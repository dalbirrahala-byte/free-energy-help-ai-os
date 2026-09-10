export const MFA_CHALLENGE_PATH = "/mfa/challenge";
export const MFA_ENROLL_PATH = "/mfa/enroll";

export type AssuranceLevel = "aal1" | "aal2" | null;

export type AssuranceLevels = {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
};

export function requiresMfaChallenge(levels: AssuranceLevels): boolean {
  return levels.currentLevel !== "aal2" && levels.nextLevel === "aal2";
}

export function hasAal2(levels: AssuranceLevels): boolean {
  return levels.currentLevel === "aal2";
}

export function safeMfaRedirectTarget(value: string | null | undefined): string {
  const target = value ?? "/";
  if (target.startsWith("/") && !target.startsWith("//") && !target.startsWith(MFA_CHALLENGE_PATH)) {
    return target;
  }
  return "/";
}
