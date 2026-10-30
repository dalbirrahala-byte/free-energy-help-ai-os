import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
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
