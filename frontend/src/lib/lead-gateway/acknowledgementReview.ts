/**
 * FEH Issue #108 — pure, non-executing, review-only SMS acknowledgement gate.
 * This is NOT a Meta webhook handler, SMS sender, database writer, consent
 * authority, or provider approval. It MUST NOT be wired directly to a public
 * request. All evidence flags must be produced by an independently reviewed,
 * authenticated server boundary; caller-supplied true values prove nothing.
 *
 * Even with all evidence positive, the output NEVER permits a send.
 * Factory 041 execution boundaries, live STOP, consent/suppression, provider
 * approval, idempotency, auditing and owner approval remain mandatory.
 */
import type { CanonicalExternalLead } from "./canonicalExternalLead.ts";

export const FEH_CALLBACK_NUMBER = "01332 605506" as const;
export const FEH_ACKNOWLEDGEMENT_VERSION = "feh-callback-ack-v1" as const;
export const FEH_FORM_COMPLETION_COPY =
  `Thank you for your enquiry. Dalbir from Free Energy Help will call you about it from ${FEH_CALLBACK_NUMBER} during business hours.`;
export const FEH_ADMINISTRATIVE_SMS_COPY =
  `Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from ${FEH_CALLBACK_NUMBER} during business hours.`;

export type ReviewHoldReason =
  | "missing_input"
  | "unverified_meta_origin"
  | "unverified_lead_persistence"
  | "missing_form_identity"
  | "stale_or_future_submission"
  | "invalid_lead_identifier"
  | "missing_callback_request"
  | "sms_notice_or_permission_unverified"
  | "suppression_not_clear"
  | "duplicate_or_prior_acknowledgement"
  | "invalid_or_unverified_mobile"
  | "caller_identity_unverified"
  | "emergency_stop_not_clear"
  | "durable_reservation_unverified";

/** From a trusted server process ONLY; NEVER accept these assertions from a browser/webhook payload. */
export type IndependentlyVerifiedReviewEvidence = {
  readonly metaWebhookSignatureAndLeadReceiptVerified: boolean;
  readonly crmLeadPersistedAndTenantChecked: boolean;
  readonly customerRequestedCallback: boolean;
  readonly formDisplayedSmsNotice: boolean;
  /** A separately documented assessment of this ONE administrative message, not generic promotional consent. */
  readonly administrativeSmsPermissionReviewed: "permitted" | "not_permitted" | "unknown";
  readonly smsSuppressionStatus: "clear" | "suppressed" | "unknown" | "lookup_failed";
  readonly contactMobileVerified: boolean;
  readonly priorSmsAttemptStatus: "none" | "exists" | "unknown";
  readonly providerLeadDuplicateStatus: "unique" | "duplicate" | "unknown";
  readonly durableSingleAttemptReservationVerified: boolean;
  readonly actualOutboundCallerIdVerified: boolean;
  readonly emergencyStopStatus: "clear" | "active" | "unknown";
};

export type AcknowledgementReviewDecision = {
  readonly status: "hold" | "candidate_for_separate_review";
  readonly reasons: readonly ReviewHoldReason[];
  readonly executionAllowed: false;
  readonly messageStatus: "not_sent";
  readonly callbackNumber: typeof FEH_CALLBACK_NUMBER;
  readonly templateVersion: typeof FEH_ACKNOWLEDGEMENT_VERSION;
  /** No telephone, email, name or SMS destination appears in this decision. */
  readonly idempotencyKey: string | null;
};

/** Validate but DO NOT return, send or log a contact number. */
export function isEligibleUkMobile(input: unknown): boolean {
  if (typeof input !== "string" || input.length > 30) return false;
  const cleaned = input.trim().replace(/[ ()-]/g, "");
  return /^(?:07[1-57-9]\d{8}|\+447[1-57-9]\d{8}|00447[1-57-9]\d{8})$/.test(cleaned);
}

export function leadAcknowledgementKey(provider: unknown, externalLeadId: unknown): string | null {
  if (provider !== "meta" || typeof externalLeadId !== "string" ||
      !/^[A-Za-z0-9_-]{6,100}$/.test(externalLeadId)) return null;
  // This is a PROPOSED durable unique key, not a lock or an actual reservation.
  return `meta:${FEH_ACKNOWLEDGEMENT_VERSION}:${externalLeadId}`;
}

function isFreshTimestamp(timestamp: unknown, nowIso: unknown): boolean {
  if (typeof timestamp !== "string" || typeof nowIso !== "string") return false;
  const timezoneIso = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/;
  if (!timezoneIso.test(timestamp) || !timezoneIso.test(nowIso)) return false;
  const stamp = Date.parse(timestamp);
  const now = Date.parse(nowIso);
  return Number.isFinite(stamp) && Number.isFinite(now) && stamp <= now + 5 * 60_000 && now - stamp <= 24 * 60 * 60_000;
}

/**
 * Outputs a review decision only, even when every input is marked positive.
 * The model itself is Meta-specific. TT/email/website intakes require a
 * separately authenticated adapter, not an invented Meta identity.
 */
export function evaluateMetaAcknowledgementReview(
  lead: CanonicalExternalLead | null | undefined,
  evidence: IndependentlyVerifiedReviewEvidence | null | undefined,
  nowIso: string,
): AcknowledgementReviewDecision {
  const reasons: ReviewHoldReason[] = [];
  if (!lead || !evidence) reasons.push("missing_input");
  const idempotencyKey = leadAcknowledgementKey(lead?.provider, lead?.externalLeadId);
  if (!idempotencyKey) reasons.push("invalid_lead_identifier");
  if (lead?.provider !== "meta" || lead?.leadSource !== "meta_ads" ||
      evidence?.metaWebhookSignatureAndLeadReceiptVerified !== true) reasons.push("unverified_meta_origin");
  if (evidence?.crmLeadPersistedAndTenantChecked !== true) reasons.push("unverified_lead_persistence");
  if (typeof lead?.formId !== "string" || lead.formId.trim() === "") reasons.push("missing_form_identity");
  if (!isFreshTimestamp(lead?.receivedAt, nowIso)) reasons.push("stale_or_future_submission");
  if (evidence?.customerRequestedCallback !== true) reasons.push("missing_callback_request");
  if (evidence?.formDisplayedSmsNotice !== true ||
      evidence?.administrativeSmsPermissionReviewed !== "permitted") reasons.push("sms_notice_or_permission_unverified");
  if (evidence?.smsSuppressionStatus !== "clear") reasons.push("suppression_not_clear");
  if (evidence?.priorSmsAttemptStatus !== "none" ||
      evidence?.providerLeadDuplicateStatus !== "unique") reasons.push("duplicate_or_prior_acknowledgement");
  if (!isEligibleUkMobile(lead?.telephone) || evidence?.contactMobileVerified !== true) reasons.push("invalid_or_unverified_mobile");
  if (evidence?.actualOutboundCallerIdVerified !== true) reasons.push("caller_identity_unverified");
  if (evidence?.emergencyStopStatus !== "clear") reasons.push("emergency_stop_not_clear");
  if (evidence?.durableSingleAttemptReservationVerified !== true) reasons.push("durable_reservation_unverified");

  return {
    status: reasons.length === 0 ? "candidate_for_separate_review" : "hold",
    reasons,
    executionAllowed: false,
    messageStatus: "not_sent",
    callbackNumber: FEH_CALLBACK_NUMBER,
    templateVersion: FEH_ACKNOWLEDGEMENT_VERSION,
    idempotencyKey,
  };
}
