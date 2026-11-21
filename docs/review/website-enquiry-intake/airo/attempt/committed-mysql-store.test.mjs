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
const call=s=>s.step(id,true,'pending',()=>payload);
test('claim and finalization each commit on a separately owned connection before returning',async()=>{
 const s=fixture();assert.equal(await call(s),'sent');assert.equal(s.durable,'sent');assert.equal(s.opens,2);
 assert.deepEqual(s.events,[[1,'open'],[1,'begin'],[1,'execute'],[1,'commit'],[1,'destroy'],[0,'transport'],[2,'open'],[2,'begin'],[2,'execute'],[2,'commit'],[2,'destroy']]);
});
test('unacknowledged in-flight commit cannot authorize transport',async()=>{
 let resolve;const waitCommit=new Promise(r=>resolve=r);const s=fixture({waitCommit});const result=call(s);
 await new Promise(r=>setImmediate(r));assert.equal(s.transports,0);assert.equal(s.durable,'pending');resolve();assert.equal(await result,'sent');
});
test('open, begin, statement and pre-commit failures never transport and never retry',async()=>{
 for(const flag of ['openThrow','beginThrow','executeThrow','commitBeforeThrow']){const s=fixture({[flag]:true});assert.equal(await call(s),'reconcile');assert.equal(s.opens,1);assert.equal(s.transports,0);assert.equal(s.durable,'pending');assert.equal(s.events.filter(e=>e[1]==='destroy').length,flag==='openThrow'?0:1);}
});
test('lost commit acknowledgement holds durable uncertain with no transport',async()=>{
 const s=fixture({commitAfterThrow:true});assert.equal(await call(s),'reconcile');assert.equal(s.durable,'uncertain');assert.equal(s.transports,0);assert.equal(s.opens,1);
});
test('failed finalization commit preserves uncertain after one correlated receipt',async()=>{
 const s=fixture({finishThrow:true});assert.equal(await call(s),'reconcile');assert.equal(s.durable,'uncertain');assert.equal(s.transports,1);assert.equal(s.opens,2);
});
test('cleanup failure after committed claim conservatively prevents transport',async()=>{
 const s=fixture({destroyThrow:true});assert.equal(await call(s),'reconcile');assert.equal(s.durable,'uncertain');assert.equal(s.transports,0);
});
test('same connection cannot be reused or concurrently destroyed by a rejected borrower',async()=>{
 let release;const wait=new Promise(r=>release=r);let destroys=0,commits=0;
 const c={beginTransaction:async()=>{},execute:async()=>[{affectedRows:1},[]],commit:async()=>{commits++;await wait;},destroy:()=>{destroys++;}};
 const store=createCommittedMysqlAttemptStore(async()=>c);const first=store.claim(id);
 await new Promise(r=>setImmediate(r));await assert.rejects(store.claim(id),/^Error: CRM persistence unavailable$/);assert.equal(destroys,0);
 release();assert.equal(await first,true);assert.equal(commits,1);assert.equal(destroys,1);
 await assert.rejects(store.claim(id),/^Error: CRM persistence unavailable$/);assert.equal(destroys,1);
});
test('zero or malformed affected-row result never becomes a successful claim after commit',async()=>{
 for(const result of [null,[],[{affectedRows:0},[]],[{affectedRows:2},[]]]){let commits=0;const store=createCommittedMysqlAttemptStore(async()=>({beginTransaction:async()=>{},execute:async()=>result,commit:async()=>{commits++;},destroy(){}}));assert.equal(await store.claim(id),false);assert.equal(commits,1);}
});
test('database error details are replaced before crossing the adapter boundary',async()=>{
 const s=fixture({executeThrow:true});await assert.rejects(s.store.claim(id),/^Error: CRM persistence indeterminate$/);
});
