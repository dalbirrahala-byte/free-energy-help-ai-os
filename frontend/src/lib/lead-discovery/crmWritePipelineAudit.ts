import type { CrmWritePipelineReceipt } from "./crmWritePipelineReceipt.ts";

export type CrmWritePipelineAuditDecision =
  | Readonly<{ status: "ACCEPTED"; reasons: readonly string[] }>
  | Readonly<{ status: "REVIEW_REQUIRED"; reasons: readonly string[] }>
  | Readonly<{ status: "REJECTED"; reasons: readonly string[] }>;

/**
 * Factory 044 Phase 16 evaluates a completed Phase 15 receipt without mutation.
 * It never retries, writes, activates outreach, or performs provider execution.
 */
export function evaluateCrmWritePipelineReceipt(
  receipt: CrmWritePipelineReceipt,
): CrmWritePipelineAuditDecision {
  if (
    !receipt.organisationName.trim() ||
    !receipt.reviewerReference.trim() ||
    !receipt.authorizationReference.trim() ||
    !receipt.idempotencyKey.trim() ||
    receipt.outreachAllowed !== false ||
    receipt.executionPerformed !== false
  ) {
    return {
      status: "REJECTED",
      reasons: ["Controlled CRM write receipt is incomplete or violates safety invariants."],
    };
  }

  if (receipt.status === "WRITTEN") {
    if (!receipt.crmWriteAttempted || !receipt.crmWritePerformed || !receipt.crmRecordReference) {
      return {
        status: "REJECTED",
        reasons: ["Written receipt is internally inconsistent."],
      };
    }
    return {
      status: "ACCEPTED",
      reasons: ["Controlled CRM write has complete provenance and a CRM record reference."],
    };
  }

  if (receipt.status === "DUPLICATE_SUPPRESSED") {
    if (!receipt.crmWriteAttempted || receipt.crmWritePerformed || !receipt.crmRecordReference) {
      return {
        status: "REJECTED",
        reasons: ["Duplicate-suppression receipt is internally inconsistent."],
      };
    }
    return {
      status: "ACCEPTED",
      reasons: ["Duplicate was safely suppressed and references the existing CRM record."],
    };
  }

  if (receipt.status === "INDETERMINATE" || receipt.status === "EVALUATION_FAILED") {
    return {
      status: "REVIEW_REQUIRED",
      reasons: ["Outcome is uncertain and must not be automatically retried."],
    };
  }

  return {
    status: "ACCEPTED",
    reasons: ["Controlled CRM write was blocked without performing a mutation."],
  };
}
