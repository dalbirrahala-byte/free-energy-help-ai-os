import type { AiFilterState, OpportunityCard, RiskItem } from "./types";

export function filterOpportunities(rows: OpportunityCard[], filters: AiFilterState): OpportunityCard[] {
  const q = filters.query.toLowerCase();
  return rows.filter((r) => {
    if (filters.businessArea !== "all" && !r.type.toLowerCase().includes(filters.businessArea.toLowerCase())) {
      return false;
    }
    if (filters.owner !== "all" && r.owner !== filters.owner) {
      return false;
    }
    if (filters.status !== "all" && !r.status.toLowerCase().includes(filters.status.toLowerCase())) {
      return false;
    }
    if (!q) return true;
    return `${r.customer} ${r.type} ${r.evidence}`.toLowerCase().includes(q);
  });
}

export function filterRisks(rows: RiskItem[], filters: AiFilterState): RiskItem[] {
  const q = filters.query.toLowerCase();
  return rows.filter((r) => {
    if (filters.riskLevel !== "all" && r.severity !== filters.riskLevel) {
      return false;
    }
    if (filters.owner !== "all" && r.owner !== filters.owner) {
      return false;
    }
    if (!q) return true;
    return `${r.type} ${r.evidence}`.toLowerCase().includes(q);
  });
}

export function uniqueOwners(items: { owner: string }[]): string[] {
  return [...new Set(items.map((i) => i.owner))].sort();
}
