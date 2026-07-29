import { SectionCard } from "@/components/dashboard/SectionCard";
import type { OpportunityIntelligence } from "@/lib/decision-engine/types";

export function OpportunityIntelligenceGrid({ items }: { items: OpportunityIntelligence[] }) {
  return (
    <SectionCard title="Opportunity intelligence" description="Demo opportunity cards">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => (
          <article key={o.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <h3 className="font-bold">{o.opportunityType}</h3>
            <p>{o.customer}</p>
            <p className="text-slate-600">{o.estimatedDemoValue} · {o.probability}</p>
            <p>Priority: {o.priority}</p>
            <p className="text-xs text-slate-500">{o.evidence}</p>
            <p className="mt-1">{o.recommendedAction}</p>
            <p className="text-xs">{o.owner} · Due {o.dueDate} · {o.status}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
