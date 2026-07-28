"use client";

import { MARKET_SEGMENTS, SECTOR_APPETITE_LEVELS, SUPPLIER_RISK_LEVELS, SUPPLIER_STATUSES } from "@/lib/suppliers/constants";
import type { SupplierFilterState } from "@/lib/suppliers/types";

type SupplierFiltersToolbarProps = {
  filters: SupplierFilterState;
  owners: string[];
  resultCount: number;
  onChange: (next: SupplierFilterState) => void;
};

export function SupplierFiltersToolbar({
  filters,
  owners,
  resultCount,
  onChange,
}: SupplierFiltersToolbarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
          Supplier name
        </span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
          placeholder="Search suppliers…"
          aria-label="Search suppliers"
        />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select label="Fuel" value={filters.fuelType} options={["all", "Electricity", "Gas", "Dual"]} onChange={(v) => onChange({ ...filters, fuelType: v })} />
        <Select label="Segment" value={filters.marketSegment} options={["all", ...MARKET_SEGMENTS]} onChange={(v) => onChange({ ...filters, marketSegment: v })} />
        <Select label="Status" value={filters.status} options={["all", ...SUPPLIER_STATUSES]} onChange={(v) => onChange({ ...filters, status: v })} />
        <Select label="Risk" value={filters.riskLevel} options={["all", ...SUPPLIER_RISK_LEVELS]} onChange={(v) => onChange({ ...filters, riskLevel: v })} />
        <Select label="Preferred" value={filters.preferredOnly} options={["all", "yes"]} onChange={(v) => onChange({ ...filters, preferredOnly: v })} />
        <Select label="Renewables" value={filters.renewableOptions} options={["all", "yes", "no"]} onChange={(v) => onChange({ ...filters, renewableOptions: v })} />
        <Select label="Sector appetite" value={filters.sectorAppetite} options={["all", ...SECTOR_APPETITE_LEVELS]} onChange={(v) => onChange({ ...filters, sectorAppetite: v })} />
        <Select label="Quote turnaround" value={filters.quoteTurnaround} options={["all", "fast", "medium", "slow"]} onChange={(v) => onChange({ ...filters, quoteTurnaround: v })} />
        <Select label="Account owner" value={filters.accountOwner} options={["all", ...owners]} onChange={(v) => onChange({ ...filters, accountOwner: v })} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Showing <strong>{resultCount}</strong> demo supplier(s)
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "all" ? `All` : opt}
          </option>
        ))}
      </select>
    </label>
  );
}
