import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c);}});
const {createFormPermissionCapture:create}=await import('./formPermissionCapture.server.ts');
const {readAutomaticRules,approveAutomaticRule}=await import('./automaticRuleReview.server.ts');
const {FEH_ACKNOWLEDGEMENT_V2_COPY}=await import('../execution-dispatch/telnyxAcknowledgementAdapter.ts');
hook.deregister();
const id='00000000-0000-4000-8000-000000000001';
for(const provider of ['meta','google_ads']) {
 const prefix=provider==='meta'?'FEH_ACK_META_PERMISSION':'FEH_ACK_GOOGLE_PERMISSION';
 const env={FEH_ACK_PERMISSION_CAPTURE_ENABLED:'true',[`${prefix}_BINDING_ID`]:id,[`${prefix}_QUESTION_KEY`]:'synthetic_permission'};
 const field=answer=>provider==='meta'?{name:'synthetic_permission',values:[answer]}:{column_id:'synthetic_permission',string_value:answer};
 const input=fields=>({leadId:42,submittedAt:'2026-11-05T23:00:00Z',fields});
 function harness(result='recorded',changes={}) {
   const calls=[];let closed=0;
   const capture=create({...env,...changes},provider,()=>({async rpc(name,args){calls.push({name,args});if(result instanceof Error)throw result;return {data:result,error:null};},async close(){closed++;}}));
   return {capture,calls,closed:()=>closed};
 }
 for(const answer of ['Yes','No','not sure','yes'])test(`${provider}: records exact answer ${answer}, no inferred permission`,async()=>{
   const h=harness(); assert.equal(await h.capture(input([field(answer),{unrelated:'private information'}])),true);
   assert.deepEqual(h.calls,[{name:'record_permission',args:{p_binding_id:id,p_lead_id:42,p_submitted_at:'2026-11-05T23:00:00Z',p_question_key:'synthetic_permission',p_answer:answer}}]);
   assert.equal(h.closed(),1);
 });
 for(const [name,fields] of [['missing',[]],['duplicate',[field('Yes'),field('No')]],['oversize',[field('y'.repeat(201))]],['control',[field('Yes\0')]],['boolean',[field(true)]]])test(`${provider}: ${name} cannot be promoted to YES`,async()=>{
   const h=harness();assert.equal(await h.capture(input(fields)),true);assert.equal(h.calls[0].args.p_answer,'');
 });
 test(`${provider}: database error requests intake recovery, never prints error or retries internally`,async()=>{
   const h=harness(new Error('secret provider diagnostic'));assert.equal(await h.capture(input([field('Yes')])),false);assert.equal(h.calls.length,1);assert.equal(h.closed(),1);
 });
 test(`${provider}: disabled or invalid binding cannot connect`,async()=>{
   assert.equal(harness('recorded',{FEH_ACK_PERMISSION_CAPTURE_ENABLED:'false'}).capture,undefined);
   const h=harness('recorded',{[`${prefix}_BINDING_ID`]:'bad'});assert.equal(await h.capture(input([field('Yes')])),false);assert.equal(h.calls.length,0);
 });
}
const binding=()=>({id,fingerprint:'a'.repeat(64),provider:'google_ads',form_id:'654321',page_id:null,campaign_id:'123456',question_key:'synthetic_permission',
 yes_answer:'Yes',no_answer:'No',notice_version:'test-v1',notice_text:'Synthetic notice',review_reference:'local-fixture',phone:'+447700900001',message:FEH_ACKNOWLEDGEMENT_V2_COPY,
 cap:1,window_minutes:15,can_approve:true,rule_id:null,approved_at:null,expires_at:null,used:false,expired:false,execution_state:'not_authorised'});
function client(b=binding(),result='approved'){const calls=[];return {calls,async rpc(name,args){calls.push({name,args});return {error:null,data:name==='get_ack_automatic_rule_review'?{status:'ready',bindings:[b]}:result};}};}
test('owner screen records only exact reviewed binding and server-generated approval reference',async()=>{
 const c=client(); assert.equal(await approveAutomaticRule(c,{id,fingerprint:'a'.repeat(64),confirm:'yes'}),true);
 assert.equal(c.calls[1].name,'approve_ack_automatic_rule');assert.deepEqual(Object.keys(c.calls[1].args),['p_binding_id','p_fingerprint','p_reference']);
 assert.match(c.calls[1].args.p_reference,/^[0-9a-f-]{36}$/);
});
for(const [name,mutate] of [['wrong copy',b=>b.message='Guaranteed savings'],['larger cap',b=>b.cap=2],['longer window',b=>b.window_minutes=60],['grant missing',b=>b.can_approve=false],['used without rule',b=>b.used=true]])test(`owner approval blocks ${name}`,async()=>{
 const b=binding();mutate(b);const c=client(b);assert.equal(await approveAutomaticRule(c,{id,fingerprint:'a'.repeat(64),confirm:'yes'}),false);assert.equal(c.calls.length,1);
});
test('tampered/stale page cannot approve the currently different binding',async()=>{
 const c=client();assert.equal(await approveAutomaticRule(c,{id,fingerprint:'b'.repeat(64),confirm:'yes'}),false);assert.equal(c.calls.length,1);
 assert.equal(await approveAutomaticRule(c,{id,fingerprint:'a'.repeat(64),confirm:null}),false);assert.equal(c.calls.length,1);
});
test('lost approval response remains unconfirmed; no retry',async()=>{
 const c=client();const rpc=c.rpc.bind(c);c.rpc=async(n,a)=>{if(n==='approve_ack_automatic_rule')throw new Error('private');return rpc(n,a);};
 assert.equal(await approveAutomaticRule(c,{id,fingerprint:'a'.repeat(64),confirm:'yes'}),false);
 assert.equal((await readAutomaticRules({rpc:async()=>({data:null,error:'unavailable'})})).status,'unavailable');
});
