"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { SupplierIntelRow } from "@/lib/digital-twin/types";

export function SupplierIntelligencePanel({
  rows,
  selectedId,
  onSelect,
}: {
  rows: SupplierIntelRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title="Supplier performance" description="Twin-linked supplier metrics (demonstration data)">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`rounded-xl border p-4 text-left text-sm transition ${
              selectedId === s.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className="font-bold">{s.supplier}</p>
            <p className="text-slate-600">Acceptance {s.acceptanceRate}</p>
            <p className="text-slate-600">Payment {s.paymentSpeed}</p>
            <p className="text-xs text-slate-500">{s.concern}</p>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
