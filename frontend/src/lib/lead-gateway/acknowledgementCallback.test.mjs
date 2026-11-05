import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {registerHooks} from 'node:module';
import {isPreviewIntakePath} from './previewIntakePath.ts';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createAcknowledgementCallbackHandler:create}=await import('./acknowledgementCallback.server.ts');
hook.deregister();
const pair=generateKeyPairSync('ed25519');
const now=Date.parse('2026-11-05T16:00:00Z');
const phone='+447700900001';
const profile='00000000-0000-4000-8000-000000000001';
const env={VERCEL_ENV:'preview',FEH_ACK_CALLBACK_ENABLED:'true',FEH_ACK_DATABASE_ENABLED:'true',
  NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',
  TELNYX_PUBLIC_KEY:pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64'),
  TELNYX_MESSAGING_PROFILE_ID:profile,FEH_ACK_PREVIEW_ALLOWED_PHONE:phone};
const path='/api/lead-acknowledgements/callback';
function event(text='STOP'){
  return {data:{id:'00000000-0000-4000-8000-000000000002',record_type:'event',event_type:'message.received',
    occurred_at:new Date(now).toISOString(),payload:{id:'00000000-0000-4000-8000-000000000003',record_type:'message',
      direction:'inbound',type:'SMS',messaging_profile_id:profile,from:{phone_number:phone},
      to:[{phone_number:'+447427851020'}],text,errors:[]}}};
}
function request(e=event(),headers={},url='https://example.invalid'+path){
  const body=typeof e==='string'?e:JSON.stringify(e);const timestamp=String(now/1000);
  return new Request(url,{method:'POST',body,headers:{'content-type':'application/json','telnyx-timestamp':timestamp,
    'telnyx-signature-ed25519':sign(null,Buffer.from(`${timestamp}|${body}`),pair.privateKey).toString('base64'),...headers}});
}
function fixture(changes={},result='recorded'){
  let opened=0,closed=0;const calls=[];
  const handler=create({...env,...changes},{now:()=>now,database(){opened++;return {
    async rpc(name,args){calls.push({name,args});if(result instanceof Error)throw result;return {data:result,error:null};},
    async close(){closed++;},
  };}});
  return {handler,calls,opened:()=>opened,closed:()=>closed};
}

for(const word of ['STOP',' stop ','StopAll','STOP ALL','UNSUBSCRIBE','CANCEL','END','QUIT','START','unstop'])test(`signed ${word.trim()} persists classified evidence only`,async()=>{
  const f=fixture();assert.equal((await f.handler(request(event(word)))).status,200);
  const kind=['START','unstop'].includes(word)?'START':'STOP';
  assert.deepEqual(f.calls,[{name:'record_acknowledgement_callback',args:{p_event_id:event().data.id,
    p_message_id:event().data.payload.id,p_profile_id:profile,p_occurred_at:new Date(now).toISOString(),
    p_event_type:'message.received',p_delivery_status:kind,p_from:phone,p_to:'+447427851020'}}]);
  assert.equal(f.closed(),1);
});
test('provider-classified opt-out and literal STOP both dominate a contradictory START',async()=>{
  for(const [text,classification] of [['Please stop contacting me','STOP'],['STOP','START']]){
    const f=fixture();const e=event(text);e.data.payload.autoresponse_type=classification;
    assert.equal((await f.handler(request(e))).status,200);assert.equal(f.calls[0].args.p_delivery_status,'STOP');
  }
});
test('ordinary text is authenticated but neither stored nor converted into a lead or permission',async()=>{
  const f=fixture();assert.equal((await f.handler(request(event('Can we discuss the bill?')))).status,200);
  assert.equal(f.opened(),0);
});
test('the same receive-only boundary routes delivery evidence and closes the connection',async()=>{
  const f=fixture();const e=event();e.data.event_type='message.finalized';e.data.payload.direction='outbound';
  e.data.payload.from.phone_number='+447427851020';e.data.payload.to=[{phone_number:phone,status:'delivery_failed'}];
  assert.equal((await f.handler(request(e))).status,200);
  assert.equal(f.calls[0].args.p_delivery_status,'delivery_failed');assert.equal(f.closed(),1);
});
for(const [name,changes] of Object.entries({disabled:{FEH_ACK_CALLBACK_ENABLED:'false'},missingFlag:{FEH_ACK_CALLBACK_ENABLED:undefined},
  production:{VERCEL_ENV:'production'},wrongProject:{NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},
  databaseDisabled:{FEH_ACK_DATABASE_ENABLED:'false'},wrongProfileConfig:{TELNYX_MESSAGING_PROFILE_ID:''},
  wrongPhoneConfig:{FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447427851020'},
}))test(`closed ${name} never opens the database`,async()=>{
  const f=fixture(changes);assert.equal((await f.handler(request())).status,404);assert.equal(f.opened(),0);
});
for(const [name,change] of Object.entries({
  sender:e=>e.data.payload.from.phone_number='+447700900099',destination:e=>e.data.payload.to[0].phone_number='+447700900099',
  profile:e=>e.data.payload.messaging_profile_id='00000000-0000-4000-8000-000000000099',
  direction:e=>e.data.payload.direction='outbound',type:e=>e.data.payload.type='MMS',
  eventId:e=>delete e.data.id,messageId:e=>delete e.data.payload.id,errors:e=>e.data.payload.errors=[{code:'bad'}],
  multiRecipient:e=>e.data.payload.to.push(e.data.payload.to[0]),text:e=>delete e.data.payload.text,
  futureTime:e=>e.data.occurred_at=new Date(now+300001).toISOString(),
}))test(`invalid inbound ${name} cannot change suppression`,async()=>{
  const f=fixture();const e=event();change(e);assert.equal((await f.handler(request(e))).status,400);assert.equal(f.opened(),0);
});
test('unsigned, stale, altered, oversized and browser submissions never access the database',async()=>{
  const f=fixture();
  assert.equal((await f.handler(request(event(),{'telnyx-signature-ed25519':'bad'}))).status,403);
  assert.equal((await f.handler(request(event(),{'telnyx-timestamp':String(now/1000-301)}))).status,403);
  assert.equal((await f.handler(request(event(),{origin:'https://example.invalid'}))).status,400);
  assert.equal((await f.handler(request('x'.repeat(65537)))).status,400);
  assert.equal((await f.handler(request(event(),{},'https://example.invalid'+path+'?token=private'))).status,400);
  const good=request();assert.equal((await f.handler(new Request(good.url,{method:'POST',headers:good.headers,body:'{}'}))).status,403);
  assert.equal(f.opened(),0);
});
for(const result of ['duplicate','rejected','conflict','unmatched',null,new Error('private secret')])test(`persistence ${String(result)} never reports unconfirmed success or retries`,async()=>{
  const f=fixture({},result);const r=await f.handler(request());assert.equal(r.status,result==='duplicate'?200:503);
  assert.doesNotMatch(await r.text(),/private secret/);assert.equal(f.calls.length,1);assert.equal(f.closed(),1);
});
test('callbacks remain available with all outbound sending flags closed',async()=>{
  const f=fixture({FEH_ACK_WORKER_ENABLED:'false',FEH_ACK_PREVIEW_ENABLED:'false'});
  assert.equal((await f.handler(request())).status,200);
});
test('only the exact enabled staging callback bypasses CRM session authentication',()=>{
  assert.equal(isPreviewIntakePath(path,env),true);
  for(const p of [path+'/',path+'/other','/api/lead-acknowledgements','/api/lead-acknowledgements/callback-other'])assert.equal(isPreviewIntakePath(p,env),false);
  for(const changes of [{FEH_ACK_CALLBACK_ENABLED:'false'},{FEH_ACK_CALLBACK_ENABLED:undefined},{VERCEL_ENV:'production'},
    {NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'}])assert.equal(isPreviewIntakePath(path,{...env,...changes}),false);
});
