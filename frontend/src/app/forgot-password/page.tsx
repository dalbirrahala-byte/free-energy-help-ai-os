import { ForgotPasswordForm } from "./ForgotPasswordForm";

type ForgotPasswordPageProps = { searchParams: Promise<{ error?: string }> };

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the email address used for your FEH CRM account.</p>
        {error === "expired" && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">That link has expired or was already used. Request a fresh password reset below.</p>}
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
