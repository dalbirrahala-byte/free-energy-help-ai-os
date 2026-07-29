"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { CustomerRiskRow } from "@/lib/digital-twin/types";

export function CustomerRiskMatrixPanel({
  rows,
  selectedId,
  onSelect,
}: {
  rows: CustomerRiskRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title="Customer risk matrix" description="Click a row for drill-down (demo)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Customer", "Score", "Churn", "Renewal", "Data", "Owner", "Next action"].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`cursor-pointer border-t border-slate-100 ${selectedId === r.id ? "bg-amber-50" : "hover:bg-slate-50"}`}
                onClick={() => onSelect(r.id)}
              >
                <td className="px-2 py-2 font-medium">{r.customer}</td>
                <td className="px-2 py-2">{r.riskScore}</td>
                <td className="px-2 py-2">{r.churnRisk}</td>
                <td className="px-2 py-2">{r.renewalRisk}</td>
                <td className="px-2 py-2">{r.dataRisk}</td>
                <td className="px-2 py-2">{r.owner}</td>
                <td className="px-2 py-2">{r.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
