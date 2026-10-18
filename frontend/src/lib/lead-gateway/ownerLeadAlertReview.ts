/**
 * FEH internal owner notification SMS — Stage 2 review-only / synthetic design.
 * NO I/O, database access, network transport, provider SDK, secret use or sends.
 * A review-only implementation. No real SMS delivery, CRM mutation, or deployment.
 *
 * Unlike customer acknowledgement SMS, this is a minimal INTERNAL staff notification.
 * Never put customer's name, phone, email, spend or a bearer token in the SMS.
 * Evidence MUST come independently from a trusted server + persisted records;
 * untrusted browser/webhook supplied boolean flags NEVER prove authenticity.
 */

export const FEH_OWNED_META_FORM_ID = '1788543365401126' as const;
export const FEH_OWNER_ALERT_TEMPLATE_VERSION = 'feh-owner-newlead-v1' as const;
export const FEH_OWNER_ALERT_TEXT =
  'FEH CRM: New verified Meta enquiry received. Sign in to the CRM and arrange a callback within one working day.' as const;

export type InternalAlertHoldReason =
  | 'missing_input'
  | 'invalid_persisted_lead_id'
  | 'invalid_feh_scope_or_form'
  | 'lead_was_not_newly_accepted'
  | 'invalid_external_lead_id'
  | 'unverified_provider_origin'
  | 'unverified_crm_persistence'
  | 'no_confirmed_owner'
  | 'no_approved_staff_destination'
  | 'internal_notification_permission_unreviewed'
  | 'stale_or_future_event'
  | 'duplicate_or_prior_attempt'
  | 'missing_durable_single_attempt_reservation'
  | 'provider_not_approved'
  | 'stop_or_suppression_unclear';

/** Server-side verified lead receipt, not raw Meta data.
 * No invented tenantId: FEH v1's organisations table represents CUSTOMER companies,
 * not auth tenants. Human FEH membership must be independently verified. */
export type FehPersistedMetaLeadReceipt = {
  readonly provider: 'meta';
  readonly externalLeadId: string;
  readonly formId: string;
  readonly leadId: number;
  /** Only a newly accepted CRM record may generate the first owner alert. */
  readonly intakeOutcome: 'accepted' | 'duplicate' | 'rejected' | 'unknown';
  readonly receivedAt: string;
};

/** Verified server-side facts. Never use form fields or caller claims as evidence. */
export type OwnerAlertEvidence = {
  readonly authenticatedMetaEventAndGraphReceipt: boolean;
  readonly persistedLeadAndFehAccessVerified: boolean;
  readonly fehStaffAndScopeVerified: boolean;
  readonly ownerAssignedFromApprovedStaffMembership: boolean;
  readonly internalMobileVerifiedAndOwnerApproved: boolean;
  readonly internalPurposeAndDataMinimisationReviewed: boolean;
  readonly providerApprovalVerified: boolean;
  readonly smsSuppressionAndEmergencyStop: 'clear' | 'blocked' | 'unknown';
  readonly priorAttempt: 'none' | 'exists' | 'unknown';
  readonly providerLeadDuplicate: 'unique' | 'duplicate' | 'unknown';
  readonly durableAttemptReservationVerified: boolean;
};

export type OwnerAlertReviewResult = {
  readonly status: 'hold' | 'candidate_for_separate_approval';
  readonly reasons: readonly InternalAlertHoldReason[];
  readonly executionAllowed: false;
  readonly messageStatus: 'not_sent';
  readonly idempotencyKey: string | null;
  readonly templateVersion: typeof FEH_OWNER_ALERT_TEMPLATE_VERSION;
  /** Safe fixed message only, never customer or staff phone data. */
  readonly message: typeof FEH_OWNER_ALERT_TEXT;
};

function validExternalId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{6,100}$/.test(value);
}

function freshTimestamp(value: unknown, nowIso: unknown): boolean {
  if (typeof value !== 'string' || typeof nowIso !== 'string') return false;
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!iso.test(value) || !iso.test(nowIso)) return false;
  const t = Date.parse(value), now = Date.parse(nowIso);
  return Number.isFinite(t) && Number.isFinite(now)
    && t <= now + 5 * 60_000 && now - t <= 24 * 60 * 60_000;
}

/** No sending capability: all paths have executionAllowed=false. */
export function reviewFehOwnerLeadAlert(
  receipt: FehPersistedMetaLeadReceipt | null | undefined,
  evidence: OwnerAlertEvidence | null | undefined,
  nowIso: string,
): OwnerAlertReviewResult {
  const reasons: InternalAlertHoldReason[] = [];
  if (!receipt || !evidence) reasons.push('missing_input');
  if (!Number.isSafeInteger(receipt?.leadId) || (receipt?.leadId ?? 0) <= 0) {
    reasons.push('invalid_persisted_lead_id');
  }
  if (receipt?.provider !== 'meta' || receipt?.formId !== FEH_OWNED_META_FORM_ID ||
      evidence?.fehStaffAndScopeVerified !== true) reasons.push('invalid_feh_scope_or_form');
  if (receipt?.intakeOutcome !== 'accepted') reasons.push('lead_was_not_newly_accepted');
  if (!validExternalId(receipt?.externalLeadId)) reasons.push('invalid_external_lead_id');
  if (evidence?.authenticatedMetaEventAndGraphReceipt !== true) reasons.push('unverified_provider_origin');
  if (evidence?.persistedLeadAndFehAccessVerified !== true) reasons.push('unverified_crm_persistence');
  if (evidence?.ownerAssignedFromApprovedStaffMembership !== true) reasons.push('no_confirmed_owner');
  if (evidence?.internalMobileVerifiedAndOwnerApproved !== true) reasons.push('no_approved_staff_destination');
  if (evidence?.internalPurposeAndDataMinimisationReviewed !== true) reasons.push('internal_notification_permission_unreviewed');
  if (!freshTimestamp(receipt?.receivedAt, nowIso)) reasons.push('stale_or_future_event');
  if (evidence?.priorAttempt !== 'none' || evidence?.providerLeadDuplicate !== 'unique') reasons.push('duplicate_or_prior_attempt');
  if (evidence?.durableAttemptReservationVerified !== true) reasons.push('missing_durable_single_attempt_reservation');
  if (evidence?.providerApprovalVerified !== true) reasons.push('provider_not_approved');
  if (evidence?.smsSuppressionAndEmergencyStop !== 'clear') reasons.push('stop_or_suppression_unclear');

  const idempotencyKey = validExternalId(receipt?.externalLeadId) && receipt?.formId === FEH_OWNED_META_FORM_ID
    ? 'meta:' + FEH_OWNER_ALERT_TEMPLATE_VERSION + ':' + FEH_OWNED_META_FORM_ID + ':' + receipt.externalLeadId
    : null;

  return {
    status: reasons.length === 0 ? 'candidate_for_separate_approval' : 'hold',
    reasons,
    executionAllowed: false,
    messageStatus: 'not_sent',
    idempotencyKey,
    templateVersion: FEH_OWNER_ALERT_TEMPLATE_VERSION,
    message: FEH_OWNER_ALERT_TEXT,
  };
}
