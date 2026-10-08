import { notFound } from "next/navigation";

import { PreviewOtpHarness } from "./PreviewOtpHarness";

export default function VerifiedMeterLookupPreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-2xl px-6">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Free Energy Help</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Verified meter lookup — OTP preview</h1>
        <p className="mt-3 text-slate-700">
          Test email + SMS possession, authority and abuse controls before any future supplier or meter lookup is allowed.
        </p>
      </div>
      <PreviewOtpHarness />
    </main>
  );
}
