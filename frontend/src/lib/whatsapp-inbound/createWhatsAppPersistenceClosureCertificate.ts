import type { WhatsAppPersistenceClosureVerification } from "./verifyWhatsAppPersistenceClosure.ts";

export type WhatsAppPersistenceClosureCertificate = Readonly<{
  status: "CERTIFIED_CLOSED" | "HUMAN_REVIEW_REQUIRED";
  reasons: readonly string[];
  automaticRetryAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

/**
 * Factory 045 Phase 13 converts the independently verified Phase 12 closure
 * into a terminal, capability-free certificate. No I/O or mutation occurs.
 */
export function createWhatsAppPersistenceClosureCertificate(
  verification: WhatsAppPersistenceClosureVerification,
): WhatsAppPersistenceClosureCertificate {
  if (verification.status === "VERIFIED_CLOSED") {
    return {
      status: "CERTIFIED_CLOSED",
      reasons: verification.reasons,
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  return {
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: verification.reasons,
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
