import { StatCard } from "@/components/dashboard/StatCard";
import { QUOTE_DASHBOARD_BUCKETS } from "@/lib/quotes/constants";
import type { QuoteDashboardBucket } from "@/lib/quotes/types";

type QuoteDashboardKpisProps = {
  counts: Record<QuoteDashboardBucket, number>;
};

export function QuoteDashboardKpis({ counts }: QuoteDashboardKpisProps) {
  return (
    <section aria-labelledby="quote-dashboard-kpis">
      <h2 id="quote-dashboard-kpis" className="text-lg font-bold text-slate-900">
        Quote dashboard
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {QUOTE_DASHBOARD_BUCKETS.map((bucket) => (
          <StatCard
            key={bucket}
            title={bucket}
            value={String(counts[bucket])}
            hint="Demo register"
          />
        ))}
      </div>
    </section>
  );
}
