import Link from 'next/link';
import {readAutomaticRules,executionStates} from '@/lib/lead-gateway/automaticRuleReview.server';
import {SubmitButton} from '../acknowledgement-permission-preview/SubmitButton';
import {automaticRuleClient} from './session';
import {adoptStagingRule} from './actions';
export const dynamic='force-dynamic';
const panel='space-y-4 rounded-xl border border-slate-200 bg-white p-6';
export default async function RuleReviewPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const state=await readAutomaticRules(await automaticRuleClient());
  const error=(await searchParams).error;
  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950"><div className="mx-auto max-w-3xl space-y-6">
    <Link href="/" className="text-sm underline">Back to CRM</Link>
    <header className="space-y-3"><p className="font-semibold text-emerald-800">Free Energy Help · Staging only</p>
      <h1 className="text-3xl font-bold">Review the acknowledgement test rule</h1>
      <p>This approval applies to one new enquiry from the displayed form and test number, for 15 minutes. It records your permission for the automatic workflow; it does not operate the sending stop or send a message when you click.</p>
      <p>Customer contact permission must still arrive from the verified form. Your earlier fictional wording review cannot supply that permission. Advertising and production require separate approval.</p>
    </header>
    {error && <p role="alert" className={panel}>The approval request was not confirmed. Check the saved status below. A repeated click cannot renew or extend an approval.</p>}
    {state.status!=='ready'?<section className={panel} role="status">The staging rule could not be verified for your account. Nothing has been approved.</section>:
      state.bindings.length===0?<section className={panel} role="status">No reviewed form has been prepared for your account yet. There is nothing for you to fill in here. The implementation needs its verified form details first.</section>:
      state.bindings.map(b=><section key={b.id} className={panel}>
        <h2 className="text-xl font-semibold">{b.provider==='meta'?'Meta / Instagram':'Google'} acknowledgement</h2>
        <dl className="grid gap-2 text-sm"><dt className="font-semibold">Form / campaign</dt><dd>{b.form_id} / {b.campaign_id}</dd>
          <dt className="font-semibold">Test number</dt><dd>{b.phone}</dd><dt className="font-semibold">Reviewed notice version</dt><dd>{b.notice_version}</dd>
          <dt className="font-semibold">Form review evidence</dt><dd className="break-words">{b.review_reference}</dd></dl>
        <h3 className="font-semibold">What the customer sees</h3><blockquote className="border-l-4 border-emerald-700 pl-4">{b.notice_text}</blockquote>
        <p>Permission answer: “{b.yes_answer}”. “{b.no_answer}”, missing, uncertain or conflicting answers prevent sending.</p>
        <h3 className="font-semibold">The acknowledgement text</h3><blockquote className="border-l-4 border-slate-400 pl-4">{b.message}</blockquote>
        {b.rule_id?<div role="status"><p className="font-semibold">{b.used?'Test allowance used':b.expired?'Approval expired':'Approval recorded'}</p>
          <p>Recorded {b.approved_at}; expires {b.expires_at}. Maximum one enquiry.</p>
          <p>{executionStates[b.execution_state]}. A saved approval or prepared attempt is not a delivery confirmation.</p></div>:
          !b.can_approve?<p role="status">Approval is not available: the required owner authorisation has not been provisioned. This page cannot grant it.</p>:
          <form action={adoptStagingRule} className="space-y-4"><input type="hidden" name="binding" value={b.id}/><input type="hidden" name="fingerprint" value={b.fingerprint}/>
            <label className="flex items-start gap-3"><input type="checkbox" name="confirm" value="yes" required className="mt-1 size-5 shrink-0"/>
              <span>I approve this exact wording and rule for one new staging enquiry at the displayed test number within the next 15 minutes. Customer permission, suppression, sending-stop and adapter checks must still pass.</span></label>
            <SubmitButton>Approve this bounded staging rule</SubmitButton></form>}
      </section>)}
  </div></main>;
}
