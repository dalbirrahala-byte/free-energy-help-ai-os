"use client";

import { useActionState } from "react";

import { updatePassword, type UpdatePasswordActionState } from "./actions";

const initialState: UpdatePasswordActionState = { error: null };

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}
