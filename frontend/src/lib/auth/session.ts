// Canonical session/role retrieval. Every Server Component and Server
// Action that needs to know "who is this and what can they do" calls one
// of these two functions — never its own ad hoc supabase.auth.getUser()
// call. This is a Next.js Server-only module (next/headers, next/navigation)
// and is validated via build + browser testing, not node --test, the same
// way lib/dashboard/queries.ts is.

import { redirect } from "next/navigation";

import { createClient } from "../supabase/server";
import { DEFAULT_ROLE, isRole, type Role } from "./roles";

export type CurrentUser = {
  id: string;
  email: string | null;
  role: Role;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Looks up the caller's role from public.user_roles. Falls back to the
 * safest role (read_only) if the table doesn't exist yet, the lookup
 * fails, or no row exists for this user — this keeps authentication
 * deployable independently of the RBAC migration's apply timing, and
 * means a user with no explicit grant can never end up with more access
 * than read_only, never less-safe-by-default.
 */
export async function lookupRole(supabase: SupabaseServerClient, userId: string): Promise<Role> {
  try {
    const { data, error } = await supabase.from("user_roles").select("role").eq("id", userId).maybeSingle();

    if (error || !data || typeof data.role !== "string" || !isRole(data.role)) {
      return DEFAULT_ROLE;
    }

    return data.role;
  } catch {
    return DEFAULT_ROLE;
  }
}

/** Returns null when nobody is signed in — never throws for the unauthenticated case. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const role = await lookupRole(supabase, data.user.id);

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role,
  };
}

/**
 * For Server Components/Actions that must have a signed-in user. This is
 * defense in depth, not the primary gate — middleware.ts already redirects
 * unauthenticated requests before they reach page code. If this ever
 * fires, middleware's own check was bypassed or misconfigured, which is
 * exactly the scenario a second, independent check exists to catch.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
