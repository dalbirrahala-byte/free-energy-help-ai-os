export type LookupRelationship =
  | "BUSINESS_OWNER_DIRECTOR"
  | "AUTHORISED_EMPLOYEE"
  | "AUTHORISED_AGENT"
  | "OTHER";

export type VerificationState = "UNVERIFIED" | "VERIFIED";

export type VerifiedLookupInput = {
  requestId: string;
  email: string;
  telephone: string;
  postcode: string;
  relationship: LookupRelationship;
  emailVerification: {
    state: VerificationState;
    verifiedValue: string | null;
    verifiedAt: string | null;
  };
  phoneVerification: {
    state: VerificationState;
    verifiedValue: string | null;
    verifiedAt: string | null;
  };
  authorityDeclared: boolean;
  botCheckPassed: boolean;
  rateLimitPassed: boolean;
  riskFlags: readonly string[];
  asOf: string;
};

export type VerifiedLookupDecision = {
  status: "ALLOW_LOOKUP" | "HOLD_FOR_REVIEW" | "DENY";
  reason:
    | "VERIFIED"
    | "VERIFICATION_REQUIRED"
    | "VERIFIED_VALUE_MISMATCH"
    | "VERIFICATION_EXPIRED"
    | "AUTHORITY_REQUIRED"
    | "ABUSE_CONTROL_FAILED"
    | "RISK_REVIEW_REQUIRED"
    | "INVALID_INPUT";
  lookupAllowed: boolean;
  supplierInformationReleaseAllowed: boolean;
  meterInformationReleaseAllowed: boolean;
  crmWriteAllowed: boolean;
  outboundAllowed: boolean;
  verificationBinding: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const E164_UK = /^\+44\d{10}$/;
const MAX_VERIFICATION_AGE_MS = 15 * 60 * 1000;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePostcode(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

export function normalizeUkTelephone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  const e164 = compact.startsWith("+44")
    ? compact
    : compact.startsWith("44")
      ? `+${compact}`
      : compact.startsWith("0")
        ? `+44${compact.slice(1)}`
        : "";
  if (!E164_UK.test(e164)) return null;
  const national = e164.slice(3);
  if (/^(\d)\1{8,}$/.test(national)) return null;
  if (/^123456789/.test(national) || /^987654321/.test(national)) return null;
  return e164;
}

function parseTime(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function deny(reason: VerifiedLookupDecision["reason"]): VerifiedLookupDecision {
  return Object.freeze({
    status: "DENY",
    reason,
    lookupAllowed: false,
    supplierInformationReleaseAllowed: false,
    meterInformationReleaseAllowed: false,
    crmWriteAllowed: false,
    outboundAllowed: false,
    verificationBinding: null,
  });
}

function binding(input: VerifiedLookupInput, phone: string): string {
  return [
    input.requestId.trim(),
    normalizeEmail(input.email),
    phone,
    normalizePostcode(input.postcode),
    input.relationship,
  ].join("|");
}

/**
 * Pure fail-closed authorization boundary for the public Supplier/Meter Lookup.
 *
 * This does NOT send OTPs or call a provider. Provider delivery/verification must
 * happen outside this function. A caller must present the exact values that were
 * independently verified. Any edit to email/phone/postcode/request/relationship
 * produces a different binding and requires a new verification decision.
 */
export function evaluateVerifiedLookup(input: unknown): VerifiedLookupDecision {
  if (!input || typeof input !== "object" || Array.isArray(input)) return deny("INVALID_INPUT");
  const x = input as Partial<VerifiedLookupInput>;
  if (
    typeof x.requestId !== "string" ||
    typeof x.email !== "string" ||
    typeof x.telephone !== "string" ||
    typeof x.postcode !== "string" ||
    typeof x.asOf !== "string" ||
    !x.emailVerification ||
    !x.phoneVerification ||
    typeof x.authorityDeclared !== "boolean" ||
    typeof x.botCheckPassed !== "boolean" ||
    typeof x.rateLimitPassed !== "boolean" ||
    !Array.isArray(x.riskFlags)
  ) return deny("INVALID_INPUT");

  if (!x.requestId.trim() || !EMAIL.test(normalizeEmail(x.email)) || !UK_POSTCODE.test(x.postcode)) {
    return deny("INVALID_INPUT");
  }
  const phone = normalizeUkTelephone(x.telephone);
  if (!phone) return deny("INVALID_INPUT");

  if (!x.botCheckPassed || !x.rateLimitPassed) return deny("ABUSE_CONTROL_FAILED");
  if (!x.authorityDeclared || !x.relationship || x.relationship === "OTHER") return deny("AUTHORITY_REQUIRED");

  if (x.emailVerification.state !== "VERIFIED" || x.phoneVerification.state !== "VERIFIED") {
    return deny("VERIFICATION_REQUIRED");
  }

  if (
    normalizeEmail(x.emailVerification.verifiedValue ?? "") !== normalizeEmail(x.email) ||
    normalizeUkTelephone(x.phoneVerification.verifiedValue ?? "") !== phone
  ) return deny("VERIFIED_VALUE_MISMATCH");

  const now = parseTime(x.asOf);
  const emailAt = parseTime(x.emailVerification.verifiedAt);
  const phoneAt = parseTime(x.phoneVerification.verifiedAt);
  if (now === null || emailAt === null || phoneAt === null || emailAt > now || phoneAt > now) {
    return deny("INVALID_INPUT");
  }
  if (now - emailAt > MAX_VERIFICATION_AGE_MS || now - phoneAt > MAX_VERIFICATION_AGE_MS) {
    return deny("VERIFICATION_EXPIRED");
  }

  if (x.riskFlags.length > 0 || x.relationship === "AUTHORISED_AGENT") {
    return Object.freeze({
      status: "HOLD_FOR_REVIEW",
      reason: "RISK_REVIEW_REQUIRED",
      lookupAllowed: false,
      supplierInformationReleaseAllowed: false,
      meterInformationReleaseAllowed: false,
      crmWriteAllowed: false,
      outboundAllowed: false,
      verificationBinding: binding(x as VerifiedLookupInput, phone),
    });
  }

  return Object.freeze({
    status: "ALLOW_LOOKUP",
    reason: "VERIFIED",
    lookupAllowed: true,
    supplierInformationReleaseAllowed: true,
    meterInformationReleaseAllowed: true,
    crmWriteAllowed: false,
    outboundAllowed: false,
    verificationBinding: binding(x as VerifiedLookupInput, phone),
  });
}
