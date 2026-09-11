export const MFA_CHALLENGE_PATH = "/mfa/challenge";
export const MFA_ENROLL_PATH = "/mfa/enroll";

export type AssuranceLevel = "aal1" | "aal2" | null;

export type AssuranceLevels = {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
};

export type AdminMfaRouteDecision = "allow" | "enroll" | "challenge";

/**
 * Supabase's SDK intentionally leaves room for future assurance-level values.
 * FEH only recognises the two levels we currently support. Anything unknown is
 * normalised to null so the admin MFA decision fails closed rather than being
 * treated as authenticated assurance.
 */
export function normalizeAssuranceLevel(value: unknown): AssuranceLevel {
  return value === "aal1" || value === "aal2" ? value : null;
}

export function requiresMfaChallenge(levels: AssuranceLevels): boolean {
  return levels.currentLevel !== "aal2" && levels.nextLevel === "aal2";
}

export function hasAal2(levels: AssuranceLevels): boolean {
  return levels.currentLevel === "aal2";
}

/**
 * Admin MFA is fail-closed by state: an admin who has not yet enrolled a
 * verified TOTP factor must enroll; an enrolled admin whose current session
 * is only AAL1 must complete a challenge; only an AAL2 admin session may
 * proceed to protected CRM routes.
 */
export function decideAdminMfaRoute(
  isAdmin: boolean,
  levels: AssuranceLevels,
): AdminMfaRouteDecision {
  if (!isAdmin) return "allow";
  if (hasAal2(levels)) return "allow";
  if (requiresMfaChallenge(levels)) return "challenge";
  return "enroll";
}

export function safeMfaRedirectTarget(value: string | null | undefined): string {
  const target = value ?? "/";
  if (
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.startsWith(MFA_CHALLENGE_PATH) &&
    !target.startsWith(MFA_ENROLL_PATH)
  ) {
    return target;
  }
  return "/";
}
