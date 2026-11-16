import assert from 'node:assert/strict';
import test from 'node:test';
import {verify} from './verify-direct-intake.mjs';

test('fresh ID then same Google sample twice, staging only',async()=>{
  const {leadId}=await verify(['new-id']);
  assert.notEqual(leadId,(await verify(['new-id'])).leadId);
  const requests=[];
  const send=async(url,opts)=>{
    assert.equal(new URL(url).hostname,'vredwhyphrhsudggrsen.supabase.co');
    assert.equal(opts.redirect,'error');
    requests.push(opts.body);
    return new Response(null,{status:200});
  };
  for(let i=0;i<2;i++) assert.equal((await verify(['google-test',leadId],{FEH_GOOGLE_WEBHOOK_KEY:'x'.repeat(40)},send)).databaseVerification,'required');
  assert.equal(requests[0],requests[1]);
  assert.equal(JSON.parse(requests[0]).is_test,true);
});
test('reject arbitrary ID before posting',async()=>{
  await assert.rejects(verify(['google-test','customer'],{},()=>assert.fail('request')));
});
test('Meta inspects only test_leads and hides unknown values and absent campaign',async()=>{
  const privateValue='private synthetic answer';
  const result=await verify(['meta-test'],{FEH_META_PAGE_TOKEN:'test',FEH_META_APP_SECRET:'test'}, async(url,opts)=>{
    assert.equal(url.pathname,'/v26.0/1831927117943843/test_leads');
    assert.equal(opts.redirect,'error');
    return Response.json({data:[{form_id:'1831927117943843',id:'12345678',field_data:[{name:'feh_sms_ack_v1',values:[privateValue]}]}]});
  });
  assert.equal(result.campaignId,null);
  assert.equal(result.smsAnswer,null);
  assert.ok(!JSON.stringify(result).includes(privateValue));
});
