import type { WhatsAppPersistenceAuditDecision } from "./evaluateWhatsAppPersistenceReceipt.ts";

export type WhatsAppPersistenceAuditDisposition = Readonly<{
  status: "CLOSED_SAFE" | "HUMAN_REVIEW_REQUIRED";
  reasons: readonly string[];
  automaticRetryAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

/**
 * Factory 045 Phase 10 converts the Phase 9 audit decision into a terminal
 * safe disposition. It grants no mutation, retry, reply, or provider
 * execution capability and performs no I/O.
 */
export function createWhatsAppPersistenceAuditDisposition(
  decision: WhatsAppPersistenceAuditDecision,
): WhatsAppPersistenceAuditDisposition {
  if (decision.status === "ACCEPTED") {
    return {
      status: "CLOSED_SAFE",
      reasons: decision.reasons,
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  return {
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: decision.reasons,
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
