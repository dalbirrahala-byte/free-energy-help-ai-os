import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createAcknowledgementInvocation}=await import('./acknowledgementInvocation.server.ts');
const {createAcknowledgementWorkerHandler}=await import('./acknowledgementWorker.server.ts');hook.deregister();
const now=()=>Date.parse('2026-11-02T05:00:00Z');
const config={enabled:true,projectId:'vredwhyphrhsudggrsen',url:'https://free-energy-help-ai-synthetic-free-energy-help.vercel.app/api/lead-acknowledgements/run',triggerToken:'a'.repeat(64),expiresAt:'2026-11-02T05:10:00Z'};
const body=(status='idle',attemptId=null)=>({status,attemptId,automaticRetry:false,deliveryConfirmed:false});
const response=b=>Response.json(b);
test('one fixed empty POST for repeated and concurrent invocations',async()=>{
 let calls=0;let sent;const run=createAcknowledgementInvocation(config,async req=>{calls++;sent=req;return response(body('provider_accepted',17));},now);
 const values=await Promise.all([run(),run(),run()]);assert.equal(calls,1);assert.deepEqual(values[0],body('provider_accepted',17));assert.equal(values[0],values[1]);assert.ok(Object.isFrozen(values[0]));
 assert.equal(sent.method,'POST');assert.equal(await sent.text(),'{}');assert.equal(sent.redirect,'error');assert.equal(sent.credentials,'omit');assert.equal(sent.cache,'no-store');assert.equal(sent.headers.get('authorization'),`Bearer ${config.triggerToken}`);assert.equal(sent.headers.has('origin'),false);assert.equal(sent.headers.has('cookie'),false);
 await run();assert.equal(calls,1);
});
for(const changes of [{enabled:false},{projectId:'kupuswwutonsagftivkv'},{triggerToken:'weak'},{expiresAt:'bad'},{expiresAt:'2026-11-02T04:59:59Z'},{expiresAt:'2026-11-02T06:00:00Z'},{timeoutMs:0},{timeoutMs:120001},
 ...['https://crm.freeenergyhelp.com/api/lead-acknowledgements/run',config.url+'?token=private',config.url+'#x',config.url.replace('https:','http:'),config.url.replace('https://','https://user:pass@'),config.url.replace('.vercel.app','.vercel.app.evil.invalid'),config.url.replace('/api/','/extra/../api/')].map(url=>({url}))])test(`invalid config blocks before transport ${JSON.stringify(changes)}`,async()=>{
 let calls=0;const run=createAcknowledgementInvocation({...config,...changes},async()=>{calls++;throw Error('unexpected');},now);assert.equal((await run()).status,'blocked');assert.equal(calls,0);
});
for(const status of ['idle','provider_accepted','failed','indeterminate','blocked','evaluation_failed','already_claimed'])test(`recognizes bounded worker outcome ${status}`,async()=>{
 const b=body(status,status==='idle'?null:23);const run=createAcknowledgementInvocation(config,async()=>response({...b,private:'must not escape'}),now);assert.deepEqual(await run(),b);
});
for(const [name,transport] of Object.entries({throw:async()=>{throw Error('private token');},timeout:async()=>new Promise(()=>{}),redirect:async()=>new Response(null,{status:302,headers:{location:'https://evil.invalid'}}),error:async()=>new Response('private',{status:503}),html:async()=>new Response('<html>private</html>',{headers:{'content-type':'text/html'}}),badJson:async()=>new Response('{',{headers:{'content-type':'application/json'}}),large:async()=>response({x:'private'.repeat(1000)}),missing:async()=>response({}),claimsDelivery:async()=>response({...body(),deliveryConfirmed:true}),retry:async()=>response({...body(),automaticRetry:true}),badId:async()=>response(body('provider_accepted',null)),unknown:async()=>response(body('success',1))}))test(`${name} remains indeterminate and is never retried`,async()=>{
 let calls=0;let signal;const run=createAcknowledgementInvocation({...config,timeoutMs:20},async req=>{calls++;signal=req.signal;return transport();},now);
 const r=await run();assert.deepEqual(r,body('indeterminate',null));assert.ok(!JSON.stringify(r).includes('private'));assert.equal(signal.aborted,true);assert.equal(await run(),r);assert.equal(calls,1);
});
test('configuration mutation cannot retarget a prepared invocation',async()=>{
 const changed={...config};let url;const run=createAcknowledgementInvocation(changed,async req=>{url=req.url;return response(body());},now);changed.url='https://evil.invalid';changed.triggerToken='b'.repeat(64);assert.equal((await run()).status,'idle');assert.equal(url,config.url);
});
test('expiry is checked when the invocation starts, not just when constructed',async()=>{
 let time=now();let calls=0;const run=createAcknowledgementInvocation(config,async()=>{calls++;return response(body());},()=>time);time+=11*60*1000;assert.equal((await run()).status,'blocked');assert.equal(calls,0);
});

test('compatible with the existing worker handler without a database write or SMS',async()=>{
 let calls=0;let closed=0;
 const handler=createAcknowledgementWorkerHandler({VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_ACK_WORKER_ENABLED:'true',FEH_ACK_DATABASE_ENABLED:'true',FEH_ACK_PREVIEW_ENABLED:'true',FEH_ACK_WORKER_TRIGGER_TOKEN:config.triggerToken,TELNYX_MESSAGING_FROM:'+447427851020',FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001'},
 {database:()=>({async rpc(name){assert.equal(name,'select_lead_acknowledgement_candidate');calls++;return {data:[],error:null};},async close(){closed++;}}),transport:()=>({createMessage:async()=>assert.fail('unexpected SMS')})});
 const run=createAcknowledgementInvocation(config,handler,now);assert.deepEqual(await run(),body());assert.deepEqual(await run(),body());assert.equal(calls,1);assert.equal(closed,1);
});
test('latch is installed before invoking even a reentrant transport',async()=>{
 let calls=0;let nested;let run;
 run=createAcknowledgementInvocation(config,async()=>{calls++;if(calls===1)nested=run();return response(body());},now);
 const first=run();await first;assert.equal(nested,first);assert.equal(calls,1);
});
