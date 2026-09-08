import type { WhatsAppPersistenceAuditDisposition } from "./createWhatsAppPersistenceAuditDisposition.ts";
import type { WhatsAppPersistenceReceipt } from "./createWhatsAppPersistenceReceipt.ts";

export type WhatsAppPersistenceCompletionRecord = Readonly<{
  disposition: WhatsAppPersistenceAuditDisposition["status"];
  outcome: WhatsAppPersistenceReceipt["status"];
  reviewerReference: string;
  executionAuthorizationReference: string;
  persistenceAuthorizationReference: string;
  provenanceReference: string;
  idempotencyKey: string;
  crmRecordReference: string | null;
  reasons: readonly string[];
  automaticRetryAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

/**
 * Factory 045 Phase 11 creates the terminal immutable completion record for
 * the controlled WhatsApp persistence flow. It performs no I/O and grants no
 * retry, reply, provider, credential, webhook, or database capability.
 */
export function createWhatsAppPersistenceCompletionRecord(
  receipt: WhatsAppPersistenceReceipt,
  disposition: WhatsAppPersistenceAuditDisposition,
): WhatsAppPersistenceCompletionRecord {
  const incompleteProvenance =
    !receipt.reviewerReference.trim() ||
    !receipt.executionAuthorizationReference.trim() ||
    !receipt.persistenceAuthorizationReference.trim() ||
    !receipt.provenanceReference.trim() ||
    !receipt.idempotencyKey.trim();

  return {
    disposition: incompleteProvenance
      ? "HUMAN_REVIEW_REQUIRED"
      : disposition.status,
    outcome: receipt.status,
    reviewerReference: receipt.reviewerReference.trim(),
    executionAuthorizationReference:
      receipt.executionAuthorizationReference.trim(),
    persistenceAuthorizationReference:
      receipt.persistenceAuthorizationReference.trim(),
    provenanceReference: receipt.provenanceReference.trim(),
    idempotencyKey: receipt.idempotencyKey.trim(),
    crmRecordReference: receipt.crmRecordReference?.trim() || null,
    reasons: incompleteProvenance
      ? ["Completion record provenance is incomplete; human review is required."]
      : disposition.reasons,
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
