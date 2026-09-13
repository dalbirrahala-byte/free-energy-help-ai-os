import { isRole } from "./roles.ts";

export type RoleLookupResult = {
  data: { role?: unknown } | null;
  error: unknown;
};

/**
 * FEH intentionally requires MFA whenever an authenticated user's role cannot
 * be positively resolved. This includes a clean no-row result: unprovisioned
 * users receive extra authentication friction, never extra permissions. Role
 * authorization remains separate and continues to fall back to read_only.
 *
 * Accept the lookup operation itself rather than the full Supabase client.
 * This keeps the security decision independently testable without forcing
 * TypeScript to structurally compare Supabase's deeply generic client type.
 */
export async function requiresMfaForRoleLookup(
  lookupRole: () => PromiseLike<RoleLookupResult>,
): Promise<boolean> {
  try {
    const { data, error } = await lookupRole();
    const roleValue = data?.role;
    const roleResolved = !error && typeof roleValue === "string" && isRole(roleValue);
    const isAdmin = roleResolved && roleValue === "admin";

    return isAdmin || !roleResolved;
  } catch {
    return true;
  }
}
