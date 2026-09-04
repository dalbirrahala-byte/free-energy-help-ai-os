// Factory 044 controlled CRM write execution boundary.
//
// This module deliberately contains no Supabase client, credentials, route,
// network transport, or automatic outreach. The only mutation capability is an
// injected controlled writer owned by a separately governed server-side layer.

import type { CrmWriteExecutionPreparation } from "./crmWriteExecutionPreparation.ts";

export type ControlledCrmWriteOutcome =
  | Readonly<{ status: "written"; crmRecordReference: string }>
  | Readonly<{ status: "duplicate_suppressed"; crmRecordReference: string }>
  | Readonly<{ status: "blocked"; reason?: string }>
  | Readonly<{ status: "indeterminate"; reason?: string }>;

export type ControlledCrmWriter = Readonly<{
  writePreparedCandidate(
    preparation: CrmWriteExecutionPreparation,
  ): Promise<ControlledCrmWriteOutcome>;
}>;

export type ControlledCrmWriteExecutionResult = Readonly<{
  status:
    | "WRITTEN"
    | "DUPLICATE_SUPPRESSED"
    | "BLOCKED"
    | "INDETERMINATE"
    | "EVALUATION_FAILED";
  organisationName: string;
  reviewerReference: string;
  authorizationReference: string;
  idempotencyKey: string;
  crmRecordReference: string | null;
  reasons: readonly string[];
  crmWriteAllowed: boolean;
  crmWriteAttempted: boolean;
  crmWritePerformed: boolean;
  outreachAllowed: false;
  executionPerformed: false;
}>;

function baseResult(
  preparation: CrmWriteExecutionPreparation,
  status: ControlledCrmWriteExecutionResult["status"],
  reasons: readonly string[],
  crmRecordReference: string | null,
  crmWriteAttempted: boolean,
  crmWritePerformed: boolean,
): ControlledCrmWriteExecutionResult {
  return {
    status,
    organisationName: preparation.organisationName.trim(),
    reviewerReference: preparation.reviewerReference.trim(),
    authorizationReference: preparation.authorizationReference.trim(),
    idempotencyKey: preparation.idempotencyKey.trim(),
    crmRecordReference,
    reasons,
    crmWriteAllowed: preparation.crmWriteAllowed,
    crmWriteAttempted,
    crmWritePerformed,
    outreachAllowed: false,
    executionPerformed: false,
  };
}

/**
 * Executes at most one controlled CRM write attempt for a validated Phase 9
 * preparation. This function never retries the writer and never activates
 * outreach or provider execution. Unknown writer outcomes are treated as
 * indeterminate rather than guessed to be successful or safe to retry.
 */
export async function executeControlledCrmWrite(
  writer: ControlledCrmWriter,
  preparation: CrmWriteExecutionPreparation,
): Promise<ControlledCrmWriteExecutionResult> {
  const organisationName = preparation.organisationName.trim();
  const reviewerReference = preparation.reviewerReference.trim();
  const authorizationReference = preparation.authorizationReference.trim();
  const idempotencyKey = preparation.idempotencyKey.trim();

  if (
    preparation.status !== "PREPARED_FOR_CONTROLLED_EXECUTION" ||
    preparation.crmWriteAllowed !== true ||
    preparation.crmWritePerformed !== false ||
    preparation.executionPerformed !== false ||
    !organisationName ||
    !reviewerReference ||
    !authorizationReference ||
    !idempotencyKey
  ) {
    return baseResult(
      preparation,
      "BLOCKED",
      ["Controlled CRM write execution prerequisites are incomplete or inconsistent."],
      null,
      false,
      false,
    );
  }

  let outcome: ControlledCrmWriteOutcome;
  try {
    outcome = await writer.writePreparedCandidate(preparation);
  } catch {
    return baseResult(
      preparation,
      "INDETERMINATE",
      [
        "Controlled CRM writer threw during the single write attempt.",
        "The outcome is indeterminate and must not be automatically retried.",
      ],
      null,
      true,
      false,
    );
  }

  if (outcome.status === "written") {
    const crmRecordReference = outcome.crmRecordReference.trim();
    if (!crmRecordReference) {
      return baseResult(
        preparation,
        "EVALUATION_FAILED",
        ["CRM writer reported success without a CRM record reference."],
        null,
        true,
        false,
      );
    }

    return baseResult(
      preparation,
      "WRITTEN",
      [
        "One controlled CRM write completed for the authorised prepared candidate.",
        "Outreach and provider execution remain disabled and require separate future authorisation boundaries.",
      ],
      crmRecordReference,
      true,
      true,
    );
  }

  if (outcome.status === "duplicate_suppressed") {
    const crmRecordReference = outcome.crmRecordReference.trim();
    if (!crmRecordReference) {
      return baseResult(
        preparation,
        "EVALUATION_FAILED",
        ["Duplicate suppression result is missing the existing CRM record reference."],
        null,
        true,
        false,
      );
    }

    return baseResult(
      preparation,
      "DUPLICATE_SUPPRESSED",
      ["Idempotency protection suppressed a duplicate CRM write."],
      crmRecordReference,
      true,
      false,
    );
  }

  if (outcome.status === "blocked") {
    return baseResult(
      preparation,
      "BLOCKED",
      [outcome.reason?.trim() || "Controlled CRM writer blocked the write attempt."],
      null,
      true,
      false,
    );
  }

  return baseResult(
    preparation,
    "INDETERMINATE",
    [
      outcome.reason?.trim() || "Controlled CRM writer returned an indeterminate outcome.",
      "Indeterminate write outcomes must not be automatically retried.",
    ],
    null,
    true,
    false,
  );
}
