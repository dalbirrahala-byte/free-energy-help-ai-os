import { SectionCard } from "@/components/dashboard/SectionCard";
import type { GrowthOpportunity } from "@/lib/digital-twin/types";

export function GrowthEnginePanel({ items }: { items: GrowthOpportunity[] }) {
  return (
    <SectionCard title="Growth engine" description="Identified opportunities (demo)">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <li key={g.id} className="rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-bold">{g.type}</p>
            <p className="mt-1 text-slate-700">{g.summary}</p>
            <p className="text-xs text-slate-500">
              {g.estimatedDemoValue} · {g.confidence}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
