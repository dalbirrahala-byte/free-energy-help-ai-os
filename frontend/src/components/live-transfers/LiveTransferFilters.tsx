"use client";

import { WAITING_BUCKET_LABELS } from "@/lib/live-transfers/constants";
import {
  PRIORITY_VALUES,
  TRANSFER_STATUS_VALUES,
  type LiveTransferFilterState,
} from "@/lib/live-transfers/types";

type LiveTransferFiltersProps = {
  filters: LiveTransferFilterState;
  agents: string[];
  onChange: (next: LiveTransferFilterState) => void;
  resultCount: number;
};

const FUEL_OPTIONS = ["Electricity", "Gas", "Dual fuel", "Unknown"];

export function LiveTransferFilters({
  filters,
  agents,
  onChange,
  resultCount,
}: LiveTransferFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">Filters</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="block sm:col-span-2 xl:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Business, contact, telephone, postcode"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            aria-label="Search transfers"
          />
        </label>
        <Select label="Status" value={filters.status} onChange={(status) => onChange({ ...filters, status })}>
          {TRANSFER_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          label="Priority"
          value={filters.priority}
          onChange={(priority) => onChange({ ...filters, priority })}
        >
          {PRIORITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          label="Fuel type"
          value={filters.fuelType}
          onChange={(fuelType) => onChange({ ...filters, fuelType })}
        >
          {FUEL_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          label="Assigned agent"
          value={filters.assignedAgent}
          onChange={(assignedAgent) => onChange({ ...filters, assignedAgent })}
        >
          {agents.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select
          label="Time waiting"
          value={filters.waitingBucket}
          onChange={(waitingBucket) => onChange({ ...filters, waitingBucket })}
        >
          {Object.entries(WAITING_BUCKET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {resultCount === 0 ? "No transfers found" : `${resultCount} demo transfer(s) match.`}
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="all">All</option>
        {children}
      </select>
    </label>
  );
}
