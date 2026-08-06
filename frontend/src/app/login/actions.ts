"use server";

import { redirect } from "next/navigation";

import { buildAuditEvent, recordAuditEvent } from "@/lib/audit/log";
import { lookupRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type LoginActionState = { error: string | null };

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = String(value ?? "/");
  // Reject anything that isn't a same-site path — blocks open-redirect
  // attempts via a crafted redirectTo (e.g. "//evil.example" or an
  // absolute URL) while still honouring the page middleware sent the user
  // away from.
  if (target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return "/";
}

/**
 * Deliberately returns the same generic message whether the email doesn't
 * exist or the password is wrong — never confirms which. No open
 * registration exists; accounts are provisioned by an admin (see
 * docs/AUTHENTICATION.md), so this form only ever signs in.
 */
export async function signIn(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // No actor id — a failed login has no session to attribute the event
    // to, and this table's insert policy only allows writing as an
    // authenticated user's own row. Logged server-side instead; see
    // docs/AUDIT_LOGGING.md for why this isn't a persisted event.
    console.warn(`[Audit] login_failure for email domain "${email.split("@")[1] ?? "unknown"}" — invalid credentials.`);
    return { error: "Invalid email or password." };
  }

  const role = await lookupRole(supabase, data.user.id);
  await recordAuditEvent(
    supabase,
    buildAuditEvent({ action: "login_success", actorId: data.user.id, actorRole: role, result: "success" }),
  );

  redirect(redirectTo);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    const role = await lookupRole(supabase, data.user.id);
    await recordAuditEvent(
      supabase,
      buildAuditEvent({ action: "logout", actorId: data.user.id, actorRole: role, result: "success" }),
    );
  }

  await supabase.auth.signOut();
  redirect("/login");
}
