import { CONTEXT_VERSION, RULE_VERSION } from "./constants";
import { generateDecisionExplanation } from "./explanations";
import { generateDecisionAuditRecord } from "./audit";
import { buildRecommendationsFromContext } from "./recommendations";
import { DECISION_RULE_LIBRARY } from "./rules";
import {
  calculateConfidence,
  calculateDataCompleteness,
  calculatePriorityScore,
  determineApprovalRequirement,
} from "./scoring";
import type { DecisionAuditRecord, DecisionContext, DecisionExplanation, Recommendation, RuleResult } from "./types";

export function rankRecommendations(rows: Recommendation[]): Recommendation[] {
  return [...rows].sort((a, b) => b.priorityScore - a.priorityScore);
}

export function mergeDuplicateRecommendations(rows: Recommendation[]): Recommendation[] {
  const seen = new Map<string, Recommendation>();
  for (const r of rows) {
    const key = `${r.customerId}-${r.recommendedAction}`;
    const existing = seen.get(key);
    if (!existing || r.priorityScore > existing.priorityScore) seen.set(key, r);
  }
  return [...seen.values()];
}

export function suppressExpiredRecommendations(rows: Recommendation[]): Recommendation[] {
  return rows.filter((r) => r.status !== "Expired" && r.status !== "Superseded");
}

export function groupRecommendationsByCustomer(rows: Recommendation[]): Record<string, Recommendation[]> {
  return rows.reduce<Record<string, Recommendation[]>>((acc, r) => {
    const key = r.customerId ?? "unknown";
    acc[key] = acc[key] ?? [];
    acc[key].push(r);
    return acc;
  }, {});
}

export function groupRecommendationsByBusinessArea(rows: Recommendation[]): Record<string, Recommendation[]> {
  return rows.reduce<Record<string, Recommendation[]>>((acc, r) => {
    acc[r.businessArea] = acc[r.businessArea] ?? [];
    acc[r.businessArea].push(r);
    return acc;
  }, {});
}

export function validateDecisionContext(ctx: DecisionContext): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (ctx.customerId === undefined && ctx.annualValueGbp === undefined) {
    missing.push("Customer identifier or value proxy");
  }
  return { valid: missing.length === 0 || ctx.annualValueGbp !== undefined, missing };
}

export function evaluateRules(ctx: DecisionContext): RuleResult[] {
  return DECISION_RULE_LIBRARY.slice(0, 8).map((rule) => {
    let matched = false;
    let reason = "Not matched (demo)";
    if (rule.id === "S-01" && (ctx.annualValueGbp ?? 0) >= 50000) {
      matched = true;
      reason = "High value lead threshold (demo)";
    }
    if (rule.id === "C-01" && (ctx.daysSinceContact ?? 0) >= 30) {
      matched = true;
      reason = "No contact threshold (demo)";
    }
    if (rule.id === "R-01" && (ctx.contractEndDays ?? 999) <= 90) {
      matched = true;
      reason = "Renewal window (demo)";
    }
    if (rule.id === "CM-01" && (ctx.outstandingCommissionGbp ?? 0) > 0) {
      matched = true;
      reason = "Outstanding commission (demo)";
    }
    return { ruleId: rule.id, matched, reason };
  });
}

export function evaluateDecisionContext(ctx: DecisionContext): {
  recommendations: Recommendation[];
  explanation: DecisionExplanation;
  audit: DecisionAuditRecord;
  scores: ReturnType<typeof calculatePriorityScore>;
} {
  const validation = validateDecisionContext(ctx);
  const rules = evaluateRules(ctx);
  const priority = calculatePriorityScore(ctx);
  const completeness = calculateDataCompleteness(ctx);
  const confidence = calculateConfidence(ctx, validation.missing.length + completeness.missingData.length);
  const approval = determineApprovalRequirement(ctx, priority.finalScore);

  let recommendations = buildRecommendationsFromContext(ctx, priority.finalScore, approval.required);
  recommendations = rankRecommendations(recommendations);
  recommendations = suppressExpiredRecommendations(recommendations);

  const top = recommendations[0];
  const explanation = generateDecisionExplanation(top, rules, [priority, completeness, confidence], ctx);
  const audit = generateDecisionAuditRecord(top, priority.finalScore, confidence.confidence, approval.required);

  return { recommendations, explanation, audit, scores: priority };
}

export { RULE_VERSION, CONTEXT_VERSION };
