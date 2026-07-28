import { DEMO_AS_OF_DATE } from "./constants";
import type { CommissionStatus, DemoCommissionRecord } from "./types";

const OUTSTANDING_STATUSES: CommissionStatus[] = [
  "Expected",
  "Invoiced",
  "Part Paid",
  "Overdue",
  "Disputed",
];

const AT_RISK_STATUSES: CommissionStatus[] = ["Overdue", "Disputed"];

export function outstandingForRecord(record: DemoCommissionRecord): number {
  if (record.status === "Cancelled" || record.status === "Paid") {
    return 0;
  }

  if (record.status === "Forecast") {
    return 0;
  }

  return Math.max(0, record.expectedAmountGbp - record.paidAmountGbp);
}

export function isAtRisk(record: DemoCommissionRecord): boolean {
  if (record.status === "Cancelled" || record.status === "Paid") {
    return false;
  }

  return (
    AT_RISK_STATUSES.includes(record.status) ||
    (record.expectedPaymentDate !== null &&
      record.expectedPaymentDate < DEMO_AS_OF_DATE &&
      outstandingForRecord(record) > 0 &&
      record.status !== "Forecast")
  );
}

export function countsTowardExpectedTotal(status: CommissionStatus): boolean {
  return status !== "Cancelled";
}

export function countsTowardOutstanding(status: CommissionStatus): boolean {
  return OUTSTANDING_STATUSES.includes(status);
}

export function monthKeyFromDate(date: string | null): string | null {
  if (!date) {
    return null;
  }

  return date.slice(0, 7);
}

export function sumExpected(records: DemoCommissionRecord[]): number {
  return records
    .filter((record) => countsTowardExpectedTotal(record.status))
    .reduce((sum, record) => sum + record.expectedAmountGbp, 0);
}

export function sumPaid(records: DemoCommissionRecord[]): number {
  return records.reduce((sum, record) => sum + record.paidAmountGbp, 0);
}

export function sumOutstanding(records: DemoCommissionRecord[]): number {
  return records
    .filter((record) => countsTowardOutstanding(record.status))
    .reduce((sum, record) => sum + outstandingForRecord(record), 0);
}

export function sumAtRisk(records: DemoCommissionRecord[]): number {
  return records
    .filter((record) => isAtRisk(record))
    .reduce((sum, record) => sum + outstandingForRecord(record), 0);
}

export function monthlyForecast(
  records: DemoCommissionRecord[],
  monthKey: string,
): number {
  return records
    .filter((record) => {
      if (record.status === "Cancelled" || record.status === "Paid") {
        return false;
      }

      const key = monthKeyFromDate(record.expectedPaymentDate);
      return key === monthKey;
    })
    .reduce((sum, record) => sum + record.expectedAmountGbp, 0);
}

/** Demo YTD: paid amounts with actual payment in given calendar year */
export function yearToDatePaid(
  records: DemoCommissionRecord[],
  year: number,
): number {
  return records.reduce((sum, record) => {
    if (!record.actualPaymentDate) {
      return sum;
    }

    const paymentYear = Number(record.actualPaymentDate.slice(0, 4));
    if (paymentYear !== year) {
      return sum;
    }

    return sum + record.paidAmountGbp;
  }, 0);
}

export function buildOverviewMetrics(
  records: DemoCommissionRecord[],
  filterMonth: string,
  demoYear: number,
): {
  expectedCommission: number;
  paidCommission: number;
  outstandingCommission: number;
  commissionAtRisk: number;
  monthlyForecast: number;
  yearToDateCommission: number;
} {
  return {
    expectedCommission: sumExpected(records),
    paidCommission: sumPaid(records),
    outstandingCommission: sumOutstanding(records),
    commissionAtRisk: sumAtRisk(records),
    monthlyForecast: monthlyForecast(
      records,
      filterMonth === "all" ? `${demoYear}-07` : filterMonth,
    ),
    yearToDateCommission: yearToDatePaid(records, demoYear),
  };
}
