import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {runLeadAcknowledgementOnce} from '../execution-dispatch/runLeadAcknowledgementOnce.ts';
const hook = registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createAcknowledgementWorkerHandler} = await import('./acknowledgementWorker.server.ts');
hook.deregister();
const token = 'a'.repeat(64); // synthetic, never a real credential
const env = {VERCEL_ENV:'preview', NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',
  FEH_ACK_WORKER_ENABLED:'true', FEH_ACK_DATABASE_ENABLED:'true', FEH_ACK_PREVIEW_ENABLED:'true',
  FEH_ACK_WORKER_TRIGGER_TOKEN:token, TELNYX_MESSAGING_FROM:'+447427851020', FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001'};
const request = (body='{}', headers={}, url='https://preview.invalid/api/lead-acknowledgements/run') => new Request(url,
  {method:'POST', headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...headers}, body});
function harness({data=[], error=null, throws=false, closeThrows=false}={}) {
  const calls={opened:0, closed:0, rpc:[], sends:0};
  const dependencies={database:()=>{calls.opened++;return {async rpc(name,args){calls.rpc.push({name,args});
    if(throws)throw new Error('private credential/SQL diagnostics');return {data,error};},
    async close(){calls.closed++;if(closeThrows)throw new Error('private shutdown');}};},
    transport:()=>({async createMessage(){calls.sends++;throw new Error('unexpected send');}})};
  return {calls, dependencies};
}
test('authenticated empty queue runs once, closes connection and does not claim delivery',async()=>{
  const h=harness();const result=await createAcknowledgementWorkerHandler(env,h.dependencies)(request());
  assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(await result.json(),{status:'idle',attemptId:null,automaticRetry:false,deliveryConfirmed:false});
  assert.deepEqual(h.calls,{opened:1,closed:1,rpc:[{name:'select_lead_acknowledgement_candidate',args:{p_allowed_phone:env.FEH_ACK_PREVIEW_ALLOWED_PHONE}}],sends:0});
});
for(const [name,changes] of Object.entries({production:{VERCEL_ENV:'production'},wrongProject:{NEXT_PUBLIC_SUPABASE_URL:'https://production.invalid'},
  workerDisabled:{FEH_ACK_WORKER_ENABLED:'false'},smsDisabled:{FEH_ACK_PREVIEW_ENABLED:'false'},databaseDisabled:{FEH_ACK_DATABASE_ENABLED:'false'},
  missingSecret:{FEH_ACK_WORKER_TRIGGER_TOKEN:undefined},weakSecret:{FEH_ACK_WORKER_TRIGGER_TOKEN:'weak'},
  wrongSender:{TELNYX_MESSAGING_FROM:'+447700900002'},missingPhone:{FEH_ACK_PREVIEW_ALLOWED_PHONE:undefined},senderAsRecipient:{FEH_ACK_PREVIEW_ALLOWED_PHONE:env.TELNYX_MESSAGING_FROM}}))
  test(`${name}: no worker access`,async()=>{const h=harness();assert.equal((await createAcknowledgementWorkerHandler({...env,...changes},h.dependencies)(request())).status,404);assert.equal(h.calls.opened,0);});
for(const [name,headers] of Object.entries({missing:{authorization:''},wrong:{authorization:`Bearer ${'b'.repeat(64)}`},cookie:{authorization:'',cookie:'session=synthetic'},browser:{origin:'https://preview.invalid'}}))
  test(`${name} authentication fails before database access`,async()=>{const h=harness();assert.equal((await createAcknowledgementWorkerHandler(env,h.dependencies)(request('{}',headers))).status,403);assert.equal(h.calls.opened,0);});
for(const body of ['null','[]','{"to":"+447700900002"}','{"leadId":1}','{"approved":true}','{"__proto__":{}}','{',' '.repeat(65)+'{}'])
  test(`caller input rejected: ${body.slice(0,25)}`,async()=>{const h=harness();assert.equal((await createAcknowledgementWorkerHandler(env,h.dependencies)(request(body))).status,400);assert.equal(h.calls.opened,0);});
test('GET, query parameters and wrong content type cannot invoke worker',async()=>{
  const h=harness();const handler=createAcknowledgementWorkerHandler(env,h.dependencies);
  assert.equal((await handler(new Request('https://preview.invalid/api/lead-acknowledgements/run'))).status,405);
  assert.equal((await handler(request('{}',{},'https://preview.invalid/api/lead-acknowledgements/run?leadId=1'))).status,400);
  assert.equal((await handler(request('{}',{'content-type':'text/plain'}))).status,415);assert.equal(h.calls.opened,0);
});
for(const input of [{data:null},{data:{}},{data:[{},{}]},{data:[{lead_id:1,authorization_id:2,provider_adapter_id:'3'}]},
  {data:[{lead_id:Number.MAX_SAFE_INTEGER+1,authorization_id:2,provider_adapter_id:3}]},{error:{message:'private'}},{throws:true}])
  test(`selection failure is redacted, bounded and never retried: ${JSON.stringify(input)}`,async()=>{
    const h=harness(input);const result=await createAcknowledgementWorkerHandler(env,h.dependencies)(request());
    assert.equal(result.status,200);const body=await result.text();assert.ok(!body.includes('private'));
    assert.equal(JSON.parse(body).status,'evaluation_failed');assert.equal(h.calls.closed,1);assert.equal(h.calls.sends,0);assert.equal(h.calls.rpc.length,1);
  });
test('missing transport/database and shutdown failure are handled without retry',async()=>{
  const h=harness({closeThrows:true});
  assert.equal((await createAcknowledgementWorkerHandler(env,{...h.dependencies,transport:()=>null})(request())).status,503);
  assert.equal(h.calls.opened,0);
  assert.equal((await createAcknowledgementWorkerHandler(env,{...h.dependencies,database:()=>null})(request())).status,503);
  assert.equal((await createAcknowledgementWorkerHandler(env,h.dependencies)(request())).status,200);assert.equal(h.calls.closed,1);
});
test('environment is snapshotted and cannot change the recipient after handler creation',async()=>{
  const h=harness();const changed={...env};const handler=createAcknowledgementWorkerHandler(changed,h.dependencies);
  changed.FEH_ACK_PREVIEW_ALLOWED_PHONE='+447700900002';changed.FEH_ACK_WORKER_TRIGGER_TOKEN='b'.repeat(64);
  assert.equal((await handler(request())).status,200);assert.equal(h.calls.rpc[0].args.p_allowed_phone,env.FEH_ACK_PREVIEW_ALLOWED_PHONE);
});
test('runner rejects invalid/sender destination before database access',async()=>{
  const h=harness();for(const phone of ['bad',env.TELNYX_MESSAGING_FROM])
    assert.equal((await runLeadAcknowledgementOnce(h.dependencies.database(),{from:env.TELNYX_MESSAGING_FROM,allowedPhone:phone},h.dependencies.transport())).status,'blocked');
  assert.equal(h.calls.rpc.length,0);
});
