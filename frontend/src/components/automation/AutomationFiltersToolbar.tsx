"use client";

import type { AutomationFilterState } from "@/lib/automation/types";

export function AutomationFiltersToolbar({
  filters,
  owners,
  areas,
  statuses,
  resultCount,
  onChange,
}: {
  filters: AutomationFilterState;
  owners: string[];
  areas: string[];
  statuses: string[];
  resultCount: number;
  onChange: (f: AutomationFilterState) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Search</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Workflow name, trigger, owner…"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Sel label="Business area" value={filters.businessArea} options={["all", ...areas]} onChange={(v) => onChange({ ...filters, businessArea: v })} />
        <Sel label="Status" value={filters.status} options={["all", ...statuses]} onChange={(v) => onChange({ ...filters, status: v })} />
        <Sel label="Environment" value={filters.environment} options={["all", "Demonstration", "Development", "Testing", "Production"]} onChange={(v) => onChange({ ...filters, environment: v })} />
        <Sel label="Owner" value={filters.owner} options={["all", ...owners]} onChange={(v) => onChange({ ...filters, owner: v })} />
        <Sel label="Approval required" value={filters.approvalRequired} options={["all", "yes"]} onChange={(v) => onChange({ ...filters, approvalRequired: v })} />
        <Sel label="Trigger type" value={filters.triggerType} options={["all", "Contract", "Record", "Time", "Live", "Commission", "Quote"]} onChange={(v) => onChange({ ...filters, triggerType: v })} />
        <Sel label="Last run result" value={filters.lastRunResult} options={["all", "Successful", "Failed"]} onChange={(v) => onChange({ ...filters, lastRunResult: v })} />
      </div>
      <p className="mt-3 text-sm text-slate-500">Showing {resultCount} workflow(s) (demo register)</p>
    </div>
  );
}

function Sel({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{o === "all" ? "All" : o}</option>
        ))}
      </select>
    </label>
  );
}
