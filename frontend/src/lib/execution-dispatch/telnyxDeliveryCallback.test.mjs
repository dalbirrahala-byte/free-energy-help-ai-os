import assert from 'node:assert/strict';
import test from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(specifier,context,next){
  return specifier==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(specifier,context);
}});
const {createTelnyxDeliveryCallback:create}=await import('./telnyxDeliveryCallback.server.ts');
hook.deregister();
const pair=generateKeyPairSync('ed25519');
const now=Date.parse('2026-11-02T12:00:00Z');
const profile='00000000-0000-4000-8000-000000000001';
const config={enabled:true,projectId:'vredwhyphrhsudggrsen',
  publicKey:pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('base64'),
  messagingProfileId:profile,allowedPhone:'+447700900001'};
function event(){return {data:{id:'00000000-0000-4000-8000-000000000002',record_type:'event',
  event_type:'message.finalized',occurred_at:new Date(now).toISOString(),payload:{
    id:'00000000-0000-4000-8000-000000000003',record_type:'message',direction:'outbound',type:'SMS',
    messaging_profile_id:profile,from:{phone_number:'+447427851020'},
    to:[{phone_number:config.allowedPhone,status:'delivered'}],errors:[],
    text:'synthetic private message text',webhook_url:'https://example.invalid/private',
  }}};}
function request(value=event(),headers={},url='https://example.invalid/receipt'){
  const body=typeof value==='string'?value:JSON.stringify(value);
  const timestamp=String(now/1000);
  return new Request(url,{method:'POST',body,headers:{'content-type':'application/json',
    'telnyx-timestamp':timestamp,'telnyx-signature-ed25519':sign(null,Buffer.from(`${timestamp}|${body}`),pair.privateKey).toString('base64'),...headers}});
}
const fixture=(configuration=config,result='recorded')=>{
  const calls=[];
  const handler=create(configuration,{async rpc(name,args){calls.push({name,args});return {data:result,error:null};}},()=>now);
  return {handler,calls};
};

for(const result of ['recorded','duplicate'])test(`signed ${result} receipt acknowledges only durable evidence`,async()=>{
  const f=fixture(config,result);const response=await f.handler(request());
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{});
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(f.calls,[{name:'record_acknowledgement_delivery_receipt',args:{
    p_event_id:event().data.id,p_message_id:event().data.payload.id,p_profile_id:profile,
    p_occurred_at:event().data.occurred_at,p_event_type:'message.finalized',p_delivery_status:'delivered',
    p_from:'+447427851020',p_to:config.allowedPhone}}]);
});
for(const [name,change] of Object.entries({
  'wrong profile':e=>e.data.payload.messaging_profile_id='00000000-0000-4000-8000-000000000099',
  'wrong sender':e=>e.data.payload.from.phone_number='+447700900099',
  'wrong recipient':e=>e.data.payload.to[0].phone_number='+447700900099',
  'multiple recipients':e=>e.data.payload.to.push(e.data.payload.to[0]),
  'missing event id':e=>delete e.data.id,
  'invalid message id':e=>e.data.payload.id='invalid',
  'unknown event':e=>e.data.event_type='unknown',
  'unknown status':e=>e.data.payload.to[0].status='unknown',
  'sent is not delivered':e=>e.data.event_type='message.sent',
  'inbound STOP':e=>{e.data.event_type='message.received';e.data.payload.direction='inbound';e.data.payload.text='STOP';},
  'MMS':e=>e.data.payload.type='MMS',
  'missing error evidence':e=>delete e.data.payload.errors,
  'contradictory delivered error':e=>e.data.payload.errors=[{code:'synthetic'}],
  'invalid time':e=>e.data.occurred_at='tomorrow',
  'future event':e=>e.data.occurred_at=new Date(now+300001).toISOString(),
}))test(`rejects ${name} before database access`,async()=>{
  const f=fixture();const e=event();change(e);
  assert.equal((await f.handler(request(e))).status,400);assert.equal(f.calls.length,0);
});
for(const status of ['sent','delivery_failed','sending_failed','delivery_unconfirmed','expired'])test(`stores ${status} as evidence without promoting delivery`,async()=>{
  const e=event();e.data.payload.to[0].status=status;
  if(status==='sent')e.data.event_type='message.sent';
  const f=fixture();assert.equal((await f.handler(request(e))).status,200);
  assert.equal(f.calls[0].args.p_delivery_status,status);
});
for(const [name,configuration] of Object.entries({
  disabled:{...config,enabled:false},production:{...config,projectId:'kupuswwutonsagftivkv'},
  missingProfile:{...config,messagingProfileId:''},missingPhone:{...config,allowedPhone:''},
  senderAsRecipient:{...config,allowedPhone:'+447427851020'},
}))test(`closed configuration ${name}`,async()=>{
  const f=fixture(configuration);assert.equal((await f.handler(request())).status,404);assert.equal(f.calls.length,0);
});
for(const [name,headers,expected] of [
  ['signature',{'telnyx-signature-ed25519':'bad'},403],
  ['timestamp',{'telnyx-timestamp':String(now/1000-301)},403],
  ['origin',{origin:'https://example.invalid'},400],
  ['content type',{'content-type':'text/plain'},415],
  ['oversized length',{'content-length':'65537'},400],
])test(`rejects invalid ${name}`,async()=>{
  const f=fixture();assert.equal((await f.handler(request(event(),headers))).status,expected);assert.equal(f.calls.length,0);
});
test('rejects unsigned/tampered body and oversized streaming input',async()=>{
  const f=fixture();
  const original=request();
  assert.equal((await f.handler(new Request(original.url,{method:'POST',headers:original.headers,body:'{}'}))).status,403);
  assert.equal((await f.handler(request('x'.repeat(65537)))).status,400);assert.equal(f.calls.length,0);
});
test('valid signature does not excuse invalid JSON or unexpected method/query',async()=>{
  const f=fixture();assert.equal((await f.handler(request('{'))).status,400);
  assert.equal((await f.handler(new Request('https://example.invalid/receipt'))).status,405);
  assert.equal((await f.handler(request(event(),{},'https://example.invalid/receipt?attempt=1'))).status,400);
  assert.equal(f.calls.length,0);
});
for(const result of ['unmatched','conflict','rejected',null,{},'unknown'])test(`unconfirmed persistence ${JSON.stringify(result)} is retryable receipt only`,async()=>{
  const f=fixture(config,result);const response=await f.handler(request());
  assert.equal(response.status,503);assert.equal(f.calls.length,1);
  assert.deepEqual(await response.json(),{message:'Receipt could not be accepted'});
});
test('database failure exposes no private diagnostics and has no internal retry',async()=>{
  let calls=0;
  const f=create(config,{async rpc(){calls++;throw Error('secret database diagnostic');}},()=>now);
  const response=await f(request());assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(),/secret/);assert.equal(calls,1);
});
test('configuration is snapshotted against later mutation',async()=>{
  const copy={...config};const f=fixture(copy);copy.enabled=false;copy.allowedPhone='+447700900099';
  assert.equal((await f.handler(request())).status,200);
});
