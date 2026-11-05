import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { ACK_PERMISSION_PROPOSAL, MOCK_PERMISSION_LABELS } from '@/lib/lead-gateway/acknowledgementPermissionReview';
import { readPermissionReview } from '@/lib/lead-gateway/acknowledgementPermissionReview.server';
import { approveMockWording, saveMockPermission } from './actions';
import { permissionReviewClient } from './session';
import { SubmitButton } from './SubmitButton';

export const dynamic = 'force-dynamic';
const panel = 'space-y-4 rounded-xl border border-slate-200 bg-white p-6';

export default async function PermissionReviewPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const client = await permissionReviewClient();
  const state = await readPermissionReview(client);
  const error = (await searchParams).error;
  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950">
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="text-sm underline">Back to CRM</Link>
      <header>
        <p className="text-sm font-semibold text-emerald-800">Free Energy Help · Private staging review</p>
        <h1 className="mt-2 text-3xl font-bold">Review the enquiry permission form</h1>
        <p className="mt-3 text-slate-700">First review the wording. Then record a fictional customer’s answer to check how permission is saved. This page cannot send a text or enable advertising.</p>
      </header>
      <section className={panel}>
        <h2 className="text-xl font-semibold">1. Wording for your review</h2>
        <h3 className="font-semibold">Customer contact request</h3>
        <blockquote className="border-l-4 border-emerald-700 pl-4 leading-relaxed">{ACK_PERMISSION_PROPOSAL.notice}</blockquote>
        <h3 className="font-semibold">Proposed acknowledgement text</h3>
        <blockquote className="border-l-4 border-slate-300 pl-4 leading-relaxed">{ACK_PERMISSION_PROPOSAL.message}</blockquote>
        <h3 className="font-semibold">Proposed sending rule</h3>
        <ul className="list-disc space-y-2 pl-5">{ACK_PERMISSION_PROPOSAL.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
        <p className="text-sm text-slate-600">These are proposed words for a fictional test. The STOP reply, actual provider forms and automatic sending still need their separate integration checks before customer use.</p>
      </section>
      {state.status !== 'ready' ? <section className={panel} role="status">
        <h2 className="font-semibold">Review is not available for this session</h2>
        <p>{state.status === 'blocked' ? 'Use the existing staging owner account with two-step verification. No approval or customer permission has been recorded by this page.' : 'The staging review service could not be verified. Nothing has been treated as approved. Please retry after the service is checked.'}</p>
      </section> : <>
        {error === 'blocked' && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4">The last request was not confirmed. The saved status below is authoritative; no sending permission has been assumed.</p>}
        <section className={panel}>
          <h2 className="text-xl font-semibold">2. Your approval for the fictional test</h2>
          {state.approvedAt ? <p role="status">Approved for fictional testing on {new Date(state.approvedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC. Your account, time and the exact wording are saved.</p> : <form action={approveMockWording} className="space-y-4">
            <input type="hidden" name="version" value={ACK_PERMISSION_PROPOSAL.version} />
            <label className="flex items-start gap-3"><input type="checkbox" name="confirm" value="yes" required className="mt-1 size-5 shrink-0" />
              <span>I approve this wording and proposed rule for a fictional staging test. This does not grant real customer permission, approve live sending or activate advertising.</span>
            </label>
            <SubmitButton>Approve wording for the fictional test</SubmitButton>
          </form>}
        </section>
        <section className={panel}>
          <h2 className="text-xl font-semibold">3. Fictional customer permission</h2>
          <p>This is a mock enquiry with no real customer details. Its answer stays in a separate test record and cannot authorise a real message.</p>
          {!state.approvedAt ? <p className="font-medium">Your review in step 2 is needed before recording a test answer.</p> : <form action={saveMockPermission} className="space-y-5">
            <input type="hidden" name="version" value={ACK_PERMISSION_PROPOSAL.version} />
            <input type="hidden" name="testId" value={randomUUID()} />
            <label className="block font-medium">Mock enquiry source
              <select name="source" required defaultValue="" className="mt-2 block w-full rounded-lg border border-slate-400 bg-white p-3 font-normal">
                <option value="" disabled>Choose a simulated source</option>
                <option value="meta">Meta / Instagram — fictional form</option>
                <option value="google">Google — fictional form</option>
              </select>
            </label>
            <fieldset className="space-y-3">
              <legend className="mb-3 font-medium">Fictional customer’s answer to the contact request</legend>
              {Object.entries(MOCK_PERMISSION_LABELS).map(([value, label]) => <label key={value} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input type="radio" name="permission" value={value} required className="mt-1 size-4 shrink-0" /><span>{label}</span>
              </label>)}
            </fieldset>
            <SubmitButton>Save fictional permission record</SubmitButton>
          </form>}
        </section>
        <section className={panel}>
          <h2 className="text-xl font-semibold">Saved test records</h2>
          {state.records.length === 0 ? <p>No fictional permission records have been saved.</p> : <ul className="space-y-4">{state.records.map(record => <li key={record.test_id} className="border-b border-slate-200 pb-4">
            <p className="font-semibold">{record.source === 'meta' ? 'Meta / Instagram' : 'Google'} · {record.permission === 'yes' ? 'Permission recorded for this fictional test' : record.permission === 'no' ? 'Permission refused — hold' : 'Permission uncertain — hold'}</p>
            <p className="mt-1 text-sm">{MOCK_PERMISSION_LABELS[record.permission]}</p>
            <p className="mt-2 break-all text-xs text-slate-600">Test {record.test_id} · {new Date(record.recorded_at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</p>
            <p className="mt-1 text-sm">Synthetic evidence only. No CRM customer, SMS queue entry or sending authority created.</p>
          </li>)}</ul>}
        </section>
      </>}
      <p className="text-sm text-slate-600">Approval and test evidence are retained with this wording version. Enquiry contact permission is separate from marketing permission. Production launch requires its own reviewed approval.</p>
    </div>
  </main>;
}
