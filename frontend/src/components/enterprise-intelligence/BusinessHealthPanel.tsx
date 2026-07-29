import { SectionCard } from "@/components/dashboard/SectionCard";
import type { BusinessHealthModel } from "@/lib/decision-engine/types";

export function BusinessHealthPanel({ model }: { model: BusinessHealthModel }) {
  return (
    <SectionCard title="Business health score" description="Demo analysis">
      <p className="text-2xl font-bold text-slate-900">{model.overallLabel}</p>
      <p className="text-sm text-slate-600">Trend: {model.trend}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {model.categoryScores.map((c) => (
          <div key={c.category} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <span className="font-medium">{c.category}</span>
            <span className="ml-2 font-bold">{c.score}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-emerald-800">Positive contributors</h3>
          <ul className="list-disc pl-5 text-sm">{model.positiveContributors.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-rose-800">Negative contributors</h3>
          <ul className="list-disc pl-5 text-sm">{model.negativeContributors.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      </div>
      <p className="mt-3 text-sm">Missing data: {model.missingData.join(", ")}</p>
      <p className="text-sm">Confidence: {model.confidence}</p>
      <p className="mt-2 text-sm font-semibold">Recommended action: {model.recommendedManagementAction}</p>
    </SectionCard>
  );
}
