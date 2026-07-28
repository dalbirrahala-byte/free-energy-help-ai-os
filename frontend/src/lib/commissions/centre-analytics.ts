import { DEMO_AS_OF_DATE } from "./constants";
import {
  buildOverviewMetrics,
  isAtRisk,
  monthKeyFromDate,
  outstandingForRecord,
} from "./calculations";
import type {
  AccountManagerCentreRow,
  AtRiskCommissionRow,
  CommissionCentreKpis,
  CommissionPipelineStage,
  DemoCommissionRecord,
  MonthlyChartPoint,
  PipelineStageSummary,
  RecentPaymentRow,
  SupplierChartPoint,
  SupplierPerformanceRow,
  SupplierRiskRating,
  UpcomingPaymentRow,
} from "./types";

export const SUPPLIER_DEMO_META: Record<
  string,
  { averagePaymentDays: number; latePayments: number; riskRating: SupplierRiskRating }
> = {
  "EDF Energy": { averagePaymentDays: 42, latePayments: 1, riskRating: "Medium" },
  "British Gas Lite": { averagePaymentDays: 28, latePayments: 0, riskRating: "Low" },
  Drax: { averagePaymentDays: 35, latePayments: 0, riskRating: "Low" },
  TotalEnergies: { averagePaymentDays: 58, latePayments: 3, riskRating: "High" },
  "SSE Business Energy": { averagePaymentDays: 45, latePayments: 1, riskRating: "Medium" },
  "E.ON Next": { averagePaymentDays: 40, latePayments: 1, riskRating: "Medium" },
  "Scottish Power": { averagePaymentDays: 32, latePayments: 0, riskRating: "Low" },
  "Opus Energy": { averagePaymentDays: 30, latePayments: 0, riskRating: "Low" },
  "Corona Energy": { averagePaymentDays: 38, latePayments: 0, riskRating: "Low" },
  "Yü Energy": { averagePaymentDays: 52, latePayments: 2, riskRating: "High" },
};

const PIPELINE_TRENDS: Record<CommissionPipelineStage, string> = {
  "Awaiting Supplier Validation": "Demo +1 vs prior month",
  "Supplier Approved": "Demo stable",
  "Invoice Raised": "Demo +2",
  "Awaiting Payment": "Demo +1",
  Paid: "Demo +3",
  Disputed: "Demo −1",
  Cancelled: "Demo 0",
};

export function daysRemaining(expectedDate: string | null): number | null {
  if (!expectedDate) {
    return null;
  }

  const end = new Date(`${expectedDate}T00:00:00`);
  const base = new Date(`${DEMO_AS_OF_DATE}T00:00:00`);
  return Math.ceil((end.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildCentreKpis(
  records: DemoCommissionRecord[],
  monthKey: string,
  year: number,
): CommissionCentreKpis {
  const overview = buildOverviewMetrics(records, monthKey, year);
  const active = records.filter((record) => record.status !== "Cancelled");
  const averageCommissionPerContract =
    active.length === 0
      ? 0
      : active.reduce((sum, record) => sum + record.expectedAmountGbp, 0) /
        active.length;

  return {
    expectedCommission: overview.expectedCommission,
    paidCommission: overview.paidCommission,
    outstandingCommission: overview.outstandingCommission,
    averageCommissionPerContract,
    commissionDueThisMonth: overview.monthlyForecast,
    commissionAtRisk: overview.commissionAtRisk,
  };
}

export function buildPipelineSummaries(
  records: DemoCommissionRecord[],
): PipelineStageSummary[] {
  const stages = Object.keys(PIPELINE_TRENDS) as CommissionPipelineStage[];

  return stages.map((stage) => {
    const stageRecords = records.filter((record) => record.pipelineStage === stage);
    return {
      stage,
      count: stageRecords.length,
      commissionValue: stageRecords.reduce(
        (sum, record) => sum + record.expectedAmountGbp,
        0,
      ),
      demoTrend: PIPELINE_TRENDS[stage],
    };
  });
}

export function buildSupplierPerformanceRows(
  records: DemoCommissionRecord[],
): SupplierPerformanceRow[] {
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
    .map(([supplier, totals]) => {
      const meta = SUPPLIER_DEMO_META[supplier] ?? {
        averagePaymentDays: 0,
        latePayments: 0,
        riskRating: "Medium" as SupplierRiskRating,
      };

      return {
        supplier,
        ...totals,
        averagePaymentDays: meta.averagePaymentDays,
        latePayments: meta.latePayments,
        riskRating: meta.riskRating,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function buildAccountManagerCentreRows(
  records: DemoCommissionRecord[],
): AccountManagerCentreRow[] {
  const map = new Map<
    string,
    { expected: number; paid: number; outstanding: number; contracts: number }
  >();

  for (const record of records) {
    const current = map.get(record.accountManager) ?? {
      expected: 0,
      paid: 0,
      outstanding: 0,
      contracts: 0,
    };
    current.expected += record.expectedAmountGbp;
    current.paid += record.paidAmountGbp;
    current.outstanding += record.outstandingAmountGbp;
    current.contracts += 1;
    map.set(record.accountManager, current);
  }

  return [...map.entries()]
    .map(([accountManager, values]) => ({
      accountManager,
      contracts: values.contracts,
      expectedCommission: values.expected,
      paid: values.paid,
      outstanding: values.outstanding,
      averageDealValue:
        values.contracts === 0 ? 0 : values.expected / values.contracts,
      collectionRatePercent:
        values.expected === 0
          ? 0
          : Math.round((values.paid / values.expected) * 100),
    }))
    .sort((a, b) => b.expectedCommission - a.expectedCommission);
}

export function buildUpcomingPayments(
  records: DemoCommissionRecord[],
): UpcomingPaymentRow[] {
  return records
    .filter(
      (record) =>
        record.expectedPaymentDate &&
        record.status !== "Paid" &&
        record.status !== "Cancelled",
    )
    .map((record) => ({
      recordId: record.id,
      expectedDate: record.expectedPaymentDate!,
      supplier: record.supplier,
      customer: record.customer,
      contract: record.contractLabel,
      amountGbp: record.expectedAmountGbp,
      daysRemaining: daysRemaining(record.expectedPaymentDate) ?? 0,
      priority: record.paymentPriority,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function buildAtRiskRows(
  records: DemoCommissionRecord[],
): AtRiskCommissionRow[] {
  return records
    .filter((record) => record.atRiskReason !== null || isAtRisk(record))
    .map((record) => ({
      recordId: record.id,
      customer: record.customer,
      contract: record.contractLabel,
      risk:
        record.atRiskReason ??
        (record.status === "Disputed"
          ? "Supplier dispute"
          : "Expected payment overdue"),
      estimatedValueGbp: outstandingForRecord(record) || record.expectedAmountGbp,
      recommendedAction: record.recommendedAction,
    }));
}

export function buildRecentPayments(
  records: DemoCommissionRecord[],
): RecentPaymentRow[] {
  return records
    .filter((record) => record.actualPaymentDate && record.paidAmountGbp > 0)
    .map((record) => ({
      recordId: record.id,
      amountGbp: record.paidAmountGbp,
      supplier: record.supplier,
      customer: record.customer,
      dateReceived: record.actualPaymentDate!,
      status: record.status,
    }))
    .sort((a, b) => b.dateReceived.localeCompare(a.dateReceived));
}

/** Demo monthly series — illustrative, not live ledger */
export function buildMonthlyCommissionChart(): MonthlyChartPoint[] {
  return [
    { monthLabel: "Apr 2026", valueGbp: 4200 },
    { monthLabel: "May 2026", valueGbp: 6100 },
    { monthLabel: "Jun 2026", valueGbp: 5800 },
    { monthLabel: "Jul 2026", valueGbp: 7200 },
  ];
}

export function buildMonthlyPaymentsChart(): MonthlyChartPoint[] {
  return [
    { monthLabel: "Apr 2026", valueGbp: 3100 },
    { monthLabel: "May 2026", valueGbp: 5400 },
    { monthLabel: "Jun 2026", valueGbp: 4736 },
    { monthLabel: "Jul 2026", valueGbp: 3964 },
  ];
}

export function buildOutstandingVsPaid(records: DemoCommissionRecord[]) {
  const paid = records.reduce((sum, record) => sum + record.paidAmountGbp, 0);
  const outstanding = records.reduce(
    (sum, record) => sum + record.outstandingAmountGbp,
    0,
  );
  return { paid, outstanding };
}

export function buildSupplierComparisonChart(
  records: DemoCommissionRecord[],
): SupplierChartPoint[] {
  return buildSupplierPerformanceRows(records)
    .slice(0, 6)
    .map((row) => ({
      supplier: row.supplier,
      expectedGbp: row.expected,
      paidGbp: row.paid,
    }));
}

export function defaultFilterMonth(records: DemoCommissionRecord[]): string {
  const keys = records
    .map((record) => monthKeyFromDate(record.expectedPaymentDate))
    .filter(Boolean) as string[];
  return keys.sort().reverse()[0] ?? "2026-07";
}
