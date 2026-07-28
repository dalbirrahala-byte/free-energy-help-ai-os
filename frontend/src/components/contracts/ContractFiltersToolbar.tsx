"use client";

import { CONTRACT_STATUSES, CONTRACT_RISK_LEVELS } from "@/lib/contracts/constants";
import type { ContractFilterState } from "@/lib/contracts/types";

type ContractFiltersToolbarProps = {
  filters: ContractFilterState;
  suppliers: string[];
  managers: string[];
  regions: string[];
  renewalMonths: string[];
  contractTypes: string[];
  resultCount: number;
  onChange: (next: ContractFilterState) => void;
};

export function ContractFiltersToolbar({
  filters,
  suppliers,
  managers,
  regions,
  renewalMonths,
  contractTypes,
  resultCount,
  onChange,
}: ContractFiltersToolbarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Customer search
          </span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Customer, site, supplier, manager…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
            aria-label="Search contracts"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <FilterSelect
            label="Supplier"
            value={filters.supplier}
            options={["all", ...suppliers]}
            onChange={(v) => onChange({ ...filters, supplier: v })}
          />
          <FilterSelect
            label="Account manager"
            value={filters.accountManager}
            options={["all", ...managers]}
            onChange={(v) => onChange({ ...filters, accountManager: v })}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            options={["all", ...CONTRACT_STATUSES]}
            onChange={(v) => onChange({ ...filters, status: v })}
          />
          <FilterSelect
            label="Risk"
            value={filters.riskLevel}
            options={["all", ...CONTRACT_RISK_LEVELS]}
            onChange={(v) => onChange({ ...filters, riskLevel: v })}
          />
          <FilterSelect
            label="Fuel"
            value={filters.fuelType}
            options={["all", "Electricity", "Gas", "Dual"]}
            onChange={(v) => onChange({ ...filters, fuelType: v })}
          />
          <FilterSelect
            label="Renewal month"
            value={filters.renewalMonth}
            options={["all", ...renewalMonths]}
            onChange={(v) => onChange({ ...filters, renewalMonth: v })}
          />
          <FilterSelect
            label="Contract type"
            value={filters.contractType}
            options={["all", ...contractTypes]}
            onChange={(v) => onChange({ ...filters, contractType: v })}
          />
          <FilterSelect
            label="Region"
            value={filters.region}
            options={["all", ...regions]}
            onChange={(v) => onChange({ ...filters, region: v })}
          />
        </div>

        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-800">{resultCount}</span> demo
          contract(s)
        </p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "all" ? `All ${label.toLowerCase()}` : opt}
          </option>
        ))}
      </select>
    </label>
  );
}
