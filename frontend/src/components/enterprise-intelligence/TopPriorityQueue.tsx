"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import type { Recommendation } from "@/lib/decision-engine/types";

export function TopPriorityQueue({
  rows,
  selectedId,
  onSelect,
}: {
  rows: Recommendation[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <SectionCard title="Top priority queue" description="Ranked demo recommendations">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Rank",
                "Customer",
                "Area",
                "Recommendation",
                "Score",
                "Confidence",
                "Est. value",
                "At risk",
                "Due",
                "Owner",
                "Approval",
                "Status",
                "Evidence",
                "Action",
              ].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => (
              <tr
                key={r.id}
                className={`border-t border-slate-100 cursor-pointer ${selectedId === r.id ? "bg-emerald-50" : ""}`}
                onClick={() => onSelect(r.id)}
              >
                <td className="px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2">{r.customerId ?? "—"}</td>
                <td className="px-2 py-2">{r.businessArea}</td>
                <td className="px-2 py-2 font-medium">{r.title}</td>
                <td className="px-2 py-2">{r.priorityScore}</td>
                <td className="px-2 py-2">{r.confidence}</td>
                <td className="px-2 py-2">{r.estimatedDemoRevenueImpact}</td>
                <td className="px-2 py-2">{r.estimatedDemoRevenueAtRisk}</td>
                <td className="px-2 py-2">{r.dueDateLabel}</td>
                <td className="px-2 py-2">{r.owner}</td>
                <td className="px-2 py-2">{r.humanApprovalRequired ? "Yes" : "—"}</td>
                <td className="px-2 py-2">{r.status}</td>
                <td className="px-2 py-2 text-xs">{r.evidence[0]?.summary ?? "—"}</td>
                <td className="px-2 py-2">
                  <button type="button" disabled className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-400">
                    {r.recommendedAction} — Not configured
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
