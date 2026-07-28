import { StatCard } from "@/components/dashboard/StatCard";
import { formatGbp } from "@/lib/commissions/alerts";
import type { CommissionCentreKpis } from "@/lib/commissions/types";

type CommissionTopKpisProps = {
  kpis: CommissionCentreKpis;
};

export function CommissionTopKpis({ kpis }: CommissionTopKpisProps) {
  return (
    <section aria-labelledby="commission-top-kpis">
      <h2 id="commission-top-kpis" className="sr-only">
        Commission summary KPIs
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="Expected Commission" value={formatGbp(kpis.expectedCommission)} hint="Demo" />
        <StatCard title="Paid Commission" value={formatGbp(kpis.paidCommission)} hint="Demo" />
        <StatCard
          title="Outstanding Commission"
          value={formatGbp(kpis.outstandingCommission)}
          hint="Demo"
        />
        <StatCard
          title="Average Commission per Contract"
          value={formatGbp(kpis.averageCommissionPerContract)}
          hint="Demo average"
        />
        <StatCard
          title="Commission Due This Month"
          value={formatGbp(kpis.commissionDueThisMonth)}
          hint="Demo forecast"
        />
        <StatCard
          title="Commission at Risk"
          value={formatGbp(kpis.commissionAtRisk)}
          hint="Demo overdue / dispute"
        />
      </div>
    </section>
  );
}
