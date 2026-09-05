import type { CrmWritePipelineAuditDecision } from "./crmWritePipelineAudit.ts";

export type CrmWriteAuditDisposition = Readonly<{
  status: "CLOSED_SAFE" | "HUMAN_REVIEW_REQUIRED";
  reasons: readonly string[];
  automaticRetryAllowed: false;
  outreachAllowed: false;
  executionAllowed: false;
}>;

/**
 * Factory 044 Phase 17 converts the Phase 16 audit decision into a terminal
 * safe disposition. It grants no mutation, retry, outreach, or provider
 * execution capability.
 */
export function createCrmWriteAuditDisposition(
  decision: CrmWritePipelineAuditDecision,
): CrmWriteAuditDisposition {
  if (decision.status === "ACCEPTED") {
    return {
      status: "CLOSED_SAFE",
      reasons: decision.reasons,
      automaticRetryAllowed: false,
      outreachAllowed: false,
      executionAllowed: false,
    };
  }

  return {
    status: "HUMAN_REVIEW_REQUIRED",
    reasons: decision.reasons,
    automaticRetryAllowed: false,
    outreachAllowed: false,
    executionAllowed: false,
  };
}
