"use client";

import type { CommissionFilterState } from "@/lib/commissions/types";
import { COMMISSION_STATUS_VALUES } from "@/lib/commissions/types";

type CommissionFiltersProps = {
  filters: CommissionFilterState;
  suppliers: string[];
  customers: string[];
  months: string[];
  fuelTypes: string[];
  accountManagers: string[];
  resultCount: number;
  onChange: (next: CommissionFilterState) => void;
};

export function CommissionFilters({
  filters,
  suppliers,
  customers,
  months,
  fuelTypes,
  accountManagers,
  resultCount,
  onChange,
}: CommissionFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">Filters</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SelectFilter
          label="Supplier"
          value={filters.supplier}
          options={suppliers}
          onChange={(supplier) => onChange({ ...filters, supplier })}
        />
        <SelectFilter
          label="Customer"
          value={filters.customer}
          options={customers}
          onChange={(customer) => onChange({ ...filters, customer })}
        />
        <SelectFilter
          label="Status"
          value={filters.status}
          options={[...COMMISSION_STATUS_VALUES]}
          onChange={(status) => onChange({ ...filters, status })}
        />
        <SelectFilter
          label="Month"
          value={filters.month}
          options={months}
          onChange={(month) => onChange({ ...filters, month })}
          allLabel="All months"
        />
        <SelectFilter
          label="Fuel type"
          value={filters.fuelType}
          options={fuelTypes}
          onChange={(fuelType) => onChange({ ...filters, fuelType })}
        />
        <SelectFilter
          label="Account manager"
          value={filters.accountManager}
          options={accountManagers}
          onChange={(accountManager) => onChange({ ...filters, accountManager })}
        />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        <span className="font-semibold text-slate-800">{resultCount}</span> demo
        record{resultCount === 1 ? "" : "s"} match filters.
      </p>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  allLabel = "All",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel?: string;
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
        aria-label={`Filter by ${label}`}
      >
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
