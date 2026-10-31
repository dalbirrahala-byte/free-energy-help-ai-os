import {notFound} from 'next/navigation';
import Link from 'next/link';
import {requireUser} from '@/lib/auth/session';
import {createClient} from '@/lib/supabase/server';
import {FEH_ADMINISTRATIVE_SMS_COPY} from '@/lib/lead-gateway/acknowledgementReview';
import {isOwnerTestPreview} from '@/lib/lead-gateway/ownerTestControl.server';
import {prepareOwnerTest,runOwnerTest,closeOwnerTest} from './actions';

export const dynamic='force-dynamic';
export const maxDuration=120;
const messages:Record<string,string>={
  blocked:'The test is not authorised to run. No sending permission was assumed.',
  prepared:'Your approval and the test enquiry are saved. Sending is still stopped.',
  provider_accepted:'Telnyx accepted the test message. Sending has been stopped and temporary access removed. Confirm receipt on your phone; acceptance alone does not confirm delivery.',
  indeterminate:'The provider response was uncertain. Sending has been stopped. Do not retry: check the provider record first.',
  closed_without_confirmation:'The test is closed and sending is stopped. Delivery was not confirmed. Do not create a replacement send without checking the attempt.',
  closed:'Sending is stopped, the test adapter is disabled and temporary access has been removed.',
  check_stop:'The sending stop could not be confirmed. Use “Restore stop and close test” below, or have the staging operator restore it. Do not repeat the send.',
};

export default async function AcknowledgementOwnerTestPage({searchParams}:{searchParams:Promise<{result?:string}>}){
  if(!isOwnerTestPreview(process.env))notFound();
  const user=await requireUser();const client=await createClient();
  const {data,error}=await client.rpc('get_ack_preview_owner_test_status');
  const status=!error && data && typeof data==='object'?data:null;
  const phase=typeof status?.status==='string'?status.status:'setup_required';
  const suffix=typeof status?.recipient_suffix==='string' && /^\d{4}$/.test(status.recipient_suffix)?status.recipient_suffix:null;
  const enabled=process.env.FEH_ACK_OWNER_TEST_ENABLED==='true';
  const canApprove=enabled && user.role==='admin' && status?.can_approve===true;
  const result=(await searchParams).result;
  // Success is reconstructed from persisted state, never a caller-editable URL.
  const closed=phase==='finished' && status?.execution_control==='stopped' && status?.temporary_access_removed===true;
  const message=closed
    ? status?.attempt_status==='succeeded'?messages.provider_accepted
      :status?.attempt_status==='indeterminate'?messages.indeterminate:messages.closed_without_confirmation
    :phase==='prepared' && status?.execution_control==='stopped'?messages.prepared
      :result==='check_stop'?messages.check_stop:result==='blocked'?messages.blocked:null;
  const button='rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400';
  return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950"><div className="mx-auto max-w-2xl space-y-6">
    <Link href="/" className="text-sm underline">Back to CRM</Link>
    <div><p className="text-sm font-semibold text-emerald-800">Free Energy Help · Staging</p>
      <h1 className="mt-2 text-3xl font-bold">One acknowledgement SMS test</h1>
      <p className="mt-3 text-slate-700">Approve one test message to your own mobile, then check that the same enquiry cannot send it again. This creates a synthetic test enquiry; Meta and Google advertising connections are tested separately.</p></div>
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">Message for your approval</h2><p className="mt-3 leading-relaxed">{FEH_ADMINISTRATIVE_SMS_COPY}</p>
      <p className="mt-4 text-sm text-slate-600">{suffix?`Test mobile ending ${suffix}.`:'The approved test mobile has not been configured.'} Caller number in the message: 01332 605506.</p>
    </section>
    {message && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4">{message}</p>}
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">Test controls</h2>
      {phase==='setup_required' || !enabled?<p>Operator setup is pending. No message can be sent from this page yet.</p>:null}
      {phase==='setup' && <form action={prepareOwnerTest}><p className="mb-4">Save your approval for this message and your own test number. This step does not send it.</p><button className={button} disabled={!canApprove}>Approve and prepare one test</button></form>}
      {phase==='prepared' && <form action={runOwnerTest}><p className="mb-4">Release the staging stop for this single attempt. The system will restore the stop and remove temporary access when the attempt finishes.</p><button className={button} disabled={!canApprove}>Send the one approved test SMS</button></form>}
      {phase==='running' && <p>The test has started. Do not repeat the send. If the result is interrupted, restore the stop below and check the recorded attempt.</p>}
      {phase==='finished' && <p>The test is closed. This enquiry cannot be started again. Its approval and attempt history are retained.</p>}
      {user.role==='admin' && ['setup','prepared','running'].includes(phase) && <form action={closeOwnerTest}><button className="rounded-lg border border-red-700 px-5 py-3 font-semibold text-red-800">Restore stop and close test</button></form>}
      <p className="text-sm text-slate-600">{status?.execution_control==='stopped'?'Sending stop: enabled.':status?.execution_control==='clear'?'Sending stop: released for the test.':'Sending state has not been verified.'}</p>
    </section>
  </div></main>;
}
