import type { ControlledCrmWriteExecutionResult } from "./executeControlledCrmWrite.ts";

export type CrmWritePipelineReceipt = Readonly<{
  status: ControlledCrmWriteExecutionResult["status"];
  organisationName: string;
  reviewerReference: string;
  authorizationReference: string;
  idempotencyKey: string;
  crmRecordReference: string | null;
  crmWriteAttempted: boolean;
  crmWritePerformed: boolean;
  outreachAllowed: false;
  executionPerformed: false;
}>;

/**
 * Factory 044 Phase 15 creates a deterministic, non-secret receipt from a
 * completed controlled CRM-write evaluation. It performs no mutation and
 * grants no capability.
 */
export function createCrmWritePipelineReceipt(
  result: ControlledCrmWriteExecutionResult,
): CrmWritePipelineReceipt {
  return {
    status: result.status,
    organisationName: result.organisationName.trim(),
    reviewerReference: result.reviewerReference.trim(),
    authorizationReference: result.authorizationReference.trim(),
    idempotencyKey: result.idempotencyKey.trim(),
    crmRecordReference: result.crmRecordReference?.trim() || null,
    crmWriteAttempted: result.crmWriteAttempted,
    crmWritePerformed: result.crmWritePerformed,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
