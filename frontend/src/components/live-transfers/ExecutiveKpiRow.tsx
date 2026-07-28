import { StatCard } from "@/components/dashboard/StatCard";
import { formatGbp } from "@/lib/live-transfers/demo-data";
import type { LiveTransferKpis } from "@/lib/live-transfers/types";

export function ExecutiveKpiRow({ kpis }: { kpis: LiveTransferKpis }) {
  return (
    <section aria-labelledby="lt-executive-kpis">
      <h2 id="lt-executive-kpis" className="sr-only">
        Executive KPIs
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <StatCard title="Transfers waiting" value={String(kpis.transfersWaiting)} hint="Demo" />
        <StatCard title="Agents available" value={String(kpis.agentsAvailable)} hint="Demo" />
        <StatCard title="Average wait time" value={kpis.averageWaitTimeLabel} hint="Demo queue" />
        <StatCard title="Transfers received today" value={String(kpis.transfersReceivedToday)} hint="Demo" />
        <StatCard title="Qualified today" value={String(kpis.qualifiedToday)} hint="Demo" />
        <StatCard title="Conversions today" value={String(kpis.conversionsToday)} hint="Demo" />
        <StatCard title="Conversion rate" value={`${kpis.conversionRatePercent}%`} hint="Demo" />
        <StatCard
          title="Estimated demo revenue today"
          value={formatGbp(kpis.estimatedDemoRevenueTodayGbp)}
          hint="Not live revenue"
        />
      </div>
    </section>
  );
}
