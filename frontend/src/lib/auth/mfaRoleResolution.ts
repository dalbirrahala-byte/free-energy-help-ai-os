import { isRole } from "./roles";

export type RoleLookupResult = {
  data: { role?: unknown } | null;
  error: unknown;
};

export type RoleLookupClient = {
  from(table: "user_roles"): {
    select(column: "role"): {
      eq(column: "id", value: string): {
        maybeSingle(): PromiseLike<RoleLookupResult>;
      };
    };
  };
};

/**
 * FEH intentionally requires MFA whenever an authenticated user's role cannot
 * be positively resolved. This includes a clean no-row result: unprovisioned
 * users receive extra authentication friction, never extra permissions. Role
 * authorization remains separate and continues to fall back to read_only.
 */
export async function requiresMfaForRoleLookup(
  supabase: RoleLookupClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const roleValue = data?.role;
    const roleResolved = !error && typeof roleValue === "string" && isRole(roleValue);
    const isAdmin = roleResolved && roleValue === "admin";

    return isAdmin || !roleResolved;
  } catch {
    return true;
  }
}
