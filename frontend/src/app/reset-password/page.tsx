import { ResetPasswordForm } from "./ResetPasswordForm";

type ResetPasswordPageProps = { searchParams: Promise<{ mode?: string }> };

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { mode } = await searchParams;
  const invited = mode === "invite";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{invited ? "Create your CRM password" : "Choose a new password"}</h1>
        <p className="mt-1 text-sm text-slate-500">Use at least 12 characters. Your password is never shown to an administrator.</p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
