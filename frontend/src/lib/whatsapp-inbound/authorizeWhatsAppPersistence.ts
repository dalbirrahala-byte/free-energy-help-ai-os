import type { WhatsAppCrmWriteIntent } from "./prepareWhatsAppCrmWriteIntent.ts";

export type WhatsAppPersistenceDecision = "APPROVE_PERSISTENCE" | "REJECT_PERSISTENCE";

export type WhatsAppPersistenceAuthorization =
  | {
      status: "AUTHORIZED_FOR_CONTROLLED_PERSISTENCE";
      reviewerReference: string;
      authorizationReference: string;
      provenanceReference: string;
      idempotencyKey: string;
      intent: Extract<
        WhatsAppCrmWriteIntent,
        { disposition: "prepared_create" | "prepared_attach" }
      >;
      persistenceAllowed: true;
      persistencePerformed: false;
      outboundReplyAllowed: false;
      providerExecutionAllowed: false;
    }
  | {
      status: "REJECTED_BY_HUMAN" | "BLOCKED";
      reviewerReference: string;
      authorizationReference: string;
      provenanceReference: string | null;
      idempotencyKey: string | null;
      reason: string;
      persistenceAllowed: false;
      persistencePerformed: false;
      outboundReplyAllowed: false;
      providerExecutionAllowed: false;
    };

/**
 * Factory 045 Phase 4 grants permission for one later controlled CRM
 * persistence step. It does not execute any database/network mutation.
 */
export function authorizeWhatsAppPersistence(
  intent: WhatsAppCrmWriteIntent,
  decision: WhatsAppPersistenceDecision,
  reviewerReference: string,
  authorizationReference: string,
): WhatsAppPersistenceAuthorization {
  const reviewer = reviewerReference.trim();
  const authorization = authorizationReference.trim();

  if (!reviewer) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      authorizationReference: authorization,
      provenanceReference: "provenanceReference" in intent ? intent.provenanceReference : null,
      idempotencyKey: "idempotencyKey" in intent ? intent.idempotencyKey : null,
      reason: "Human persistence reviewer provenance is required.",
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (!authorization) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      authorizationReference: authorization,
      provenanceReference: "provenanceReference" in intent ? intent.provenanceReference : null,
      idempotencyKey: "idempotencyKey" in intent ? intent.idempotencyKey : null,
      reason: "A unique persistence authorization reference is required.",
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (
    intent.disposition !== "prepared_create" &&
    intent.disposition !== "prepared_attach"
  ) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      authorizationReference: authorization,
      provenanceReference: intent.provenanceReference,
      idempotencyKey: intent.idempotencyKey,
      reason: "Only prepared create/attach intents may be authorized for controlled persistence.",
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (!intent.provenanceReference.trim() || !intent.idempotencyKey.trim()) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      authorizationReference: authorization,
      provenanceReference: intent.provenanceReference || null,
      idempotencyKey: intent.idempotencyKey || null,
      reason: "Persistence authorization requires provenance and idempotency evidence.",
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (decision === "REJECT_PERSISTENCE") {
    return {
      status: "REJECTED_BY_HUMAN",
      reviewerReference: reviewer,
      authorizationReference: authorization,
      provenanceReference: intent.provenanceReference,
      idempotencyKey: intent.idempotencyKey,
      reason: "Human reviewer rejected controlled persistence.",
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  return {
    status: "AUTHORIZED_FOR_CONTROLLED_PERSISTENCE",
    reviewerReference: reviewer,
    authorizationReference: authorization,
    provenanceReference: intent.provenanceReference,
    idempotencyKey: intent.idempotencyKey,
    intent,
    persistenceAllowed: true,
    persistencePerformed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
