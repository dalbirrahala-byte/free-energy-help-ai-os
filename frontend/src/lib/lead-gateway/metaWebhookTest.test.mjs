import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHmac} from 'node:crypto';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createMetaWebhookTestHandlers}=await import('./metaWebhookTest.server.ts');
const {createIntakeReceiver}=await import('./intakeReceiver.server.ts');
hook.deregister();
// Local fixtures only; production IDs cannot enable this dashboard adapter.
const env={FEH_INTAKE_RUNTIME:'supabase-edge',SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_INTAKE_RECEIVER_ENABLED:'true',FEH_INTAKE_RECEIVER_EXPIRES_AT:'2026-11-06T23:59:59Z',FEH_ACK_DATABASE_ENABLED:'true',FEH_META_DASHBOARD_TEST_ENABLED:'true',FEH_META_APP_SECRET:'a'.repeat(32),FEH_META_VERIFY_TOKEN:'synthetic-meta-verify-token-0123456789',FEH_META_DASHBOARD_ENTRY_ID:'0',FEH_META_DASHBOARD_PAGE_ID:'444444444444',FEH_META_DASHBOARD_FORM_ID:'444444444444',FEH_META_DASHBOARD_LEAD_ID:'444444444444'};
const url='https://receiver.invalid/functions/v1/feh-staging-lead-intake/meta';
const payload=()=>({object:'page',entry:[{id:'0',time:1793563200,changes:[{field:'leadgen',value:{page_id:'444444444444',form_id:'444444444444',leadgen_id:'444444444444',created_time:1447342022}}]}]});
const signed=(raw,secret=env.FEH_META_APP_SECRET,headers={})=>new Request(url,{method:'POST',body:raw,headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256',secret).update(raw).digest('hex'),...headers}});
const req=(p=payload())=>signed(JSON.stringify(p));
function db({outcome='accepted',error=null,closeThrows=false}={}){const calls=[];let closed=0;return {calls,closed:()=>closed,factory:()=>({async rpc(...args){calls.push(args);return {data:[{outcome,lead_id:7}],error};},async close(){closed++;if(closeThrows)throw new Error('private shutdown credential');}})};}
test('callback echoes challenge only for the exact configured token and unique parameters',async()=>{
 const h=db();const handler=createMetaWebhookTestHandlers(env,h.factory);
 const good=url+'?hub.mode=subscribe&hub.verify_token='+env.FEH_META_VERIFY_TOKEN+'&hub.challenge=123456789';
 const result=await handler.GET(new Request(good));assert.equal(result.status,200);assert.equal(await result.text(),'123456789');
 for(const bad of [url,good+'&hub.challenge=9',good+'&hub.mode=subscribe',good+'&hub.verify_token=other',good.replace('123456789','bad'),good.replace(env.FEH_META_VERIFY_TOKEN,'wrong')])assert.equal((await handler.GET(new Request(bad))).status,403);
 assert.equal(h.calls.length,0);
});
test('signed dashboard fixture records only a synthetic receipt, without Graph or SMS',async()=>{
 const h=db();assert.equal((await createMetaWebhookTestHandlers(env,h.factory).POST(req())).status,200);assert.equal(h.closed(),1);
 assert.deepEqual(h.calls,[['ingest_external_lead',{p_provider:'meta',p_external_lead_id:'meta_dashboard_1121337167194437_444444444444',p_provider_created_at:new Date(1447342022*1000).toISOString(),p_consent_status:'unknown',p_company_name:'FEH synthetic Meta dashboard notification',p_contact_name:'Meta dashboard test (notification only)',p_telephone:null,p_email:'meta-webhook-test@example.invalid',p_utm_campaign:null}]]);
});
test('replay acknowledges the same durable fixture identity',async()=>{const h=db({outcome:'duplicate'});assert.equal((await createMetaWebhookTestHandlers(env,h.factory).POST(req())).status,200);assert.equal(h.calls[0][1].p_external_lead_id,'meta_dashboard_1121337167194437_444444444444');});
test('signature verification works without Node global Buffer, as in Edge runtime',async()=>{const request=req();const saved=globalThis.Buffer;try{globalThis.Buffer=undefined;const h=db();assert.equal((await createMetaWebhookTestHandlers(env,h.factory).POST(request)).status,200);assert.equal(h.calls.length,1);}finally{globalThis.Buffer=saved;}});
test('raw-byte HMAC rejects tampering, wrong/missing signatures and keys before DB',async()=>{
 const h=db();const handler=createMetaWebhookTestHandlers(env,h.factory);const raw=JSON.stringify(payload());
 for(const request of [signed(raw,'b'.repeat(32)),signed(raw,env.FEH_META_APP_SECRET,{'x-hub-signature-256':'sha256=zz'}),signed(raw,env.FEH_META_APP_SECRET,{'x-hub-signature-256':''}),new Request(url,{method:'POST',body:raw+' ',headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256',env.FEH_META_APP_SECRET).update(raw).digest('hex')}})])assert.equal((await handler.POST(request)).status,403);
 assert.equal(h.calls.length,0);
});
for(const [name,mutate] of [
 ['object',p=>p.object='user'],['empty entries',p=>p.entry=[]],['batch entries',p=>p.entry.push(p.entry[0])],['entry',p=>p.entry[0].id='invalid'],['field',p=>p.entry[0].changes[0].field='feed'],['batch changes',p=>p.entry[0].changes.push(p.entry[0].changes[0])],
 ['page',p=>p.entry[0].changes[0].value.page_id='100693684801233'],['form',p=>p.entry[0].changes[0].value.form_id='1788543365401126'],['lead',p=>p.entry[0].changes[0].value.leadgen_id='987654321'],['missing time',p=>delete p.entry[0].changes[0].value.created_time],['overflow time',p=>p.entry[0].changes[0].value.created_time=Number.MAX_SAFE_INTEGER],
])test(`dashboard scope rejects ${name} before persistence`,async()=>{const p=payload();mutate(p);const h=db();assert.equal((await createMetaWebhookTestHandlers(env,h.factory).POST(req(p))).status,400);assert.equal(h.calls.length,0);});
test('malformed JSON, unsupported media type and oversized body never reach DB',async()=>{
 const h=db();const handler=createMetaWebhookTestHandlers(env,h.factory);
 assert.equal((await handler.POST(signed('{'))).status,400);
 assert.equal((await handler.POST(signed(JSON.stringify(payload()),env.FEH_META_APP_SECRET,{'content-type':'text/plain'}))).status,415);
 assert.equal((await handler.POST(signed('x'.repeat(128*1024+1)))).status,400);assert.equal(h.calls.length,0);
});
for(const changes of [{SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},{FEH_META_DASHBOARD_TEST_ENABLED:'false'},{FEH_ACK_DATABASE_ENABLED:'false'},{FEH_META_APP_SECRET:undefined},{FEH_META_VERIFY_TOKEN:'weak'},{FEH_INTAKE_RUNTIME:'vercel'}])test(`configuration fails closed ${JSON.stringify(changes)}`,async()=>{
 const h=db();const handler=createMetaWebhookTestHandlers({...env,...changes},h.factory);assert.equal((await handler.POST(req())).status,404);assert.equal((await handler.GET(new Request(url))).status,404);assert.equal(h.calls.length,0);
});
for(const changes of [{FEH_META_DASHBOARD_PAGE_ID:undefined},{FEH_META_DASHBOARD_PAGE_ID:'100693684801233'},{FEH_META_DASHBOARD_FORM_ID:'1788543365401126'},{FEH_META_DASHBOARD_LEAD_ID:undefined}])test(`missing/sensitive sample scope keeps POST closed ${JSON.stringify(changes)}`,async()=>{
 const h=db();assert.equal((await createMetaWebhookTestHandlers({...env,...changes},h.factory).POST(req())).status,404);assert.equal(h.calls.length,0);
});
test('database failure remains retryable without leaking details; connection closes',async()=>{const h=db({error:new Error('private value')});const r=await createMetaWebhookTestHandlers(env,h.factory).POST(req());assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private value'));assert.equal(h.closed(),1);});
test('Meta route respects bounded receiver expiry, path, methods and project',async()=>{
 let calls=0;const meta={GET:async()=>{calls++;return new Response('ok');},POST:async()=>{calls++;return new Response('ok');}};
 const handler=createIntakeReceiver(env,{meta,now:()=>Date.parse('2026-11-01T20:00:00Z')});
 for(const method of ['GET','POST'])assert.equal((await handler(new Request(url,{method}))).status,200);
 for(const method of ['PUT','DELETE','OPTIONS'])assert.equal((await handler(new Request(url,{method}))).status,405);
 assert.equal((await handler(new Request(url+'/extra'))).status,404);assert.equal(calls,2);
 for(const changes of [{FEH_INTAKE_RECEIVER_EXPIRES_AT:'2026-11-01T19:59:59Z'},{FEH_INTAKE_RECEIVER_ENABLED:'false'}])assert.equal((await createIntakeReceiver({...env,...changes},{meta,now:()=>Date.parse('2026-11-01T20:00:00Z')})(new Request(url))).status,404);
 assert.equal(calls,2);
});

for(const [outcome,error,status] of [
 ['accepted',null,200],['duplicate',null,200],['rejected',null,503],['accepted',new Error('private RPC credential'),503],
])test(`dashboard preserves ${outcome}/${status} when cleanup throws`,async()=>{
 const h=db({outcome,error,closeThrows:true});const r=await createMetaWebhookTestHandlers(env,h.factory).POST(req());
 assert.equal(r.status,status);assert.ok(!(await r.text()).includes('private'));
 assert.equal(h.calls.length,1);assert.equal(h.closed(),1);
});
