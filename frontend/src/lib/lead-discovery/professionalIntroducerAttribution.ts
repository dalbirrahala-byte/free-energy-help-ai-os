import { buildIntentRadarSignal, type IntentRadarSignal } from "./intentRadar.ts";

export type IntroducerCategory =
  | "ACCOUNTANT"
  | "COMMERCIAL_PROPERTY"
  | "FINANCE_BROKER"
  | "INSURANCE_BROKER"
  | "SOLICITOR"
  | "BUSINESS_ADVISER"
  | "OTHER_PROFESSIONAL";

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

function clean(value: string | null | undefined, max = 500): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeInstant(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid_introduced_at");
  return parsed.toISOString();
}

function canonical(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._:-]/g, "");
}

export function buildIntroducerReferralAttribution(
  input: IntroducerReferralInput,
): IntroducerReferralAttribution {
  const introducerReference = clean(input.introducerReference, 160);
  const agreementReference = clean(input.agreementReference, 160);
  const companyName = clean(input.companyName, 200);
  const referralReference = clean(input.referralReference, 160);
  const businessReason = clean(input.businessReason, 1000);
  if (!introducerReference || !agreementReference || !companyName || !referralReference || !businessReason) {
    throw new Error("invalid_introducer_referral");
  }

  const introducedAt = normalizeInstant(input.introducedAt);
  const reasons: string[] = [];
  if (input.agreementStatus !== "ACTIVE") reasons.push("Introducer agreement is not verified active.");
  if (input.contactPermissionEvidence !== "BUSINESS_INTRODUCTION_CONFIRMED") {
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
    attributionKey: `introducer:${canonical(introducerReference)}:${canonical(referralReference)}`,
    introducerReference,
    introducerCategory: input.introducerCategory,
    agreementReference,
    companyName,
    referralReference,
    introducedAt,
    contactPermissionEvidence: input.contactPermissionEvidence,
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
