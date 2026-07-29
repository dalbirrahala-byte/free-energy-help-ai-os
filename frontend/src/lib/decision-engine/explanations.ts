import { CONTEXT_VERSION, RULE_VERSION } from "./constants";
import type { DecisionContext, DecisionExplanation, Recommendation, RuleResult, ScoreBreakdown } from "./types";

export function generateDecisionExplanation(
  recommendation: Recommendation | undefined,
  rules: RuleResult[],
  scores: ScoreBreakdown[],
  _ctx: DecisionContext,
): DecisionExplanation {
  const matched = rules.filter((r) => r.matched).map((r) => `${r.ruleId}: ${r.reason}`);
  return {
    whyCreated: recommendation?.explanation ?? "No recommendation selected (demo).",
    rulesTriggered: matched.length ? matched : ["No rules matched — demo default"],
    scoresCalculated: scores,
    evidenceUsed: recommendation?.evidence.map((e) => e.summary) ?? [],
    missingInformation: scores.flatMap((s) => s.missingData),
    confidenceReason: scores[scores.length - 1]?.explanation ?? "Demo confidence model",
    estimatedBusinessImpact: recommendation?.estimatedDemoRevenueImpact ?? "—",
    alternativeActions: ["Defer", "Assign to colleague", "Request data (demo)"],
    approvalRequired: recommendation?.humanApprovalRequired ?? false,
    sourceModules: ["Workflow Intelligence", "Renewals", "Commission Intelligence", "Customer 360"],
    correlationId: recommendation?.correlationId ?? "CORR-DEMO-DECISION-001",
    decisionTimestamp: recommendation?.createdLabel ?? "28 Jul 2026, 17:00",
  };
}

export { RULE_VERSION, CONTEXT_VERSION };
