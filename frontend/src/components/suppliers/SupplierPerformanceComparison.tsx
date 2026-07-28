import { SectionCard } from "@/components/dashboard/SectionCard";
import type { PerformanceComparisonMetric } from "@/lib/suppliers/types";

export function SupplierPerformanceComparison({
  metrics,
}: {
  metrics: PerformanceComparisonMetric[];
}) {
  return (
    <SectionCard title="Supplier performance comparison" description="Demo indices — not live data">
      <div className="grid gap-6 lg:grid-cols-2">
        {metrics.map((metric) => {
          const max = Math.max(...metric.suppliers.map((s) => s.value), 1);

          return (
            <div key={metric.id} className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">{metric.label}</h3>
              <ul className="mt-3 space-y-2">
                {metric.suppliers.map((row) => (
                  <li key={row.supplierId}>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{row.name}</span>
                      <span>{row.display}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
