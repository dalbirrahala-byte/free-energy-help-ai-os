import type { WhatsAppPersistenceCompletionRecord } from "./createWhatsAppPersistenceCompletionRecord.ts";

export type WhatsAppPersistenceClosureVerification = Readonly<{
  status: "VERIFIED_CLOSED" | "HUMAN_REVIEW_REQUIRED";
  reasons: readonly string[];
  automaticRetryAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

/**
 * Factory 045 Phase 12 independently verifies the terminal Phase 11 record.
 * This is a pure fail-closed check: no I/O, mutation, retry, reply, or provider
 * execution capability is introduced.
 */
export function verifyWhatsAppPersistenceClosure(
  record: WhatsAppPersistenceCompletionRecord,
): WhatsAppPersistenceClosureVerification {
  const provenanceComplete =
    Boolean(record.reviewerReference.trim()) &&
    Boolean(record.executionAuthorizationReference.trim()) &&
    Boolean(record.persistenceAuthorizationReference.trim()) &&
    Boolean(record.provenanceReference.trim()) &&
    Boolean(record.idempotencyKey.trim());

  const safetyLocked =
    record.automaticRetryAllowed === false &&
    record.outboundReplyAllowed === false &&
    record.providerExecutionAllowed === false;

  const closedConsistently =
    record.disposition === "CLOSED_SAFE" &&
    provenanceComplete &&
    safetyLocked &&
    (
      (record.outcome === "WRITTEN" && Boolean(record.crmRecordReference?.trim())) ||
      (record.outcome === "DUPLICATE_SUPPRESSED" && Boolean(record.crmRecordReference?.trim())) ||
      record.outcome === "BLOCKED"
    );

  if (closedConsistently) {
    return {
      status: "VERIFIED_CLOSED",
      reasons: ["Terminal WhatsApp persistence record is complete, consistent, and safety-locked."],
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  return {
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: ["Terminal WhatsApp persistence record cannot be independently verified as safely closed."],
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
