import { SectionCard } from "@/components/dashboard/SectionCard";
import type { RiskIntelligence } from "@/lib/decision-engine/types";

export function RiskIntelligenceGrid({ items }: { items: RiskIntelligence[] }) {
  return (
    <SectionCard title="Risk intelligence" description="Demo risk cards">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((r) => (
          <article key={r.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <h3 className="font-bold">{r.riskType}</h3>
            <p>
              {r.severity} · {r.probability} · Impact: {r.impact}
            </p>
            <p className="text-slate-600">{r.evidence}</p>
            <p>Records: {r.affectedRecords}</p>
            <p>Mitigation: {r.recommendedMitigation}</p>
            <p className="text-xs">
              {r.owner} · Review {r.reviewDate} · {r.approvalRequirement}
            </p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
