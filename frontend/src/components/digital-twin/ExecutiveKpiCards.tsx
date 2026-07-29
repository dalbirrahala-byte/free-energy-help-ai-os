import { StatCard } from "@/components/dashboard/StatCard";
import type { ExecutiveKpi } from "@/lib/digital-twin/types";

export function ExecutiveKpiCards({ kpis }: { kpis: ExecutiveKpi[] }) {
  return (
    <section aria-labelledby="exec-kpi-heading">
      <h2 id="exec-kpi-heading" className="mb-4 text-lg font-bold text-slate-900">
        Executive KPI cards
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <StatCard key={k.id} title={k.label} value={k.value} hint={k.hint} />
        ))}
      </div>
    </section>
  );
}
