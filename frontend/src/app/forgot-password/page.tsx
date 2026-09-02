import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Free Energy Help</h1>
        <p className="mt-1 text-sm text-slate-500">Reset your FEH CRM password securely.</p>

        <ForgotPasswordForm />
      </div>
    </main>
  );
}
