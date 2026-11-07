import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createGoogleReceiver}=await import('./googleReceiver.server.ts');
const {isGoogleReceiverEnabled}=await import('./googleReceiverConfiguration.server.ts');
const {createPreviewAcknowledgementDatabase,readPreviewDatabaseConfiguration}=await import('./previewDatabase.server.ts');
hook.deregister();
const project='vredwhyphrhsudggrsen';
const env=()=>({FEH_INTAKE_RUNTIME:'supabase-google',SUPABASE_URL:`https://${project}.supabase.co`,NEXT_PUBLIC_SUPABASE_URL:`https://${project}.supabase.co`,
 FEH_GOOGLE_RECEIVER_ENABLED:'true',FEH_GOOGLE_RECEIVER_SCOPE:'owner-test',FEH_GOOGLE_INGRESS_ENABLED:'true',FEH_ACK_DATABASE_ENABLED:'true',
 FEH_GOOGLE_RECEIVER_TEST_STARTED_AT:new Date(Date.now()-1000).toISOString(),FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT:new Date(Date.now()+14*60*1000).toISOString(),
 FEH_GOOGLE_FORM_ID:'402325113451',FEH_GOOGLE_CAMPAIGN_ID:'24096131756',FEH_GOOGLE_WEBHOOK_KEY:'synthetic-google-key-0123456789012345',FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001'});
const body=()=>({lead_id:'synthetic_google_owner_123',google_key:env().FEH_GOOGLE_WEBHOOK_KEY,form_id:402325113451,campaign_id:24096131756,is_test:false,
 lead_submit_time:'2026-11-02T12:00:00Z',user_column_data:[{column_id:'PHONE_NUMBER',string_value:'+447700900001'},
 {column_id:'FULL_NAME',string_value:'Synthetic Test'},{column_id:'EMAIL',string_value:'owner-test@example.invalid'}]});
const demonstration=()=>({...body(),is_test:true,campaign_id:123456,user_column_data:[{column_id:'PHONE_NUMBER',string_value:'+1 650-555-0123'},
 {column_id:'FULL_NAME',string_value:'FirstName LastName'},{column_id:'EMAIL',string_value:'test@example.com'}]});
const request=(payload=body(),options={})=>new Request(options.url??'https://staging.invalid/functions/v1/feh-google-lead-intake',{
 method:'POST',headers:{'content-type':'application/json',...options.headers},body:typeof payload==='string'||payload instanceof Uint8Array?payload:JSON.stringify(payload)});
function harness(configuration=env(),{outcome='accepted',fail=false,closeThrows=false}={}){
 const calls=[];let opened=0,closed=0;
 const factory=kind=>()=>{opened++;return {async rpc(name,args){calls.push({kind,name,args});if(fail)throw new Error('private connection diagnostic');
  return {data:[{outcome,lead_id:42,acknowledgement_reserved:outcome==='accepted'}],error:null};},async close(){closed++;if(closeThrows)throw new Error('private close diagnostic');}};};
 return {handler:createGoogleReceiver(configuration,{ingestor:factory('ingestor'),receiver:factory('receiver')}),calls,opened:()=>opened,closed:()=>closed};
}
for(const marker of [false,undefined])test(`ordinary payload marker ${marker}: owner test maps to atomic acknowledgement ingestion`,async()=>{
 const h=harness();const p=body();p.is_test=marker;
 p.user_column_data.push({column_id:'FUTURE_FIELD',string_value:'do not retain'});
 const r=await h.handler(request(p));assert.equal(r.status,200);assert.deepEqual(await r.json(),{});
 assert.equal(h.calls.length,1);assert.equal(h.closed(),1);
 assert.deepEqual(h.calls[0],{kind:'ingestor',name:'ingest_google_lead_with_acknowledgement',args:{
  p_form_id:'402325113451',p_campaign_id:'24096131756',p_external_lead_id:p.lead_id,p_provider_created_at:p.lead_submit_time,
  p_company_name:null,p_contact_name:'Synthetic Test',p_telephone:'+447700900001',p_email:'owner-test@example.invalid'}});
});
test('missing provider timestamp is retained for review without fabricating freshness or reserving SMS',async()=>{
 const h=harness();const p=body();delete p.lead_submit_time;
 assert.equal((await h.handler(request(p))).status,200);assert.equal(h.calls[0].args.p_provider_created_at,null);
 assert.equal(h.calls[0].kind,'receiver');assert.equal(h.calls[0].name,'ingest_external_lead');assert.equal(h.calls[0].args.p_consent_status,'unknown');
});
test('Google dashboard demonstration uses intake only and cannot reserve an SMS',async()=>{
 const h=harness();const p=demonstration();delete p.lead_submit_time;
 assert.equal((await h.handler(request(p))).status,200);
 assert.equal(h.calls[0].kind,'receiver');assert.equal(h.calls[0].name,'ingest_external_lead');
 assert.equal(h.calls[0].args.p_consent_status,'unknown');assert.equal(h.calls[0].args.p_provider_created_at,null);
 assert.equal(h.calls[0].args.p_provider,'google_ads');assert.equal(h.calls.length,1);
});
for(const [name,mutate,status] of [
 ['wrong key',p=>p.google_key='not-the-key',403],['wrong form',p=>p.form_id=402325113452,400],
 ['wrong campaign',p=>p.campaign_id=123456,400],['other recipient',p=>p.user_column_data[0].string_value='+447700900003',400],
 ['sender as recipient',p=>p.user_column_data[0].string_value='+447427851020',400],
 ['duplicate phone',p=>p.user_column_data.push(p.user_column_data[0]),400],['invalid timestamp',p=>p.lead_submit_time='not-a-date',400],
 ['null timestamp',p=>p.lead_submit_time=null,400],['unknown source',p=>p.lead_source='CONVERSATIONAL_AGENT',400],
 ['malformed marker',p=>p.is_test='false',400],['null marker',p=>p.is_test=null,400],
 ['ordinary fixture marked as demo',p=>p.is_test=true,400],['numeric lead identity',p=>p.lead_id=1234567,400],
])test(`${name} reaches no database`,async()=>{const h=harness();const p=body();mutate(p);assert.equal((await h.handler(request(p))).status,status);assert.equal(h.opened(),0);});
for(const field of ['PHONE_NUMBER','FULL_NAME','EMAIL'])test(`demonstration rejects altered ${field}`,async()=>{
 const h=harness();const p=demonstration();p.user_column_data.find(f=>f.column_id===field).string_value='changed';
 assert.equal((await h.handler(request(p))).status,400);assert.equal(h.opened(),0);
});
for(const [name,changes] of Object.entries({
 disabled:{FEH_GOOGLE_RECEIVER_ENABLED:'false'},missingEnable:{FEH_GOOGLE_RECEIVER_ENABLED:undefined},legacySwitchOnly:{FEH_GOOGLE_RECEIVER_ENABLED:undefined,FEH_INTAKE_RECEIVER_ENABLED:'true'},
 missingScope:{FEH_GOOGLE_RECEIVER_SCOPE:undefined},customerScope:{FEH_GOOGLE_RECEIVER_SCOPE:'customers'},production:{SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},
 wrongPublicProject:{NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'},previewRuntime:{VERCEL_ENV:'preview'},productionRuntime:{VERCEL_ENV:'production'},
 oldRuntime:{FEH_INTAKE_RUNTIME:'supabase-edge'},disabledIngress:{FEH_GOOGLE_INGRESS_ENABLED:'false'},disabledDatabase:{FEH_ACK_DATABASE_ENABLED:'false'},
 noPhone:{FEH_ACK_PREVIEW_ALLOWED_PHONE:undefined},senderPhone:{FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447427851020'},
 missingKey:{FEH_GOOGLE_WEBHOOK_KEY:undefined},oversizedKey:{FEH_GOOGLE_WEBHOOK_KEY:'x'.repeat(51)},otherForm:{FEH_GOOGLE_FORM_ID:'123456'},otherCampaign:{FEH_GOOGLE_CAMPAIGN_ID:'123456'},
}))test(`${name} keeps receiver closed`,async()=>{const h=harness({...env(),...changes});assert.equal((await h.handler(request())).status,404);assert.equal(h.opened(),0);});
test('configuration is snapshotted; caller mutation cannot activate a closed receiver',async()=>{
 const configuration={...env(),FEH_GOOGLE_RECEIVER_ENABLED:'false'};const h=harness(configuration);configuration.FEH_GOOGLE_RECEIVER_ENABLED='true';
 assert.equal((await h.handler(request())).status,404);assert.equal(h.opened(),0);
});
test('test window uses exact UTC bounds, closes at expiry, and lasts at most fifteen minutes',()=>{
 const start=Date.parse('2026-11-03T00:00:00.000Z'),end=start+15*60*1000;
 const configuration={...env(),FEH_GOOGLE_RECEIVER_TEST_STARTED_AT:new Date(start).toISOString(),FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT:new Date(end).toISOString()};
 assert.equal(isGoogleReceiverEnabled(configuration,start-1),false);
 assert.equal(isGoogleReceiverEnabled(configuration,start),true);
 assert.equal(isGoogleReceiverEnabled(configuration,end-1),true);
 assert.equal(isGoogleReceiverEnabled(configuration,end),false);
 assert.equal(isGoogleReceiverEnabled(configuration,NaN),false);
 for(const invalid of [undefined,'','not-a-date','2026-11-03','2026-11-03T00:15:00+00:00','2026-02-30T00:15:00.000Z',new Date(end+1).toISOString(),new Date(start).toISOString()]){
  assert.equal(isGoogleReceiverEnabled({...configuration,FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT:invalid},start),false);
 }
 assert.equal(isGoogleReceiverEnabled({...configuration,FEH_GOOGLE_RECEIVER_TEST_STARTED_AT:undefined},start),false);
});
test('a warm handler and a fresh cold handler both reject the expired window without database access',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-03T00:00:00.000Z')});
 const configuration=env(),h=harness(configuration);
 assert.equal((await h.handler(request())).status,200);const opened=h.opened();
 t.mock.timers.setTime(Date.parse(configuration.FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT));
 assert.equal((await h.handler(request())).status,404);assert.equal(h.opened(),opened);
 const cold=harness(configuration);assert.equal((await cold.handler(request())).status,404);assert.equal(cold.opened(),0);
});
test('expiry during body streaming rejects the request before either ingestion factory opens',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-11-03T00:00:00.000Z')});
 const configuration=env(),h=harness(configuration);
 const stream=new ReadableStream({pull(controller){
  t.mock.timers.setTime(Date.parse(configuration.FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT));
  controller.enqueue(new TextEncoder().encode(JSON.stringify(body())));controller.close();
 }});
 const r=await h.handler(new Request('https://staging.invalid/feh-google-lead-intake',{method:'POST',headers:{'content-type':'application/json'},body:stream,duplex:'half'}));
 assert.equal(r.status,404);assert.equal(h.opened(),0);
});
for(const path of ['/','/api/lead-acknowledgements/run','/feh-google-lead-intake/extra','/functions/v1/feh-google-lead-intake/'])test(`unexposed path ${path}`,async()=>{
 const h=harness();assert.equal((await h.handler(request(body(),{url:'https://staging.invalid'+path}))).status,404);assert.equal(h.opened(),0);
});
test('exact short edge path also works',async()=>{const h=harness();assert.equal((await h.handler(request(body(),{url:'https://staging.invalid/feh-google-lead-intake'}))).status,200);});
test('GET rejected with Allow POST',async()=>{
 const h=harness();const r=await h.handler(new Request('https://staging.invalid/feh-google-lead-intake'));assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'POST');assert.equal(h.opened(),0);
});
for(const [name,options,status] of [
 ['query',{url:'https://staging.invalid/feh-google-lead-intake?key=synthetic'},400],
 ['browser origin',{headers:{origin:'https://example.invalid'}},400],['content type',{headers:{'content-type':'text/plain'}},415],
])test(`${name} rejected before database`,async()=>{const h=harness();assert.equal((await h.handler(request(body(),options))).status,status);assert.equal(h.opened(),0);});
for(const [name,payload] of [['invalid JSON','{'],['array','[]'],['null','null'],['UTF8',new Uint8Array([0xc3,0x28])],['oversized','x'.repeat(128*1024+1)]])test(`${name} body rejected`,async()=>{
 const h=harness();assert.equal((await h.handler(request(payload))).status,400);assert.equal(h.opened(),0);
});
for(const [outcome,fail,status] of [['accepted',false,200],['duplicate',false,200],['rejected',false,400],['accepted',true,503]])test(`${outcome}/${status} survives cleanup failure without leaking diagnostics`,async()=>{
 const h=harness(env(),{outcome,fail,closeThrows:true});const r=await h.handler(request());assert.equal(r.status,status);
 assert.ok(!(await r.text()).includes('private'));assert.equal(h.calls.length,1);assert.equal(h.closed(),1);
});
const dbEnv=()=>({...env(),FEH_ACK_INGESTOR_DATABASE_URL:`postgresql://feh_ack_preview_ingestor.${project}:synthetic-password-01234567890123456789@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`,
 FEH_INTAKE_RECEIVER_DATABASE_URL:`postgresql://feh_intake_preview_receiver.${project}:synthetic-password-01234567890123456789@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`});
test('Google runtime admits only existing restricted ingestion identities; never worker or admin',()=>{
 assert.ok(readPreviewDatabaseConfiguration('ingestor',dbEnv()));assert.ok(readPreviewDatabaseConfiguration('receiver',dbEnv()));
 assert.equal(createPreviewAcknowledgementDatabase('worker',dbEnv(),()=>assert.fail('worker must not connect')),null);
 const e=dbEnv();e.FEH_ACK_INGESTOR_DATABASE_URL=e.FEH_ACK_INGESTOR_DATABASE_URL.replace('feh_ack_preview_ingestor.','postgres.');
 assert.equal(createPreviewAcknowledgementDatabase('ingestor',e,()=>assert.fail('admin must not connect')),null);
});
for(const kind of ['ingestor','receiver'])test(`${kind}: Google-only SQL allowlist stays pinned after environment mutation`,async()=>{
 const e=dbEnv();let transactions=0;
 const client=createPreviewAcknowledgementDatabase(kind,e,()=>({async begin(){transactions++;throw new Error('unexpected query');},async end(){}}));
 assert.ok(client);delete e.FEH_INTAKE_RUNTIME;
 for(const name of ['ingest_meta_lead_with_acknowledgement','create_execution_authorization','stop_execution','prepare_execution_dispatch','complete_execution_dispatch_success']){
  assert.ok((await client.rpc(name,{})).error);
 }
 assert.ok((await client.rpc('ingest_external_lead',{p_provider:'meta'})).error);
 assert.equal(transactions,0);await client.close();
});
test('both Edge manifests have resolved local imports and the new entry reads no worker/provider/admin settings',async()=>{
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');const destination=await mkdtemp(resolve(tmpdir(),'feh-google-build-test-'));
 try{
  for(const script of ['build-google-receiver.mjs','build-intake-receiver.mjs']){
   const out=resolve(destination,script);const built=spawnSync(process.execPath,[resolve(root,'scripts',script),out],{encoding:'utf8'});
   assert.equal(built.status,0,built.stderr);const files=JSON.parse(await readFile(resolve(out,'deployment-files.json'),'utf8'));
   const paths=new Set(files.map(f=>f.file));assert.equal(paths.size,files.length);
   for(const file of files.filter(f=>f.file.endsWith('.mjs'))){
    assert.equal(spawnSync(process.execPath,['--check',resolve(out,file.file)],{encoding:'utf8'}).status,0,file.file);
    for(const [,specifier] of file.data.matchAll(/from\s+['"](\.[^'"]+)['"]/g))assert.ok(paths.has(resolve('/',dirname(file.file),specifier).slice(1)),`${file.file}: ${specifier}`);
   }
   if(script==='build-google-receiver.mjs'){
    assert.equal(files.length,11);const entry=files.find(f=>f.file==='index.ts').data;
    assert.doesNotMatch(entry,/WORKER|TELNYX|META_|SERVICE_ROLE|SECRET_KEY|STOP|RELEASE/);
    assert.match(entry,/FEH_GOOGLE_RECEIVER_ENABLED/);assert.match(entry,/FEH_GOOGLE_RECEIVER_SCOPE/);
    assert.match(entry,/FEH_GOOGLE_RECEIVER_TEST_STARTED_AT/);assert.match(entry,/FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT/);
    assert.ok(!files.some(f=>/worker|execution|metaIngress|telnyx/i.test(f.file)));
   }
  }
 }finally{await rm(destination,{recursive:true,force:true});}
});
