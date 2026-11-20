import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PATH,validPayload,validReceipt} from '../source/contract.ts';
import type {Payload} from '../source/contract.ts';
import {createReceiver,signature} from '../source/receiver.ts';
import {deliver} from '../source/client.ts';
import {createStore} from '../source/store.ts';
const key='synthetic-fixture-only-no-runtime-authority';
for(const [label,clock] of [
 ['NaN',()=>NaN],['infinite',()=>Infinity],['throwing',()=>{throw Error('PRIVATE_CLOCK_ERROR');}]
] as const){test('sender blocks '+label+' clock without transport or uncertain outcome',async()=>{
 let calls=0,clocks=0;
 const result=await deliver(fixture(),{...deps(async()=>{calls++;return json(receipt());}),now:()=>{clocks++;return clock();}});
 assert.deepEqual(result,{ok:false,httpStatus:null,simulated:false,endpointAbsent:false,uncertain:false,error:'clock_unavailable'});
 assert.equal(calls,0);assert.equal(clocks,1);
});}
for(const [label,clock] of [
 ['NaN',()=>NaN],['infinite',()=>Infinity],['throwing',()=>{throw Error('PRIVATE_CLOCK_ERROR');}]
] as const){test('receiver fails closed for '+label+' clock before body read or persistence',async()=>{
 let saves=0,reads=0;
 const req=request(undefined,String(now/1000-301));
 Object.defineProperty(req,'body',{get(){reads++;throw Error('must not read body');}});
 const result=await createReceiver({key,now:clock,save:async()=>{saves++;throw Error('must not save');}})(req);
 assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'clock_unavailable'});
 assert.equal(saves,0);assert.equal(reads,0);
});}
const now=Date.parse('2026-11-17T21:00:00.000Z');
const endpoint='https://crm.example.invalid'+PATH;
const fixture=():Payload=>({submissionId:'00000000-0000-4000-8000-000000000001',submittedAt:'2026-11-17T20:00:00.000Z',businessName:'Synthetic Business',contactName:'Synthetic Person',email:'test@example.invalid',phone:null,meterNumbers:null,currentSupplier:'Synthetic Supplier',message:'Synthetic enquiry',smsConsent:null,attribution:{utmSource:'synthetic',utmMedium:null,utmCampaign:null,utmContent:null,utmTerm:null,gclid:null,fbclid:null},sourcePage:'/quote'});
function request(body=JSON.stringify(fixture()),ts=String(now/1000),signatureKey=key){return new Request(endpoint,{method:'POST',headers:{'content-type':'application/json','x-feh-timestamp':ts,'x-feh-signature':'v1='+signature(signatureKey,ts,body)},body});}
function deps(transport:(u:string,i:RequestInit)=>Promise<Response>){return {endpoint,approvedEndpoint:endpoint,key,now:()=>now,transport};}
function receipt(p=fixture(),outcome='created'){return {version:1,submissionId:p.submissionId,outcome,leadId:'1'};}
function json(body:unknown,status=201){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});}
// No global network transport can accidentally be used by these tests.
globalThis.fetch=async()=>{throw Error('network forbidden');};
test('signed sender -> receiver -> committed mock receipt; fields preserved, no consent invention',async()=>{
 let calls=0;const p=fixture();const receive=createReceiver({key,now:()=>now,save:async got=>{calls++;assert.deepEqual(got,p);assert.equal(got.smsConsent,null);return receipt(got) as any;}});
 const result=await deliver(p,deps(async(u,i)=>{assert.equal(i.redirect,'error');return receive(new Request(u,i));}));
 assert.equal(result.ok,true);assert.equal(result.simulated,false);assert.equal(calls,1);
});
test('duplicate and conflict contract under concurrent requests (in-memory store, not PostgreSQL proof)',async()=>{
 const map=new Map<string,{hash:string;id:string}>();let creates=0;
 const receive=createReceiver({key,now:()=>now,save:async p=>{
 const hash=createHash('sha256').update(JSON.stringify(p)).digest('hex');const old=map.get(p.submissionId);
 if(old)return old.hash===hash?{...receipt(p,'duplicate'),leadId:old.id} as any:{outcome:'conflict'};
 const id=String(++creates);map.set(p.submissionId,{hash,id});return {...receipt(p),leadId:id} as any;
 }});
 const results=await Promise.all([receive(request()),receive(request())]);assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);assert.equal(creates,1);
 const p=fixture();p.businessName='Different';assert.equal((await receive(request(JSON.stringify(p)))).status,409);assert.equal(creates,1);
});
for(const [label,req]of [
 ['missing signature',()=>new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(fixture())})],
 ['wrong key',()=>request(undefined,undefined,'wrong-key-that-is-long-enough-for-test')],
 ['stale timestamp',()=>request(undefined,String(now/1000-301))],
 ['future timestamp',()=>request(undefined,String(now/1000+301))],
 ['tampered signed body',()=>{const r=request();return new Request(endpoint,{method:'POST',headers:r.headers,body:JSON.stringify({...fixture(),message:'tampered'})});}]
]as const){test('authentication rejects '+label+' before persistence',async()=>{let calls=0;const r=await createReceiver({key,now:()=>now,save:async()=>{calls++;throw Error('must not run');}})(req());assert.equal(r.status,401);assert.equal(calls,0);});}
for(const [label,mutate] of [
 ['extra authority flag',(p:any)=>p.authorized=true],['sms consent boolean',(p:any)=>p.smsConsent=true],['missing email',(p:any)=>delete p.email],['missing attribution',(p:any)=>delete p.attribution],['invalid UUID',(p:any)=>p.submissionId='bad'],['invalid timestamp',(p:any)=>p.submittedAt='2026-02-30T20:00:00.000Z'],['overlong message',(p:any)=>p.message='x'.repeat(2001)],['phone object',(p:any)=>p.phone={}],['extra attribution',(p:any)=>p.attribution.permission=true],['null business',(p:any)=>p.businessName=null]
] as const){test('receiver rejects '+label,async()=>{const p=fixture();mutate(p);let calls=0;const r=await createReceiver({key,now:()=>now,save:async()=>{calls++;throw Error('must not run');}})(request(JSON.stringify(p)));assert.equal(r.status,400);assert.equal(calls,0);});}
for(const answer of ['yes','no',null]as const){test('preserves SMS answer '+String(answer),()=>{const p=fixture();p.smsConsent=answer;assert(validPayload(p));assert.equal(p.smsConsent,answer);});}
test('unconfigured receiver is closed',async()=>{assert.equal((await createReceiver(null)(request())).status,503);});
test('wrong method and path rejected',async()=>{const r=createReceiver({key,now:()=>now,save:async()=>{throw Error('must not run');}});assert.equal((await r(new Request(endpoint))).status,405);assert.equal((await r(new Request(endpoint+'?x=1',{method:'POST'}))).status,404);});
test('body size bounded before persistence',async()=>{let saved=false;const r=await createReceiver({key,now:()=>now,save:async()=>{saved=true;throw Error('must not run');}})(request('x'.repeat(32769)));assert.equal(r.status,413);assert.equal(saved,false);});
test('database error response redacted; no receipt issued',async()=>{const r=await createReceiver({key,now:()=>now,save:async()=>{throw Error('RAW-SECRET-OR-PAYLOAD');}})(request());assert.equal(r.status,503);assert(! (await r.text()).includes('RAW'));});
test('mismatched database receipt fails closed',async()=>{const r=await createReceiver({key,now:()=>now,save:async()=>({...receipt(),submissionId:'wrong'} as any)})(request());assert.equal(r.status,503);});
test('no endpoint means pending with zero transport calls',async()=>{let calls=0;const r=await deliver(fixture(),{...deps(async()=>{calls++;throw Error('no');}),endpoint:null});assert.equal(r.endpointAbsent,true);assert.equal(r.simulated,true);assert.equal(calls,0);});
for(const [label,config]of [['missing key',{key:null}],['different destination',{approvedEndpoint:'https://other.example.invalid'+PATH}],['http',{endpoint:'http://crm.example.invalid'+PATH,approvedEndpoint:'http://crm.example.invalid'+PATH}],['query',{endpoint:endpoint+'?token=x',approvedEndpoint:endpoint+'?token=x'}]]as const){test('client blocks '+label+' without transport',async()=>{let calls=0;const r=await deliver(fixture(),{...deps(async()=>{calls++;throw Error('no');}),...config});assert.equal(r.ok,false);assert.equal(calls,0);});}
for(const [label,resp]of [
 ['HTML 200',()=>new Response('<html>login</html>',{status:200,headers:{'content-type':'text/html'}})],
 ['empty 204',()=>new Response(null,{status:204})],['malformed JSON',()=>new Response('{',{status:201,headers:{'content-type':'application/json'}})],
 ['lead id beyond PostgreSQL bigint',()=>json({...receipt(),leadId:'9223372036854775808'})],
 ['wrong submission',()=>json({...receipt(),submissionId:'different'})],['missing lead id',()=>json({version:1,submissionId:fixture().submissionId,outcome:'created'})],
 ['uncommitted 202',()=>json(receipt(),202)],['500',()=>json({error:'RAW'},500)],['429',()=>json({error:'RAW'},429)],['302',()=>new Response(null,{status:302})],
 ['HTML route 404',()=>new Response('Not found',{status:404})],
 ['empty 401',()=>new Response(null,{status:401})],
 ['mismatched rejection code',()=>json({error:'unauthorized'},409)],
 ['extra rejection details',()=>json({error:'submission_conflict',debug:'RAW'},409)],
 ['oversized receipt',()=>json({...receipt(),extra:'x'.repeat(3000)})]
]as const){test('client holds ambiguous '+label+' without retry',async()=>{let calls=0;const r=await deliver(fixture(),deps(async()=>{calls++;return resp();}));assert.equal(r.ok,false);assert.equal(r.uncertain,true);assert.equal(calls,1);assert(!JSON.stringify(r).includes('RAW'));});}
test('network error classified uncertain, no raw exception or retry',async()=>{let calls=0;const r=await deliver(fixture(),deps(async()=>{calls++;throw Error('RAW');}));assert.equal(r.uncertain,true);assert.equal(calls,1);assert(!JSON.stringify(r).includes('RAW'));});
for (const [status, error] of [
 [400, 'invalid_payload'], [401, 'unauthorized'], [404, 'not_found'],
 [405, 'method_not_allowed'], [409, 'submission_conflict'], [413, 'invalid_body'],
 [415, 'content_type'],
] as const) {
 test('client holds uncorrelated JSON rejection ' + status, async () => {
  let calls = 0;
  const result = await deliver(fixture(), deps(async () => {
   calls++;
   return json({error}, status);
  }));
  assert.equal(result.ok, false);
  assert.equal(result.uncertain, true);
  assert.equal(result.httpStatus, status);
  assert.equal(calls, 1);
 });
}
test('duplicate committed receipt accepted',async()=>{const r=await deliver(fixture(),deps(async()=>json(receipt(fixture(),'duplicate'),200)));assert.equal(r.ok,true);});
test('store preserves the largest PostgreSQL bigint as exact decimal text',async()=>{
 const largest={...receipt(),leadId:'9223372036854775807'};
 const save=createStore(async()=>({rows:[{receipt:largest}]}));
 assert.deepEqual(await save(fixture()),largest);
});
test('receiver withholds the receipt when the store returns an impossible lead ID',async()=>{
 const save=createStore(async()=>({rows:[{receipt:{...receipt(),leadId:'9223372036854775808'}}]}));
 const response=await createReceiver({key,now:()=>now,save})(request());
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{error:'receipt_unavailable'});
});
test('store uses parameterized single-function query and correlated receipt',async()=>{
 let called=0;const save=createStore(async(sql,values)=>{called++;assert.equal(sql,'select public.ingest_website_enquiry($1::jsonb) as receipt');assert.equal(values.length,1);assert.deepEqual(JSON.parse(values[0] as string),fixture());return {rows:[{receipt:receipt()}]};});
 assert(validReceipt(await save(fixture()),fixture().submissionId));assert.equal(called,1);
});
test('store rejects missing or mismatched receipt',async()=>{await assert.rejects(createStore(async()=>({rows:[]}))(fixture()));await assert.rejects(createStore(async()=>({rows:[{receipt:{...receipt(),submissionId:'wrong'}}]}))(fixture()));});
test('SQL structural checks only: no grants, no permission upgrade, unique receipt, atomic audit',()=>{
 const sql=readFileSync(new URL('../source/website-enquiries.sql',import.meta.url),'utf8');
 assert(!/^\s*grant\s/im.test(sql));assert(sql.includes('submission_id uuid primary key'));assert(sql.includes('pg_advisory_xact_lock'));assert(sql.includes("'user-entered',false"));assert(sql.includes('alter table public.website_enquiry_receipts enable row level security'));assert(sql.includes('insert into public.audit_log'));assert(!sql.includes('exception when others'));assert(!sql.includes('set role'));
});

