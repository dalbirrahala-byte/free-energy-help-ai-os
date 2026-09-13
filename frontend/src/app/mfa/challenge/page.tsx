import { MfaChallengeForm } from "./MfaChallengeForm";

export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo = "/" } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Security verification</h1>
        <p className="mt-2 text-sm text-slate-600">
          Open Microsoft Authenticator and enter the current six-digit code for Free Energy Help.
        </p>
        <MfaChallengeForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
