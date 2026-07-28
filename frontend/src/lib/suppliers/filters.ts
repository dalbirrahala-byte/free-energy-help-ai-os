import type { DemoSupplierRecord, SupplierFilterState } from "./types";

export function filterDemoSuppliers(
  records: DemoSupplierRecord[],
  filters: SupplierFilterState,
): DemoSupplierRecord[] {
  const query = filters.query.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.fuelType !== "all") {
      if (filters.fuelType === "Electricity" && !record.electricityAvailable) return false;
      if (filters.fuelType === "Gas" && !record.gasAvailable) return false;
      if (filters.fuelType === "Dual" && record.fuelFilter !== "Dual") return false;
    }

    if (filters.marketSegment !== "all" && record.marketSegment !== filters.marketSegment) {
      return false;
    }

    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }

    if (filters.riskLevel !== "all" && record.riskRating !== filters.riskLevel) {
      return false;
    }

    if (filters.preferredOnly === "yes" && !record.preferred) {
      return false;
    }

    if (filters.renewableOptions !== "all") {
      const hasRenewable = record.renewableOptions.toLowerCase().includes("renewable") ||
        record.renewableOptions.toLowerCase().includes("rego") ||
        record.renewableOptions.toLowerCase().includes("ppa") ||
        record.renewableOptions.toLowerCase().includes("biomethane");
      if (filters.renewableOptions === "yes" && !hasRenewable) return false;
      if (filters.renewableOptions === "no" && hasRenewable) return false;
    }

    if (filters.sectorAppetite !== "all") {
      const match = Object.values(record.sectorAppetite).some((a) => a === filters.sectorAppetite);
      if (!match) return false;
    }

    if (filters.quoteTurnaround !== "all") {
      const days = Number(record.avgQuoteTurnaround.match(/(\d+)/)?.[1] ?? 999);
      if (filters.quoteTurnaround === "fast" && days > 2) return false;
      if (filters.quoteTurnaround === "medium" && (days <= 2 || days > 4)) return false;
      if (filters.quoteTurnaround === "slow" && days <= 4) return false;
    }

    if (filters.accountOwner !== "all" && record.accountOwner !== filters.accountOwner) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [record.name, record.category, record.accountOwner, record.preferredSectors]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function uniqueOwners(records: DemoSupplierRecord[]): string[] {
  return [...new Set(records.map((r) => r.accountOwner))].sort();
}
