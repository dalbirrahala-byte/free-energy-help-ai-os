import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {X509Certificate} from 'node:crypto';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createPreviewAcknowledgementDatabase,readPreviewDatabaseConfiguration}=await import('./previewDatabase.server.ts');
hook.deregister();
const ref='vredwhyphrhsudggrsen';
const password='synthetic-not-a-live-password-0123456789';
const url=kind=>`postgresql://feh_ack_preview_${kind}.${ref}:${password}@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`;
const env=()=>({VERCEL_ENV:'preview',FEH_ACK_DATABASE_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:`https://${ref}.supabase.co`,FEH_ACK_INGESTOR_DATABASE_URL:url('ingestor'),FEH_ACK_WORKER_DATABASE_URL:url('worker')});
const roles={ingestor:'external_lead_ingestor',worker:'execution_dispatch_worker'};
function harness(kind,{identity={},fail=false,result='blocked'}={}){
 const calls=[];let transactions=0,closed=0;
 const client=createPreviewAcknowledgementDatabase(kind,env(),config=>{
  assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.prepare,false);assert.equal(config.max,1);assert.equal(config.debug,false);
  return {async begin(work){transactions++;return work({async unsafe(sql,args=[]){calls.push({sql,args});if(fail)throw new Error(`${password} private DB error`);
   if(sql.startsWith('select current_user'))return [{role:roles[kind],login:`feh_ack_preview_${kind}`,database:'postgres',elevated:false,raw_queue_access:false,...identity}];
   if(sql.startsWith('select to_jsonb'))return [{result}];return [];
  }});},async end(){closed++;}};
 });
 return {client,calls,transactions:()=>transactions,closed:()=>closed};
}
for(const kind of ['ingestor','worker'])test(`${kind}: exact project, verified TLS and pooler options`,()=>{
 const config=readPreviewDatabaseConfiguration(kind,env());assert.ok(config);assert.equal(config.username,`feh_ack_preview_${kind}.${ref}`);assert.equal(config.port,6543);
 const direct={...env(),[kind==='worker'?'FEH_ACK_WORKER_DATABASE_URL':'FEH_ACK_INGESTOR_DATABASE_URL']:`postgresql://feh_ack_preview_${kind}:${password}@db.${ref}.supabase.co:5432/postgres`};
 assert.ok(readPreviewDatabaseConfiguration(kind,direct));
});
for(const [name,changes] of Object.entries({
 production:{VERCEL_ENV:'production'},development:{VERCEL_ENV:'development'},disabled:{FEH_ACK_DATABASE_ENABLED:'false'},missingFlag:{FEH_ACK_DATABASE_ENABLED:undefined},
 wrongProject:{NEXT_PUBLIC_SUPABASE_URL:'https://production.supabase.co'},missingSecret:{FEH_ACK_WORKER_DATABASE_URL:undefined},
 admin:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace('feh_ack_preview_worker.','postgres.')},wrongTenant:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace(ref,'differentprojectref')},
 externalHost:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace('pooler.supabase.com','pooler.supabase.com.evil.invalid')},
 sslOverride:{FEH_ACK_WORKER_DATABASE_URL:url('worker')+'?sslmode=disable'},fragment:{FEH_ACK_WORKER_DATABASE_URL:url('worker')+'#test'},
 wrongPort:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace(':6543',':5432')},otherDatabase:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace('/postgres','/other')},
 blankPassword:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace(password,'')},newlinePassword:{FEH_ACK_WORKER_DATABASE_URL:url('worker').replace(password,password+'%0A')},
 wrongRole:{FEH_ACK_WORKER_DATABASE_URL:url('ingestor')},
}))test(`reject ${name} before opening any connection`,()=>{
 assert.equal(createPreviewAcknowledgementDatabase('worker',{...env(),...changes},()=>assert.fail('must not connect')),null);
});
test('worker has no arbitrary SQL, ingestion or authority-writing entry point',async()=>{
 const h=harness('worker');for(const name of ['ingest_meta_lead_with_acknowledgement','create_execution_authorization','stop_execution','prepare_execution_dispatch;drop table leads','toString','__proto__'])assert.ok((await h.client.rpc(name,{})).error);
 assert.equal(h.transactions(),0);
});
test('only parameterized allowlisted worker functions, role local to transaction, scalar response',async()=>{
 const h=harness('worker',{result:'consumed'});const r=await h.client.rpc('consume_execution_authorization',{p_execution_authorization_id:123});assert.deepEqual(r,{data:'consumed',error:null});
 assert.equal(h.calls[2].sql,'set local role execution_dispatch_worker');assert.equal(h.calls.at(-1).sql,'select to_jsonb(public.consume_execution_authorization($1::bigint)) as result');assert.deepEqual(h.calls.at(-1).args,[123]);assert.equal(h.transactions(),1);
 await h.client.close();assert.equal(h.closed(),1);
});
test('candidate lookup is parameterized and unavailable to the ingestor',async()=>{
 const row={lead_id:1,authorization_id:2,provider_adapter_id:3};
 const h=harness('worker',{result:row});
 assert.deepEqual(await h.client.rpc('select_lead_acknowledgement_candidate',{p_allowed_phone:'+447700900001'}),{data:[row],error:null});
 assert.equal(h.calls.at(-1).sql,'select to_jsonb(result) as result from public.select_lead_acknowledgement_candidate($1::text) as result');
 assert.deepEqual(h.calls.at(-1).args,['+447700900001']);
 const ingestor=harness('ingestor');assert.ok((await ingestor.client.rpc('select_lead_acknowledgement_candidate',{p_allowed_phone:'+447700900001'})).error);
 assert.equal(ingestor.transactions(),0);
});
test('ingestion values stay parameters and returns a row array',async()=>{
 const h=harness('ingestor',{result:{outcome:'accepted',lead_id:42,acknowledgement_reserved:true}});
 const value="Synthetic O'Name; --";const r=await h.client.rpc('ingest_meta_lead_with_acknowledgement',{p_page_id:'123456',p_form_id:'654321',p_external_lead_id:'987654',p_provider_created_at:'2026-10-30T12:00:00Z',p_company_name:value,p_telephone:'+447700900001'});
 assert.equal(r.data[0].lead_id,42);assert.ok(!h.calls.at(-1).sql.includes(value));assert.ok(h.calls.at(-1).args.includes(value));
 assert.ok((await h.client.rpc('prepare_execution_dispatch',{p_execution_authorization_id:1,p_provider_adapter_id:1})).error);assert.equal(h.transactions(),1);
});
for(const [name,identity] of Object.entries({wrongRole:{role:'postgres'},wrongLogin:{login:'postgres'},wrongDatabase:{database:'other'},superuser:{elevated:true},tableAccess:{raw_queue_access:true},unknown:{elevated:null}}))test(`database identity check rejects ${name} before RPC`,async()=>{
 const h=harness('worker',{identity});assert.ok((await h.client.rpc('consume_execution_authorization',{p_execution_authorization_id:1})).error);assert.ok(!h.calls.some(c=>c.sql.startsWith('select to_jsonb')));
});
test('DB failure is private and is not retried',async()=>{
 const h=harness('worker',{fail:true});const r=await h.client.rpc('consume_execution_authorization',{p_execution_authorization_id:1});assert.deepEqual(r,{data:null,error:{code:'ACK_DATABASE_UNAVAILABLE'}});assert.equal(h.transactions(),1);assert.ok(!JSON.stringify(r).includes(password));
});
for(const value of [0,-1,Infinity,NaN,1.2,Number.MAX_SAFE_INTEGER+1,'1',null])test(`invalid integer ${String(value)} rejected without query`,async()=>{
 const h=harness('worker');assert.ok((await h.client.rpc('consume_execution_authorization',{p_execution_authorization_id:value})).error);assert.equal(h.transactions(),0);
});
test('unknown arguments cannot select destinations or database roles',async()=>{
 const h=harness('worker');assert.ok((await h.client.rpc('consume_execution_authorization',{p_execution_authorization_id:1,role:'postgres'})).error);assert.equal(h.transactions(),0);
});
test('readiness proves both identities using read-only transactions and no RPC',async()=>{
 for(const kind of ['ingestor','worker']){
  const h=harness(kind);assert.equal(await h.client.verifyConnection(),true);
  assert.equal(h.calls[0].sql,'set transaction read only');
  assert.equal(h.calls[3].sql,`set local role ${roles[kind]}`);
  assert.ok(!h.calls.some(c=>c.sql.startsWith('select to_jsonb')));
 }
});
test('readiness fails closed on privilege mismatch and private connection error',async()=>{
 assert.equal(await harness('worker',{identity:{raw_queue_access:true}}).client.verifyConnection(),false);
 assert.equal(await harness('ingestor',{fail:true}).client.verifyConnection(),false);
});
test('readiness exposes only a closed diagnostic vocabulary',async()=>{
 const h=harness('worker',{fail:true});await h.client.verifyConnection();
 assert.equal(h.client.verificationFailure(),'UNAVAILABLE');
 const identity=harness('worker',{identity:{login:'postgres'}});await identity.client.verifyConnection();
 assert.equal(identity.client.verificationFailure(),'IDENTITY_MISMATCH');
 assert.ok(!JSON.stringify([h.client.verificationFailure(),identity.client.verificationFailure()]).includes(password));
});
test('staging trusts the official CA while retaining full hostname verification',()=>{
 const config=readPreviewDatabaseConfiguration('worker',env());
 assert.equal(config.ssl.rejectUnauthorized,true);
 assert.equal(config.ssl.servername,config.host);
 const cert=new X509Certificate(config.ssl.ca);
 assert.equal(cert.ca,true);
 assert.equal(cert.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
 assert.ok(Date.parse(cert.validTo)>Date.now());
 assert.equal(Object.hasOwn(config.ssl,'checkServerIdentity'),false);
});

const callbackEnv=()=>({...env(),FEH_ACK_CALLBACK_ENABLED:'true',FEH_ACK_CALLBACK_DATABASE_URL:url('callback')});
test('callback identity accepts only staging Preview with its own enabled credential',()=>{
  assert.ok(readPreviewDatabaseConfiguration('callback',callbackEnv()));
  for(const changes of [{FEH_ACK_CALLBACK_ENABLED:'false'},{FEH_ACK_CALLBACK_ENABLED:undefined},
    {FEH_ACK_CALLBACK_DATABASE_URL:url('worker')},{FEH_ACK_CALLBACK_DATABASE_URL:url('ingestor')},
    {VERCEL_ENV:'production'},{VERCEL_ENV:undefined,FEH_INTAKE_RUNTIME:'supabase-google'},
    {NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'}]){
    assert.equal(createPreviewAcknowledgementDatabase('callback',{...callbackEnv(),...changes},()=>assert.fail('must not connect')),null);
  }
});
test('callback database exposes only one parameterized receipt RPC with short lock timeout',async()=>{
  const calls=[];
  const client=createPreviewAcknowledgementDatabase('callback',callbackEnv(),()=>({async begin(work){return work({async unsafe(sql,args=[]){
    calls.push({sql,args});
    if(sql.startsWith('select current_user'))return [{role:'feh_ack_preview_callback',login:'feh_ack_preview_callback',
      database:'postgres',elevated:false,raw_queue_access:false,raw_suppression_access:false}];
    if(sql.startsWith('select to_jsonb'))return [{result:'recorded'}];return [];
  }});},async end(){}}));
  for(const name of ['create_execution_authorization','stop_execution','release_execution','record_acknowledgement_delivery_receipt',
    'select_lead_acknowledgement_candidate','ingest_external_lead','prepare_execution_dispatch']){
    assert.ok((await client.rpc(name,{})).error);
  }
  assert.equal(calls.length,0);
  const result=await client.rpc('record_acknowledgement_callback',{p_event_id:'00000000-0000-4000-8000-000000000001',
    p_message_id:'00000000-0000-4000-8000-000000000002',p_profile_id:'00000000-0000-4000-8000-000000000003',
    p_occurred_at:'2026-11-05T16:00:00Z',p_event_type:'message.received',p_delivery_status:'STOP',p_from:'+447700900001',p_to:'+447427851020'});
  assert.deepEqual(result,{data:'recorded',error:null});
  assert.equal(calls[0].sql,"set local statement_timeout = '1500ms'");
  assert.equal(calls[1].sql,"set local lock_timeout = '750ms'");
  assert.equal(calls.at(-1).sql,'select to_jsonb(public.record_acknowledgement_callback($1::uuid,$2::uuid,$3::uuid,$4::timestamptz,$5::text,$6::text,$7::text,$8::text)) as result');
  assert.equal(calls.at(-1).args.length,8);
});

const authorityEnv=()=>({...env(),FEH_ACK_PERMISSION_CAPTURE_ENABLED:'true',FEH_ACK_AUTOMATIC_ENABLED:'true',
  FEH_ACK_PERMISSION_DATABASE_URL:url('worker').replace('feh_ack_preview_worker','feh_ack_permission_recorder'),
  FEH_ACK_AUTHORIZER_DATABASE_URL:url('worker').replace('feh_ack_preview_worker','feh_ack_rule_authorizer')});
for(const kind of ['permission','authorizer']) {
  const flag=kind==='permission'?'FEH_ACK_PERMISSION_CAPTURE_ENABLED':'FEH_ACK_AUTOMATIC_ENABLED';
  const credential=kind==='permission'?'FEH_ACK_PERMISSION_DATABASE_URL':'FEH_ACK_AUTHORIZER_DATABASE_URL';
  test(`${kind}: no production, substituted identity or absent explicit enablement`,()=>{
    assert.ok(readPreviewDatabaseConfiguration(kind,authorityEnv()));
    for(const changes of [{[flag]:'false'},{[credential]:url('worker')},{[credential]:url('ingestor')},
      {VERCEL_ENV:'production'},{NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'}])
      assert.equal(createPreviewAcknowledgementDatabase(kind,{...authorityEnv(),...changes},()=>assert.fail('must not connect')),null);
  });
  test(`${kind}: fixed private RPC boundary cannot approve rules, change STOP or use the other identity`,async()=>{
    const calls=[];const login=kind==='permission'?'feh_ack_permission_recorder':'feh_ack_rule_authorizer';
    const client=createPreviewAcknowledgementDatabase(kind,authorityEnv(),()=>({async begin(work){return work({async unsafe(sql,args=[]){
      calls.push({sql,args});
      if(sql.startsWith('select current_user'))return [{role:login,login,database:'postgres',elevated:false,raw_queue_access:false}];
      if(sql.startsWith('select to_jsonb'))return [{result:kind==='permission'?'recorded':{lead_id:42}}];return [];
    }});},async end(){}}));
    for(const name of ['approve_ack_automatic_rule','get_ack_automatic_rule_review','stop_execution','release_execution','prepare_execution_dispatch',
      kind==='permission'?'authorize_enquiry':'record_permission',kind==='permission'?'select_enquiry':'ingest_google_lead_with_acknowledgement'])
      assert.ok((await client.rpc(name,{})).error);
    assert.equal(calls.length,0);
    const name=kind==='permission'?'record_permission':'select_enquiry';
    const args=kind==='permission'?{p_binding_id:'00000000-0000-4000-8000-000000000001',p_lead_id:42,p_submitted_at:'2026-11-05T23:00:00Z',p_question_key:'synthetic',p_answer:'Yes'}:{p_allowed_phone:'+447700900001'};
    assert.equal((await client.rpc(name,args)).error,null);
    assert.ok(calls.at(-1).sql.includes(`feh_ack_authority_private.${name}(`));
    assert.ok(!calls.at(-1).sql.includes('synthetic'));assert.deepEqual(calls.at(-1).args,Object.values(args));
  });
}
test('public intake runtime cannot obtain authorizer even when its flag and credential are present',()=>{
  const edge={...authorityEnv(),VERCEL_ENV:undefined,FEH_INTAKE_RUNTIME:'supabase-edge',SUPABASE_URL:`https://${ref}.supabase.co`,
    FEH_INTAKE_RECEIVER_ENABLED:'true',FEH_META_FORM_TEST_ENABLED:'true'};
  assert.ok(readPreviewDatabaseConfiguration('permission',edge));
  assert.equal(createPreviewAcknowledgementDatabase('authorizer',edge,()=>assert.fail('must not connect')),null);
});

// Exercise the actual catalog query with distinct SESSION_USER and CURRENT_USER.
// These roles and credentials exist only in the isolated in-memory database.
test('a restricted worker identity cannot hide an overprivileged login behind SET ROLE', async()=>{
 const {PGlite}=await import('@electric-sql/pglite');
 const db=new PGlite();
 try{
   await db.exec(`create table public.lead_acknowledgements(id bigint primary key);
     create role execution_dispatch_worker nologin noinherit;
     create role feh_ack_preview_worker login noinherit;
     create role unexpected_role nologin;
     grant execution_dispatch_worker to feh_ack_preview_worker with admin false, inherit false, set true;`);
   const client=createPreviewAcknowledgementDatabase('worker',env(),()=>({
     begin:work=>db.transaction(async tx=>{
       await tx.exec('set local session authorization feh_ack_preview_worker');
       try { return await work({unsafe:async(sql,args)=> (await tx.query(sql,args)).rows}); }
       finally { await tx.exec('set session authorization postgres; reset role'); }
     }),end:async()=>{},
   }));
   assert.equal(await client.verifyConnection(),true);
   for(const [add,remove] of [
     ['alter role feh_ack_preview_worker createdb','alter role feh_ack_preview_worker nocreatedb'],
     ['grant unexpected_role to feh_ack_preview_worker','revoke unexpected_role from feh_ack_preview_worker'],
     ['grant unexpected_role to execution_dispatch_worker','revoke unexpected_role from execution_dispatch_worker'],
     ['grant select on public.lead_acknowledgements to feh_ack_preview_worker',
      'revoke select on public.lead_acknowledgements from feh_ack_preview_worker'],
   ]){
     await db.exec(add);
     assert.equal(await client.verifyConnection(),false,add);
     assert.equal(client.verificationFailure(),'IDENTITY_MISMATCH');
     await db.exec(remove);
     assert.equal(await client.verifyConnection(),true,remove);
   }
 }finally{await db.close();}
});
