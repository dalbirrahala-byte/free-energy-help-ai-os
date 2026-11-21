import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deliver} from '../source/client.ts';
import {createReceiver} from '../source/receiver.ts';
import {PATH} from '../source/contract.ts';

// No runtime transport, credentials or DB. Run under the seccomp launcher.
globalThis.fetch=async()=>{throw Error('network forbidden');};
const modules={
 '@/server/email.js':'export const sendEmail=(...a)=>globalThis.quoteMocks.email(...a);',
 '@/lib/phone.js':"export const TEL1='SYNTHETIC'; export const TEL1_HREF='tel:synthetic';",
 '@/server/lib/crm-client.js':'export const deliverToCrm=(...a)=>globalThis.quoteMocks.deliver(...a);',
 '@/server/lib/enquiry-store.js':'export const saveEnquiry=(...a)=>globalThis.quoteMocks.save(...a); export const updateDeliveryStatus=(...a)=>globalThis.quoteMocks.update(...a); export const enquiryRowToCrmPayload=(...a)=>globalThis.quoteMocks.map(...a);',
};
const hooks=registerHooks({resolve(spec,ctx,next){
 if(Object.hasOwn(modules,spec))return {url:'data:text/javascript,'+encodeURIComponent(modules[spec]),shortCircuit:true};
 if(spec.startsWith('@/'))throw Error('unmocked application import');
 return next(spec,ctx);
}});
const bytes=readFileSync(new URL('./quote-POST.ts',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'25219749b68dd6c3b4efd8d79a70ca9377e6e14a68b23f1e3dcd02f1c4680893');
const {default:handler}=await import('./quote-POST.ts');
hooks.deregister();
const id='00000000-0000-4000-8000-000000000001';
const now=Date.parse('2026-11-18T12:00:00.000Z');
const endpoint='https://crm.example.invalid'+PATH;
const key='synthetic-fixture-only-no-runtime-authority';
const row=()=>({id:1,submissionId:id,submittedAt:'2026-11-18T11:00:00.000Z',businessName:'Synthetic Business',contactName:'Synthetic Person',email:'visitor@example.invalid',phone:null,meterNumbers:null,currentSupplier:null,message:'Synthetic enquiry',smsConsent:null,utmSource:'synthetic',utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null,gclid:null,fbclid:null,sourcePage:'/quote',ownerEmailStatus:'pending',visitorEmailStatus:'pending',crmStatus:'pending'});
function payload(r){const {submissionId,submittedAt,businessName,contactName,email,phone,meterNumbers,currentSupplier,message,smsConsent,sourcePage}=r;return {submissionId,submittedAt,businessName,contactName,email,phone,meterNumbers,currentSupplier,message,smsConsent,sourcePage,attribution:Object.fromEntries(['utmSource','utmMedium','utmCampaign','utmContent','utmTerm','gclid','fbclid'].map(k=>[k,r[k]]))};}
async function run(options={}){
 const saved={...row(),...options.row};const events=[],emails=[],logs=[];let transports=0,saves=0;
 const receive=createReceiver({key,now:()=>now,save:async p=>{saves++;assert.deepEqual(p,payload(saved));return {version:1,submissionId:p.submissionId,outcome:'created',leadId:'1'};}});
 globalThis.quoteMocks={
  save:async input=>{assert.equal(input.submissionId,id);events.push('save');return {ok:true,created:true,row:{...saved}};},
  map:payload,
  email:async e=>{events.push('email:'+e.to);emails.push(e);if(options.emailFailure===e.to)throw Error('synthetic_email_failure');},
  update:async(_id,col,status)=>{events.push(col+':'+status);if(col==='crmStatus'&&options.writeFailure==='throw')throw Error('PRIVATE_WRITE_FAILURE');if(col==='crmStatus'&&options.writeFailure==='false')return {ok:false};saved[col]=status;return {ok:true};},
  deliver:async p=>{events.push('deliver');if(options.deliveryThrow)throw Error('PRIVATE_DELIVERY_FAILURE');return deliver(p,{endpoint:options.absent?null:endpoint,approvedEndpoint:endpoint,key,now:()=>now,transport:async(u,i)=>{transports++;assert.equal(i.redirect,'error');if(options.response)return options.response();return receive(new Request(u,i));}});},
 };
 const res={statusCode:null,body:null,status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
 const old=Object.fromEntries(['log','warn','error'].map(k=>[k,console[k]]));
 process.env.NOTIFICATION_RECIPIENT_EMAIL='owner@example.invalid';
 for(const k of Object.keys(old))console[k]=(...a)=>logs.push(a);
 try{await handler({body:{submissionId:id,businessName:'Synthetic Business',contactName:'Synthetic Person',email:'visitor@example.invalid'}},res);}finally{Object.assign(console,old);delete process.env.NOTIFICATION_RECIPIENT_EMAIL;delete globalThis.quoteMocks;}
 return {saved,events,emails,logs,res,transports,saves};
}
function successfulEmailJourney(r){assert.equal(r.res.statusCode,201);assert.deepEqual(r.emails.map(e=>e.to),['owner@example.invalid','visitor@example.invalid']);assert.deepEqual(r.events.slice(0,6),['save','email:owner@example.invalid','ownerEmailStatus:sent','email:visitor@example.invalid','visitorEmailStatus:sent','deliver']);assert.equal(r.res.body.submissionId,id);}
test('actual handler composes with signed candidate and correlated mock receipt after both emails',async()=>{
 const r=await run();successfulEmailJourney(r);assert.equal(r.transports,1);assert.equal(r.saves,1);assert.equal(r.saved.crmStatus,'sent');assert(r.logs.some(a=>a[0]==='quote.submit.crm_ok'));
});
test('absent endpoint preserves identical email contents and 201 with no transport',async()=>{
 const a=await run(),b=await run({absent:true});successfulEmailJourney(b);assert.deepEqual(b.emails,a.emails);assert.equal(b.transports,0);assert.equal(b.saved.crmStatus,'pending');
});
test('delivery throws AND uncertain status write throws: 201, no repeat, redacted reconciliation',async()=>{
 const r=await run({deliveryThrow:true,writeFailure:'throw'});successfulEmailJourney(r);assert.equal(r.events.filter(e=>e==='deliver').length,1);assert.equal(r.transports,0);assert.equal(r.saved.crmStatus,'pending');assert.equal(r.events.filter(e=>e==='crmStatus:uncertain').length,1);assert(r.logs.some(a=>a[0]==='quote.submit.crm_reconciliation_required'));assert(!JSON.stringify(r.logs).includes('PRIVATE_'));
});
test('receiver receipt followed by failed status write stays pending: must reconcile, not replay',async()=>{
 const r=await run({writeFailure:'false'});successfulEmailJourney(r);assert.equal(r.transports,1);assert.equal(r.saves,1);assert.equal(r.saved.crmStatus,'pending');assert(!r.logs.some(a=>a[0]==='quote.submit.crm_ok'));assert(r.logs.some(a=>a[0]==='quote.submit.crm_reconciliation_required'));
});
test('uncommitted 202 remains uncertain while email contents and 201 are preserved',async()=>{
 const baseline=await run({absent:true});const r=await run({response:()=>new Response('{}',{status:202})});successfulEmailJourney(r);assert.deepEqual(r.emails,baseline.emails);assert.equal(r.saved.crmStatus,'uncertain');assert.equal(r.transports,1);assert.equal(r.saves,0);
});
test('already sent emails and uncertain CRM are skipped with no transport',async()=>{
 const r=await run({row:{ownerEmailStatus:'sent',visitorEmailStatus:'sent',crmStatus:'uncertain'}});assert.equal(r.res.statusCode,201);assert.equal(r.emails.length,0);assert.equal(r.transports,0);assert.deepEqual(r.events,['save']);
});
test('owner email failure retains existing fatal behavior and blocks visitor and CRM',async()=>{
 const r=await run({emailFailure:'owner@example.invalid'});assert.equal(r.res.statusCode,500);assert.equal(r.emails.length,1);assert.equal(r.transports,0);assert.equal(r.saved.ownerEmailStatus,'failed');
});
test('visitor email failure retains existing nonfatal behavior with candidate CRM',async()=>{
 const r=await run({emailFailure:'visitor@example.invalid'});assert.equal(r.res.statusCode,201);assert.equal(r.saved.visitorEmailStatus,'failed');assert.equal(r.saved.crmStatus,'sent');assert.equal(r.transports,1);
});
