import assert from 'node:assert/strict';
import {before, after, beforeEach, afterEach, test} from 'node:test';
import {readFile, readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {runAutomaticAcknowledgementOnce} from '../execution-dispatch/runAutomaticAcknowledgementOnce.ts';
import {FEH_ACKNOWLEDGEMENT_V2_COPY} from '../execution-dispatch/telnyxAcknowledgementAdapter.ts';

// Every actor/phone/permission/grant is synthetic in a local WASM PostgreSQL.
// No hosted account, credentials, transport or customer is used. One connection
// proves durable restart semantics; it does NOT prove independent-session races.
const db = new PGlite();
const actor = '00000000-0000-4000-8000-000000000321';
const phone = '+447700900001';
const notice = 'Synthetic local test: please call me and send one acknowledgement SMS. Reply STOP to opt out.';
const config = {enabled: true, projectRef: 'vredwhyphrhsudggrsen', allowedPhone: phone};
let serial = 910000;
let grant;
before(async () => {
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant all on functions to anon,authenticated,service_role;`);
  const migrations = new URL('../../../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(file,migrations),'utf8'));
  await db.exec(await readFile(new URL('../../../../docs/staging/ACK_AUTOMATIC_AUTHORITY_DRAFT.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users(id) values($1)',[actor]);
  await db.query("insert into user_roles(id,role) values($1,'admin')",[actor]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:actor,aal:'aal2',is_anonymous:false})]);
  const grants=(await db.query(`insert into execution_authorisers(user_id,capability,granted_by)
    values($1,'execution_authoriser',$1),($1,'execution_controller',$1) returning id,capability`,[actor])).rows;
  grant=grants.find(g=>g.capability==='execution_authoriser').id;
  await db.query("insert into execution_control_events(event_type,actor_id,controller_grant_id) values('RELEASE',$1,$2)",
    [actor,grants.find(g=>g.capability==='execution_controller').id]);
});
beforeEach(async()=>{await db.exec('begin');});
afterEach(async()=>{await db.exec('rollback');});
after(async()=>{await db.close();});

async function fixture(provider='meta', answer='Yes', options={}) {
  const org=(await db.query("insert into organisations(legal_name) values('Synthetic business') returning id")).rows[0].id;
  const contact=(await db.query('insert into contacts(organisation_id,phone) values($1,$2) returning id',[org,phone])).rows[0].id;
  const binding=(await db.query(`insert into feh_ack_authority_private.bindings(project_ref,owner_id,allowed_phone,provider,
    form_id,page_id,campaign_id,question_key,affirmative_answer,negative_answer,notice_version,notice_text,form_review_reference,contact_id)
    values('vredwhyphrhsudggrsen',$1,$2,$3,'654321',$4,'123456','synthetic_sms_permission','Yes','No','synthetic-v1',$5,'LOCAL-FIXTURE-NOT-LIVE',$6) returning id`,
    [actor,phone,provider,provider==='meta'?'123456':null,notice,contact])).rows[0].id;
  let rule=null;
  if(options.approve!==false) rule=(await db.query('select feh_ack_authority_private.approve_rule($1,$2,$3,$4) as id',
    [binding,notice,FEH_ACKNOWLEDGEMENT_V2_COPY,'LOCAL-SYNTHETIC-OWNER-ADOPTION'])).rows[0].id;
  const id=(provider==='meta'?'':'google_')+String(++serial);
  const query=provider==='meta'?
    "select * from ingest_meta_lead_with_acknowledgement('123456','654321',$1,clock_timestamp(),'Synthetic business','Synthetic person',$2,'test@example.invalid','123456')":
    "select * from ingest_google_lead_with_acknowledgement('654321','123456',$1,clock_timestamp(),'Synthetic business','Synthetic person',$2,'test@example.invalid')";
  const lead=(await db.query(query,[id,phone])).rows[0];
  await db.query('update leads set organisation_id=$1 where id=$2',[org,lead.lead_id]);
  const timestamp=(await db.query('select provider_created_at::text as t from leads where id=$1',[lead.lead_id])).rows[0].t;
  const adapter=(await db.query(`insert into execution_provider_adapters(adapter_key,channel,status,approved_by,approved_at)
    values('TELNYX_FEH_CALLBACK_ACK_V2','SMS','approved',$1,clock_timestamp()) on conflict(channel,adapter_key) do update set status='approved' returning id`,[actor])).rows[0].id;
  const f={binding,rule,leadId:lead.lead_id,org,contact,timestamp,id,adapter};
  if(options.record!==false) assert.equal(await record(f,answer),'recorded');
  return f;
}
async function scoped(role,query,args=[]) {
  await db.exec('savepoint role_rpc');
  await db.exec(`set local role ${role}`);
  try {
    const result=await db.query(query,args);
    await db.exec('reset role; release savepoint role_rpc');
    return result;
  } catch(error) {
    await db.exec('rollback to savepoint role_rpc; reset role; release savepoint role_rpc');
    throw error;
  }
}
async function record(f,answer='Yes',key='synthetic_sms_permission') {
  return (await scoped('feh_ack_permission_recorder','select feh_ack_authority_private.record_permission($1,$2,$3,$4,$5) as result',
    [f.binding,f.leadId,f.timestamp,key,answer])).rows[0].result;
}
const authority={async rpc(name,args){
  assert.equal(name,'authorize_enquiry');
  const rows=(await scoped('feh_ack_rule_authorizer','select * from feh_ack_authority_private.authorize_enquiry($1,$2)',
    [args.p_lead_id,args.p_allowed_phone])).rows;
  return {data:JSON.parse(JSON.stringify(rows)),error:null};
}};
const rpcKeys={
  claim_meta_lead_acknowledgement:['p_lead_id','p_execution_authorization_id','p_provider_adapter_id'],
  consume_execution_authorization:['p_execution_authorization_id'],
  prepare_execution_dispatch:['p_execution_authorization_id','p_provider_adapter_id'],
  evaluate_execution_precall_readiness:['p_execution_dispatch_attempt_id','p_execution_authorization_id','p_expected_provider_adapter_id','p_expected_adapter_key'],
  complete_execution_dispatch_success:['p_execution_dispatch_attempt_id','p_provider_reference'],
  complete_execution_dispatch_failure:['p_execution_dispatch_attempt_id','p_failure_code'],
  complete_execution_dispatch_indeterminate:['p_execution_dispatch_attempt_id','p_failure_code'],
};
const worker={async rpc(name,args){
  const keys=rpcKeys[name]; assert.ok(keys,'only existing reviewed dispatch RPCs');
  const rows=(await scoped('execution_dispatch_worker',`select * from public.${name}(${keys.map((_,i)=>`$${i+1}`).join(',')})`,keys.map(k=>args[k]??null))).rows;
  const data=['claim_meta_lead_acknowledgement','prepare_execution_dispatch'].includes(name)?rows:rows[0]?.[name];
  return {data:JSON.parse(JSON.stringify(data)),error:null};
}};
function mockTransport(sends,outcome='accepted') {return {async createMessage(request){
  sends.push(request);
  if(outcome==='timeout') throw new Error('synthetic private network error');
  if(outcome==='rejected') return {outcome:'response',httpStatus:422,body:{errors:[{code:'10015',title:'Invalid address'}]}};
  return {outcome:'response',httpStatus:200,body:{data:{id:'00000000-0000-4000-8000-000000000999',record_type:'message',direction:'outbound',type:'SMS',
    from:{phone_number:request.from},to:[{phone_number:request.to,status:'queued'}],errors:[]}}};
}};}
const run=(f,sends=[],outcome='accepted')=>runAutomaticAcknowledgementOnce(authority,worker,f.leadId,config,mockTransport(sends,outcome));
const authorize=f=>authority.rpc('authorize_enquiry',{p_lead_id:f.leadId,p_allowed_phone:phone});
async function counts(){return (await db.query(`select (select count(*)::int from execution_intents) intents,
  (select count(*)::int from execution_authorizations) authorizations,
  (select count(*)::int from execution_dispatch_attempts) attempts,
  (select count(*)::int from feh_ack_authority_private.authorizations) bridges`)).rows[0];}

for(const provider of ['meta','google_ads']) {
  test(`${provider}: recorded permission -> owner rule -> automatic authority -> existing worker, one v2 mock SMS`,async()=>{
    const f=await fixture(provider); const sends=[];
    // The autonomous path has no owner JWT; attribution comes from saved rule.
    await db.exec("select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true)");
    assert.equal((await run(f,sends)).status,'succeeded');
    assert.equal(sends.length,1); assert.equal(sends[0].text,FEH_ACKNOWLEDGEMENT_V2_COPY);
    assert.deepEqual(await counts(),{intents:1,authorizations:1,attempts:1,bridges:1});
    const row=(await db.query(`select i.created_by_actor_type,i.created_by_actor_id,a.actor_id,a.evidence->>'approval_mode' mode,
      l.consent_status,l.consent_given from feh_ack_authority_private.authorizations x join execution_intents i on i.id=x.intent_id
      join execution_authorizations a on a.id=x.authorization_id join leads l on l.id=x.lead_id`)).rows[0];
    assert.deepEqual(row,{created_by_actor_type:'system',created_by_actor_id:null,actor_id:actor,mode:'owner_delegated_rule',consent_status:'unknown',consent_given:false});
  });
  for(const answer of ['No','not sure','', 'true','YES']) test(`${provider}: ${JSON.stringify(answer)} never creates authority or dispatch`,async()=>{
    const f=await fixture(provider,answer); const sends=[];
    assert.equal((await run(f,sends)).status,'blocked'); assert.equal(sends.length,0);
    assert.deepEqual(await counts(),{intents:0,authorizations:0,attempts:0,bridges:0});
  });
}
test('missing permission or owner adoption holds; old fixture review is never consulted',async()=>{
  for(const options of [{record:false},{approve:false}]) {
    const f=await fixture('meta','Yes',options);
    assert.equal((await run(f)).status,'blocked');
  }
  assert.deepEqual(await counts(),{intents:0,authorizations:0,attempts:0,bridges:0});
});
test('replay and reconstructed coordinator after successful dispatch never send twice',async()=>{
  const f=await fixture(); const sends=[];
  assert.equal(await record(f),'duplicate');
  assert.equal((await run(f,sends)).status,'succeeded');
  await runAutomaticAcknowledgementOnce({...authority},{...worker},f.leadId,{...config},mockTransport(sends));
  assert.equal(sends.length,1); assert.deepEqual(await counts(),{intents:1,authorizations:1,attempts:1,bridges:1});
});
test('restart after committed authority but before claim resumes the same authorization',async()=>{
  const f=await fixture(); const original=(await authorize(f)).data[0];
  const repeated=(await authorize(f)).data[0];
  assert.equal(original.status,'authorised'); assert.equal(repeated.status,'existing');
  assert.equal(repeated.authorization_id,original.authorization_id);
  assert.equal((await run(f)).status,'succeeded');
  assert.deepEqual(await counts(),{intents:1,authorizations:1,attempts:1,bridges:1});
});
test('crash after queue claim and before consumption stays held, no blind resume',async()=>{
  const f=await fixture(); const a=(await authorize(f)).data[0];
  assert.equal((await worker.rpc('claim_meta_lead_acknowledgement',{p_lead_id:f.leadId,p_execution_authorization_id:a.authorization_id,p_provider_adapter_id:a.provider_adapter_id})).data[0].claim_status,'claimed');
  const sends=[]; assert.equal((await run(f,sends)).status,'already_claimed'); assert.equal(sends.length,0);
  assert.equal((await counts()).attempts,0);
});
test('timeout is durable indeterminate and cannot rearm the rule',async()=>{
  const f=await fixture(); const sends=[];
  assert.equal((await run(f,sends,'timeout')).status,'indeterminate');
  await run(f,sends); assert.equal(sends.length,1);
  assert.equal((await db.query('select status from execution_dispatch_attempts')).rows[0].status,'indeterminate');
});
test('another enquiry cannot spend the same bounded rule',async()=>{
  const f=await fixture(); assert.equal((await run(f)).status,'succeeded');
  const other=await fixture('meta','Yes',{record:false,approve:false});
  await db.query('update leads set organisation_id=$1 where id=$2',[f.org,other.leadId]);
  assert.equal(await record({...other,binding:f.binding}),'recorded');
  assert.equal((await run(other)).status,'blocked'); assert.equal((await counts()).bridges,1);
});
test('wrong question, source, timestamp or recipient cannot record permission',async()=>{
  const f=await fixture('meta','Yes',{record:false});
  assert.equal(await record(f,'Yes','unreviewed-question'),'rejected');
  assert.equal(await record({...f,timestamp:'2000-01-01T00:00:00Z'}),'rejected');
  await db.query("update leads set telephone='+447700900099' where id=$1",[f.leadId]);
  assert.equal(await record(f),'rejected');
  await db.query('update leads set telephone=$1 where id=$2',[phone,f.leadId]);
  await db.query("update lead_acknowledgements set form_id='987654' where lead_id=$1",[f.leadId]);
  assert.equal(await record(f),'rejected'); assert.equal((await run(f)).status,'blocked');
});
test('conflicting replay holds even an already-authorized enquiry and remains held after a later YES',async()=>{
  const f=await fixture(); assert.equal((await authorize(f)).data[0].status,'authorised');
  assert.equal(await record(f,'No'),'conflict'); assert.equal(await record(f),'conflict');
  const sends=[]; assert.equal((await run(f,sends)).status,'blocked'); assert.equal(sends.length,0);
  assert.equal((await db.query("select count(*)::int n from suppression_records where reason='INTERNAL_QUALITY_BLOCK'")).rows[0].n,3);
});
test('revoked authoriser grant, absent adapter and ambiguous CRM identity all fail closed',async()=>{
  const f=await fixture();
  await db.query("update execution_authorisers set revoked_at=clock_timestamp() where id=$1",[grant]);
  assert.equal((await run(f)).status,'blocked');
  await db.query('update execution_authorisers set revoked_at=null where id=$1',[grant]);
  await db.query("update execution_provider_adapters set status='disabled' where id=$1",[f.adapter]);
  assert.equal((await run(f)).status,'blocked');
  await db.query("update execution_provider_adapters set status='approved' where id=$1",[f.adapter]);
  await db.query('insert into contacts(organisation_id,phone) values($1,$2)',[f.org,phone]);
  assert.equal((await run(f)).status,'blocked');
  assert.equal((await counts()).authorizations,0);
});
test('STOP prevents authority; a later STOP prevents an already-authorized claim',async()=>{
  const f=await fixture();
  await db.query(`insert into execution_control_events(event_type,actor_id,controller_grant_id)
    select 'STOP',$1,id from execution_authorisers where capability='execution_controller'`,[actor]);
  assert.equal((await run(f)).status,'blocked'); assert.equal((await counts()).intents,0);
  await db.query(`insert into execution_control_events(event_type,actor_id,controller_grant_id)
    select 'RELEASE',$1,id from execution_authorisers where capability='execution_controller'`,[actor]);
  assert.equal((await authorize(f)).data[0].status,'authorised');
  await db.query(`insert into execution_control_events(event_type,actor_id,controller_grant_id)
    select 'STOP',$1,id from execution_authorisers where capability='execution_controller'`,[actor]);
  assert.equal((await run(f)).status,'blocked'); assert.equal((await counts()).attempts,0);
});
test('restricted customer STOP database callback blocks queued and future authority; START does not restore',async()=>{
  const f=await fixture(); await authorize(f);
  await db.query(`insert into feh_ack_callback_private.scope(profile_id,allowed_phone,approval_reference)
    values('00000000-0000-4000-8000-000000000456',$1,'LOCAL-SYNTHETIC-CALLBACK')`,[phone]);
  const callback=async(kind,suffix)=>scoped('feh_ack_preview_callback',`select public.record_acknowledgement_callback(
    $1,$2,'00000000-0000-4000-8000-000000000456',clock_timestamp(),'message.received',$3,$4,'+447427851020') as result`,
    [`00000000-0000-4000-8000-000000000${suffix}`,`00000000-0000-4000-8001-000000000${suffix}`,kind,phone]);
  assert.equal((await callback('STOP','501')).rows[0].result,'recorded');
  assert.equal((await run(f)).status,'blocked');
  const next=await fixture('google_ads'); assert.equal((await run(next)).status,'blocked');
  assert.equal((await callback('START','502')).rows[0].result,'recorded');
  assert.equal((await run(next)).status,'blocked'); assert.equal((await counts()).attempts,0);
});
test('owner review requires exact identity, MFA, exact notice and exact v2 text',async()=>{
  const f=await fixture('meta','Yes',{approve:false});
  const approve=(n=notice,m=FEH_ACKNOWLEDGEMENT_V2_COPY)=>db.query('select feh_ack_authority_private.approve_rule($1,$2,$3,$4) id',
    [f.binding,n,m,'LOCAL-ONLY']);
  assert.equal((await approve('wrong notice')).rows[0].id,null);
  assert.equal((await approve(notice,'old message')).rows[0].id,null);
  await db.exec("select set_config('request.jwt.claims','{\"aal\":\"aal1\",\"is_anonymous\":false}',true)");
  assert.equal((await approve()).rows[0].id,null);
  await db.exec("select set_config('request.jwt.claims','{\"aal\":\"aal2\",\"is_anonymous\":true}',true)");
  assert.equal((await approve()).rows[0].id,null);
  await db.exec("select set_config('request.jwt.claims','{\"aal\":\"aal2\",\"is_anonymous\":false}',true)");
  await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000000',true)");
  assert.equal((await approve()).rows[0].id,null);
});
test('owner repeated approval never extends its window',async()=>{
  const f=await fixture();
  const before=(await db.query('select * from feh_ack_authority_private.rules')).rows;
  assert.equal((await db.query('select feh_ack_authority_private.approve_rule($1,$2,$3,$4) id',
    [f.binding,notice,FEH_ACKNOWLEDGEMENT_V2_COPY,'LOCAL-REPEAT'])).rows[0].id,null);
  assert.deepEqual((await db.query('select * from feh_ack_authority_private.rules')).rows,before);
});
test('new roles cannot send, approve, read raw data, inherit capabilities or log in',async()=>{
  for(const role of ['feh_ack_permission_recorder','feh_ack_rule_authorizer']) {
    const attrs=(await db.query('select rolcanlogin,rolinherit,rolsuper,rolbypassrls from pg_roles where rolname=$1',[role])).rows[0];
    assert.deepEqual(attrs,{rolcanlogin:false,rolinherit:false,rolsuper:false,rolbypassrls:false});
    for(const fn of ['public.create_execution_authorization(bigint)','public.consume_execution_authorization(bigint)',
      'public.claim_meta_lead_acknowledgement(bigint,bigint,bigint)', 'feh_ack_authority_private.approve_rule(uuid,text,text,text)'])
      assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') ok",[role,fn])).rows[0].ok,false);
    for(const table of ['public.leads','public.execution_authorizations','feh_ack_authority_private.bindings','feh_ack_authority_private.rules'])
      assert.equal((await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') ok",[role,table])).rows[0].ok,false);
  }
  for(const role of ['anon','authenticated','service_role','external_lead_ingestor','execution_dispatch_worker']) {
    assert.equal((await db.query("select has_schema_privilege($1,'feh_ack_authority_private','USAGE') ok",[role])).rows[0].ok,false);
    assert.equal((await db.query("select has_function_privilege($1,'feh_ack_authority_private.authorize_enquiry(bigint,text)','EXECUTE') ok",[role])).rows[0].ok,false);
  }
});
test('audit failure rolls back the entire generated authority, approval and compliance chain',async()=>{
  const f=await fixture();
  await db.exec("alter table audit_log add constraint synthetic_authority_failure check(action<>'acknowledgement_rule_authorized') not valid; savepoint audit_test");
  await assert.rejects(authorize(f));
  await db.exec('rollback to savepoint audit_test; reset role');
  assert.deepEqual(await counts(),{intents:0,authorizations:0,attempts:0,bridges:0});
  assert.equal((await db.query('select count(*)::int n from execution_intent_approvals')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from compliance_decisions')).rows[0].n,0);
});
test('disabled, production, malformed or wrong runtime scope cannot even call the database',async()=>{
  const never={rpc(){throw new Error('must not call');}}; const sends=[];
  for(const cfg of [{...config,enabled:false},{...config,projectRef:'production-excluded'},
    {...config,allowedPhone:'+447427851020'},{...config,allowedPhone:'not-mobile'}])
    assert.equal((await runAutomaticAcknowledgementOnce(never,never,1,cfg,mockTransport(sends))).status,'blocked');
  assert.equal(sends.length,0);
});

test('expired rule cannot authorize and expired authority is never renewed',async()=>{
  const f=await fixture();
  await db.query("update feh_ack_authority_private.rules set approved_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '50 minutes' where id=$1",[f.rule]);
  assert.equal((await run(f)).status,'blocked'); assert.equal((await counts()).authorizations,0);
  const other=await fixture('google_ads'); const a=(await authorize(other)).data[0];
  await db.query("update execution_authorizations set expires_at=clock_timestamp()-interval '1 second' where id=$1",[a.authorization_id]);
  assert.equal((await run(other)).status,'blocked');
  assert.equal((await authorize(other)).data[0].authorization_id,a.authorization_id);
  assert.equal((await counts()).authorizations,1);
});
test('an old enquiry cannot use an owner approval given after its submission',async()=>{
  const f=await fixture('meta','Yes',{approve:false});
  assert.ok((await db.query('select feh_ack_authority_private.approve_rule($1,$2,$3,$4) id',
    [f.binding,notice,FEH_ACKNOWLEDGEMENT_V2_COPY,'LOCAL-LATER-ADOPTION'])).rows[0].id);
  assert.equal((await run(f)).status,'blocked'); assert.equal((await counts()).authorizations,0);
});
test('lost response after committed authorization is reconciled with the same identity',async()=>{
  const f=await fixture(); const sends=[];
  const lost={async rpc(name,args){await authority.rpc(name,args); throw new Error('synthetic lost database reply');}};
  assert.equal((await runAutomaticAcknowledgementOnce(lost,worker,f.leadId,config,mockTransport(sends))).status,'evaluation_failed');
  assert.equal(sends.length,0); assert.equal((await counts()).authorizations,1);
  assert.equal((await run(f,sends)).status,'succeeded');
  assert.equal(sends.length,1); assert.equal((await counts()).authorizations,1);
});
test('failure to finalize an accepted mock send preserves its prepared attempt and never retries',async()=>{
  const f=await fixture(); const sends=[];
  const interrupted={async rpc(name,args){
    if(name==='complete_execution_dispatch_success') throw new Error('synthetic finalization interruption');
    return worker.rpc(name,args);
  }};
  const result=await runAutomaticAcknowledgementOnce(authority,interrupted,f.leadId,config,mockTransport(sends));
  assert.notEqual(result.status,'succeeded'); assert.equal(sends.length,1);
  await run(f,sends); assert.equal(sends.length,1); assert.equal((await counts()).attempts,1);
});
test('a customer opt-out immediately before checkpoint three blocks the mock provider call',async()=>{
  const f=await fixture(); const sends=[];
  const optout={async rpc(name,args){
    if(name==='evaluate_execution_precall_readiness') await db.query(`insert into suppression_records(telephone,channel,reason,requested_by,scope,starts_at,evidence_reference)
      values($1,'SMS','CONSENT_WITHDRAWN','ORGANISATION','PERMANENT',now(),'LOCAL-CHECKPOINT-OPTOUT')`,[phone]);
    return worker.rpc(name,args);
  }};
  const result=await runAutomaticAcknowledgementOnce(authority,optout,f.leadId,config,mockTransport(sends));
  assert.notEqual(result.status,'succeeded'); assert.equal(sends.length,0); assert.equal((await counts()).attempts,1);
  await run(f,sends); assert.equal(sends.length,0);
});
test('v2 authorization cannot be claimed with the historical v1 adapter',async()=>{
  const f=await fixture(); const a=(await authorize(f)).data[0];
  const old=(await db.query(`insert into execution_provider_adapters(adapter_key,channel,status,approved_by,approved_at)
    values('TELNYX_FEH_CALLBACK_ACK_V1','SMS','approved',$1,now()) returning id`,[actor])).rows[0].id;
  const result=await worker.rpc('claim_meta_lead_acknowledgement',{p_lead_id:f.leadId,p_execution_authorization_id:a.authorization_id,p_provider_adapter_id:old});
  assert.equal(result.data[0].claim_status,'blocked');
  assert.equal((await run(f)).status,'succeeded');
});
test('v2 callback-before-ID, delivery failure, out-of-order receipt and replay preserve one dispatch',async()=>{
  const f=await fixture(); const sends=[];
  await db.query(`insert into feh_ack_callback_private.scope(profile_id,allowed_phone,approval_reference)
    values('00000000-0000-4000-8000-000000000456',$1,'LOCAL-RECEIPT-TEST')`,[phone]);
  const stamp=(await db.query('select clock_timestamp()::text t')).rows[0].t;
  const callback=async(id,type,status,to=phone)=>scoped('feh_ack_preview_callback',`select public.record_acknowledgement_callback(
    $1,'00000000-0000-4000-8000-000000000999','00000000-0000-4000-8000-000000000456',$2,$3,$4,'+447427851020',$5) as result`,
    [`00000000-0000-4000-8000-000000000${id}`,stamp,type,status,to]);
  assert.equal((await callback('601','message.finalized','delivery_failed')).rows[0].result,'unmatched');
  assert.equal((await run(f,sends)).status,'succeeded');
  assert.equal((await callback('601','message.finalized','delivery_failed')).rows[0].result,'recorded');
  assert.equal((await callback('601','message.finalized','delivery_failed')).rows[0].result,'duplicate');
  assert.equal((await callback('602','message.sent','sent')).rows[0].result,'recorded');
  assert.equal((await callback('603','message.finalized','delivered','+447700900099')).rows[0].result,'rejected');
  await run(f,sends); assert.equal(sends.length,1);
  assert.equal((await db.query('select count(*)::int n from acknowledgement_delivery_receipts')).rows[0].n,2);
  assert.equal((await counts()).attempts,1);
});
