import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHmac} from 'node:crypto';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createMetaIngressHandlers}=await import('./metaIngress.server.ts');
const {createIntakeReceiver}=await import('./intakeReceiver.server.ts');
const {readPreviewDatabaseConfiguration,createPreviewAcknowledgementDatabase}=await import('./previewDatabase.server.ts');
hook.deregister();

const clock=Date.parse('2026-11-01T21:00:00Z');
const ref='vredwhyphrhsudggrsen';
const env={FEH_INTAKE_RUNTIME:'supabase-edge',SUPABASE_URL:`https://${ref}.supabase.co`,NEXT_PUBLIC_SUPABASE_URL:`https://${ref}.supabase.co`,
 FEH_INTAKE_RECEIVER_ENABLED:'true',FEH_INTAKE_RECEIVER_EXPIRES_AT:'2026-11-06T23:59:59Z',FEH_META_FORM_TEST_ENABLED:'true',
 FEH_META_FORM_TEST_EXPIRES_AT:'2026-11-01T21:15:00Z',FEH_META_TEST_LEAD_ID:'987654321',FEH_META_PAGE_ID:'100693684801233',FEH_META_FORM_ID:'1788543365401126',
 FEH_META_APP_SECRET:'a'.repeat(32),FEH_META_PAGE_TOKEN:'synthetic-page-token-0123456789',FEH_META_VERIFY_TOKEN:'synthetic-verification-token-0123456789',
 FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001',FEH_ACK_DATABASE_ENABLED:'true',
 FEH_ACK_INGESTOR_DATABASE_URL:`postgresql://feh_ack_preview_ingestor.${ref}:synthetic-not-live-password-0123456789@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`};
const url='https://receiver.invalid/functions/v1/feh-staging-lead-intake/meta-form';
const value=()=>({page_id:env.FEH_META_PAGE_ID,form_id:env.FEH_META_FORM_ID,leadgen_id:env.FEH_META_TEST_LEAD_ID,created_time:Math.floor(clock/1000)});
const payload=()=>({object:'page',entry:[{id:env.FEH_META_PAGE_ID,changes:[{field:'leadgen',value:value()}]}]});
const details=()=>({id:env.FEH_META_TEST_LEAD_ID,form_id:env.FEH_META_FORM_ID,created_time:new Date(clock).toISOString(),field_data:[
 {name:'phone_number',values:[env.FEH_ACK_PREVIEW_ALLOWED_PHONE]},{name:'company_name',values:['Synthetic FEH form test']},
 {name:'full_name',values:['Synthetic Test']},{name:'email',values:['test@example.invalid']}]});
const request=(p=payload(),path=url)=>{const body=JSON.stringify(p);return new Request(path,{method:'POST',body,headers:{'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256',env.FEH_META_APP_SECRET).update(body).digest('hex')}});};
function harness(){
 let time=clock;const calls={graph:0,connections:0,rpc:[],closed:0};const receipts=new Set();
 const dependencies={now:()=>time,fetch:async()=>{calls.graph++;return Response.json(details());},database:()=>{
  calls.connections++;return {async rpc(name,args){calls.rpc.push([name,args]);assert.equal(name,'ingest_meta_lead_with_acknowledgement');
   const duplicate=receipts.has(args.p_external_lead_id);receipts.add(args.p_external_lead_id);
   return {data:[{outcome:duplicate?'duplicate':'accepted',lead_id:17,acknowledgement_reserved:!duplicate}],error:null};},async close(){calls.closed++;}};
 }};
 return {calls,dependencies,receipts,setTime:t=>{time=t;}};
}
test('Edge form path composes signed retrieval and the existing atomic queue RPC; replay retains identity',async()=>{
 const h=harness();const metaForm=createMetaIngressHandlers(env,h.dependencies);
 const receiver=createIntakeReceiver(env,{metaForm,now:h.dependencies.now});
 for(let i=0;i<2;i++)assert.equal((await receiver(request())).status,200);
 assert.equal(h.receipts.size,1);assert.equal(h.calls.graph,2);assert.equal(h.calls.closed,2);
 assert.deepEqual(h.calls.rpc[0],h.calls.rpc[1]);assert.equal(h.calls.rpc[0][1].p_external_lead_id,env.FEH_META_TEST_LEAD_ID);
 // This harness verifies HTTP/RPC composition. Real atomic SQL is separately
 // exercised by leadAcknowledgement.database.test.mjs, never claimed here.
});
for(const [name,change] of Object.entries({unapprovedLead:p=>p.entry[0].changes[0].value.leadgen_id='987654322',
 mixedBatch:p=>p.entry[0].changes.push({field:'leadgen',value:{...value(),leadgen_id:'987654322'}}),
 otherPage:p=>p.entry[0].id='999999',otherForm:p=>p.entry[0].changes[0].value.form_id='999999'}))test(`${name} is rejected BEFORE Graph can read any customer details`,async()=>{
 const h=harness();const p=payload();change(p);
 assert.equal((await createMetaIngressHandlers(env,h.dependencies).POST(request(p))).status,400);
 assert.equal(h.calls.graph,0);assert.equal(h.calls.connections,0);
});
for(const [name,changes] of Object.entries({disabled:{FEH_META_FORM_TEST_ENABLED:undefined},noLead:{FEH_META_TEST_LEAD_ID:undefined},invalidLead:{FEH_META_TEST_LEAD_ID:'../me'},
 missingExpiry:{FEH_META_FORM_TEST_EXPIRES_AT:undefined},excessExpiry:{FEH_META_FORM_TEST_EXPIRES_AT:'2027-01-01T00:00:00Z'},expired:{FEH_META_FORM_TEST_EXPIRES_AT:'2026-11-01T21:00:00Z'},
 production:{SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},productionLabel:{VERCEL_ENV:'production'},mixedRuntime:{VERCEL_ENV:'preview'},
 wrongPublicProject:{NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},senderLoop:{FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447427851020'},
 noToken:{FEH_META_PAGE_TOKEN:undefined},receiverDisabled:{FEH_INTAKE_RECEIVER_ENABLED:'false'}}))test(`${name} stays disabled without network or persistence`,async()=>{
 const h=harness();const handler=createMetaIngressHandlers({...env,...changes},h.dependencies);
 assert.equal((await handler.POST(request())).status,404);assert.equal((await handler.GET(new Request(url))).status,404);
 assert.equal(h.calls.graph,0);assert.equal(h.calls.connections,0);
});
test('expiry is checked per request and again after Graph, before persistence',async()=>{
 const h=harness();const handler=createMetaIngressHandlers(env,h.dependencies);
 h.setTime(Date.parse(env.FEH_META_FORM_TEST_EXPIRES_AT));assert.equal((await handler.POST(request())).status,404);assert.equal(h.calls.graph,0);
 const g=harness();const fetch=g.dependencies.fetch;
 g.dependencies.fetch=async(...args)=>{const result=await fetch(...args);g.setTime(Date.parse(env.FEH_META_FORM_TEST_EXPIRES_AT));return result;};
 assert.equal((await createMetaIngressHandlers(env,g.dependencies).POST(request())).status,503);assert.equal(g.calls.connections,0);
});
test('Edge verification does not depend on Node global Buffer',async()=>{
 const h=harness();const req=request();const saved=globalThis.Buffer;
 try{globalThis.Buffer=undefined;assert.equal((await createMetaIngressHandlers(env,h.dependencies).POST(req)).status,200);}
 finally{globalThis.Buffer=saved;}
});
test('real-form route is closed by default; no worker or extended paths are exposed',async()=>{
 const h=harness();const receiver=createIntakeReceiver({...env,FEH_META_FORM_TEST_ENABLED:undefined},{now:h.dependencies.now});
 assert.equal((await receiver(request())).status,404);
 for(const path of [url+'/extra',url.replace('/meta-form','/run'),url.replace('/meta-form','/worker')])assert.equal((await receiver(request(payload(),path))).status,404);
 for(const method of ['PUT','DELETE','OPTIONS'])assert.equal((await receiver(new Request(url,{method}))).status,405);
});
test('Edge runtime admits only the restricted ingestor identity, never a worker or administrator',async()=>{
 assert.ok(readPreviewDatabaseConfiguration('ingestor',env));
 for(const login of ['postgres','feh_ack_preview_worker','feh_intake_preview_receiver'])assert.equal(readPreviewDatabaseConfiguration('ingestor',{
  ...env,FEH_ACK_INGESTOR_DATABASE_URL:env.FEH_ACK_INGESTOR_DATABASE_URL.replace('feh_ack_preview_ingestor',login)}),null);
 assert.equal(readPreviewDatabaseConfiguration('ingestor',{...env,FEH_META_FORM_TEST_ENABLED:'false'}),null);
 assert.equal(readPreviewDatabaseConfiguration('ingestor',{...env,VERCEL_ENV:'production'}),null);
 assert.equal(readPreviewDatabaseConfiguration('worker',{...env,FEH_ACK_WORKER_DATABASE_URL:env.FEH_ACK_INGESTOR_DATABASE_URL.replace('ingestor','worker')}),null);
 const db=createPreviewAcknowledgementDatabase('ingestor',env,()=>({begin:async()=>assert.fail('no transaction allowed'),end:async()=>{}}));
 for(const name of ['select_lead_acknowledgement_candidate','create_execution_authorization','stop_execution','prepare_execution_dispatch','claim_meta_lead_acknowledgement'])assert.ok((await db.rpc(name,{})).error);
});
