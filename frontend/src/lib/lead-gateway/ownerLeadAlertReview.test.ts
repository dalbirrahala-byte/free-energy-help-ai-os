import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reviewFehOwnerLeadAlert, FEH_OWNED_META_FORM_ID, FEH_OWNER_ALERT_TEXT } from './ownerLeadAlertReview.ts';
import type { FehPersistedMetaLeadReceipt, OwnerAlertEvidence } from './ownerLeadAlertReview.ts';

const now = '2026-10-18T21:00:00+01:00';
const baseReceipt: FehPersistedMetaLeadReceipt = {
  provider: 'meta', externalLeadId: 'SYNTH-LEAD-001',
  formId: FEH_OWNED_META_FORM_ID, leadId: 128, intakeOutcome: 'accepted',
  receivedAt: '2026-10-18T20:58:00+01:00',
};
const baseEvidence: OwnerAlertEvidence = {
  authenticatedMetaEventAndGraphReceipt: true,
  persistedLeadAndFehAccessVerified: true,
  fehStaffAndScopeVerified: true,
  ownerAssignedFromApprovedStaffMembership: true,
  internalMobileVerifiedAndOwnerApproved: true,
  internalPurposeAndDataMinimisationReviewed: true,
  providerApprovalVerified: true,
  smsSuppressionAndEmergencyStop: 'clear',
  priorAttempt: 'none',
  providerLeadDuplicate: 'unique',
  durableAttemptReservationVerified: true,
};
const check = (
  receipt: FehPersistedMetaLeadReceipt | null = baseReceipt,
  evidence: OwnerAlertEvidence | null = baseEvidence,
  time = now,
) => reviewFehOwnerLeadAlert(receipt, evidence, time);

test('all positive evidence is still non-executing candidate for separate approval', () => {
  const d = check();
  assert.equal(d.status, 'candidate_for_separate_approval');
  assert.equal(d.executionAllowed, false);
  assert.equal(d.messageStatus, 'not_sent');
  assert.deepEqual(d.reasons, []);
});
test('message contains no PII and no clickable credential link', () => {
  assert.equal(FEH_OWNER_ALERT_TEXT, 'FEH CRM: New verified Meta enquiry received. Sign in to the CRM and arrange a callback within one working day.');
  assert.ok(!FEH_OWNER_ALERT_TEXT.includes('http'));
  assert.ok(FEH_OWNER_ALERT_TEXT.length < 160);
});
test('stable idempotency key only for owned form and safe ID', () => {
  assert.equal(check().idempotencyKey, 'meta:feh-owner-newlead-v1:1788543365401126:SYNTH-LEAD-001');
  assert.equal(check({...baseReceipt, externalLeadId:'!invalid'}).idempotencyKey, null);
  assert.equal(check({...baseReceipt, formId:'1618322856411605'}).idempotencyKey, null);
});
test('null receipt and evidence always hold', () => {
  assert.equal(check(null, null).status, 'hold');
});

const negative: Array<[string, Partial<FehPersistedMetaLeadReceipt>, Partial<OwnerAlertEvidence>, string]> = [
  ['wrong Meta form', {formId:'1618322856411605'}, {}, 'invalid_feh_scope_or_form'],
  ['missing form', {formId:''}, {}, 'invalid_feh_scope_or_form'],
  ['wrong provider', {provider:'website' as 'meta'}, {}, 'invalid_feh_scope_or_form'],
  ['FEH scope not verified', {}, {fehStaffAndScopeVerified:false}, 'invalid_feh_scope_or_form'],
  ['unverified Meta event', {}, {authenticatedMetaEventAndGraphReceipt:false}, 'unverified_provider_origin'],
  ['lead not persisted', {}, {persistedLeadAndFehAccessVerified:false}, 'unverified_crm_persistence'],
  ['owner not assigned', {}, {ownerAssignedFromApprovedStaffMembership:false}, 'no_confirmed_owner'],
  ['unverified staff mobile', {}, {internalMobileVerifiedAndOwnerApproved:false}, 'no_approved_staff_destination'],
  ['purpose not reviewed', {}, {internalPurposeAndDataMinimisationReviewed:false}, 'internal_notification_permission_unreviewed'],
  ['prior SMS attempt', {}, {priorAttempt:'exists'}, 'duplicate_or_prior_attempt'],
  ['unknown prior SMS', {}, {priorAttempt:'unknown'}, 'duplicate_or_prior_attempt'],
  ['replayed/duplicated lead', {}, {providerLeadDuplicate:'duplicate'}, 'duplicate_or_prior_attempt'],
  ['unknown duplicate', {}, {providerLeadDuplicate:'unknown'}, 'duplicate_or_prior_attempt'],
  ['missing durable reservation', {}, {durableAttemptReservationVerified:false}, 'missing_durable_single_attempt_reservation'],
  ['provider not approved', {}, {providerApprovalVerified:false}, 'provider_not_approved'],
  ['STOP active', {}, {smsSuppressionAndEmergencyStop:'blocked'}, 'stop_or_suppression_unclear'],
  ['STOP unclear', {}, {smsSuppressionAndEmergencyStop:'unknown'}, 'stop_or_suppression_unclear'],
  ['zero CRM lead ID', {leadId:0}, {}, 'invalid_persisted_lead_id'],
  ['unsafe CRM lead ID', {leadId:Number.MAX_SAFE_INTEGER+1}, {}, 'invalid_persisted_lead_id'],
  ['duplicate CRM outcome', {intakeOutcome:'duplicate'}, {}, 'lead_was_not_newly_accepted'],
  ['rejected CRM outcome', {intakeOutcome:'rejected'}, {}, 'lead_was_not_newly_accepted'],
  ['indeterminate CRM outcome', {intakeOutcome:'unknown'}, {}, 'lead_was_not_newly_accepted'],
  ['invalid external ID', {externalLeadId:'!bad'}, {}, 'invalid_external_lead_id'],
  ['stale event', {receivedAt:'2026-10-16T20:00:00+01:00'}, {}, 'stale_or_future_event'],
  ['future event', {receivedAt:'2026-10-19T20:00:00+01:00'}, {}, 'stale_or_future_event'],
  ['no timezone', {receivedAt:'2026-10-18T20:58:00'}, {}, 'stale_or_future_event'],
];
for (const [title, receiptPatch, evidencePatch, holdReason] of negative) {
  test('fail closed: ' + title, () => {
    const r = check({...baseReceipt, ...receiptPatch}, {...baseEvidence, ...evidencePatch});
    assert.equal(r.status, 'hold');
    assert.equal(r.executionAllowed, false);
    assert.equal(r.messageStatus, 'not_sent');
    assert.ok(r.reasons.includes(holdReason as never));
  });
}
test('no path enables execution, including complete positive evidence', () => {
  const result = check();
  assert.deepEqual(Object.keys(result).filter(k => /phone|email|name|recipient/i.test(k)), []);
  assert.equal(result.executionAllowed, false);
});
