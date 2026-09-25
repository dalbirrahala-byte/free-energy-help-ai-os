import { buildIntentRadarSignal, type IntentRadarSignal } from "./intentRadar.ts";

export const INTRODUCER_CATEGORIES = [
  "ACCOUNTANT",
  "COMMERCIAL_PROPERTY",
  "FINANCE_BROKER",
  "INSURANCE_BROKER",
  "SOLICITOR",
  "BUSINESS_ADVISER",
  "OTHER_PROFESSIONAL",
] as const;

export type IntroducerCategory = (typeof INTRODUCER_CATEGORIES)[number];
export type IntroducerAgreementStatus = "ACTIVE" | "EXPIRED" | "NOT_VERIFIED";
export type IntroducerContactPermissionEvidence = "BUSINESS_INTRODUCTION_CONFIRMED" | "UNKNOWN";

export type IntroducerReferralInput = Readonly<{
  introducerReference: string;
  introducerCategory: IntroducerCategory;
  agreementReference: string;
  agreementStatus: IntroducerAgreementStatus;
  companyName: string;
  companyNumber?: string | null;
  companyDomain?: string | null;
  referralReference: string;
  introducedAt: string;
  businessReason: string;
  contactPermissionEvidence: IntroducerContactPermissionEvidence;
}>;

export type IntroducerReferralAttribution = Readonly<{
  attributionStatus: "ATTRIBUTED_FOR_REVIEW" | "BLOCKED";
  attributionKey: string;
  introducerReference: string;
  introducerCategory: IntroducerCategory;
  agreementReference: string;
  companyName: string;
  referralReference: string;
  introducedAt: string;
  contactPermissionEvidence: IntroducerContactPermissionEvidence;
  reasons: readonly string[];
  commissionAccrualAllowed: false;
  commissionPaymentAllowed: false;
  crmWriteAllowed: false;
  outreachAllowed: false;
}>;

const INTRODUCER_AGREEMENT_STATUSES = new Set<IntroducerAgreementStatus>([
  "ACTIVE",
  "EXPIRED",
  "NOT_VERIFIED",
]);

const INTRODUCER_CONTACT_PERMISSION_VALUES = new Set<IntroducerContactPermissionEvidence>([
  "BUSINESS_INTRODUCTION_CONFIRMED",
  "UNKNOWN",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeReference(value: unknown, errorCode: string): string {
  const cleaned = clean(value, 160);
  if (!cleaned || !/^[A-Za-z0-9._:-]+$/.test(cleaned)) throw new Error(errorCode);
  return cleaned;
}

function normalizeInstant(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_introduced_at");
  const cleaned = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(cleaned);
  if (!match) throw new Error("invalid_introduced_at");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) throw new Error("invalid_introduced_at");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) throw new Error("invalid_introduced_at");
  if (hour > 23 || minute > 59 || second > 59) throw new Error("invalid_introduced_at");

  if (match[8] !== "Z") {
    const offsetHour = Number(match[10]);
    const offsetMinute = Number(match[11]);
    if (offsetHour > 14 || offsetMinute > 59) throw new Error("invalid_introduced_at");
    if (offsetHour === 14 && offsetMinute !== 0) throw new Error("invalid_introduced_at");
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid_introduced_at");
  return parsed.toISOString();
}

function canonicalReference(value: string): string {
  return value.toLowerCase();
}

export function buildIntroducerReferralAttribution(
  input: IntroducerReferralInput,
): IntroducerReferralAttribution {
  const unknownInput: unknown = input;
  if (!isRecord(unknownInput)) throw new Error("invalid_introducer_referral");
  const raw: Record<string, unknown> = unknownInput;

  const introducerReference = normalizeReference(raw.introducerReference, "invalid_introducer_reference");
  const agreementReference = normalizeReference(raw.agreementReference, "invalid_agreement_reference");
  const companyName = clean(raw.companyName, 200);
  const referralReference = normalizeReference(raw.referralReference, "invalid_referral_reference");
  const businessReason = clean(raw.businessReason, 1000);
  if (!companyName || !businessReason) {
    throw new Error("invalid_introducer_referral");
  }

  if (
    typeof raw.introducerCategory !== "string" ||
    !INTRODUCER_CATEGORIES.includes(raw.introducerCategory as IntroducerCategory)
  ) {
    throw new Error("invalid_introducer_category");
  }
  const introducerCategory = raw.introducerCategory as IntroducerCategory;

  if (
    typeof raw.agreementStatus !== "string" ||
    !INTRODUCER_AGREEMENT_STATUSES.has(raw.agreementStatus as IntroducerAgreementStatus)
  ) {
    throw new Error("invalid_introducer_agreement_status");
  }
  const agreementStatus = raw.agreementStatus as IntroducerAgreementStatus;

  if (
    typeof raw.contactPermissionEvidence !== "string" ||
    !INTRODUCER_CONTACT_PERMISSION_VALUES.has(
      raw.contactPermissionEvidence as IntroducerContactPermissionEvidence,
    )
  ) {
    throw new Error("invalid_introducer_contact_permission_evidence");
  }
  const contactPermissionEvidence = raw.contactPermissionEvidence as IntroducerContactPermissionEvidence;

  const introducedAt = normalizeInstant(raw.introducedAt);
  const reasons: string[] = [];
  if (agreementStatus !== "ACTIVE") reasons.push("Introducer agreement is not verified active.");
  if (contactPermissionEvidence !== "BUSINESS_INTRODUCTION_CONFIRMED") {
    reasons.push("Introducer has not supplied explicit business-introduction evidence.");
  }

  const ready = reasons.length === 0;
  if (ready) {
    reasons.push(
      "Referral may be attributed for human review.",
      "Attribution does not approve commission, CRM persistence or outbound contact.",
    );
  }

  return {
    attributionStatus: ready ? "ATTRIBUTED_FOR_REVIEW" : "BLOCKED",
    attributionKey: `introducer:${canonicalReference(introducerReference)}:${canonicalReference(referralReference)}`,
    introducerReference,
    introducerCategory,
    agreementReference,
    companyName,
    referralReference,
    introducedAt,
    contactPermissionEvidence,
    reasons,
    commissionAccrualAllowed: false,
    commissionPaymentAllowed: false,
    crmWriteAllowed: false,
    outreachAllowed: false,
  };
}

export function mapIntroducerReferralToIntentSignal(
  input: IntroducerReferralInput,
): IntentRadarSignal | null {
  const attribution = buildIntroducerReferralAttribution(input);
  if (attribution.attributionStatus !== "ATTRIBUTED_FOR_REVIEW") return null;

  return buildIntentRadarSignal({
    companyName: input.companyName,
    companyNumber: input.companyNumber ?? null,
    companyDomain: input.companyDomain ?? null,
    source: "INTRODUCER",
    sourceReference: attribution.attributionKey,
    sourceUrl: null,
    observedAt: attribution.introducedAt,
    expiresAt: new Date(new Date(attribution.introducedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    signalFamily: "PROCUREMENT",
    signalType: "PROFESSIONAL_BUSINESS_ENERGY_INTRODUCTION",
    summary: `Professional introducer referral from ${attribution.introducerCategory}; business reason supplied and introduction evidence confirmed.`,
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence: 90,
    strength: "STRONG",
    provenance: "INTRODUCER",
  });
}
