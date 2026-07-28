import { SectionCard } from "@/components/dashboard/SectionCard";
import type { IntegrationReadinessCard } from "@/lib/workflows/types";

export function WorkflowIntegrationGrid({ cards }: { cards: IntegrationReadinessCard[] }) {
  return (
    <SectionCard title="Integration readiness" description="No integration marked as connected">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <article key={c.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <h3 className="font-bold text-slate-900">{c.name}</h3>
            <p className="mt-1 font-medium text-slate-700">{c.status}</p>
            <p className="mt-2 text-xs text-slate-500">{c.notes}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
