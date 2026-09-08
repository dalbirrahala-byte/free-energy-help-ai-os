"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isCanonicalAuthOrigin } from "@/lib/auth/authOrigin";
import { passwordValidationError } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

    if (!isCanonicalAuthOrigin(window.location.origin)) {
      setError("Password changes are blocked on preview or alternate hosts. Use the canonical FEH CRM recovery flow.");
      return;
    }
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

    // Do not treat the recovery session itself as proof that the new password
    // works. End the recovery session and force a fresh password login.
    await supabase.auth.signOut();
    router.replace("/login?reset=success");
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
        <div className="relative mt-1">
          <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={12} autoComplete="new-password" autoCapitalize="none" spellCheck={false} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-16 text-sm focus:border-emerald-500 focus:outline-none" />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide new password" : "Show new password"} className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirmation" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confirm new password</label>
        <div className="relative mt-1">
          <input id="confirmation" name="confirmation" type={showConfirmation ? "text" : "password"} required minLength={12} autoComplete="new-password" autoCapitalize="none" spellCheck={false} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-16 text-sm focus:border-emerald-500 focus:outline-none" />
          <button type="button" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? "Hide confirmed password" : "Show confirmed password"} className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
            {showConfirmation ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">After saving, you will be signed out and must prove the new password with a fresh login.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Saving..." : "Save password and verify login"}</button>
    </form>
  );
}
