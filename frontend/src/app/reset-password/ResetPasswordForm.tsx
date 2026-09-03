"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { passwordValidationError } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasSession(Boolean(data.session));
        setChecking(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        setHasSession(true);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    const validationError = passwordValidationError(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError("This password link is no longer valid. Request a new one and use the newest email.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (checking) return <p className="mt-6 text-sm text-slate-600">Checking your secure link...</p>;
  if (!hasSession) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This link has expired, was already used, or was opened without its security token.</p>
        <Link href="/forgot-password" className="block text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">Request a new password link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-400">New password</label>
        <input id="password" name="password" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      <div>
        <label htmlFor="confirmation" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confirm new password</label>
        <input id="confirmation" name="confirmation" type="password" required minLength={12} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" />
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Saving..." : "Save password and enter CRM"}</button>
    </form>
  );
}
