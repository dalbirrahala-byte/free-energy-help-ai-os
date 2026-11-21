import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {createQuoteCrmStep,finishQuoteCrm} from './handoff.ts';
import {createMysqlAttemptStore,CLAIM_SQL,FINISH_SQL} from './mysql-attempt-store.ts';
import {createReceiver} from '../../source/receiver.ts';
import {PATH} from '../../source/contract.ts';

globalThis.fetch=async()=>{throw Error('NO NETWORK');};
const id='00000000-0000-4000-8000-000000000001';
const now=Date.parse('2026-11-18T12:00:00Z');
const endpoint='https://crm.example.invalid'+PATH, key='synthetic-fixture-only-no-runtime-authority';
const payload={submissionId:id,submittedAt:'2026-11-18T11:00:00.000Z',businessName:'Synthetic Business',contactName:'Synthetic Person',email:'visitor@example.invalid',phone:null,meterNumbers:null,currentSupplier:null,message:null,smsConsent:null,sourcePage:'/quote',attribution:{utmSource:null,utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null,gclid:null,fbclid:null}};
function setup(options={}) {
 const events=[];let status='pending',transports=0,commits=0;
 const receive=createReceiver({key,now:()=>now,save:async p=>{commits++;assert.deepEqual(p,payload);return {version:1,submissionId:id,outcome:'created',leadId:'1'};}});
 const execute=async(sql,args)=>{
  events.push(sql===CLAIM_SQL?'claim':'finish');
  if(sql===CLAIM_SQL){
   assert.deepEqual(args,[id]);
   if(options.claimThrow)throw Error('PRIVATE_CLAIM');
   if(options.badClaim!==undefined)return options.badClaim;
   const count=status==='pending'?1:0;if(count)status='uncertain';
   if(options.claimAfterCommitThrow)throw Error('PRIVATE_CLAIM_ACK');
   return [{affectedRows:count},[]];
  }
  assert.equal(sql,FINISH_SQL);assert.equal(args[1],id);
  if(options.finishThrow)throw Error('PRIVATE_FINISH');
  if(options.badFinish!==undefined)return options.badFinish;
  const count=status==='uncertain'?1:0;if(count)status=args[0];return [{affectedRows:count},[]];
 };
 const client={endpoint:options.absent?null:endpoint,approvedEndpoint:endpoint,key,now:()=>now,transport:async(u,i)=>{
  events.push('transport');transports++;assert.equal(status,'uncertain');
  if(options.transportThrow)throw Error('PRIVATE_TRANSPORT');
  if(options.response)return options.response();
  return receive(new Request(u,i));
 }};
 const step=createQuoteCrmStep({client,store:createMysqlAttemptStore(execute)});
 return {step,client,events,get status(){return status;},get transports(){return transports;},get commits(){return commits;}};
}
const call=(s,isNew=true,status='pending')=>s.step(id,isNew,status,()=>payload);
test('signed committed correlated receipt follows durable claim and finalizes exactly once',async()=>{const s=setup();assert.equal(await call(s),'sent');assert.deepEqual(s.events,['claim','transport','finish']);assert.equal(s.status,'sent');assert.equal(s.commits,1);});
test('two simultaneous eligible callers: one atomic mock claim, one transport',async()=>{const s=setup();assert.deepEqual((await Promise.all([call(s),call(s)])).sort(),['reconcile','sent']);assert.equal(s.transports,1);assert.equal(s.commits,1);});
test('closed default and absent endpoint never claim or send',async()=>{assert.equal(await finishQuoteCrm(id,true,'pending',()=>{throw Error('must not map');}),'disabled');const s=setup({absent:true});assert.equal(await call(s),'pending');assert.deepEqual(s.events,[]);});
test('historical pending, sent, failed and uncertain rows never replay',async()=>{for(const [fresh,status] of [[false,'pending'],[true,'sent'],[true,'failed'],[true,'uncertain']]){const s=setup();assert.equal(await call(s,fresh,status),'held');assert.deepEqual(s.events,[]);}});
test('claim failure, malformed/no-match results, and lost commit acknowledgment never transport',async()=>{
 for(const options of [{claimThrow:true},{claimAfterCommitThrow:true},{badClaim:null},{badClaim:[]},{badClaim:[{affectedRows:0},[]]},{badClaim:[{affectedRows:2},[]]},{badClaim:[{affectedRows:'1'},[]]}]){const s=setup(options);assert.equal(await call(s),'reconcile');assert.equal(s.transports,0);}
});
test('lost claim acknowledgment leaves durable hold; another call cannot send',async()=>{const s=setup({claimAfterCommitThrow:true});await call(s);assert.equal(s.status,'uncertain');await call(s,false,'uncertain');assert.equal(s.transports,0);});
test('transport throw preserves durable hold even across a fresh coordinator invocation',async()=>{const s=setup({transportThrow:true});assert.equal(await call(s),'reconcile');assert.equal(s.status,'uncertain');assert.equal(await call(s),'reconcile');assert.equal(s.transports,1);});
test('receipt followed by failed finalization remains held and cannot be resent',async()=>{
 for(const options of [{finishThrow:true},{badFinish:null},{badFinish:[]},{badFinish:[{affectedRows:0},[]]}]){const s=setup(options);assert.equal(await call(s),'reconcile');assert.equal(s.status,'uncertain');assert.equal(s.commits,1);await call(s);assert.equal(s.transports,1);}
});
test('202 and mismatched receipt cannot become sent',async()=>{for(const response of [()=>new Response('{}',{status:202}),()=>Response.json({version:1,submissionId:'wrong',outcome:'created',leadId:'1'},{status:201})]){const s=setup({response});assert.equal(await call(s),'reconcile');assert.equal(s.status,'uncertain');}});
test('unrecognised gateway response after a receiver commit preserves the reconciliation hold',async()=>{
 const s=setup();
 const send=s.client.transport;
 s.client.transport=async(url,init)=>{
  const committed=await send(url,init);
  assert.equal(committed.status,201);
  return new Response('Gateway could not find the route',{status:404});
 };
 assert.equal(await call(s),'reconcile');
 assert.equal(s.status,'uncertain');
 assert.deepEqual(s.events,['claim','transport']);
 assert.equal(s.commits,1);
 assert.equal(s.transports,1);
});
test('receiver-shaped error after a committed receipt keeps the durable hold', async () => {
 const s = setup();
 const send = s.client.transport;
 s.client.transport = async (url, init) => {
  const receipt = await send(url, init);
  assert.equal(receipt.status, 201);
  return Response.json({error:'not_found'}, {status:404});
 };
 assert.equal(await call(s), 'reconcile');
 assert.equal(s.status, 'uncertain');
 assert.deepEqual(s.events, ['claim', 'transport']);
 assert.equal(s.commits, 1);
 assert.equal(s.transports, 1);
});
test('invalid local configuration can finish failed before transport', async () => {
 const s = setup();
 s.client.approvedEndpoint = null;
 assert.equal(await call(s), 'failed');
 assert.equal(s.status, 'failed');
 assert.equal(s.transports, 0);
});
test('mapper error or changed submission identity cannot claim',async()=>{const s=setup();assert.equal(await s.step(id,true,'pending',()=>{throw Error('PRIVATE_MAP');}),'reconcile');assert.equal(await s.step(id,true,'pending',()=>({...payload,submissionId:'wrong'})),'reconcile');assert.deepEqual(s.events,[]);});

// Load both exact baseline and generated candidate with all DB/email imports mocked.
const modules={
 '@/server/email.js':'export const sendEmail=(...a)=>globalThis.q.email(...a);',
 '@/lib/phone.js':"export const TEL1='SYNTHETIC';export const TEL1_HREF='tel:synthetic';",
 '@/server/lib/crm-client.js':'export const deliverToCrm=async()=>({ok:true,simulated:true,endpointAbsent:true});',
 '@/server/lib/quote-crm-step.js':'export const finishQuoteCrm=(...a)=>globalThis.q.step(...a);',
 '@/server/lib/enquiry-store.js':'export const saveEnquiry=(...a)=>globalThis.q.save(...a);export const updateDeliveryStatus=(...a)=>globalThis.q.update(...a);export const enquiryRowToCrmPayload=()=>globalThis.q.payload;',
};
const hooks=registerHooks({resolve(spec,ctx,next){if(Object.hasOwn(modules,spec))return {url:'data:text/javascript,'+encodeURIComponent(modules[spec]),shortCircuit:true};if(spec.startsWith('@/'))throw Error('unmocked import');return next(spec,ctx);}});
// Distinct module identity prevents baseline cache reuse with the older fixture
// when both suites run in one no-network process with different mock bindings.
const baseline=(await import('../quote-POST.ts?attempt-baseline')).default;
const candidate=(await import('./quote-POST.candidate.ts')).default;
hooks.deregister();
async function quote(handler,options={}){
 const s=setup(options);const emails=[],events=[],logs=[];
 const row={...payload,id:1,...payload.attribution,ownerEmailStatus:'pending',visitorEmailStatus:'pending',crmStatus:'pending'};
 globalThis.q={payload,step:s.step,save:async()=>({ok:true,created:true,row}),update:async(_id,col,status)=>{events.push(col+':'+status);return {ok:true};},email:async e=>{emails.push(e);events.push('email:'+e.to);if(options.emailFailure===e.to)throw Error('synthetic email failure');}};
 const res={status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 const old={log:console.log,warn:console.warn,error:console.error};for(const k of Object.keys(old))console[k]=(...a)=>logs.push(a);
 process.env.NOTIFICATION_RECIPIENT_EMAIL='owner@example.invalid';
 try{await handler({body:payload},res);}finally{Object.assign(console,old);delete globalThis.q;delete process.env.NOTIFICATION_RECIPIENT_EMAIL;}
 return {s,emails,events,logs,res};
}
test('patch preserves validation, persistence, email code and response/builders byte-for-byte',()=>{
 const a=readFileSync(new URL('../quote-POST.ts',import.meta.url),'utf8'),b=readFileSync(new URL('./quote-POST.candidate.ts',import.meta.url),'utf8');
 assert.equal(a.slice(a.indexOf('interface QuoteRequestBody'),a.indexOf('  // ── Step 4: CRM delivery')),b.slice(b.indexOf('interface QuoteRequestBody'),b.indexOf('  // CRM is subordinate')));
 assert.equal(a.slice(a.indexOf('  return res.status(201)')),b.slice(b.indexOf('  return res.status(201)')));
});
test('candidate preserves actual email contents/order and HTTP201 across success/absent/ambiguous/failed-write paths',async()=>{
 const base=await quote(baseline);
 for(const options of [{},{absent:true},{transportThrow:true},{finishThrow:true},{claimAfterCommitThrow:true}]){
  const r=await quote(candidate,options);assert.equal(r.res.code,201);assert.deepEqual(r.res.body,base.res.body);assert.deepEqual(r.emails,base.emails);assert.deepEqual(r.events,base.events);assert(!JSON.stringify(r.logs).includes('PRIVATE_'));
 }
});
test('owner failure remains HTTP500 without CRM; visitor failure remains nonfatal',async()=>{
 for(const emailFailure of ['owner@example.invalid','visitor@example.invalid']){
  const a=await quote(baseline,{emailFailure}),b=await quote(candidate,{emailFailure});assert.equal(a.res.code,b.res.code);assert.deepEqual(a.emails,b.emails);assert.deepEqual(a.events,b.events);assert.equal(b.s.transports,emailFailure.startsWith('owner')?0:1);
 }
});

for (const phase of ['headers', 'body']) {
 test('lost ' + phase + ' deadline after commit retains the claim', async t => {
  const clock = new AbortController();
  t.mock.method(AbortSignal, 'timeout', ms => {
   assert.equal(ms, 8000);
   return clock.signal;
  });
  const s = setup();
  const send = s.client.transport;
  const ready = Promise.withResolvers();
  const release = Promise.withResolvers();
  let cancellations = 0;
  s.client.transport = async (url, init) => {
   assert.equal(init.signal, clock.signal);
   const committed = await send(url, init);
   const bytes = new Uint8Array(await committed.arrayBuffer());
   const stream = new ReadableStream({
    async pull(controller) {
     ready.resolve();
     await release.promise;
     if (!cancellations) {
      controller.enqueue(bytes);
      controller.close();
     }
    },
    cancel() { cancellations++; },
   }, {highWaterMark:0});
   const reply = new Response(stream, {status:201, headers:committed.headers});
   if (phase === 'headers') { ready.resolve(); await release.promise; }
   return reply;
  };
  let outcome;
  const delivery = call(s).then(value => { outcome = value; });
  try {
   await ready.promise;
   await new Promise(resolve => setImmediate(resolve));
   assert.equal(s.commits, 1);
   clock.abort();
   await new Promise(resolve => setImmediate(resolve));
   assert.equal(outcome, 'reconcile');
   assert.equal(s.status, 'uncertain');
  } finally {
   release.resolve();
   await delivery;
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cancellations, 1);
  assert.deepEqual(s.events, ['claim', 'transport']);
  assert.equal(s.transports, 1);
  assert.equal(s.commits, 1);
 });
}

for (const receiptLost of [false, true]) {
 const receiptState = receiptLost ? 'lost' : 'received';
 test('disable new CRM handoffs with an earlier committed receipt ' + receiptState, async () => {
  const s = setup();
  const committed = Promise.withResolvers();
  const releaseReply = Promise.withResolvers();
  const send = s.client.transport;
  s.client.transport = async (url, init) => {
   const receipt = await send(url, init);
   assert.equal(receipt.status, 201);
   committed.resolve();
   await releaseReply.promise;
   if (receiptLost) throw Error('synthetic lost reply');
   return receipt;
  };

  const earlier = call(s);
  try {
   await Promise.race([committed.promise, earlier.then(() => assert.fail('expected outstanding receipt'))]);
   assert.equal(s.commits, 1);
   assert.equal(s.status, 'uncertain');
   s.client.endpoint = null;
   const laterId = '00000000-0000-4000-8000-000000000002';
   const later = await s.step(laterId, true, 'pending', () => assert.fail('unexpected mapping'));
   assert.equal(later, 'pending');
   assert.deepEqual(s.events, ['claim', 'transport']);
  } finally {
   releaseReply.resolve();
  }

  assert.equal(await earlier, receiptLost ? 'reconcile' : 'sent');
  assert.equal(s.status, receiptLost ? 'uncertain' : 'sent');
  assert.deepEqual(s.events, receiptLost ? ['claim', 'transport'] : ['claim', 'transport', 'finish']);
  assert.equal(s.commits, 1);
  assert.equal(s.transports, 1);
 });
}
