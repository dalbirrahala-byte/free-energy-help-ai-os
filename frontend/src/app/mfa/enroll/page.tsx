"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";

import { enrollTotp, verifyEnrollment, type MfaActionState } from "../actions";

const initialState: MfaActionState = { error: null };

type Enrollment = { factorId: string; qrCode: string; secret: string };

export default function MfaEnrollPage() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(verifyEnrollment, initialState);

  useEffect(() => {
    let active = true;
    void enrollTotp().then((result) => {
      if (!active) return;
      if ("error" in result) setSetupError(result.error);
      else setEnrollment(result);
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Protect your FEH account</h1>
        <p className="mt-2 text-sm text-slate-600">Scan this QR code with Microsoft Authenticator, then enter the six-digit code it shows.</p>
        {setupError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{setupError}</p>}
        {!setupError && !enrollment && <p className="mt-6 text-sm text-slate-500">Preparing secure setup…</p>}
        {enrollment && (
          <>
            <div className="mt-6 flex justify-center rounded-xl border border-slate-200 bg-white p-4" dangerouslySetInnerHTML={{ __html: enrollment.qrCode }} />
            <details className="mt-4 text-sm text-slate-600"><summary className="cursor-pointer font-semibold">Can’t scan the QR code?</summary><p className="mt-2 break-all font-mono text-xs">{enrollment.secret}</p></details>
            <form action={formAction} className="mt-6 space-y-4">
              <input type="hidden" name="factorId" value={enrollment.factorId} />
              <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-label="Authenticator code" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-lg tracking-[0.35em] focus:border-emerald-500 focus:outline-none" />
              {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{state.error}</p>}
              <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{pending ? "Verifying…" : "Enable Authenticator"}</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
