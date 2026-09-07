import type { WhatsAppPersistenceExecutionResult } from "./executeAuthorizedWhatsAppPersistenceOnce.ts";

export type WhatsAppPersistenceReceipt = Readonly<{
  status: WhatsAppPersistenceExecutionResult["status"];
  reviewerReference: string;
  executionAuthorizationReference: string;
  persistenceAuthorizationReference: string;
  provenanceReference: string;
  idempotencyKey: string;
  crmRecordReference: string | null;
  persistenceAttempted: boolean;
  persistenceExecuted: boolean;
  automaticRetryAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

/**
 * Factory 045 Phase 8 creates a deterministic, non-secret receipt from the
 * Phase 7 execution result. It performs no I/O and grants no new capability.
 */
export function createWhatsAppPersistenceReceipt(
  result: WhatsAppPersistenceExecutionResult,
): WhatsAppPersistenceReceipt {
  return {
    status: result.status,
    reviewerReference: result.reviewerReference.trim(),
    executionAuthorizationReference:
      result.executionAuthorizationReference.trim(),
    persistenceAuthorizationReference:
      result.persistenceAuthorizationReference.trim(),
    provenanceReference: result.provenanceReference.trim(),
    idempotencyKey: result.idempotencyKey.trim(),
    crmRecordReference: result.crmRecordReference?.trim() || null,
    persistenceAttempted: result.persistenceAttempted,
    persistenceExecuted: result.persistenceExecuted,
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
