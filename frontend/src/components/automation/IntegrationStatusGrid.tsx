import { SectionCard } from "@/components/dashboard/SectionCard";
import type { IntegrationCard } from "@/lib/automation/types";

export function IntegrationStatusGrid({ cards }: { cards: IntegrationCard[] }) {
  return (
    <SectionCard title="Integration status" description="No false connected states">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">{card.name}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {card.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
