import { CONTEXT_VERSION, RULE_VERSION } from "./constants";
import type { DecisionAuditRecord, Recommendation } from "./types";

export function generateDecisionAuditRecord(
  recommendation: Recommendation | undefined,
  score: number,
  confidence: string,
  approvalRequired: boolean,
): DecisionAuditRecord {
  return {
    decisionId: recommendation?.id ?? "DEC-DEMO-000",
    recommendation: recommendation?.title ?? "—",
    customer: recommendation?.customerId ?? "—",
    ruleVersion: RULE_VERSION,
    contextVersion: CONTEXT_VERSION,
    score,
    confidence,
    approval: approvalRequired ? "Required (demo)" : "Not required (demo)",
    outcome: "Pending (demo)",
    actor: "Decision engine (demo)",
    created: recommendation?.createdLabel ?? "—",
    updated: recommendation?.updatedLabel ?? "—",
    correlationId: recommendation?.correlationId ?? "CORR-DEMO-DECISION-001",
  };
}
