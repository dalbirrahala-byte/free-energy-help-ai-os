"use client";

import type { AiFilterState } from "@/lib/ai-assistant/types";

export function AiAssistantFilters({
  filters,
  owners,
  onChange,
}: {
  filters: AiFilterState;
  owners: string[];
  onChange: (f: AiFilterState) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="text-xs font-semibold uppercase text-slate-500">Search</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["businessArea", "Business area", ["all", "Renewal", "Quote", "Commission", "Solar"]],
            ["priority", "Priority", ["all", "High", "Medium", "Low"]],
            ["confidence", "Confidence", ["all", "High (demo)", "Medium (demo)"]],
            ["riskLevel", "Risk level", ["all", "High", "Medium", "Low"]],
            ["owner", "Owner", ["all", ...owners]],
            ["status", "Status", ["all", "Open (demo)", "Ready (demo)"]],
            ["actionType", "Action type", ["all", "Call", "Email", "Task"]],
          ] as const
        ).map(([key, label, options]) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <select
              value={filters[key as keyof AiFilterState]}
              onChange={(e) => onChange({ ...filters, [key]: e.target.value } as AiFilterState)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {options.map((o) => (
                <option key={o} value={o}>{o === "all" ? "All" : o}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
