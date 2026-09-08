import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ redirectTo?: string; reset?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/";
  const resetSucceeded = params.reset === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Free Energy Help</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to the AI Sales OS.</p>

        {resetSucceeded && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Password saved. Sign in now with that new password to verify the account end to end.
          </p>
        )}

        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
