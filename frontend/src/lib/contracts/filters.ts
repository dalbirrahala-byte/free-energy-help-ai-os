import type { ContractFilterState, DemoContractRecord } from "./types";

export function filterDemoContracts(
  records: DemoContractRecord[],
  filters: ContractFilterState,
): DemoContractRecord[] {
  const query = filters.query.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.supplier !== "all" && record.supplier !== filters.supplier) {
      return false;
    }

    if (filters.accountManager !== "all" && record.accountManager !== filters.accountManager) {
      return false;
    }

    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }

    if (filters.riskLevel !== "all" && record.riskLevel !== filters.riskLevel) {
      return false;
    }

    if (filters.fuelType !== "all" && record.fuelType !== filters.fuelType) {
      return false;
    }

    if (filters.renewalMonth !== "all" && record.renewalMonth !== filters.renewalMonth) {
      return false;
    }

    if (filters.contractType !== "all" && record.contractType !== filters.contractType) {
      return false;
    }

    if (filters.region !== "all" && record.region !== filters.region) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      record.customer,
      record.site,
      record.supplier,
      record.accountManager,
      record.recommendedAction,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function uniqueValues(records: DemoContractRecord[], key: keyof DemoContractRecord): string[] {
  return [...new Set(records.map((r) => String(r[key])))].sort();
}

export function uniqueSuppliers(records: DemoContractRecord[]): string[] {
  return uniqueValues(records, "supplier");
}

export function uniqueManagers(records: DemoContractRecord[]): string[] {
  return uniqueValues(records, "accountManager");
}

export function uniqueRegions(records: DemoContractRecord[]): string[] {
  return uniqueValues(records, "region");
}

export function uniqueRenewalMonths(records: DemoContractRecord[]): string[] {
  return uniqueValues(records, "renewalMonth");
}

export function uniqueContractTypes(records: DemoContractRecord[]): string[] {
  return uniqueValues(records, "contractType");
}
