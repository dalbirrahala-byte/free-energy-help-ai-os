import { monthKeyFromDate } from "./calculations";
import type { CommissionFilterState, DemoCommissionRecord } from "./types";

export function filterCommissionRecords(
  records: DemoCommissionRecord[],
  filters: CommissionFilterState,
): DemoCommissionRecord[] {
  return records.filter((record) => {
    if (filters.supplier !== "all" && record.supplier !== filters.supplier) {
      return false;
    }

    if (filters.customer !== "all" && record.customer !== filters.customer) {
      return false;
    }

    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }

    if (filters.fuelType !== "all" && record.fuelType !== filters.fuelType) {
      return false;
    }

    if (
      filters.accountManager !== "all" &&
      record.accountManager !== filters.accountManager
    ) {
      return false;
    }

    if (filters.month !== "all") {
      const expectedMonth = monthKeyFromDate(record.expectedPaymentDate);
      const actualMonth = monthKeyFromDate(record.actualPaymentDate);
      if (expectedMonth !== filters.month && actualMonth !== filters.month) {
        return false;
      }
    }

    return true;
  });
}

export function buildSupplierTotals(
  records: DemoCommissionRecord[],
): { supplier: string; expected: number; paid: number; outstanding: number }[] {
  const map = new Map<
    string,
    { expected: number; paid: number; outstanding: number }
  >();

  for (const record of records) {
    const current = map.get(record.supplier) ?? {
      expected: 0,
      paid: 0,
      outstanding: 0,
    };

    current.expected += record.expectedAmountGbp;
    current.paid += record.paidAmountGbp;
    current.outstanding += record.outstandingAmountGbp;
    map.set(record.supplier, current);
  }

  return [...map.entries()]
    .map(([supplier, totals]) => ({ supplier, ...totals }))
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function buildCustomerProfitability(records: DemoCommissionRecord[]) {
  const map = new Map<
    string,
    { demoCommission: number; demoCost: number }
  >();

  for (const record of records) {
    if (record.status === "Cancelled") {
      continue;
    }

    const current = map.get(record.customer) ?? {
      demoCommission: 0,
      demoCost: 0,
    };
    current.demoCommission += record.expectedAmountGbp;
    current.demoCost += record.demoCostAllocationGbp;
    map.set(record.customer, current);
  }

  return [...map.entries()]
    .map(([customer, values]) => ({
      customer,
      demoCommission: values.demoCommission,
      demoCost: values.demoCost,
      demoProfit: values.demoCommission - values.demoCost,
    }))
    .sort((a, b) => b.demoProfit - a.demoProfit);
}

export function buildAccountManagerPerformance(records: DemoCommissionRecord[]) {
  const map = new Map<
    string,
    { expected: number; paid: number; outstanding: number; recordCount: number }
  >();

  for (const record of records) {
    const current = map.get(record.accountManager) ?? {
      expected: 0,
      paid: 0,
      outstanding: 0,
      recordCount: 0,
    };

    current.expected += record.expectedAmountGbp;
    current.paid += record.paidAmountGbp;
    current.outstanding += record.outstandingAmountGbp;
    current.recordCount += 1;
    map.set(record.accountManager, current);
  }

  return [...map.entries()]
    .map(([accountManager, values]) => ({
      accountManager,
      ...values,
    }))
    .sort((a, b) => b.paid - a.paid);
}
