import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {createHmac} from 'node:crypto';
import {isPreviewIntakePath} from './previewIntakePath.ts';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createMetaIngressHandlers}=await import('./metaIngress.server.ts');
const {createMetaGraphReader}=await import('./metaGraph.server.ts');
const {createGoogleIngressHandler}=await import('./googleIngress.server.ts');
hook.deregister();
const base={VERCEL_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_ACK_PREVIEW_ALLOWED_PHONE:'+447700900001'};
const meta={...base,FEH_META_INGRESS_ENABLED:'true',FEH_META_PAGE_ID:'100693684801233',FEH_META_FORM_ID:'1788543365401126',FEH_META_APP_SECRET:'synthetic-app-secret-123456',FEH_META_PAGE_TOKEN:'synthetic-page-token-123456',FEH_META_VERIFY_TOKEN:'synthetic-verification-token-0123456789'};
const google={...base,FEH_GOOGLE_INGRESS_ENABLED:'true',FEH_GOOGLE_WEBHOOK_KEY:'synthetic-google-key-0123456789012345',FEH_GOOGLE_FORM_ID:'9007199254740993',FEH_GOOGLE_CAMPAIGN_ID:'1234567890'};
const eventTime=1793360000;
const metaBody=()=>({object:'page',entry:[{id:meta.FEH_META_PAGE_ID,changes:[{field:'leadgen',value:{page_id:meta.FEH_META_PAGE_ID,form_id:meta.FEH_META_FORM_ID,leadgen_id:'987654321',created_time:eventTime}}]}]});
const details=()=>({id:'987654321',form_id:meta.FEH_META_FORM_ID,created_time:new Date(eventTime*1000).toISOString(),field_data:[{name:'phone_number',values:[base.FEH_ACK_PREVIEW_ALLOWED_PHONE]},{name:'company_name',values:['Synthetic Test']} ]});
function metaRequest(body=metaBody(),signature){const raw=JSON.stringify(body);return new Request('https://preview.invalid/api/lead-intake/meta',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':signature??'sha256='+createHmac('sha256',meta.FEH_META_APP_SECRET).update(raw).digest('hex')},body:raw});}
function harness({graph=details(),outcome='accepted',error=null}={}){const calls={fetch:[],rpc:[],connections:0,closed:0};return {calls,dependencies:{fetch:async(...args)=>{calls.fetch.push(args);return new Response(JSON.stringify(graph),{headers:{'content-type':'application/json'}});},database:()=>{calls.connections++;return {async rpc(...args){calls.rpc.push(args);return {data:[{outcome,lead_id:17,acknowledgement_reserved:outcome==='accepted'}],error};},async close(){calls.closed++;}};}}};}
test('Meta valid signature, matching Graph details and fixed test phone persist one receipt',async()=>{
 const h=harness();const r=await createMetaIngressHandlers(meta,h.dependencies).POST(metaRequest());assert.equal(r.status,200);assert.deepEqual(await r.json(),{});assert.equal(h.calls.rpc.length,1);assert.equal(h.calls.closed,1);
 const [url,options]=h.calls.fetch[0];assert.equal(new URL(url).origin,'https://graph.facebook.com');assert.equal(new URL(url).pathname,'/v26.0/987654321');assert.ok(!url.includes(meta.FEH_META_PAGE_TOKEN));assert.equal(options.headers.Authorization,`Bearer ${meta.FEH_META_PAGE_TOKEN}`);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
});
test('Meta invalid signature creates no Graph or DB access',async()=>{const h=harness();assert.equal((await createMetaIngressHandlers(meta,h.dependencies).POST(metaRequest(metaBody(),'sha256'+'0'.repeat(64)))).status,400);assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.connections,0);});
for(const [name,mutate] of Object.entries({otherPhone:d=>d.field_data[0].values=['+447700900002'],wrongLead:d=>d.id='555555',duplicateField:d=>d.field_data.push(d.field_data[0]),wrongTime:d=>d.created_time='2020-01-01T00:00:00Z'}))test(`Meta ${name} never reaches the database`,async()=>{const d=details();mutate(d);const h=harness({graph:d});assert.equal((await createMetaIngressHandlers(meta,h.dependencies).POST(metaRequest())).status,400);assert.equal(h.calls.connections,0);});
for(const outcome of ['accepted','duplicate'])test(`Meta ${outcome} acknowledges without a sending call`,async()=>{const h=harness({outcome});assert.equal((await createMetaIngressHandlers(meta,h.dependencies).POST(metaRequest())).status,200);assert.equal(h.calls.rpc[0][0],'ingest_meta_lead_with_acknowledgement');});
test('Meta database failure returns retryable generic response',async()=>{const h=harness({error:new Error('private')});const r=await createMetaIngressHandlers(meta,h.dependencies).POST(metaRequest());assert.equal(r.status,503);assert.ok(!(await r.text()).includes('private'));});
test('Meta verification challenge is echoed only for exact matching token and mode',async()=>{
 const h=createMetaIngressHandlers(meta);const q=`hub.mode=subscribe&hub.verify_token=${meta.FEH_META_VERIFY_TOKEN}&hub.challenge=123456`;
 const response=await h.GET(new Request('https://preview.invalid/?'+q));assert.equal(response.status,200);assert.equal(await response.text(),'123456');
 for(const suffix of ['&hub.verify_token=other','&hub.mode=subscribe','&hub.challenge=789'])assert.equal((await h.GET(new Request('https://preview.invalid/?'+q+suffix))).status,403);
 assert.equal((await h.GET(new Request('https://preview.invalid/?'+q.replace('123456','abc')))).status,403);
});
for(const [name,changes] of Object.entries({production:{VERCEL_ENV:'production'},wrongDB:{NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'},disabled:{FEH_META_INGRESS_ENABLED:'false'},noPhone:{FEH_ACK_PREVIEW_ALLOWED_PHONE:undefined},wrongPage:{FEH_META_PAGE_ID:'123456'},noSecret:{FEH_META_APP_SECRET:undefined}}))test(`Meta ${name} stays disabled`,async()=>{const h=harness();assert.equal((await createMetaIngressHandlers({...meta,...changes},h.dependencies).POST(metaRequest())).status,404);assert.equal(h.calls.connections,0);assert.equal(h.calls.fetch.length,0);});
for(const [name,response] of Object.entries({error:()=>new Response('private',{status:403}),html:()=>new Response('<html>',{headers:{'content-type':'text/html'}}),large:()=>new Response('x'.repeat(128*1024+1),{headers:{'content-type':'application/json'}}),badJson:()=>new Response('{',{headers:{'content-type':'application/json'}})}))test(`Graph ${name} rejects without exposing provider content`,async()=>{
 let calls=0;const reader=createMetaGraphReader({pageId:meta.FEH_META_PAGE_ID,formId:meta.FEH_META_FORM_ID,appSecret:meta.FEH_META_APP_SECRET,pageToken:meta.FEH_META_PAGE_TOKEN},async()=>{calls++;return response();});
 await assert.rejects(reader({pageId:meta.FEH_META_PAGE_ID,formId:meta.FEH_META_FORM_ID,leadId:'987654321',createdTime:eventTime}),{message:'meta_unavailable'});assert.equal(calls,1);
});
const googleBody=()=>({lead_id:'google_synthetic_123',form_id:google.FEH_GOOGLE_FORM_ID,campaign_id:google.FEH_GOOGLE_CAMPAIGN_ID,google_key:google.FEH_GOOGLE_WEBHOOK_KEY,is_test:true,lead_submit_time:'2026-10-30T12:00:00Z',user_column_data:[{column_id:'PHONE_NUMBER',string_value:base.FEH_ACK_PREVIEW_ALLOWED_PHONE},{column_id:'FULL_NAME',string_value:'Synthetic Test'},{column_id:'UNUSED_NEW_FIELD',string_value:'not retained'}]});
const googleRequest=(body=googleBody())=>new Request('https://preview.invalid/api/lead-intake/google',{method:'POST',headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
test('Google verified test lead maps exact IDs and ignores new unneeded fields',async()=>{const h=harness();const r=await createGoogleIngressHandler(google,h.dependencies.database)(googleRequest());assert.equal(r.status,200);assert.equal(h.calls.rpc[0][0],'ingest_google_lead_with_acknowledgement');assert.equal(h.calls.rpc[0][1].p_form_id,'9007199254740993');assert.ok(!JSON.stringify(h.calls.rpc).includes('not retained'));});
test('Google int64 JSON numeric form IDs retain exact digits',async()=>{const h=harness();const raw=JSON.stringify(googleBody()).replace('"9007199254740993"','9007199254740993').replace('"1234567890"','1234567890');assert.equal((await createGoogleIngressHandler(google,h.dependencies.database)(googleRequest(raw))).status,200);assert.equal(h.calls.rpc[0][1].p_form_id,'9007199254740993');});
for(const [name,mutate,status] of [
 ['wrong key',p=>p.google_key='wrong',403],['wrong form',p=>p.form_id='123456',400],['wrong campaign',p=>p.campaign_id='999',400],
 ['real lead',p=>p.is_test=false,400],['no test marker',p=>delete p.is_test,400],['other phone',p=>p.user_column_data[0].string_value='+447700900002',400],
 ['duplicate phone',p=>p.user_column_data.push(p.user_column_data[0]),400],['missing timestamp',p=>delete p.lead_submit_time,400],['agent source',p=>p.lead_source='CONVERSATIONAL_AGENT',400],
])test(`Google ${name} causes no database access`,async()=>{const h=harness();const body=googleBody();mutate(body);assert.equal((await createGoogleIngressHandler(google,h.dependencies.database)(googleRequest(body))).status,status);assert.equal(h.calls.connections,0);});
test('Google duplicate receives 200 and cannot create a second reservation',async()=>{const h=harness({outcome:'duplicate'});assert.equal((await createGoogleIngressHandler(google,h.dependencies.database)(googleRequest())).status,200);assert.equal(h.calls.rpc.length,1);});
for(const [name,changes] of Object.entries({production:{VERCEL_ENV:'production'},disabled:{FEH_GOOGLE_INGRESS_ENABLED:'false'},missingForm:{FEH_GOOGLE_FORM_ID:undefined},missingKey:{FEH_GOOGLE_WEBHOOK_KEY:undefined},missingPhone:{FEH_ACK_PREVIEW_ALLOWED_PHONE:undefined}}))test(`Google ${name} is disabled`,async()=>{const h=harness();assert.equal((await createGoogleIngressHandler({...google,...changes},h.dependencies.database)(googleRequest())).status,404);assert.equal(h.calls.connections,0);});
test('only exact staging machine-intake paths bypass CRM login',()=>{
 for(const path of ['/api/lead-intake/meta','/api/lead-intake/google','/api/lead-intake/readiness']){assert.equal(isPreviewIntakePath(path,base),true);assert.equal(isPreviewIntakePath(path,{...base,VERCEL_ENV:'production'}),false);}
 for(const path of ['/api/lead-intake/meta/extra','/api/lead-intake/google-admin','/leads','/api/sms/send'])assert.equal(isPreviewIntakePath(path,base),false);
});
