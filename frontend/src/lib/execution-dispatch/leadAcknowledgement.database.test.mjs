import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { executeLeadAcknowledgement } from './executeLeadAcknowledgement.ts';

// Real PostgreSQL engine in WASM, isolated from Supabase and Telnyx. PGlite has
// one connection: these prove persisted SQL invariants, not multi-session races.
const db = new PGlite();
const migrations = new URL('../../../../supabase/migrations/', import.meta.url);
const actor = '00000000-0000-4000-8000-000000000123';
const phone = '+447700900001';
const from = '+447700900002';
let external = 800000;
before(async () => {
  await db.exec(`
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant all on functions to anon,authenticated,service_role;
  `);
  for (const file of (await readdir(migrations)).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  }
  await db.query('insert into auth.users(id) values($1)', [actor]);
  await db.query("insert into public.user_roles(id,role) values($1,'admin')", [actor]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [actor]);
  const grants = (await db.query(`insert into public.execution_authorisers(user_id,capability,granted_by)
    values ($1,'execution_authoriser',$1),($1,'execution_controller',$1) returning id,capability`, [actor])).rows;
  const controller = grants.find(g => g.capability === 'execution_controller').id;
  await db.query(`insert into public.execution_control_events(event_type,actor_id,controller_grant_id)
    values ('RELEASE',$1,$2)`, [actor, controller]);
});
after(async () => { await db.close(); });

async function fixture(provider='meta') {
  const externalId = (provider==='meta'?'':'google_')+String(++external);
  const intake=provider==='meta'?`select * from public.ingest_meta_lead_with_acknowledgement(
    '123456','654321',$1,now(),'Synthetic FEH test','Synthetic Contact',$2,'test@example.invalid',null)`:
    `select * from public.ingest_google_lead_with_acknowledgement('654321','123456',$1,now(),'Synthetic FEH test','Synthetic Contact',$2,'test@example.invalid')`;
  const lead = (await db.query(intake, [externalId, phone])).rows[0];
  const org = (await db.query("insert into organisations(legal_name) values('Synthetic FEH test') returning id")).rows[0].id;
  const contact = (await db.query('insert into contacts(organisation_id,phone) values($1,$2) returning id', [org, phone])).rows[0].id;
  await db.query('update leads set organisation_id=$1 where id=$2', [org, lead.lead_id]);
  const intent = (await db.query("select * from create_execution_intent($1,'SMS',$2)",
    [contact, `${provider}:feh-callback-ack-v1:${externalId}`])).rows[0].execution_intent_id;
  await db.query(`insert into compliance_decisions(evaluated_at,organisation_id,contact_id,requested_channel,
    policy_version,decision,identity_tier,contactability_status,has_email,has_telephone,has_domain,
    destination_commitment_nonce,destination_commitment,expires_at,execution_intent_id)
    select now(),$1,$2,'SMS','FEH_CONTACT_PERMISSION_V1','eligible','deterministic','contactable',false,true,false,
      nonce,destination_commitment,now()+interval '30 minutes',$3 from derive_destination_commitment($2,'SMS')`, [org, contact, intent]);
  assert.equal((await db.query("select approve_execution_intent($1,'feh-callback-ack-v1','synthetic-fixture-permission-not-live') as result", [intent])).rows[0].result, 'approved');
  assert.equal((await db.query('select create_execution_authorization($1) as result', [intent])).rows[0].result, 'authorised');
  const authorization = (await db.query('select id from execution_authorizations where execution_intent_id=$1', [intent])).rows[0].id;
  const adapter = (await db.query(`insert into execution_provider_adapters(adapter_key,channel,status,approved_by,approved_at)
    values ('TELNYX_FEH_CALLBACK_ACK_V1','SMS','approved',$1,now())
    on conflict(channel,adapter_key) do update set status='approved' returning id`, [actor])).rows[0].id;
  return { leadId: lead.lead_id, authorizationId: authorization, providerAdapterId: adapter, intent, contact, org, externalId };
}

const rpcArgs = {
  claim_meta_lead_acknowledgement: ['p_lead_id','p_execution_authorization_id','p_provider_adapter_id'],
  consume_execution_authorization: ['p_execution_authorization_id'],
  prepare_execution_dispatch: ['p_execution_authorization_id','p_provider_adapter_id'],
  evaluate_execution_precall_readiness: ['p_execution_dispatch_attempt_id','p_execution_authorization_id','p_expected_provider_adapter_id','p_expected_adapter_key'],
  complete_execution_dispatch_success: ['p_execution_dispatch_attempt_id','p_provider_reference'],
  complete_execution_dispatch_failure: ['p_execution_dispatch_attempt_id','p_failure_code'],
  complete_execution_dispatch_indeterminate: ['p_execution_dispatch_attempt_id','p_failure_code'],
};
const rowResults = new Set(['claim_meta_lead_acknowledgement','prepare_execution_dispatch']);
const worker = {
  async rpc(name, args) {
    const keys = rpcArgs[name]; assert.ok(keys, 'only reviewed RPC names');
    try {
      const rows = await db.transaction(async tx => {
        await tx.exec('set local role execution_dispatch_worker');
        return (await tx.query(`select * from public.${name}(${keys.map((_,i)=>`$${i+1}`).join(',')})`, keys.map(k=>args[k]??null))).rows;
      });
      // PostgREST/Supabase transport emits JSON timestamps, not native Dates.
      const data = rowResults.has(name) ? rows : rows[0]?.[name];
      return { data: JSON.parse(JSON.stringify(data)), error: null };
    } catch (error) { throw new Error(`Local fixture RPC ${name}: ${error.code ?? error.message}`, { cause: error }); }
  },
};
function transport(sends, outcome = 'accepted') {
  return { async createMessage(request) {
    sends.push(request);
    if (outcome === 'timeout') throw new Error('synthetic network error, must stay private');
    return { outcome: 'response', httpStatus: 200, body: { data: {
      id: '00000000-0000-4000-8000-000000000999', record_type: 'message', direction: 'outbound', type: 'SMS',
      from: { phone_number: request.from }, to: [{ phone_number: request.to, status: 'queued' }], errors: [],
    } } };
  } };
}

test('atomic ingestion: replay creates one lead and one reservation with unknown marketing consent', async () => {
  const id = String(++external);
  for (let i=0;i<3;i++) {
    const rows = await db.transaction(async tx => {
      await tx.exec('set local role external_lead_ingestor');
      return (await tx.query("select * from ingest_meta_lead_with_acknowledgement('123456','654321',$1,now(),null,null,$2,null,null)", [id,phone])).rows;
    });
    assert.equal(rows[0].outcome, i===0?'accepted':'duplicate');
    assert.equal(rows[0].acknowledgement_reserved, i===0);
  }
  const counts = (await db.query(`select count(*)::int as total, bool_and(l.consent_status='unknown' and l.consent_given=false) as unknown
    from leads l join lead_acknowledgements q on q.lead_id=l.id where l.external_lead_id=$1`, [id])).rows[0];
  assert.deepEqual(counts, { total: 1, unknown: true });
});

test('full database claim -> existing Factory 041 worker -> fixed message -> durable finalization; replay never sends', async () => {
  const f=await fixture(); const sends=[];
  const first=await executeLeadAcknowledgement(worker,f,{from},transport(sends));
  assert.equal(first.status,'succeeded'); assert.ok(first.attemptId);
  const second=await executeLeadAcknowledgement(worker,f,{from},transport(sends));
  assert.ok(['blocked','already_claimed'].includes(second.status)); assert.equal(sends.length,1);
  assert.equal(sends[0].to,phone); assert.match(sends[0].text,/01332 605506/);
  const state=(await db.query(`select q.status as queue,a.status as attempt from lead_acknowledgements q
    join execution_dispatch_attempts a on a.execution_authorization_id=q.execution_authorization_id where q.lead_id=$1`,[f.leadId])).rows[0];
  assert.deepEqual(state,{queue:'claimed',attempt:'succeeded'});
});

test('ambiguous provider outcome is finalized indeterminate and cannot be resent', async () => {
  const f=await fixture(); const sends=[];
  assert.equal((await executeLeadAcknowledgement(worker,f,{from},transport(sends,'timeout'))).status,'indeterminate');
  await executeLeadAcknowledgement(worker,f,{from},transport(sends)); assert.equal(sends.length,1);
  assert.equal((await db.query('select status from execution_dispatch_attempts where execution_authorization_id=$1',[f.authorizationId])).rows[0].status,'indeterminate');
});

test('Google enquiry creates one reservation and one fixed acknowledgement; replay cannot resend',async()=>{
  const f=await fixture('google_ads');const sends=[];
  const replay=(await db.query("select * from ingest_google_lead_with_acknowledgement('654321','123456',$1,now(),null,null,$2,null)",[f.externalId,phone])).rows[0];
  assert.equal(replay.outcome,'duplicate');assert.equal(replay.acknowledgement_reserved,false);
  assert.equal((await executeLeadAcknowledgement(worker,f,{from},transport(sends))).status,'succeeded');
  await executeLeadAcknowledgement(worker,f,{from},transport(sends));assert.equal(sends.length,1);
  const rows=(await db.query('select l.provider,l.lead_source,l.consent_status,q.provider as queue_provider,q.page_id from leads l join lead_acknowledgements q on q.lead_id=l.id where l.id=$1',[f.leadId])).rows;
  assert.deepEqual(rows,[{provider:'google_ads',lead_source:'google_ads',consent_status:'unknown',queue_provider:'google_ads',page_id:null}]);
});

test('new runtime identities can assume only their assigned capabilities and inherit none',async()=>{
  const rows=(await db.query(`select p.rolname as capability,r.rolname as runtime,m.admin_option,m.inherit_option,m.set_option
    from pg_auth_members m join pg_roles p on p.oid=m.roleid join pg_roles r on r.oid=m.member
    where r.rolname in ('feh_ack_preview_ingestor','feh_ack_preview_worker') order by r.rolname`)).rows;
  assert.deepEqual(rows,[
    {capability:'external_lead_ingestor',runtime:'feh_ack_preview_ingestor',admin_option:false,inherit_option:false,set_option:true},
    {capability:'execution_dispatch_worker',runtime:'feh_ack_preview_worker',admin_option:false,inherit_option:false,set_option:true},
  ]);
  for(const role of ['feh_ack_preview_ingestor','feh_ack_preview_worker']) {
    const attributes=(await db.query('select rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolreplication,rolconnlimit from pg_roles where rolname=$1',[role])).rows[0];
    assert.deepEqual(attributes,{rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolbypassrls:false,rolreplication:false,rolconnlimit:2});
    assert.equal((await db.query("select has_table_privilege($1,'public.lead_acknowledgements','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as allowed",[role])).rows[0].allowed,false);
  }
  for(const role of ['anon','authenticated','service_role','execution_dispatch_worker'])assert.equal((await db.query("select has_function_privilege($1,'public.ingest_google_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
});

test('worker crash after a durable claim cannot obtain the claim again', async () => {
  const f=await fixture(); const sends=[];
  const claim=await worker.rpc('claim_meta_lead_acknowledgement',{
    p_lead_id:f.leadId,p_execution_authorization_id:f.authorizationId,p_provider_adapter_id:f.providerAdapterId});
  assert.equal(claim.data[0].claim_status,'claimed');
  assert.equal((await executeLeadAcknowledgement(worker,f,{from},transport(sends))).status,'already_claimed');
  assert.equal(sends.length,0);
});

for(const [name,sql,args] of [
  ['changed contact mobile','update contacts set phone=$1 where id=$2',f=>['+447700900003',f.contact]],
  ['changed lead mobile','update leads set telephone=$1 where id=$2',f=>['+447700900003',f.leadId]],
  ['missing organisation linkage','update leads set organisation_id=null where id=$1',f=>[f.leadId]],
  ['expired authority',"update execution_authorizations set expires_at=now()-interval '1 second' where id=$1",f=>[f.authorizationId]],
  ['disabled adapter',"update execution_provider_adapters set status='disabled' where id=$1",f=>[f.providerAdapterId]],
  ['no exact-template approval',"update execution_intent_approvals set reason='different-purpose' where execution_intent_id=$1",f=>[f.intent]],
  ['no permission evidence',"update execution_intent_approvals set evidence_reference=null where execution_intent_id=$1",f=>[f.intent]],
  ['new rejection',"select reject_execution_intent($1,'synthetic rejection','synthetic-evidence')",f=>[f.intent]],
  ['live suppression',`insert into suppression_records(contact_id,channel,reason,requested_by,scope)
    values($1,'SMS','CONSENT_WITHDRAWN','INTERNAL','PERMANENT')`,f=>[f.contact]],
]) {
  test(`${name}: no claim and no provider invocation`,async()=>{
    const f=await fixture(); const sends=[]; await db.query(sql,args(f));
    const result=await executeLeadAcknowledgement(worker,f,{from},transport(sends));
    assert.equal(result.status,'blocked'); assert.equal(sends.length,0);
    assert.equal((await db.query('select status from lead_acknowledgements where lead_id=$1',[f.leadId])).rows[0].status,'awaiting_authority');
  });
}

test('new queue and RPCs are inaccessible to public application and service roles',async()=>{
  for(const role of ['anon','authenticated','service_role']) {
    const table=(await db.query("select has_table_privilege($1,'public.lead_acknowledgements','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') as allowed",[role])).rows[0];
    assert.equal(table.allowed,false);
    for(const fn of ['public.claim_meta_lead_acknowledgement(bigint,bigint,bigint)',
      'public.ingest_meta_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text,text)']) {
      assert.equal((await db.query('select has_function_privilege($1,$2,\'EXECUTE\') as allowed',[role,fn])).rows[0].allowed,false);
    }
  }
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.lead_acknowledgements'::regclass")).rows[0].relrowsecurity,true);
});

test('failure to write the audit rolls back the lead and acknowledgement together', async () => {
  const id=String(++external);
  await assert.rejects(db.transaction(async tx => {
    await tx.exec("alter table audit_log add constraint synthetic_audit_failure check(action <> 'lead_acknowledgement_reserved')");
    await tx.query("select * from ingest_meta_lead_with_acknowledgement('123456','654321',$1,now(),null,null,$2,null,null)",[id,phone]);
  }));
  assert.equal((await db.query('select count(*)::int as count from leads where external_lead_id=$1',[id])).rows[0].count,0);
  assert.equal((await db.query('select count(*)::int as count from lead_acknowledgements where external_lead_id=$1',[id])).rows[0].count,0);
});

test('an existing lead cannot be backfilled into an acknowledgement by webhook replay', async () => {
  const id=String(++external);
  await db.query("select * from ingest_external_lead('meta',$1,now(),'unknown',null,null,$2,null,null)",[id,phone]);
  const receipt=(await db.query("select * from ingest_meta_lead_with_acknowledgement('123456','654321',$1,now(),null,null,$2,null,null)",[id,phone])).rows[0];
  assert.equal(receipt.outcome,'duplicate'); assert.equal(receipt.acknowledgement_reserved,false);
  assert.equal((await db.query('select count(*)::int as count from lead_acknowledgements where external_lead_id=$1',[id])).rows[0].count,0);
});

test('a STOP arriving after claim still prevents the provider invocation', async () => {
  const f=await fixture(); const sends=[];
  const stoppedWorker={async rpc(name,args){
    const result=await worker.rpc(name,args);
    if(name==='claim_meta_lead_acknowledgement') {
      assert.equal(result.data[0].claim_status,'claimed');
      assert.equal((await db.query("select stop_execution('synthetic stop','local test only') as result")).rows[0].result,'stopped');
    }
    return result;
  }};
  try {
    assert.equal((await executeLeadAcknowledgement(stoppedWorker,f,{from},transport(sends))).status,'blocked');
    assert.equal(sends.length,0);
  } finally {
    assert.equal((await db.query("select release_execution('synthetic release','local test only') as result")).rows[0].result,'released');
  }
});

test('overlapping deliveries through the worker receive only one claim', async () => {
  const f=await fixture(); const sends=[];
  const results=await Promise.all([executeLeadAcknowledgement(worker,f,{from},transport(sends)),
    executeLeadAcknowledgement(worker,f,{from},transport(sends))]);
  assert.equal(results.filter(r=>r.status==='succeeded').length,1);
  assert.equal(sends.length,1);
});
