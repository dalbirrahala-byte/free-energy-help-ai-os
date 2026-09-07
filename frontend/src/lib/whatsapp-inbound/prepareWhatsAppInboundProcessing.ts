import type { CanonicalWhatsAppInboundMessage } from "./types.ts";
import {
  planWhatsAppCrmIntake,
  type WhatsAppCrmIntakePlan,
  type WhatsAppLeadMatch,
} from "./planWhatsAppCrmIntake.ts";

export type WhatsAppInboundProcessingCandidate = {
  verified: boolean;
  provenanceReference?: string | null;
  message: CanonicalWhatsAppInboundMessage;
  match: WhatsAppLeadMatch;
};

export type WhatsAppInboundProcessingResult =
  | {
      disposition: "prepared";
      provenanceReference: string;
      plan: WhatsAppCrmIntakePlan;
      crmWriteAllowed: false;
      outboundReplyAllowed: false;
    }
  | {
      disposition: "rejected";
      reason: "unverified_webhook" | "missing_provenance" | "invalid_intake";
      crmWriteAllowed: false;
      outboundReplyAllowed: false;
    };

/**
 * Factory 045 Phase 2 prepares a verified inbound event for later controlled
 * persistence. This boundary is deliberately non-mutating: it performs no
 * network/database I/O and cannot authorize CRM writes or outbound replies.
 */
export function prepareWhatsAppInboundProcessing(
  candidate: WhatsAppInboundProcessingCandidate,
): WhatsAppInboundProcessingResult {
  if (!candidate.verified) {
    return {
      disposition: "rejected",
      reason: "unverified_webhook",
      crmWriteAllowed: false,
      outboundReplyAllowed: false,
    };
  }

  const provenanceReference =
    typeof candidate.provenanceReference === "string"
      ? candidate.provenanceReference.trim()
      : "";
  if (!provenanceReference) {
    return {
      disposition: "rejected",
      reason: "missing_provenance",
      crmWriteAllowed: false,
      outboundReplyAllowed: false,
    };
  }

  try {
    const plan = planWhatsAppCrmIntake(candidate.message, candidate.match);
    return {
      disposition: "prepared",
      provenanceReference,
      plan,
      crmWriteAllowed: false,
      outboundReplyAllowed: false,
    };
  } catch {
    return {
      disposition: "rejected",
      reason: "invalid_intake",
      crmWriteAllowed: false,
      outboundReplyAllowed: false,
    };
  }
}
