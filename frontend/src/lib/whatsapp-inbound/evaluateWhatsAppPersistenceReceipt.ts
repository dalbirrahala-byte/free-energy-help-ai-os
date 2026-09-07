import type { WhatsAppPersistenceReceipt } from "./createWhatsAppPersistenceReceipt.ts";

export type WhatsAppPersistenceAuditDecision =
  | Readonly<{ status: "ACCEPTED"; reasons: readonly string[] }>
  | Readonly<{ status: "HUMAN_REVIEW_REQUIRED"; reasons: readonly string[] }>
  | Readonly<{ status: "REJECTED"; reasons: readonly string[] }>;

/**
 * Factory 045 Phase 9 evaluates a Phase 8 persistence receipt without mutation.
 * It never retries, writes, activates outreach, or performs provider execution.
 */
export function evaluateWhatsAppPersistenceReceipt(
  receipt: WhatsAppPersistenceReceipt,
): WhatsAppPersistenceAuditDecision {
  if (
    !receipt.reviewerReference.trim() ||
    !receipt.executionAuthorizationReference.trim() ||
    !receipt.persistenceAuthorizationReference.trim() ||
    !receipt.provenanceReference.trim() ||
    !receipt.idempotencyKey.trim() ||
    receipt.automaticRetryAllowed !== false ||
    receipt.outboundReplyAllowed !== false ||
    receipt.providerExecutionAllowed !== false
  ) {
    return {
      status: "REJECTED",
      reasons: ["WhatsApp persistence receipt is incomplete or violates safety invariants."],
    };
  }

  if (receipt.status === "WRITTEN") {
    if (
      !receipt.persistenceAttempted ||
      !receipt.persistenceExecuted ||
      !receipt.crmRecordReference
    ) {
      return {
        status: "REJECTED",
        reasons: ["Written WhatsApp persistence receipt is internally inconsistent."],
      };
    }
    return {
      status: "ACCEPTED",
      reasons: [
        "Controlled persistence completed with complete provenance and a CRM record reference.",
      ],
    };
  }

  if (receipt.status === "DUPLICATE_SUPPRESSED") {
    if (
      !receipt.persistenceAttempted ||
      receipt.persistenceExecuted ||
      !receipt.crmRecordReference
    ) {
      return {
        status: "REJECTED",
        reasons: ["Duplicate-suppression receipt is internally inconsistent."],
      };
    }
    return {
      status: "ACCEPTED",
      reasons: ["Duplicate persistence was safely suppressed and references the existing CRM record."],
    };
  }

  if (receipt.status === "INDETERMINATE" || receipt.status === "EVALUATION_FAILED") {
    return {
      status: "HUMAN_REVIEW_REQUIRED",
      reasons: [
        "Persistence outcome is uncertain and must not be automatically retried.",
      ],
    };
  }

  if (receipt.status === "BLOCKED") {
    if (receipt.persistenceExecuted) {
      return {
        status: "REJECTED",
        reasons: ["Blocked persistence receipt cannot indicate an executed mutation."],
      };
    }
    return {
      status: "ACCEPTED",
      reasons: ["Persistence was blocked without completing a mutation."],
    };
  }

  return {
    status: "REJECTED",
    reasons: ["Unknown persistence receipt status."],
  };
}
