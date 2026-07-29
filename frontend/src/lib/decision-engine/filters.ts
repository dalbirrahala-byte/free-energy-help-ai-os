import type { DecisionFilterState, OpportunityIntelligence, Recommendation, RiskIntelligence } from "./types";

export function filterRecommendations(rows: Recommendation[], f: DecisionFilterState): Recommendation[] {
  const q = f.query.toLowerCase();
  return rows.filter((r) => {
    if (f.businessArea !== "all" && r.businessArea !== f.businessArea) return false;
    if (f.priority !== "all" && r.priority !== f.priority) return false;
    if (f.risk !== "all" && r.risk !== f.risk) return false;
    if (f.confidence !== "all" && !r.confidence.includes(f.confidence)) return false;
    if (f.owner !== "all" && r.owner !== f.owner) return false;
    if (f.approvalRequired === "yes" && !r.humanApprovalRequired) return false;
    if (f.approvalRequired === "no" && r.humanApprovalRequired) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.customer !== "all" && r.customerId !== f.customer) return false;
    if (!q) return true;
    return `${r.title} ${r.description} ${r.recommendedAction}`.toLowerCase().includes(q);
  });
}

export function filterOpportunities(rows: OpportunityIntelligence[], f: DecisionFilterState): OpportunityIntelligence[] {
  if (f.opportunityType !== "all") {
    return rows.filter((r) => r.opportunityType.toLowerCase().includes(f.opportunityType.toLowerCase()));
  }
  return rows;
}

export function filterRisks(rows: RiskIntelligence[], f: DecisionFilterState): RiskIntelligence[] {
  if (f.risk !== "all") {
    return rows.filter((r) => r.severity === f.risk);
  }
  return rows;
}

export function uniqueOwners(rows: Recommendation[]): string[] {
  return [...new Set(rows.map((r) => r.owner))].sort();
}
