import { StatCard } from "@/components/dashboard/StatCard";
import { DEMO_DATA_TAG } from "@/lib/reports/constants";
import type { ExecutiveKpiSummary } from "@/lib/reports/types";

export function ExecutiveKpiSummaryRow({ kpis }: { kpis: ExecutiveKpiSummary }) {
  const items = [
    { title: "Total customers", value: kpis.totalCustomers },
    { title: "Active contracts", value: kpis.activeContracts },
    { title: "Annual contracted spend", value: kpis.annualContractedSpend },
    { title: "Forecast commission", value: kpis.forecastCommission },
    { title: "Commission received", value: kpis.commissionReceived },
    { title: "Outstanding commission", value: kpis.outstandingCommission },
    { title: "Renewal retention rate", value: kpis.renewalRetentionRate },
    { title: "Quote win rate", value: kpis.quoteWinRate },
    { title: "Live transfer conversion", value: kpis.liveTransferConversionRate },
    { title: "Pipeline value", value: kpis.pipelineValue },
    { title: "Monthly revenue", value: kpis.monthlyRevenue },
    { title: "Average deal value", value: kpis.averageDealValue },
  ];

  return (
    <section aria-labelledby="exec-kpi-summary">
      <h2 id="exec-kpi-summary" className="text-lg font-bold text-slate-900">
        Executive KPI summary
      </h2>
      <p className="mt-1 text-sm text-slate-500">All figures: {DEMO_DATA_TAG}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} hint={DEMO_DATA_TAG} />
        ))}
      </div>
    </section>
  );
}
