import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createIntakeReadinessHandler}=await import('./intakeReadiness.server.ts');
hook.deregister();
const env={VERCEL_ENV:'preview',FEH_ACK_DATABASE_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001'};
const candidate={lead_id:1,authorization_id:2,provider_adapter_id:3};
function harness(overrides={}){
 const calls={factory:[],verify:[],close:[],rpc:[]};
 const factory=kind=>{
  calls.factory.push(kind);const o=overrides[kind]??{};
  if(o.factoryThrows)throw Error('private factory credential');if(o.missing)return null;
  return {
   async verifyConnection(){calls.verify.push(kind);if(o.verifyThrows)throw Error('private verify credential');return o.verified??true;},
   verificationFailure(){return 'IDENTITY_MISMATCH';},
   async rpc(name,args){calls.rpc.push({kind,name,args});if(o.rpcThrows)throw Error('private RPC credential');return {data:o.data===undefined?[]:o.data,error:o.error??null};},
   async close(){calls.close.push(kind);if(o.closeThrows)throw Error('private close credential');},
  };
 };
 return {calls,handler:createIntakeReadinessHandler(async()=>true,env,factory),factory};
}
for(const data of [[],[candidate]])test(`healthy probe with ${data.length} candidates exposes no IDs or phone`,async()=>{
 const h=harness({worker:{data}});const r=await h.handler();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
 assert.deepEqual(await r.json(),{ingestor:true,worker:true,workerCandidateLookup:true,workerCandidateAvailable:data.length===1});
 assert.deepEqual(h.calls.close,['ingestor','worker']);assert.deepEqual(h.calls.rpc,[{kind:'worker',name:'select_lead_acknowledgement_candidate',args:{p_allowed_phone:env.FEH_ACK_PREVIEW_ALLOWED_PHONE}}]);
});
for(const kind of ['ingestor','worker'])for(const defect of ['factoryThrows','missing','verifyThrows','closeThrows'])test(`${kind} ${defect} is isolated and redacted`,async()=>{
 const h=harness({[kind]:{[defect]:true}});const r=await h.handler();assert.equal(r.status,503);
 const text=await r.text();assert.ok(!text.includes('private'));assert.ok(!text.includes(env.FEH_ACK_PREVIEW_ALLOWED_PHONE));
 const b=JSON.parse(text);assert.equal(b[kind],false);assert.equal(b[kind==='worker'?'ingestor':'worker'],true);
 assert.deepEqual(h.calls.factory,['ingestor','worker']);
 assert.equal(h.calls.close.filter(k=>k===kind).length,['missing','factoryThrows'].includes(defect)?0:1);
 if(kind==='worker')assert.equal(b.workerCandidateAvailable,false);
});
for(const data of [null,{},[candidate,candidate],[{}],[{...candidate,lead_id:'1'}],[{...candidate,authorization_id:0}],[{...candidate,provider_adapter_id:Number.MAX_SAFE_INTEGER+1}]])test(`invalid candidate receipt stays unavailable: ${JSON.stringify(data)}`,async()=>{
 const h=harness({worker:{data}});const r=await h.handler();assert.equal(r.status,503);const b=await r.json();assert.equal(b.workerCandidateLookup,false);assert.equal(b.workerCandidateAvailable,false);assert.equal(h.calls.rpc.length,1);
});
for(const o of [{rpcThrows:true},{error:{message:'private RPC credential'}}])test(`candidate error remains generic ${JSON.stringify(o)}`,async()=>{
 const h=harness({worker:o});const r=await h.handler();assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private'));assert.deepEqual(h.calls.close,['ingestor','worker']);
});
for(const changes of [{VERCEL_ENV:'production'},{FEH_ACK_DATABASE_ENABLED:'false'},{NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'}])test(`disabled scope never connects ${JSON.stringify(changes)}`,async()=>{
 const h=harness();assert.equal((await createIntakeReadinessHandler(async()=>true,{...env,...changes},h.factory)()).status,404);assert.deepEqual(h.calls.factory,[]);
});
test('invalid recipient prevents candidate lookup without concealing connection health',async()=>{
 const h=harness();const r=await createIntakeReadinessHandler(async()=>true,{...env,FEH_ACK_PREVIEW_ALLOWED_PHONE:'invalid'},h.factory)();assert.equal(r.status,503);const b=await r.json();assert.equal(b.worker,true);assert.equal(b.workerCandidateLookup,false);assert.equal(h.calls.rpc.length,0);
});
test('failed identity verification never queries candidates',async()=>{
 const h=harness({worker:{verified:false}});const r=await h.handler();assert.equal(r.status,503);assert.equal((await r.json()).failures.worker,'IDENTITY_MISMATCH');assert.equal(h.calls.rpc.length,0);
});
test('configuration is snapshotted before probing',async()=>{
 const h=harness();const changed={...env};const handler=createIntakeReadinessHandler(async()=>true,changed,h.factory);changed.FEH_ACK_PREVIEW_ALLOWED_PHONE='+447700900002';changed.VERCEL_ENV='production';
 assert.equal((await handler()).status,200);assert.equal(h.calls.rpc[0].args.p_allowed_phone,env.FEH_ACK_PREVIEW_ALLOWED_PHONE);
});

test('unverified operator and failed identity service cannot open a readiness database', async()=>{
 const h=harness();
 for(const authorize of [async()=>false,async()=>{throw Error('identity unavailable');}]){
   assert.equal((await createIntakeReadinessHandler(authorize,env,h.factory)()).status,403);
 }
 assert.deepEqual(h.calls.factory,[]);
});
