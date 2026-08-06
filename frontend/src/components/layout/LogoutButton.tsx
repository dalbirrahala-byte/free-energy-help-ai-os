"use client";

import { LogOut } from "lucide-react";

import { signOut } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <LogOut size={19} />
        Sign out
      </button>
    </form>
  );
}
