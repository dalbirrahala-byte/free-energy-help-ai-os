import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createGoogleReceiver}=await import('./googleReceiver.server.ts');hook.deregister();
// Isolated real PostgreSQL engine, no remote credentials, fabricated permission,
// actor grant, RELEASE, authority or provider transport. One connection only:
// replay is proved here; multi-session racing requires separate acceptance.
const db=new PGlite();
before(async()=>{
 await db.exec(`create schema auth;create table auth.users(id uuid primary key);
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create role anon;create role authenticated;create role service_role bypassrls;
 grant usage on schema public,auth to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
 alter default privileges in schema public grant all on functions to anon,authenticated,service_role;`);
 const migrations=new URL('../../../../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
});
after(async()=>db.close());
const environment={FEH_INTAKE_RUNTIME:'supabase-google',SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',
 FEH_GOOGLE_RECEIVER_ENABLED:'true',FEH_GOOGLE_RECEIVER_SCOPE:'owner-test',FEH_GOOGLE_INGRESS_ENABLED:'true',FEH_ACK_DATABASE_ENABLED:'true',
 FEH_GOOGLE_RECEIVER_TEST_STARTED_AT:new Date(Date.now()-1000).toISOString(),FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT:new Date(Date.now()+14*60*1000).toISOString(),
 FEH_GOOGLE_FORM_ID:'402325113451',FEH_GOOGLE_CAMPAIGN_ID:'24096131756',FEH_GOOGLE_WEBHOOK_KEY:'synthetic-google-key-0123456789012345',FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001'};
const calls=[];
const dependencies={
 ingestor:()=>({async rpc(name,a){
  assert.equal(name,'ingest_google_lead_with_acknowledgement');calls.push(name);
  const rows=await db.transaction(async tx=>{await tx.exec('set local role external_lead_ingestor');
   return (await tx.query('select * from public.ingest_google_lead_with_acknowledgement($1,$2,$3,$4,$5,$6,$7,$8)',
    [a.p_form_id,a.p_campaign_id,a.p_external_lead_id,a.p_provider_created_at,a.p_company_name,a.p_contact_name,a.p_telephone,a.p_email])).rows;});
  return {data:rows,error:null};},async close(){}}),
 receiver:()=>({async rpc(name,a){
  assert.equal(name,'ingest_external_lead');calls.push(name);
  const rows=await db.transaction(async tx=>{await tx.exec('set local role feh_intake_preview_receiver');
   return (await tx.query('select * from public.ingest_external_lead($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [a.p_provider,a.p_external_lead_id,a.p_provider_created_at,a.p_consent_status,a.p_company_name,a.p_contact_name,a.p_telephone,a.p_email,a.p_utm_campaign])).rows;});
  return {data:rows,error:null};},async close(){}}),
};
const handler=createGoogleReceiver(environment,dependencies);
const payload=id=>({lead_id:id,google_key:environment.FEH_GOOGLE_WEBHOOK_KEY,form_id:402325113451,campaign_id:24096131756,
 lead_submit_time:new Date().toISOString(),user_column_data:[{column_id:'PHONE_NUMBER',string_value:'+447700900001'},
 {column_id:'FULL_NAME',string_value:'Synthetic Test'},{column_id:'EMAIL',string_value:'test@example.invalid'}]});
const send=p=>handler(new Request('https://staging.invalid/functions/v1/feh-google-lead-intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)}));
async function closed(){
 const counts=(await db.query(`select
 (select count(*)::int from public.execution_authorizations) authorizations,
 (select count(*)::int from public.execution_dispatch_attempts) attempts,
 (select count(*)::int from public.execution_authorisers) grants,
 (select count(*)::int from public.execution_provider_adapters where status='approved') adapters`)).rows[0];
 assert.deepEqual(counts,{authorizations:0,attempts:0,grants:0,adapters:0});
}
test('ordinary Google HTTP payload and two replays persist exactly one lead/reservation and zero authority/attempts',async()=>{
 const p=payload('google_stable_replay_001');
 for(let i=0;i<3;i++)assert.equal((await send(p)).status,200);
 const row=(await db.query(`select l.id,l.consent_status,l.consent_given,l.lead_owner,l.follow_up_date,l.follow_up_required,l.next_action,
 q.status,q.execution_authorization_id,q.claimed_at,q.form_id from leads l join lead_acknowledgements q on q.lead_id=l.id where l.external_lead_id=$1`,[p.lead_id])).rows;
 assert.equal(row.length,1);assert.deepEqual({...row[0],id:undefined},{id:undefined,consent_status:'unknown',consent_given:false,lead_owner:null,follow_up_date:null,
 follow_up_required:true,next_action:'Review enquiry, verify contact permission and assign follow-up',status:'awaiting_authority',execution_authorization_id:null,claimed_at:null,form_id:'402325113451'});
 const audit=(await db.query("select count(*)::int n from audit_log where action='external_lead_duplicate' and entity_type='lead' and entity_id=$1",[String(row[0].id)])).rows[0];
 assert.equal(audit.n,2);await closed();
});
test('missing Google submission time retains review-only enquiry; later replay cannot backfill SMS authority',async()=>{
 const p=payload('google_stable_no_time_001');delete p.lead_submit_time;
 assert.equal((await send(p)).status,200);assert.equal((await send(p)).status,200);
 p.lead_submit_time=new Date().toISOString();assert.equal((await send(p)).status,200);
 const rows=(await db.query(`select l.provider_created_at,l.consent_status,count(q.*)::int reservations from leads l
 left join lead_acknowledgements q on q.lead_id=l.id where l.external_lead_id=$1 group by l.id`,[p.lead_id])).rows;
 assert.deepEqual(rows,[{provider_created_at:null,consent_status:'unknown',reservations:0}]);await closed();
});
test('official Google demonstration and replay remain intake-only',async()=>{
 const p=payload('google_stable_dashboard_001');p.is_test=true;p.campaign_id=123456;delete p.lead_submit_time;
 p.user_column_data=[{column_id:'PHONE_NUMBER',string_value:'+16505550123'},{column_id:'FULL_NAME',string_value:'FirstName LastName'},{column_id:'EMAIL',string_value:'test@example.com'}];
 assert.equal((await send(p)).status,200);assert.equal((await send(p)).status,200);
 const rows=(await db.query(`select l.consent_status,count(q.*)::int reservations from leads l left join lead_acknowledgements q on q.lead_id=l.id
 where l.external_lead_id=$1 group by l.id`,[p.lead_id])).rows;
 assert.deepEqual(rows,[{consent_status:'unknown',reservations:0}]);await closed();
});
test('wrong Google key and other telephone cannot leave any database evidence',async()=>{
 const before=calls.length;const p=payload('google_stable_rejected_001');p.google_key='incorrect';assert.equal((await send(p)).status,403);
 p.google_key=environment.FEH_GOOGLE_WEBHOOK_KEY;p.user_column_data[0].string_value='+447700900009';assert.equal((await send(p)).status,400);
 assert.equal(calls.length,before);assert.equal((await db.query('select count(*)::int n from leads where external_lead_id=$1',[p.lead_id])).rows[0].n,0);await closed();
});
