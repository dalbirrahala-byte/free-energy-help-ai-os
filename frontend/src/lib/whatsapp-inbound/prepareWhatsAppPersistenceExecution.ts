import type { WhatsAppPersistenceAuthorization } from "./authorizeWhatsAppPersistence.ts";

export type WhatsAppPersistenceExecutionPreparation =
  | {
      status: "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW";
      reviewerReference: string;
      authorizationReference: string;
      provenanceReference: string;
      idempotencyKey: string;
      intent: Extract<
        WhatsAppPersistenceAuthorization,
        { status: "AUTHORIZED_FOR_CONTROLLED_PERSISTENCE" }
      >["intent"];
      executionReviewRequired: true;
      persistenceAllowed: true;
      persistencePerformed: false;
      outboundReplyAllowed: false;
      providerExecutionAllowed: false;
    }
  | {
      status: "BLOCKED";
      reason: string;
      reviewerReference: string;
      authorizationReference: string;
      provenanceReference: string | null;
      idempotencyKey: string | null;
      executionReviewRequired: true;
      persistenceAllowed: false;
      persistencePerformed: false;
      outboundReplyAllowed: false;
      providerExecutionAllowed: false;
    };

/**
 * Factory 045 Phase 5 prepares an already-authorized persistence request for
 * a separate execution review. It performs no CRM/database/network mutation.
 */
export function prepareWhatsAppPersistenceExecution(
  authorization: WhatsAppPersistenceAuthorization,
): WhatsAppPersistenceExecutionPreparation {
  if (
    authorization.status !== "AUTHORIZED_FOR_CONTROLLED_PERSISTENCE" ||
    !authorization.persistenceAllowed
  ) {
    return {
      status: "BLOCKED",
      reason: "Controlled persistence authorization is required before execution preparation.",
      reviewerReference: authorization.reviewerReference,
      authorizationReference: authorization.authorizationReference,
      provenanceReference: authorization.provenanceReference,
      idempotencyKey: authorization.idempotencyKey,
      executionReviewRequired: true,
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (
    !authorization.reviewerReference.trim() ||
    !authorization.authorizationReference.trim() ||
    !authorization.provenanceReference.trim() ||
    !authorization.idempotencyKey.trim()
  ) {
    return {
      status: "BLOCKED",
      reason: "Execution preparation requires complete reviewer, authorization, provenance, and idempotency evidence.",
      reviewerReference: authorization.reviewerReference,
      authorizationReference: authorization.authorizationReference,
      provenanceReference: authorization.provenanceReference || null,
      idempotencyKey: authorization.idempotencyKey || null,
      executionReviewRequired: true,
      persistenceAllowed: false,
      persistencePerformed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  return {
    status: "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW",
    reviewerReference: authorization.reviewerReference,
    authorizationReference: authorization.authorizationReference,
    provenanceReference: authorization.provenanceReference,
    idempotencyKey: authorization.idempotencyKey,
    intent: authorization.intent,
    executionReviewRequired: true,
    persistenceAllowed: true,
    persistencePerformed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
