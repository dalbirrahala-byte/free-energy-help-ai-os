import assert from 'node:assert/strict';
import test from 'node:test';
import {createOperator} from './direct-intake-operator.mjs';
const token='b'.repeat(64);
const start=Date.UTC(2026,10,16);
const env={SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co',FEH_VERIFY_START:new Date(start).toISOString(),
  FEH_VERIFY_END:new Date(start+900000).toISOString(),FEH_VERIFY_OPERATOR_TOKEN:token,FEH_VERIFY_GOOGLE_ID:'fixed'};
const request=(route,headers={},options={})=>new Request('https://example.invalid/functions/v1/feh-direct-intake-operator/'+route,{method:'POST',headers,...options});
test('disabled outside staging or time window',async()=>{
  for(const [settings,time] of [[env,start-1],[env,start+900000],[{...env,SUPABASE_URL:'other'},start]]){
    const handle=createOperator(settings,()=>assert.fail(),()=>time);
    assert.equal((await handle(request('meta'))).status,404);
  }
});
test('rejects missing caller token and caller-controlled payloads',async()=>{
  const handle=createOperator(env,()=>assert.fail(),()=>start);
  assert.equal((await handle(request('google'))).status,403);
  assert.equal((await handle(request('google',{'x-feh-operator':token},{body:'{}'}))).status,400);
});
test('only operator-selected fixture can be replayed',async()=>{
  const seen=[];
  const handle=createOperator(env,async args=>{seen.push(args);return {http:200}},()=>start);
  for(const route of ['google','google','meta'])assert.equal((await handle(request(route,{'x-feh-operator':token}))).status,200);
  assert.deepEqual(seen,[['google-test','fixed'],['google-test','fixed'],['meta-test']]);
});
test('accepts a zero-byte POST stream from a gateway',async()=>{
  const handle=createOperator(env,async()=>({http:200}),()=>start);
  const empty=request('google',{'x-feh-operator':token},{body:new Uint8Array(0)});
  assert.ok(empty.body);
  assert.equal((await handle(empty)).status,200);
});

test('authenticated Meta errors expose only the stage and numeric codes', async () => {
  const {verify}=await import('./verify-direct-intake.mjs');
  const settings={...env,FEH_META_PAGE_TOKEN:'synthetic-token',FEH_META_APP_SECRET:'synthetic-secret'};
  const check=async(requestImpl, expected)=>{
    const handle=createOperator(settings,(args,e)=>verify(args,e,requestImpl),()=>start);
    const response=await handle(request('meta',{'x-feh-operator':token}));
    assert.equal(response.status,502);
    assert.deepEqual(await response.json(),expected);
  };
  await check(async()=>Response.json({error:{code:190,error_subcode:463,message:'private message',fbtrace_id:'private'}},{status:400}),
    {stage:'graph_response',httpStatus:400,code:190,subcode:463});
  await check(async()=>Response.json({error:{code:'private',error_subcode:[]}}, {status:403}),
    {stage:'graph_response',httpStatus:403,code:null,subcode:null});
  await check(async()=>{throw Error('private URL')},{stage:'transport',httpStatus:null,code:null,subcode:null});
  await check(async()=>new Response('private non-JSON response',{status:503}),
    {stage:'response_decode',httpStatus:503,code:null,subcode:null});
  await check(async()=>Response.json({data:[null]}),{stage:'test_lead_identity',httpStatus:200,code:null,subcode:null});
});
