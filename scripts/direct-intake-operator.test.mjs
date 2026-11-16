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
