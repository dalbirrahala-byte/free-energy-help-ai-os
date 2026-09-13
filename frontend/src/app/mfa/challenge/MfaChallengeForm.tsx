"use client";

import { useActionState } from "react";

import { verifyMfaChallenge, type MfaActionState } from "../actions";

const initialState: MfaActionState = { error: null };

export function MfaChallengeForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(verifyMfaChallenge, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <label htmlFor="code" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Authenticator code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-lg tracking-[0.35em] focus:border-emerald-500 focus:outline-none"
        />
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
        {pending ? "Verifying..." : "Verify and continue"}
      </button>
    </form>
  );
}
