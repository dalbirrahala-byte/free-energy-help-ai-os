import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {runOwnerAcknowledgementTest}=await import('./ownerTestControl.server.ts');
hook.deregister();
const db=new PGlite();
const actor='00000000-0000-4000-8000-000000000456';
const other='00000000-0000-4000-8000-000000000457';
const phone='+447700900004';
const from='+447427851020';
const issuer='https://vredwhyphrhsudggrsen.supabase.co/auth/v1';
const env={VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_ACK_OWNER_TEST_ENABLED:'true'};
const bootstrap=await readFile(new URL('../../../../docs/staging/ACK_OWNER_TEST_BOOTSTRAP.sql.in',import.meta.url),'utf8');
before(async()=>{
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    create role anon;create role authenticated;create role service_role bypassrls;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
    alter default privileges in schema public grant all on functions to anon,authenticated,service_role;`);
  const directory=new URL('../../../../supabase/migrations/',import.meta.url);
  for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL(name,directory),'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)',[actor,other]);
  await db.query("insert into public.user_roles(id,role) values($1,'read_only'),($2,'admin')",[actor,other]);
});
after(()=>db.close());
const functions={
  select_lead_acknowledgement_candidate:['p_allowed_phone'],
  claim_meta_lead_acknowledgement:['p_lead_id','p_execution_authorization_id','p_provider_adapter_id'],
  consume_execution_authorization:['p_execution_authorization_id'],
  prepare_execution_dispatch:['p_execution_authorization_id','p_provider_adapter_id'],
  evaluate_execution_precall_readiness:['p_execution_dispatch_attempt_id','p_execution_authorization_id','p_expected_provider_adapter_id','p_expected_adapter_key'],
  complete_execution_dispatch_success:['p_execution_dispatch_attempt_id','p_provider_reference'],
  complete_execution_dispatch_failure:['p_execution_dispatch_attempt_id','p_failure_code'],
  complete_execution_dispatch_indeterminate:['p_execution_dispatch_attempt_id','p_failure_code'],
};
const rowResults=new Set(['claim_meta_lead_acknowledgement','prepare_execution_dispatch','select_lead_acknowledgement_candidate','begin_ack_preview_owner_test']);
const ownerFunctions=new Set(['get_ack_preview_owner_test_status','prepare_ack_preview_owner_test','begin_ack_preview_owner_test','finish_ack_preview_owner_test']);
const reset=Symbol('rollback synthetic fixture');
async function fixture(work){
  try{await db.transaction(async tx=>{
    const claims={sub:actor,iss:issuer,role:'authenticated',aal:'aal2'};
    async function jwt(changes={}){await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({...claims,...changes})]);}
    await jwt();
    await tx.exec(bootstrap.replace('__OWNER_UUID__',actor).replace('__OWNER_PHONE__',phone)
      .replace('__APPROVAL_REFERENCE__','owner-approved-staging-sms-synthetic_fixture_only'));
    const calls=[];const sends=[];
    async function rpc(role,name,args={}){
      assert.ok(ownerFunctions.has(name)||Object.hasOwn(functions,name));
      calls.push(name);const keys=functions[name]??[];
      await tx.exec('savepoint owner_test_rpc');
      try{
        await tx.exec(`set local role ${role}`);
        const rows=(await tx.query(`select * from public.${name}(${keys.map((_,i)=>`$${i+1}`).join(',')})`,keys.map(k=>args[k]))).rows;
        await tx.exec('reset role');await tx.exec('release savepoint owner_test_rpc');
        return {data:JSON.parse(JSON.stringify(rowResults.has(name)?rows:rows[0][name])),error:null};
      }catch(error){await tx.exec('rollback to savepoint owner_test_rpc');await tx.exec('release savepoint owner_test_rpc');throw error;}
    }
    const owner={rpc:name=>rpc('authenticated',name)};
    const worker={rpc:(name,args)=>rpc('execution_dispatch_worker',name,args),verifyConnection:async()=>true,close:async()=>{}};
    const transport={async createMessage(request){sends.push(request);return {outcome:'response',httpStatus:200,body:{data:{
      id:'00000000-0000-4000-8000-000000000999',record_type:'message',direction:'outbound',type:'SMS',
      from:{phone_number:request.from},to:[{phone_number:request.to,status:'queued'}],errors:[]}}};}};
    const state=async()=>(await tx.query(`select c.phase,c.enabled,u.role,
      (select count(*)::int from public.execution_authorisers where revoked_at is null) as active_grants,
      (select count(*)::int from public.execution_dispatch_attempts) as attempts,
      (select count(*)::int from public.lead_acknowledgements) as reservations,
      public.evaluate_execution_emergency_stop() as control
      from public.ack_preview_owner_test_control c join public.user_roles u on u.id=c.operator_id`)).rows[0];
    await work({tx,jwt,owner,worker,transport,calls,sends,state});throw reset;
  });}catch(error){if(error!==reset)throw error;}
}

test('installation creates no live authority or configuration',async()=>{
  assert.equal((await db.query('select count(*)::int as count from public.ack_preview_owner_test_control')).rows[0].count,0);
  assert.equal((await db.query('select evaluate_execution_emergency_stop() as state')).rows[0].state,'stopped');
  for(const role of ['anon','authenticated','service_role','execution_dispatch_worker','external_lead_ingestor'])
    assert.equal((await db.query("select has_table_privilege($1,'public.ack_preview_owner_test_control','SELECT,INSERT,UPDATE,DELETE') as allowed",[role])).rows[0].allowed,false);
  for(const name of ownerFunctions)for(const role of ['anon','service_role','execution_dispatch_worker','external_lead_ingestor'])
    assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') as allowed",[role,`public.${name}()`])).rows[0].allowed,false);
});
for(const [name,change] of Object.entries({wrongOwner:{sub:other},wrongProject:{iss:'https://production.invalid/auth/v1'},weakSession:{aal:'aal1'},machine:{role:'service_role'},missingUser:{sub:null}}))
  test(`${name}: cannot prepare, approve an adapter or release`,()=>fixture(async h=>{
    await h.jwt(change);assert.equal((await h.owner.rpc('prepare_ack_preview_owner_test')).data,'blocked');
    assert.equal((await h.owner.rpc('begin_ack_preview_owner_test')).data[0].status,'blocked');
    assert.equal((await h.state()).reservations,0);assert.equal((await h.state()).control,'stopped');
  }));
for(const [name,sql] of Object.entries({readOnly:"update user_roles set role='read_only'",disabled:"update ack_preview_owner_test_control set enabled=false",expired:"update ack_preview_owner_test_control set expires_at=now()-interval '1 second'",revoked:"update execution_authorisers set revoked_at=now()"}))
  test(`${name}: scope cannot self-approve`,()=>fixture(async h=>{await h.tx.exec(sql);assert.equal((await h.owner.rpc('prepare_ack_preview_owner_test')).data,'blocked');assert.equal((await h.state()).reservations,0);}));

test('owner prepares one attributed approval and adapter while STOP stays enabled',()=>fixture(async h=>{
  assert.equal((await h.owner.rpc('prepare_ack_preview_owner_test')).data,'prepared');
  assert.equal((await h.owner.rpc('prepare_ack_preview_owner_test')).data,'blocked');
  assert.equal((await h.state()).reservations,1);assert.equal((await h.state()).control,'stopped');
  const rows=(await h.tx.query(`select a.actor_id,p.approved_by,cd.consent_source,l.consent_status,l.consent_given from execution_intent_approvals a
    join compliance_decisions cd on cd.execution_intent_id=a.execution_intent_id cross join execution_provider_adapters p cross join leads l`)).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].actor_id,actor);assert.equal(rows[0].approved_by,actor);
  assert.match(rows[0].consent_source,/^ack-owner-test:/);assert.equal(rows[0].consent_status,'unknown');assert.equal(rows[0].consent_given,false);
}));

test('one authorised run sends once then restores STOP, disables adapter and removes temporary access',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');
  const r=await runOwnerAcknowledgementTest(h.owner,env,{database:()=>h.worker,transport:()=>h.transport});
  assert.equal(r.status,'provider_accepted');assert.equal(r.stopRestored,true);assert.equal(r.deliveryConfirmed,false);
  assert.equal(h.sends.length,1);assert.equal(h.sends[0].to,phone);assert.equal(h.sends[0].from,from);
  assert.deepEqual(await h.state(),{phase:'finished',enabled:false,role:'read_only',active_grants:0,attempts:1,reservations:1,control:'stopped'});
  assert.equal((await h.tx.query('select status from execution_provider_adapters')).rows[0].status,'disabled');
  const status=(await h.owner.rpc('get_ack_preview_owner_test_status')).data;
  assert.equal(status.attempt_status,'succeeded');assert.equal(status.temporary_access_removed,true);
  assert.equal(status.recipient_suffix,'0004');assert.ok(!JSON.stringify(status).includes(phone));
  const q=(await h.tx.query('select external_lead_id from lead_acknowledgements')).rows[0];
  assert.equal((await h.tx.query("select * from ingest_google_lead_with_acknowledgement('402325113451','24096131756',$1,now(),null,null,$2,null)",[q.external_lead_id,phone])).rows[0].outcome,'duplicate');
  assert.equal((await runOwnerAcknowledgementTest(h.owner,env,{database:()=>h.worker,transport:()=>h.transport})).status,'blocked');
  assert.equal(h.sends.length,1);
}));

test('provider timeout remains indeterminate, restores STOP and never retries',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');
  const transport={async createMessage(input){h.sends.push(input);throw new Error('private provider error');}};
  const r=await runOwnerAcknowledgementTest(h.owner,env,{database:()=>h.worker,transport:()=>transport});
  assert.equal(r.status,'indeterminate');assert.equal(r.stopRestored,true);assert.equal(h.sends.length,1);
  assert.equal((await h.state()).control,'stopped');
  assert.equal((await h.tx.query('select status from execution_dispatch_attempts')).rows[0].status,'indeterminate');
}));

test('lost begin response causes cleanup without dispatch',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');
  const owner={async rpc(name){const r=await h.owner.rpc(name);if(name==='begin_ack_preview_owner_test')throw new Error('lost response');return r;}};
  const r=await runOwnerAcknowledgementTest(owner,env,{database:()=>h.worker,transport:()=>h.transport});
  assert.equal(r.status,'evaluation_failed');assert.equal(r.stopRestored,true);assert.equal(h.sends.length,0);assert.equal((await h.state()).control,'stopped');
}));

test('cleanup remains available after scope expiry and never deletes evidence',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');await h.owner.rpc('begin_ack_preview_owner_test');
  await h.tx.exec("update ack_preview_owner_test_control set expires_at=now()-interval '1 second'");
  assert.equal((await h.owner.rpc('finish_ack_preview_owner_test')).data,'finished');assert.equal((await h.state()).control,'stopped');assert.equal((await h.state()).reservations,1);
}));

test('a replayed begin is blocked without stopping the original running attempt',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');await h.owner.rpc('begin_ack_preview_owner_test');
  const r=await runOwnerAcknowledgementTest(h.owner,env,{database:()=>h.worker,transport:()=>h.transport});
  assert.equal(r.status,'blocked');assert.equal((await h.state()).control,'clear');assert.equal(h.calls.filter(n=>n==='finish_ack_preview_owner_test').length,0);
  await h.owner.rpc('finish_ack_preview_owner_test');
}));

test('cleanup failure is reported honestly and manual cleanup can recover',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');
  const owner={rpc:name=>name==='finish_ack_preview_owner_test'?Promise.resolve({data:null,error:{message:'private'}}):h.owner.rpc(name)};
  const r=await runOwnerAcknowledgementTest(owner,env,{database:()=>h.worker,transport:()=>h.transport});
  assert.equal(r.status,'provider_accepted');assert.equal(r.stopRestored,false);assert.equal(h.sends.length,1);
  assert.equal((await h.owner.rpc('finish_ack_preview_owner_test')).data,'finished');assert.equal((await h.state()).control,'stopped');
}));

test('production, disabled flag, missing transport or failed worker connection cannot release STOP',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');
  for(const config of [{...env,VERCEL_ENV:'production'},{...env,FEH_ACK_OWNER_TEST_ENABLED:'false'}])
    assert.equal((await runOwnerAcknowledgementTest(h.owner,config,{database:()=>h.worker,transport:()=>h.transport})).status,'blocked');
  assert.equal((await runOwnerAcknowledgementTest(h.owner,env,{database:()=>({...h.worker,verifyConnection:async()=>false}),transport:()=>h.transport})).status,'blocked');
  assert.equal((await runOwnerAcknowledgementTest(h.owner,env,{database:()=>h.worker,transport:()=>null})).status,'blocked');
  assert.equal(h.calls.includes('begin_ack_preview_owner_test'),false);assert.equal((await h.state()).control,'stopped');
}));

test('failed authorization rolls RELEASE back and retains STOP',()=>fixture(async h=>{
  await h.owner.rpc('prepare_ack_preview_owner_test');
  await h.tx.exec("update compliance_decisions set evaluated_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute'");
  await assert.rejects(h.owner.rpc('begin_ack_preview_owner_test'),/owner_test_begin_failed/);
  assert.equal((await h.state()).control,'stopped');assert.equal((await h.state()).phase,'prepared');
  assert.equal((await h.tx.query('select count(*)::int as count from execution_authorizations')).rows[0].count,0);
}));

test('prepare refuses to approve over an existing adapter',()=>fixture(async h=>{
  await h.tx.query("insert into execution_provider_adapters(adapter_key,channel,status) values('OTHER_ADAPTER','SMS','disabled')");
  assert.equal((await h.owner.rpc('prepare_ack_preview_owner_test')).data,'blocked');assert.equal((await h.state()).reservations,0);
}));
