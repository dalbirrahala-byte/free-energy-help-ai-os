import type { DemoRenewalRecord, RenewalFilterState } from "./types";

export function filterDemoRenewals(
  records: DemoRenewalRecord[],
  filters: RenewalFilterState,
): DemoRenewalRecord[] {
  const query = filters.query.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.pipelineWindow !== "all" && record.pipelineWindow !== filters.pipelineWindow) {
      return false;
    }

    if (filters.urgency !== "all" && record.urgencyBand !== filters.urgency) {
      return false;
    }

    if (filters.riskLevel !== "all" && record.riskLevel !== filters.riskLevel) {
      return false;
    }

    if (filters.supplier !== "all" && record.supplier !== filters.supplier) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      record.customerName,
      record.siteName,
      record.supplier,
      record.accountManager,
      record.recommendedAction,
      record.aiRecommendation,
      record.nextTask,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function uniqueSuppliers(records: DemoRenewalRecord[]): string[] {
  return [...new Set(records.map((record) => record.supplier))].sort();
}
