"use client";

import type { DecisionFilterState } from "@/lib/decision-engine/types";
import { BUSINESS_AREAS } from "@/lib/decision-engine/constants";

export function DecisionFiltersToolbar({
  filters,
  owners,
  onChange,
}: {
  filters: DecisionFilterState;
  owners: string[];
  onChange: (f: DecisionFilterState) => void;
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
            ["businessArea", "Business area", ["all", ...BUSINESS_AREAS]],
            ["priority", "Priority", ["all", "Critical", "High", "Medium", "Low"]],
            ["risk", "Risk", ["all", "High", "Medium", "Low"]],
            ["confidence", "Confidence", ["all", "Medium", "High", "Low"]],
            ["owner", "Owner", ["all", ...owners]],
            ["approvalRequired", "Approval required", ["all", "yes", "no"]],
            ["status", "Status", ["all", "New", "Under review", "Approved"]],
            ["customer", "Customer", ["all", "CUST-DEMO-001", "CUST-DEMO-002"]],
          ] as const
        ).map(([key, label, options]) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <select
              value={filters[key as keyof DecisionFilterState]}
              onChange={(e) => onChange({ ...filters, [key]: e.target.value } as DecisionFilterState)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o === "all" ? "All" : o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
