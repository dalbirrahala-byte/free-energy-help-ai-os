"use client";

import { useActionState } from "react";

import { runPreviewOtpAction, type PreviewOtpState } from "./actions";

const INITIAL_STATE: PreviewOtpState = {
  stage: "request",
  message: null,
  request: null,
  echoedCodes: null,
  decision: null,
};

function HiddenRequest({ state }: { state: PreviewOtpState }) {
  const request = state.request;
  if (!request) return null;
  return (
    <>
      <input type="hidden" name="requestId" value={request.requestId} />
      <input type="hidden" name="email" value={request.email} />
      <input type="hidden" name="telephone" value={request.telephone} />
      <input type="hidden" name="postcode" value={request.postcode} />
      <input type="hidden" name="relationship" value={request.relationship} />
      <input type="hidden" name="authorityDeclared" value={String(request.authorityDeclared)} />
      <input type="hidden" name="botCheckPassed" value={String(request.botCheckPassed)} />
      <input type="hidden" name="rateLimitPassed" value={String(request.rateLimitPassed)} />
      <input type="hidden" name="riskFlags" value={request.riskFlags} />
    </>
  );
}

export function PreviewOtpHarness() {
  const [state, action, pending] = useActionState(runPreviewOtpAction, INITIAL_STATE);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Preview test only.</strong> This route is disabled in production and never calls a supplier/meter provider.
        It tests OTP delivery and the final ALLOW / HOLD / DENY security decision only.
      </div>

      {state.message ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">{state.message}</div>
      ) : null}

      {state.stage === "request" ? (
        <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="_step" value="request" />
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input required name="email" type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">UK mobile</label>
            <input required name="telephone" inputMode="tel" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Business postcode</label>
            <input required name="postcode" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Relationship</label>
            <select name="relationship" defaultValue="BUSINESS_OWNER_DIRECTOR" className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="BUSINESS_OWNER_DIRECTOR">Business owner / director</option>
              <option value="AUTHORISED_EMPLOYEE">Authorised employee</option>
              <option value="AUTHORISED_AGENT">Authorised agent — should hold for review</option>
              <option value="OTHER">Other — should deny</option>
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input required name="authorityDeclared" type="checkbox" className="mt-1" />
            I declare that I am authorised to request supplier/meter information for this business.
          </label>
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="mb-2 font-medium">Preview-only abuse-control simulation</p>
            <label className="mr-5 inline-flex items-center gap-2">
              <input name="botCheckPassed" type="checkbox" defaultChecked /> Bot check passed
            </label>
            <label className="inline-flex items-center gap-2">
              <input name="rateLimitPassed" type="checkbox" defaultChecked /> Rate limit passed
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Risk flags to simulate (optional, comma-separated)</label>
            <input name="riskFlags" className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. postcode_mismatch" />
          </div>
          <button disabled={pending} className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50">
            {pending ? "Issuing codes…" : "Send email and SMS codes"}
          </button>
        </form>
      ) : null}

      {state.stage === "codes_sent" && state.request ? (
        <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="_step" value="verify" />
          <HiddenRequest state={state} />
          {state.echoedCodes?.email || state.echoedCodes?.sms ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
              <strong>Preview echo mode:</strong>{" "}
              {state.echoedCodes.email ? `Email code ${state.echoedCodes.email}. ` : ""}
              {state.echoedCodes.sms ? `SMS code ${state.echoedCodes.sms}.` : ""}
              These codes are shown only when the explicit preview echo setting is enabled.
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium">Email code</label>
            <input required name="emailCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.35em]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">SMS code</label>
            <input required name="smsCode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.35em]" />
          </div>
          <button disabled={pending} className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50">
            {pending ? "Verifying…" : "Verify both codes"}
          </button>
        </form>
      ) : null}

      {state.stage === "decision" && state.decision ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm uppercase tracking-wide text-slate-500">Authorization decision</div>
          <div className="text-2xl font-semibold">{state.decision.status}</div>
          <div className="text-sm text-slate-700">Reason: {state.decision.reason}</div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">Lookup: {String(state.decision.lookupAllowed)}</div>
            <div className="rounded-lg bg-slate-50 p-3">Supplier release: {String(state.decision.supplierInformationReleaseAllowed)}</div>
            <div className="rounded-lg bg-slate-50 p-3">Meter release: {String(state.decision.meterInformationReleaseAllowed)}</div>
          </div>
          <a href="/verified-meter-lookup-preview" className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">
            Start another test
          </a>
        </div>
      ) : null}
    </div>
  );
}
