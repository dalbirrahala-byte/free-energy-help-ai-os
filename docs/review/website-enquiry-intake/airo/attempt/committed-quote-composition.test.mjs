import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommittedMysqlAttemptStore} from './committed-mysql-store.ts';
import {createQuoteCrmStep} from './handoff.ts';
import {CLAIM_SQL, FINISH_SQL} from './mysql-attempt-store.ts';
import {PATH} from '../../source/contract.ts';

const id='00000000-0000-4000-8000-000000000001';
const payload={submissionId:id,submittedAt:'2026-11-18T12:00:00.000Z',businessName:'Synthetic',contactName:'Synthetic',email:'test@example.invalid',phone:null,meterNumbers:null,currentSupplier:null,message:null,smsConsent:null,sourcePage:null,attribution:{utmSource:null,utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null,gclid:null,fbclid:null}};
const endpoint='https://crm.example.invalid'+PATH;
function fixture(options={}) {
 const events=[];let durable='pending',opens=0,transports=0;
 const open=async()=>{
  const n=++opens;events.push([n,'open']);
  if(options.openThrow)throw Error('PRIVATE_OPEN');
  let pending=durable;
  return {
   async beginTransaction(){events.push([n,'begin']);if(options.beginThrow)throw Error('PRIVATE_BEGIN');},
   async execute(sql,args){events.push([n,'execute']);if(options.executeThrow)throw Error('PRIVATE_EXECUTE');
    if(sql===CLAIM_SQL){assert.deepEqual(args,[id]);const count=durable==='pending'?1:0;if(count)pending='uncertain';return [{affectedRows:count},[]];}
    assert.equal(sql,FINISH_SQL);assert.equal(args[1],id);const count=durable==='uncertain'?1:0;if(count)pending=args[0];return [{affectedRows:count},[]];
   },
   async commit(){events.push([n,'commit']);if(options.waitCommit&&n===1)await options.waitCommit;
    if(options.commitBeforeThrow||options.finishThrow&&n===2)throw Error('PRIVATE_COMMIT');
    durable=pending;if(options.commitAfterThrow)throw Error('PRIVATE_ACK');
   },
   destroy(){events.push([n,'destroy']);if(options.destroyThrow)throw Error('PRIVATE_DESTROY');},
  };
 };
 const store=createCommittedMysqlAttemptStore(open);
 const step=createQuoteCrmStep({store,client:{endpoint,approvedEndpoint:endpoint,key:'synthetic-only-test-signature-key-000000',now:()=>Date.parse(payload.submittedAt),transport:async()=>{
  events.push([0,'transport']);transports++;assert.equal(durable,'uncertain');return Response.json({version:1,submissionId:id,outcome:'created',leadId:'1'},{status:201});
 }}});
 return {store,step,events,get durable(){return durable;},get opens(){return opens;},get transports(){return transports;}};
}

const {registerHooks}=await import('node:module');
const modules={
 '@/server/email.js':'export const sendEmail=(...a)=>globalThis.composed.email(...a);',
 '@/lib/phone.js':"export const TEL1='SYNTHETIC';export const TEL1_HREF='tel:synthetic';",
 '@/server/lib/quote-crm-step.js':'export const finishQuoteCrm=(...a)=>globalThis.composed.step(...a);',
 '@/server/lib/enquiry-store.js':'export const saveEnquiry=async()=>globalThis.composed.saved;export const updateDeliveryStatus=async()=>({ok:true});export const enquiryRowToCrmPayload=()=>globalThis.composed.payload;',
};
const hooks=registerHooks({resolve(spec,ctx,next){if(Object.hasOwn(modules,spec))return {url:'data:text/javascript,'+encodeURIComponent(modules[spec]),shortCircuit:true};if(spec.startsWith('@/'))throw Error('unmocked import');return next(spec,ctx);}});
const handler=(await import('./quote-POST.candidate.ts?owned-composition')).default;hooks.deregister();
globalThis.fetch=async()=>{throw Error('network forbidden');};
async function run(options={}){
 const s=fixture(options),emails=[],logs=[];
 globalThis.composed={payload,saved:{ok:true,created:true,row:{...payload,...payload.attribution,ownerEmailStatus:'pending',visitorEmailStatus:'pending',crmStatus:'pending'}},step:s.step,email:async e=>{s.events.push([0,'email']);emails.push(e);}};
 const res={status(n){this.code=n;return this;},json(b){this.body=b;return this;}};
 const old={log:console.log,warn:console.warn,error:console.error};
 process.env.NOTIFICATION_RECIPIENT_EMAIL='owner@example.invalid';for(const k of Object.keys(old))console[k]=(...a)=>logs.push(a);
 try{await handler({body:payload},res);}finally{Object.assign(console,old);delete process.env.NOTIFICATION_RECIPIENT_EMAIL;delete globalThis.composed;}
 return {s,emails,logs,res};
}
test('actual candidate handler completes emails before owned claim and correlated mock receipt',async()=>{
 const r=await run();assert.equal(r.res.code,201);assert.equal(r.res.body.submissionId,id);
 assert.deepEqual(r.emails.map(e=>e.to),['owner@example.invalid','test@example.invalid']);
 assert.deepEqual(r.s.events.slice(0,3),[[0,'email'],[0,'email'],[1,'open']]);
 assert.equal(r.s.durable,'sent');assert.equal(r.s.transports,1);assert.equal(r.s.opens,2);
});
test('actual handler preserves email contents and 201 when claim COMMIT acknowledgement is lost',async()=>{
 const base=await run();const r=await run({commitAfterThrow:true});
 assert.deepEqual(r.emails,base.emails);assert.deepEqual(r.res.body,base.res.body);assert.equal(r.res.code,201);
 assert.equal(r.s.durable,'uncertain');assert.equal(r.s.transports,0);assert.equal(r.s.opens,1);assert(!JSON.stringify(r.logs).includes('PRIVATE_'));
});
test('actual handler preserves email contents and 201 after receipt then failed final COMMIT',async()=>{
 const base=await run();const r=await run({finishThrow:true});
 assert.deepEqual(r.emails,base.emails);assert.deepEqual(r.res.body,base.res.body);assert.equal(r.res.code,201);
 assert.equal(r.s.durable,'uncertain');assert.equal(r.s.transports,1);assert.equal(r.s.opens,2);assert(!JSON.stringify(r.logs).includes('PRIVATE_'));
});
