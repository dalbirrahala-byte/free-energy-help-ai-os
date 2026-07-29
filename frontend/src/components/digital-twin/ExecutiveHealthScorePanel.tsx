import { SectionCard } from "@/components/dashboard/SectionCard";
import type { ExecutiveHealthScore } from "@/lib/digital-twin/types";

export function ExecutiveHealthScorePanel({ health }: { health: ExecutiveHealthScore }) {
  return (
    <SectionCard title="Executive health score" description="Demo analysis — operational brain index">
      <div className="flex flex-wrap items-baseline gap-4">
        <p className="text-4xl font-bold text-slate-900">{health.overallScore}</p>
        <p className="text-sm text-slate-600">{health.overallLabel}</p>
      </div>
      <p className="mt-2 text-sm">Trend: {health.trend}</p>
      <p className="text-sm text-slate-500">Confidence: {health.confidence}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {health.drivers.map((d) => (
          <li key={d.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium">{d.label}</span>
            <span className="ml-2 text-slate-600">{d.impact}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-emerald-900">{health.managementNote}</p>
    </SectionCard>
  );
}
