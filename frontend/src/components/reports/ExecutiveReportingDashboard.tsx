"use client";

import { useMemo, useState } from "react";

import { getReportSnapshotForRange } from "@/lib/reports/analytics";
import { DEMO_REPORTS_LABEL } from "@/lib/reports/constants";
import type { DateRangeOption } from "@/lib/reports/types";

import { AiExecutiveInsightsPanel } from "./AiExecutiveInsightsPanel";
import { DateRangeControls } from "./DateRangeControls";
import { DemoTrendChart } from "./DemoTrendChart";
import { ExecutiveKpiSummaryRow } from "./ExecutiveKpiSummaryRow";
import {
  AccountManagerLeagueTable,
  AlertsExceptionsPanel,
  CommissionForecastPanel,
  CustomerAnalyticsPanel,
  LiveTransferAnalyticsPanel,
  PipelineAnalyticsPanel,
  RenewalForecastPanel,
  SalesPerformancePanel,
  SectorAnalyticsTable,
  SupplierAnalyticsPanel,
} from "./ReportAnalyticsPanels";
import { ReportActionsBar } from "./ReportActionsBar";

export function ExecutiveReportingDashboard() {
  const [range, setRange] = useState<DateRangeOption>("This month");
  const snapshot = useMemo(() => getReportSnapshotForRange(range), [range]);

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Executive Reporting &amp; Analytics Centre — Demonstration mode</p>
        <p className="mt-1">{DEMO_REPORTS_LABEL}</p>
        <p className="mt-1 text-xs">Viewing: {range} (demo)</p>
      </div>

      <DateRangeControls value={range} onChange={setRange} />

      <ExecutiveKpiSummaryRow kpis={snapshot.kpis} />

      <SalesPerformancePanel sales={snapshot.sales} />

      <AccountManagerLeagueTable rows={snapshot.accountManagers} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RenewalForecastPanel data={snapshot.renewals} />
        <CommissionForecastPanel data={snapshot.commission} />
      </div>

      <PipelineAnalyticsPanel rows={snapshot.pipeline} />

      <CustomerAnalyticsPanel data={snapshot.customers} />

      <SectorAnalyticsTable rows={snapshot.sectors} />

      <SupplierAnalyticsPanel rows={snapshot.suppliers} />

      <LiveTransferAnalyticsPanel data={snapshot.liveTransfers} />

      <section aria-labelledby="charts-trends-heading">
        <h2 id="charts-trends-heading" className="text-lg font-bold text-slate-900">
          Charts and trends
        </h2>
        <p className="mt-1 text-sm text-slate-500">Lightweight demo visualisations — Demo data</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.trends.map((series) => (
            <DemoTrendChart key={series.id} series={series} />
          ))}
        </div>
      </section>

      <AlertsExceptionsPanel alerts={snapshot.alerts} />

      <AiExecutiveInsightsPanel insights={snapshot.aiInsights} />

      <ReportActionsBar />
    </div>
  );
}
