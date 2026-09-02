"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type ForgotPasswordActionState } from "./actions";

const initialState: ForgotPasswordActionState = { status: "idle", message: null };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {state.message && (
        <p
          className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
            state.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send secure reset email"}
      </button>

      <div className="text-center">
        <Link href="/login" className="text-sm font-medium text-emerald-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
