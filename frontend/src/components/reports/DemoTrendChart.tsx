import type { TrendSeries } from "@/lib/reports/types";

export function DemoTrendChart({ series }: { series: TrendSeries }) {
  const max = Math.max(...series.points.map((p) => p.value), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-900">{series.title}</h3>
      <ul className="mt-3 space-y-2" aria-label={series.title}>
        {series.points.map((point) => (
          <li key={point.label}>
            <div className="flex justify-between text-xs text-slate-600">
              <span>{point.label}</span>
              <span>{point.display} — Demo data</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, (point.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
