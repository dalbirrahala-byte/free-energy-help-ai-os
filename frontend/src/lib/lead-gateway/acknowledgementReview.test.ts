import assert from "node:assert/strict";
import { test } from "node:test";
import type { CanonicalExternalLead } from "./canonicalExternalLead.ts";
import {
  FEH_ADMINISTRATIVE_SMS_COPY,
  FEH_CALLBACK_NUMBER,
  FEH_FORM_COMPLETION_COPY,
  evaluateMetaAcknowledgementReview,
  isEligibleUkMobile,
  leadAcknowledgementKey,
  type IndependentlyVerifiedReviewEvidence,
  type ReviewHoldReason,
} from "./acknowledgementReview.ts";

const NOW = "2026-10-14T19:00:00.000Z";
const lead: CanonicalExternalLead = {
  provider: "meta", externalLeadId: "lead_123456", receivedAt: NOW, leadSource: "meta_ads",
  companyName: "Synthetic Test Ltd", contactName: "Test Person", telephone: "07123 456789",
  email: "nobody@example.invalid", campaignId: "campaign_test", campaignName: null,
  formId: "form_123", consentStatus: "unknown",
};
const evidence: IndependentlyVerifiedReviewEvidence = {
  metaWebhookSignatureAndLeadReceiptVerified: true,
  crmLeadPersistedAndTenantChecked: true, customerRequestedCallback: true,
  formDisplayedSmsNotice: true, administrativeSmsPermissionReviewed: "permitted",
  smsSuppressionStatus: "clear", contactMobileVerified: true,
  priorSmsAttemptStatus: "none", providerLeadDuplicateStatus: "unique",
  durableSingleAttemptReservationVerified: true, actualOutboundCallerIdVerified: true,
  emergencyStopStatus: "clear",
};
const run = (l: CanonicalExternalLead | null = lead, e: IndependentlyVerifiedReviewEvidence | null = evidence, now = NOW) =>
  evaluateMetaAcknowledgementReview(l, e, now);

test("all-green review remains non-executing, not 'sent'", () => {
  const d = run();
  assert.equal(d.status, "candidate_for_separate_review");
  assert.equal(d.executionAllowed, false);
  assert.equal(d.messageStatus, "not_sent");
  assert.equal(d.callbackNumber, "01332 605506");
  assert.deepEqual(d.reasons, []);
  assert.equal(d.idempotencyKey, "meta:feh-callback-ack-v1:lead_123456");
});
for (const [name, patch, reason] of [
  ["unauthenticated Meta", { metaWebhookSignatureAndLeadReceiptVerified: false }, "unverified_meta_origin"],
  ["unpersisted", { crmLeadPersistedAndTenantChecked: false }, "unverified_lead_persistence"],
  ["callback not requested", { customerRequestedCallback: false }, "missing_callback_request"],
  ["no notice", { formDisplayedSmsNotice: false }, "sms_notice_or_permission_unverified"],
  ["permission unknown", { administrativeSmsPermissionReviewed: "unknown" }, "sms_notice_or_permission_unverified"],
  ["permission denied", { administrativeSmsPermissionReviewed: "not_permitted" }, "sms_notice_or_permission_unverified"],
  ["suppressed", { smsSuppressionStatus: "suppressed" }, "suppression_not_clear"],
  ["suppression unknown", { smsSuppressionStatus: "unknown" }, "suppression_not_clear"],
  ["suppression lookup failed", { smsSuppressionStatus: "lookup_failed" }, "suppression_not_clear"],
  ["prior SMS exists", { priorSmsAttemptStatus: "exists" }, "duplicate_or_prior_acknowledgement"],
  ["prior SMS unknown", { priorSmsAttemptStatus: "unknown" }, "duplicate_or_prior_acknowledgement"],
  ["duplicate", { providerLeadDuplicateStatus: "duplicate" }, "duplicate_or_prior_acknowledgement"],
  ["dedupe unknown", { providerLeadDuplicateStatus: "unknown" }, "duplicate_or_prior_acknowledgement"],
  ["mobile ownership unknown", { contactMobileVerified: false }, "invalid_or_unverified_mobile"],
  ["CLI not verified", { actualOutboundCallerIdVerified: false }, "caller_identity_unverified"],
  ["STOP active", { emergencyStopStatus: "active" }, "emergency_stop_not_clear"],
  ["STOP unknown", { emergencyStopStatus: "unknown" }, "emergency_stop_not_clear"],
  ["no durable reservation", { durableSingleAttemptReservationVerified: false }, "durable_reservation_unverified"],
] as const) test(name, () => {
  const d = run(lead, { ...evidence, ...patch } as IndependentlyVerifiedReviewEvidence);
  assert.equal(d.status, "hold"); assert.ok(d.reasons.includes(reason as ReviewHoldReason));
  assert.equal(d.executionAllowed, false); assert.equal(d.messageStatus, "not_sent");
});
for (const [name, patch, reason] of [
  ["wrong source", { leadSource: "website" }, "unverified_meta_origin"],
  ["missing lead id", { externalLeadId: "" }, "invalid_lead_identifier"],
  ["contact number is landline", { telephone: "01332 605506" }, "invalid_or_unverified_mobile"],
  ["SMS number missing", { telephone: null }, "invalid_or_unverified_mobile"],
  ["missing form", { formId: null }, "missing_form_identity"],
  ["stale", { receivedAt: "2026-10-11T19:00:00Z" }, "stale_or_future_submission"],
  ["future", { receivedAt: "2026-10-15T19:00:00Z" }, "stale_or_future_submission"],
  ["invalid timestamp", { receivedAt: "yesterday" }, "stale_or_future_submission"],
  ["timezone missing", { receivedAt: "2026-10-14T19:00:00" }, "stale_or_future_submission"],
] as const) test(name, () => {
  const d = run({ ...lead, ...patch } as CanonicalExternalLead);
  assert.equal(d.status, "hold"); assert.ok(d.reasons.includes(reason as ReviewHoldReason));
});
test("null lead fails closed", () => assert.equal(run(null).status, "hold"));
test("null independently verified evidence fails closed", () => assert.equal(run(lead, null).status, "hold"));
test("invalid current clock fails closed", () => assert.ok(run(lead, evidence, "unknown").reasons.includes("stale_or_future_submission")));
test("valid UK mobile accepted for eligibility check only", () => {
  for (const mobile of ["07123 456789", "+44 7123 456789", "00447123456789", "07900123456"]) assert.equal(isEligibleUkMobile(mobile), true);
});
test("premium/pager/short/landline and non-string rejected", () => {
  for (const mobile of ["07012345678", "07612345678", "01332605506", "071234567", "071234567891", "07test", null, 7123456789]) assert.equal(isEligibleUkMobile(mobile), false);
});
test("idempotency key only for narrow Meta event ID", () => {
  assert.equal(leadAcknowledgementKey("tt", "lead_123456"), null);
  assert.equal(leadAcknowledgementKey("meta", "../../evil"), null);
  assert.equal(leadAcknowledgementKey("meta", "lead_123456"), "meta:feh-callback-ack-v1:lead_123456");
});
test("decision does not contain customer name, email or mobile", () => {
  const serialized = JSON.stringify(run());
  for (const privateValue of [lead.contactName!, lead.companyName!, lead.email!, lead.telephone!]) assert.ok(!serialized.includes(privateValue));
});
test("templates use approved FEH CLI and contain no additional sales copy", () => {
  assert.equal(FEH_CALLBACK_NUMBER, "01332 605506");
  for (const copy of [FEH_ADMINISTRATIVE_SMS_COPY, FEH_FORM_COMPLETION_COPY]) {
    assert.ok(copy.includes(FEH_CALLBACK_NUMBER));
    assert.ok(!/discount|renew now|special offer|lowest rates|exclusive deal/i.test(copy));
  }
});
