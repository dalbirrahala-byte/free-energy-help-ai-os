"use client";

import { useCallback, useMemo, useState } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  buildAccountManagerCentreRows,
  buildAtRiskRows,
  buildCentreKpis,
  buildMonthlyCommissionChart,
  buildMonthlyPaymentsChart,
  buildOutstandingVsPaid,
  buildPipelineSummaries,
  buildRecentPayments,
  buildSupplierComparisonChart,
  buildSupplierPerformanceRows,
  buildUpcomingPayments,
  defaultFilterMonth,
} from "@/lib/commissions/centre-analytics";
import { DEMO_DATA_LABEL, DEMO_REFERENCE_YEAR } from "@/lib/commissions/constants";
import type { DemoCommissionRecord } from "@/lib/commissions/types";

import { AccountManagerCentreTable } from "./AccountManagerCentreTable";
import { ActionCentre } from "./ActionCentre";
import { AtRiskCommissionPanel } from "./AtRiskCommissionPanel";
import { CommissionChartsPanel } from "./CommissionChartsPanel";
import { CommissionPipelineGrid } from "./CommissionPipelineGrid";
import { CommissionTopKpis } from "./CommissionTopKpis";
import { RecentPaymentsPanel } from "./RecentPaymentsPanel";
import { SupplierPerformanceTable } from "./SupplierPerformanceTable";
import { UpcomingPaymentsTimeline } from "./UpcomingPaymentsTimeline";

type CommissionIntelligenceCentreProps = {
  records: DemoCommissionRecord[];
};

export function CommissionIntelligenceCentre({
  records,
}: CommissionIntelligenceCentreProps) {
  const [refreshToken, setRefreshToken] = useState(0);

  const onRefresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const monthKey = useMemo(() => defaultFilterMonth(records), [records]);

  const analytics = useMemo(() => {
    void refreshToken;
    const kpis = buildCentreKpis(records, monthKey, DEMO_REFERENCE_YEAR);
    const pipeline = buildPipelineSummaries(records);
    const suppliers = buildSupplierPerformanceRows(records);
    const managers = buildAccountManagerCentreRows(records);
    const upcoming = buildUpcomingPayments(records);
    const atRisk = buildAtRiskRows(records);
    const recent = buildRecentPayments(records);
    const monthlyCommission = buildMonthlyCommissionChart();
    const monthlyPayments = buildMonthlyPaymentsChart();
    const { paid, outstanding } = buildOutstandingVsPaid(records);
    const supplierComparison = buildSupplierComparisonChart(records);

    return {
      kpis,
      pipeline,
      suppliers,
      managers,
      upcoming,
      atRisk,
      recent,
      monthlyCommission,
      monthlyPayments,
      paid,
      outstanding,
      supplierComparison,
    };
  }, [records, monthKey, refreshToken]);

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Demonstration mode — Demo data</p>
        <p className="mt-1">{DEMO_DATA_LABEL}</p>
      </div>

      <CommissionTopKpis kpis={analytics.kpis} />
      <CommissionPipelineGrid stages={analytics.pipeline} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SupplierPerformanceTable rows={analytics.suppliers} />
        <AccountManagerCentreTable rows={analytics.managers} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <UpcomingPaymentsTimeline rows={analytics.upcoming} />
        <RecentPaymentsPanel rows={analytics.recent} />
      </div>

      <AtRiskCommissionPanel rows={analytics.atRisk} />

      <ActionCentre onRefresh={onRefresh} />

      <SectionCard
        title="Analytics"
        description="Executive demo charts — not connected to live BI"
      >
        <CommissionChartsPanel
          monthlyCommission={analytics.monthlyCommission}
          monthlyPayments={analytics.monthlyPayments}
          outstandingGbp={analytics.outstanding}
          paidGbp={analytics.paid}
          supplierComparison={analytics.supplierComparison}
        />
      </SectionCard>
    </div>
  );
}
