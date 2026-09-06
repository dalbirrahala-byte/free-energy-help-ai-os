import type { CrmWriteAuditDisposition } from "./crmWriteAuditDisposition.ts";
import type { CrmWritePipelineReceipt } from "./crmWritePipelineReceipt.ts";

export type CrmWriteCompletionRecord = Readonly<{
  disposition: CrmWriteAuditDisposition["status"];
  outcome: CrmWritePipelineReceipt["status"];
  organisationName: string;
  reviewerReference: string;
  authorizationReference: string;
  idempotencyKey: string;
  crmRecordReference: string | null;
  reasons: readonly string[];
  automaticRetryAllowed: false;
  outreachAllowed: false;
  executionAllowed: false;
}>;

/**
 * Factory 044 Phase 18 creates the terminal immutable completion record for
 * the controlled CRM-write flow. It grants no capability and performs no I/O.
 */
export function createCrmWriteCompletionRecord(
  receipt: CrmWritePipelineReceipt,
  disposition: CrmWriteAuditDisposition,
): CrmWriteCompletionRecord {
  const inconsistent =
    !receipt.organisationName.trim() ||
    !receipt.reviewerReference.trim() ||
    !receipt.authorizationReference.trim() ||
    !receipt.idempotencyKey.trim();

  return {
    disposition: inconsistent ? "HUMAN_REVIEW_REQUIRED" : disposition.status,
    outcome: receipt.status,
    organisationName: receipt.organisationName.trim(),
    reviewerReference: receipt.reviewerReference.trim(),
    authorizationReference: receipt.authorizationReference.trim(),
    idempotencyKey: receipt.idempotencyKey.trim(),
    crmRecordReference: receipt.crmRecordReference?.trim() || null,
    reasons: inconsistent
      ? ["Completion record provenance is incomplete; human review is required."]
      : disposition.reasons,
    automaticRetryAllowed: false,
    outreachAllowed: false,
    executionAllowed: false,
  };
}
