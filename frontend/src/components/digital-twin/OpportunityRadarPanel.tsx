"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { OpportunityRadarItem } from "@/lib/digital-twin/types";

export function OpportunityRadarPanel({
  items,
  selectedId,
  onSelect,
}: {
  items: OpportunityRadarItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title="Opportunity radar" description="Prioritised growth and retention (demo)">
      <ul className="space-y-2">
        {items.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onSelect(o.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
                selectedId === o.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <span className="font-bold">{o.type}</span>
              <span className="mx-2 text-slate-400">·</span>
              {o.customer}
              <p className="text-xs text-slate-600">
                {o.valueDemo} · {o.probability} · {o.priority} · {o.owner}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
