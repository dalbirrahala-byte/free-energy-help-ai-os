"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?mode=recovery`,
    });

    setPending(false);
    if (resetError) {
      setError("We could not send the reset email. Please wait a moment and try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          If that address has a CRM account, a password reset email has been sent. Use the newest email; the link can only be used once.
        </p>
        <Link href="/login" className="block text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Sending..." : "Send password reset"}
      </button>
      <Link href="/login" className="block text-center text-sm font-semibold text-slate-600 hover:text-slate-800">Back to sign in</Link>
    </form>
  );
}
