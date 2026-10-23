/**
 * Review-only FEH verified-lead qualification model.
 *
 * This module is intentionally deterministic and non-executing. It does not
 * persist a lead, send SMS/email, call a provider, grant contact permission or
 * activate advertising. It only classifies already-supplied evidence so the
 * future Health Check flow can distinguish unverified submissions from leads
 * that deserve prompt human review.
 */

export const MONTHLY_SPEND_BANDS = [
  "UNDER_250",
  "250_1000",
  "1000_2000",
  "2000_PLUS",
  "UNKNOWN",
] as const;

export const VERIFIED_LEAD_RENEWAL_TIMINGS = [
  "OUT_OF_CONTRACT",
  "WITHIN_30_DAYS",
  "31_90_DAYS",
  "3_6_MONTHS",
  "6_12_MONTHS",
  "MORE_THAN_12_MONTHS",
  "UNKNOWN",
] as const;

export type MonthlySpendBand = (typeof MONTHLY_SPEND_BANDS)[number];
export type VerifiedLeadRenewalTiming =
  (typeof VERIFIED_LEAD_RENEWAL_TIMINGS)[number];
export type LeadAuthority = "YES" | "NO" | "UNKNOWN";
export type MobileVerificationState = "VERIFIED" | "UNVERIFIED";

export type VerifiedLeadQualificationInput = Readonly<{
  isUkBusiness: boolean;
  consentGiven: boolean;
  mobileVerification: MobileVerificationState;
  authority: LeadAuthority;
  monthlySpendBand: MonthlySpendBand;
  renewalTiming: VerifiedLeadRenewalTiming;
  currentSupplierProvided: boolean;
}>;

export type VerifiedLeadCrmState =
  | "REJECTED_NOT_BUSINESS"
  | "UNVERIFIED"
  | "VERIFIED_REVIEW"
  | "VERIFIED_CALL_NOW";

export type VerifiedLeadPriority = "Blocked" | "Review" | "Warm" | "Hot";

export type VerifiedLeadQualification = Readonly<{
  crmState: VerifiedLeadCrmState;
  priority: VerifiedLeadPriority;
  callNowEligible: boolean;
  executionAllowed: false;
  reasons: readonly string[];
}>;

const URGENT_RENEWALS = new Set<VerifiedLeadRenewalTiming>([
  "OUT_OF_CONTRACT",
  "WITHIN_30_DAYS",
  "31_90_DAYS",
]);

const MEANINGFUL_SPEND = new Set<MonthlySpendBand>([
  "1000_2000",
  "2000_PLUS",
]);

export function evaluateVerifiedLeadQualification(
  input: VerifiedLeadQualificationInput,
): VerifiedLeadQualification {
  const reasons: string[] = [];

  if (!input.isUkBusiness) {
    return Object.freeze({
      crmState: "REJECTED_NOT_BUSINESS",
      priority: "Blocked",
      callNowEligible: false,
      executionAllowed: false,
      reasons: Object.freeze(["not_uk_business"]),
    });
  }

  if (!input.consentGiven) {
    reasons.push("contact_consent_missing");
  }

  if (input.mobileVerification !== "VERIFIED") {
    reasons.push("mobile_not_verified");
  }

  if (reasons.length > 0) {
    return Object.freeze({
      crmState: "UNVERIFIED",
      priority: "Review",
      callNowEligible: false,
      executionAllowed: false,
      reasons: Object.freeze(reasons),
    });
  }

  if (input.authority !== "YES") {
    reasons.push(
      input.authority === "NO"
        ? "not_authorised_for_energy_account"
        : "authority_unconfirmed",
    );

    return Object.freeze({
      crmState: "VERIFIED_REVIEW",
      priority: "Review",
      callNowEligible: false,
      executionAllowed: false,
      reasons: Object.freeze(reasons),
    });
  }

  const urgent = URGENT_RENEWALS.has(input.renewalTiming);
  const meaningfulSpend = MEANINGFUL_SPEND.has(input.monthlySpendBand);

  if (urgent && meaningfulSpend) {
    if (!input.currentSupplierProvided) {
      reasons.push("current_supplier_not_provided");
    }

    return Object.freeze({
      crmState: "VERIFIED_CALL_NOW",
      priority: "Hot",
      callNowEligible: true,
      executionAllowed: false,
      reasons: Object.freeze(reasons),
    });
  }

  if (input.renewalTiming === "UNKNOWN") {
    reasons.push("renewal_timing_unknown");
  }
  if (input.monthlySpendBand === "UNKNOWN") {
    reasons.push("monthly_spend_unknown");
  }
  if (!input.currentSupplierProvided) {
    reasons.push("current_supplier_not_provided");
  }

  return Object.freeze({
    crmState: "VERIFIED_REVIEW",
    priority: urgent ? "Warm" : "Warm",
    callNowEligible: false,
    executionAllowed: false,
    reasons: Object.freeze(reasons),
  });
}
