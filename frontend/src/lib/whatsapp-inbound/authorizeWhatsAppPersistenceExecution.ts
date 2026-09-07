import type { WhatsAppPersistenceExecutionPreparation } from "./prepareWhatsAppPersistenceExecution.ts";

export type WhatsAppPersistenceExecutionDecision =
  | "APPROVE_EXECUTION"
  | "REJECT_EXECUTION";

export type WhatsAppPersistenceExecutionAuthorization =
  | {
      status: "AUTHORIZED_FOR_SINGLE_EXECUTION";
      reviewerReference: string;
      executionAuthorizationReference: string;
      persistenceAuthorizationReference: string;
      provenanceReference: string;
      idempotencyKey: string;
      preparation: Extract<
        WhatsAppPersistenceExecutionPreparation,
        { status: "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW" }
      >;
      persistenceExecutionAllowed: true;
      persistenceExecuted: false;
      automaticRetryAllowed: false;
      outboundReplyAllowed: false;
      providerExecutionAllowed: false;
    }
  | {
      status: "REJECTED_BY_HUMAN" | "BLOCKED";
      reviewerReference: string;
      executionAuthorizationReference: string;
      persistenceAuthorizationReference: string | null;
      provenanceReference: string | null;
      idempotencyKey: string | null;
      reason: string;
      persistenceExecutionAllowed: false;
      persistenceExecuted: false;
      automaticRetryAllowed: false;
      outboundReplyAllowed: false;
      providerExecutionAllowed: false;
    };

/**
 * Factory 045 Phase 6 authorizes at most one later persistence execution
 * attempt. It does not inject a writer and performs no database/network I/O.
 */
export function authorizeWhatsAppPersistenceExecution(
  preparation: WhatsAppPersistenceExecutionPreparation,
  decision: WhatsAppPersistenceExecutionDecision,
  reviewerReference: string,
  executionAuthorizationReference: string,
): WhatsAppPersistenceExecutionAuthorization {
  const reviewer = reviewerReference.trim();
  const executionAuthorization = executionAuthorizationReference.trim();

  if (!reviewer) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      executionAuthorizationReference: executionAuthorization,
      persistenceAuthorizationReference: preparation.authorizationReference || null,
      provenanceReference: preparation.provenanceReference,
      idempotencyKey: preparation.idempotencyKey,
      reason: "Human execution reviewer provenance is required.",
      persistenceExecutionAllowed: false,
      persistenceExecuted: false,
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (!executionAuthorization) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      executionAuthorizationReference: executionAuthorization,
      persistenceAuthorizationReference: preparation.authorizationReference || null,
      provenanceReference: preparation.provenanceReference,
      idempotencyKey: preparation.idempotencyKey,
      reason: "A unique execution authorization reference is required.",
      persistenceExecutionAllowed: false,
      persistenceExecuted: false,
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (
    preparation.status !== "PREPARED_FOR_CONTROLLED_EXECUTION_REVIEW" ||
    preparation.executionReviewRequired !== true ||
    preparation.persistenceAllowed !== true ||
    preparation.persistencePerformed !== false ||
    !preparation.reviewerReference.trim() ||
    !preparation.authorizationReference.trim() ||
    !preparation.provenanceReference?.trim() ||
    !preparation.idempotencyKey?.trim()
  ) {
    return {
      status: "BLOCKED",
      reviewerReference: reviewer,
      executionAuthorizationReference: executionAuthorization,
      persistenceAuthorizationReference: preparation.authorizationReference || null,
      provenanceReference: preparation.provenanceReference,
      idempotencyKey: preparation.idempotencyKey,
      reason: "Execution authorization prerequisites are incomplete or inconsistent.",
      persistenceExecutionAllowed: false,
      persistenceExecuted: false,
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  if (decision === "REJECT_EXECUTION") {
    return {
      status: "REJECTED_BY_HUMAN",
      reviewerReference: reviewer,
      executionAuthorizationReference: executionAuthorization,
      persistenceAuthorizationReference: preparation.authorizationReference,
      provenanceReference: preparation.provenanceReference,
      idempotencyKey: preparation.idempotencyKey,
      reason: "Human reviewer rejected the controlled persistence execution.",
      persistenceExecutionAllowed: false,
      persistenceExecuted: false,
      automaticRetryAllowed: false,
      outboundReplyAllowed: false,
      providerExecutionAllowed: false,
    };
  }

  return {
    status: "AUTHORIZED_FOR_SINGLE_EXECUTION",
    reviewerReference: reviewer,
    executionAuthorizationReference: executionAuthorization,
    persistenceAuthorizationReference: preparation.authorizationReference,
    provenanceReference: preparation.provenanceReference,
    idempotencyKey: preparation.idempotencyKey,
    preparation,
    persistenceExecutionAllowed: true,
    persistenceExecuted: false,
    automaticRetryAllowed: false,
    outboundReplyAllowed: false,
    providerExecutionAllowed: false,
  };
}
