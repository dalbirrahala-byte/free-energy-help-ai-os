import { StatCard } from "@/components/dashboard/StatCard";
import { formatGbp } from "@/lib/commissions/alerts";
import type { CommissionOverviewMetrics } from "@/lib/commissions/types";

type CommissionOverviewProps = {
  metrics: CommissionOverviewMetrics;
};

export function CommissionOverview({ metrics }: CommissionOverviewProps) {
  return (
    <section aria-labelledby="commission-summary-heading">
      <h2 id="commission-summary-heading" className="mb-4 text-lg font-bold text-slate-900">
        Commission summary
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Demo totals from filtered records — not live ledger figures.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Expected commission"
          value={formatGbp(metrics.expectedCommission)}
          hint="Demo"
        />
        <StatCard
          title="Paid commission"
          value={formatGbp(metrics.paidCommission)}
          hint="Demo"
        />
        <StatCard
          title="Outstanding commission"
          value={formatGbp(metrics.outstandingCommission)}
          hint="Demo"
        />
        <StatCard
          title="Commission at risk"
          value={formatGbp(metrics.commissionAtRisk)}
          hint="Demo overdue / dispute"
        />
        <StatCard
          title="Monthly forecast"
          value={formatGbp(metrics.monthlyForecast)}
          hint="Demo expected in filter month"
        />
        <StatCard
          title="Year-to-date commission"
          value={formatGbp(metrics.yearToDateCommission)}
          hint="Demo paid YTD"
        />
      </div>
    </section>
  );
}
