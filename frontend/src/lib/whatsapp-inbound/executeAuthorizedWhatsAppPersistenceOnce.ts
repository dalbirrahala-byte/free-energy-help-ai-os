import type { WhatsAppPersistenceExecutionAuthorization } from "./authorizeWhatsAppPersistenceExecution.ts";

export type WhatsAppPersistenceExecutorOutcome =
  | { status: "written"; crmRecordReference: string }
  | { status: "duplicate_suppressed"; crmRecordReference: string }
  | { status: "blocked"; reason?: string }
  | { status: "indeterminate"; reason?: string };

export type WhatsAppPersistenceExecutor = {
  executeOnce(
    authorization: Extract<
      WhatsAppPersistenceExecutionAuthorization,
      { status: "AUTHORIZED_FOR_SINGLE_EXECUTION" }
    >,
  ): Promise<WhatsAppPersistenceExecutorOutcome>;
};

export type WhatsAppPersistenceExecutionResult = {
  status:
    | "WRITTEN"
    | "DUPLICATE_SUPPRESSED"
    | "BLOCKED"
    | "INDETERMINATE"
    | "EVALUATION_FAILED";
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
  reason: string | null;
};

/**
 * Factory 045 Phase 7 introduces only a provider-neutral, single-attempt
 * execution boundary. The concrete executor is injected by a separately
 * governed layer. This module contains no Supabase client, credentials,
 * provider SDK, route, retry loop, or production activation.
 */
export async function executeAuthorizedWhatsAppPersistenceOnce(
  executor: WhatsAppPersistenceExecutor,
  authorization: WhatsAppPersistenceExecutionAuthorization,
): Promise<WhatsAppPersistenceExecutionResult> {
  const base = {
    reviewerReference: authorization.reviewerReference.trim(),
    executionAuthorizationReference:
      authorization.executionAuthorizationReference.trim(),
    persistenceAuthorizationReference:
      authorization.persistenceAuthorizationReference?.trim() || "",
    provenanceReference: authorization.provenanceReference?.trim() || "",
    idempotencyKey: authorization.idempotencyKey?.trim() || "",
    automaticRetryAllowed: false as const,
    outboundReplyAllowed: false as const,
    providerExecutionAllowed: false as const,
  };

  if (
    authorization.status !== "AUTHORIZED_FOR_SINGLE_EXECUTION" ||
    authorization.persistenceExecutionAllowed !== true ||
    authorization.persistenceExecuted !== false ||
    authorization.automaticRetryAllowed !== false ||
    !base.reviewerReference ||
    !base.executionAuthorizationReference ||
    !base.persistenceAuthorizationReference ||
    !base.provenanceReference ||
    !base.idempotencyKey
  ) {
    return {
      ...base,
      status: "BLOCKED",
      crmRecordReference: null,
      persistenceAttempted: false,
      persistenceExecuted: false,
      reason: "Single-execution persistence prerequisites are incomplete or inconsistent.",
    };
  }

  let outcome: WhatsAppPersistenceExecutorOutcome;
  try {
    outcome = await executor.executeOnce(authorization);
  } catch {
    return {
      ...base,
      status: "INDETERMINATE",
      crmRecordReference: null,
      persistenceAttempted: true,
      persistenceExecuted: false,
      reason: "Persistence executor threw; outcome is indeterminate and must not be automatically retried.",
    };
  }

  if (outcome.status === "written") {
    const crmRecordReference = outcome.crmRecordReference.trim();
    if (!crmRecordReference) {
      return {
        ...base,
        status: "EVALUATION_FAILED",
        crmRecordReference: null,
        persistenceAttempted: true,
        persistenceExecuted: false,
        reason: "Persistence reported success without a CRM record reference.",
      };
    }

    return {
      ...base,
      status: "WRITTEN",
      crmRecordReference,
      persistenceAttempted: true,
      persistenceExecuted: true,
      reason: null,
    };
  }

  if (outcome.status === "duplicate_suppressed") {
    const crmRecordReference = outcome.crmRecordReference.trim();
    if (!crmRecordReference) {
      return {
        ...base,
        status: "EVALUATION_FAILED",
        crmRecordReference: null,
        persistenceAttempted: true,
        persistenceExecuted: false,
        reason: "Duplicate suppression reported no existing CRM record reference.",
      };
    }

    return {
      ...base,
      status: "DUPLICATE_SUPPRESSED",
      crmRecordReference,
      persistenceAttempted: true,
      persistenceExecuted: false,
      reason: null,
    };
  }

  if (outcome.status === "blocked") {
    return {
      ...base,
      status: "BLOCKED",
      crmRecordReference: null,
      persistenceAttempted: true,
      persistenceExecuted: false,
      reason: outcome.reason?.trim() || "Persistence executor blocked the attempt.",
    };
  }

  return {
    ...base,
    status: "INDETERMINATE",
    crmRecordReference: null,
    persistenceAttempted: true,
    persistenceExecuted: false,
    reason:
      outcome.reason?.trim() ||
      "Persistence executor returned an indeterminate outcome; automatic retry is forbidden.",
  };
}
