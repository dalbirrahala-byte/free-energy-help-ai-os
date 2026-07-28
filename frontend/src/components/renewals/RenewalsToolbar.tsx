"use client";

import type { RenewalFilterState } from "@/lib/renewals/types";

type RenewalsToolbarProps = {
  filters: RenewalFilterState;
  suppliers: string[];
  resultCount: number;
  onChange: (next: RenewalFilterState) => void;
};

export function RenewalsToolbar({
  filters,
  suppliers,
  resultCount,
  onChange,
}: RenewalsToolbarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block sm:col-span-2 lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) =>
                onChange({ ...filters, query: event.target.value })
              }
              placeholder="Customer, supplier, manager, task…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              aria-label="Search renewal records"
            />
          </label>

          <FilterSelect
            label="Pipeline window"
            value={filters.pipelineWindow}
            onChange={(value) =>
              onChange({
                ...filters,
                pipelineWindow: value as RenewalFilterState["pipelineWindow"],
              })
            }
            options={[
              { value: "all", label: "All (90-day demo)" },
              { value: "30", label: "0–30 days" },
              { value: "60", label: "31–60 days" },
              { value: "90", label: "61–90 days" },
            ]}
          />

          <FilterSelect
            label="Urgency"
            value={filters.urgency}
            onChange={(value) =>
              onChange({
                ...filters,
                urgency: value as RenewalFilterState["urgency"],
              })
            }
            options={[
              { value: "all", label: "All urgency bands" },
              { value: "critical", label: "Critical (0–30d)" },
              { value: "high", label: "High (31–60d)" },
              { value: "medium", label: "Medium (61–90d)" },
            ]}
          />

          <FilterSelect
            label="Risk"
            value={filters.riskLevel}
            onChange={(value) =>
              onChange({
                ...filters,
                riskLevel: value as RenewalFilterState["riskLevel"],
              })
            }
            options={[
              { value: "all", label: "All risk levels" },
              { value: "Low", label: "Low" },
              { value: "Medium", label: "Medium" },
              { value: "High", label: "High" },
            ]}
          />

          <FilterSelect
            label="Supplier"
            value={filters.supplier}
            onChange={(value) => onChange({ ...filters, supplier: value })}
            options={[
              { value: "all", label: "All suppliers" },
              ...suppliers.map((supplier) => ({ value: supplier, label: supplier })),
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{resultCount}</span> demo
            record{resultCount === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            disabled
            title="Export will connect to live CRM data in a future release"
            className="cursor-not-allowed rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400"
            aria-disabled
          >
            Export (placeholder)
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
