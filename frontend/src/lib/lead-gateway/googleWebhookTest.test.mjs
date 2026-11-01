import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createGoogleWebhookTestHandler}=await import('./googleWebhookTest.server.ts');
const {createIntakeReceiver}=await import('./intakeReceiver.server.ts');
const {createPreviewAcknowledgementDatabase,readPreviewDatabaseConfiguration}=await import('./previewDatabase.server.ts');
hook.deregister();
const env={FEH_INTAKE_RUNTIME:'supabase-edge',SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_INTAKE_RECEIVER_ENABLED:'true',FEH_INTAKE_RECEIVER_EXPIRES_AT:'2026-11-06T23:59:59Z',FEH_GOOGLE_INGRESS_ENABLED:'true',FEH_ACK_DATABASE_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_GOOGLE_FORM_ID:'402325113451',FEH_GOOGLE_CAMPAIGN_ID:'24096131756',FEH_GOOGLE_WEBHOOK_KEY:'synthetic-google-ui-key-01234567890123'};
const body=()=>({lead_id:'google_dashboard_synthetic_123',form_id:402325113451,campaign_id:123456,is_test:true,google_key:env.FEH_GOOGLE_WEBHOOK_KEY,user_column_data:[{column_id:'FULL_NAME',string_value:'FirstName LastName'},{column_id:'PHONE_NUMBER',string_value:'1-650-555-0123'},{column_id:'EMAIL',string_value:'test@example.com'}]});
const req=(p=body())=>new Request('https://receiver.invalid/functions/v1/feh-staging-lead-intake/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)});
function db({outcome='accepted',error=null}={}){const calls=[];let closed=0;return {calls,closed:()=>closed,factory:()=>({async rpc(...args){calls.push(args);return {data:[{outcome,lead_id:23}],error};},async close(){closed++;}})};}
test('documented Google UI fixture persists with absent provider time and no SMS reservation',async()=>{
 const h=db();const result=await createGoogleWebhookTestHandler(env,h.factory)(req());
 assert.equal(result.status,200);assert.deepEqual(await result.json(),{});assert.equal(h.closed(),1);
 assert.deepEqual(h.calls,[['ingest_external_lead',{p_provider:'google_ads',p_external_lead_id:'google_dashboard_synthetic_123',p_provider_created_at:null,p_consent_status:'unknown',p_company_name:'FEH synthetic Google webhook test',p_contact_name:'FirstName LastName',p_telephone:'+16505550123',p_email:'test@example.com',p_utm_campaign:'123456'}]]);
});
test('fixture accepts actual pinned campaign and preserves supplied timestamp',async()=>{const p=body();p.campaign_id=24096131756;p.lead_submit_time='2026-11-01T15:00:00Z';const h=db();assert.equal((await createGoogleWebhookTestHandler(env,h.factory)(req(p))).status,200);assert.equal(h.calls[0][1].p_provider_created_at,p.lead_submit_time);assert.equal(h.calls[0][1].p_utm_campaign,'24096131756');});
test('fixture replay uses the same durable provider identity and acknowledges duplicate',async()=>{const h=db({outcome:'duplicate'});assert.equal((await createGoogleWebhookTestHandler(env,h.factory)(req())).status,200);assert.equal(h.calls[0][0],'ingest_external_lead');});
for(const [name,mutate,status] of [
 ['key',p=>p.google_key='wrong',403],['form',p=>p.form_id=123456789,400],['campaign',p=>p.campaign_id=333,400],['real marker',p=>p.is_test=false,400],['missing marker',p=>delete p.is_test,400],
 ['real phone',p=>p.user_column_data[1].string_value='+447700900001',400],['real name',p=>p.user_column_data[0].string_value='Actual Person',400],['real email',p=>p.user_column_data[2].string_value='customer@business.example',400],
 ['duplicate column',p=>p.user_column_data.push(p.user_column_data[1]),400],['invalid time',p=>p.lead_submit_time='bad',400],['agent source',p=>p.lead_source='CONVERSATIONAL_AGENT',400],['missing phone',p=>p.user_column_data.splice(1,1),400],
])test(`fixture rejects ${name} before DB`,async()=>{const p=body();mutate(p);const h=db();assert.equal((await createGoogleWebhookTestHandler(env,h.factory)(req(p))).status,status);assert.equal(h.calls.length,0);});
for(const [name,changes] of Object.entries({production:{SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},project:{NEXT_PUBLIC_SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'},disabled:{FEH_INTAKE_RECEIVER_ENABLED:'false'},dbDisabled:{FEH_ACK_DATABASE_ENABLED:'false'},noKey:{FEH_GOOGLE_WEBHOOK_KEY:undefined},wrongForm:{FEH_GOOGLE_FORM_ID:'123456'}}))test(`fixture ${name} remains closed`,async()=>{const h=db();assert.equal((await createGoogleWebhookTestHandler({...env,...changes},h.factory)(req())).status,404);assert.equal(h.calls.length,0);});
test('database error is retryable and no private response escapes',async()=>{const h=db({error:new Error('private database credential')});const r=await createGoogleWebhookTestHandler(env,h.factory)(req());assert.equal(r.status,503);assert.ok(!(await r.text()).includes('credential'));assert.equal(h.closed(),1);});
test('public receiver exposes only the exact intake path and POST',async()=>{
 let count=0;const handler=createIntakeReceiver(env,{now:()=>Date.parse('2026-11-01T15:00:00Z'),google:async()=>{count++;return Response.json({});}});
 for(const path of ['/','/login','/leads','/api/lead-intake/readiness','/api/lead-acknowledgements/run','/api/index','/functions/v1/feh-staging-lead-intake/google/extra'])assert.equal((await handler(new Request('https://receiver.invalid'+path,{method:'POST'}))).status,404);
 for(const method of ['GET','PUT','DELETE','OPTIONS'])assert.equal((await handler(new Request('https://receiver.invalid/functions/v1/feh-staging-lead-intake/google',{method}))).status,405);
 assert.equal(count,0);assert.equal((await handler(req())).status,200);assert.equal(count,1);
});
for(const changes of [{FEH_INTAKE_RECEIVER_EXPIRES_AT:undefined},{FEH_INTAKE_RECEIVER_EXPIRES_AT:'2027-01-01T00:00:00Z'},{FEH_INTAKE_RECEIVER_EXPIRES_AT:'2026-10-31T00:00:00Z'},{SUPABASE_URL:'https://kupuswwutonsagftivkv.supabase.co'}])test(`receiver window closed ${JSON.stringify(changes)}`,async()=>{const handler=createIntakeReceiver({...env,...changes},{now:()=>Date.parse('2026-11-01T15:00:00Z'),google:async()=>assert.fail('disabled')});assert.equal((await handler(req())).status,404);});
test('dedicated receiver connection cannot use admin, worker or original ingestor login',async()=>{
 const config={...env,FEH_INTAKE_RECEIVER_DATABASE_URL:'postgresql://feh_intake_preview_receiver.vredwhyphrhsudggrsen:synthetic-not-a-live-password-0123456789@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'};
 assert.ok(readPreviewDatabaseConfiguration('receiver',config));
 for(const login of ['postgres','feh_ack_preview_worker','feh_ack_preview_ingestor'])assert.equal(readPreviewDatabaseConfiguration('receiver',{...config,FEH_INTAKE_RECEIVER_DATABASE_URL:config.FEH_INTAKE_RECEIVER_DATABASE_URL.replace('feh_intake_preview_receiver',login)}),null);
 const client=createPreviewAcknowledgementDatabase('receiver',config,()=>({begin:async()=>assert.fail('unexpected transaction'),end:async()=>{}}));
 for(const rpc of ['create_execution_authorization','stop_execution','claim_meta_lead_acknowledgement','select_lead_acknowledgement_candidate','ingest_google_lead_with_acknowledgement','ingest_meta_lead_with_acknowledgement'])assert.ok((await client.rpc(rpc,{})).error);
});
