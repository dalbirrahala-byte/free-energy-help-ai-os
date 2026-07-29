"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { RenewalHeatCell } from "@/lib/digital-twin/types";

const INTENSITY_CLASS: Record<RenewalHeatCell["intensity"], string> = {
  critical: "bg-rose-100 border-rose-300 text-rose-950",
  high: "bg-orange-100 border-orange-300 text-orange-950",
  medium: "bg-amber-100 border-amber-300 text-amber-950",
  low: "bg-emerald-50 border-emerald-200 text-emerald-900",
};

export function RenewalHeatMapPanel({
  cells,
  selectedId,
  onSelect,
}: {
  cells: RenewalHeatCell[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title="Renewal heat map" description="Contract end windows — demo intensity">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`rounded-xl border p-4 text-left transition ${INTENSITY_CLASS[c.intensity]} ${
              selectedId === c.id ? "ring-2 ring-slate-400" : ""
            }`}
          >
            <p className="text-xs font-semibold uppercase">{c.window}</p>
            <p className="text-2xl font-bold">{c.count}</p>
            <p className="text-sm">{c.valueDemo}</p>
            <p className="mt-1 text-xs">{c.customers}</p>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
