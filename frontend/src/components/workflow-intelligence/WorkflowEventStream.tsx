"use client";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { BUSINESS_AREAS } from "@/lib/workflows/constants";
import type { EventStreamFilters, WorkflowEvent } from "@/lib/workflows/types";

export function WorkflowEventStream({
  events,
  filters,
  onChange,
  eventTypes,
  owners,
  sources,
}: {
  events: WorkflowEvent[];
  filters: EventStreamFilters;
  onChange: (f: EventStreamFilters) => void;
  eventTypes: string[];
  owners: string[];
  sources: string[];
}) {
  return (
    <SectionCard title="Event stream" description="Searchable demonstration timeline">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Search</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        {(
          [
            ["businessArea", "Business area", ["all", ...BUSINESS_AREAS]],
            ["eventType", "Event type", ["all", ...eventTypes]],
            ["status", "Status", ["all", "Completed", "Processing", "Waiting for approval", "Failed", "Queued"]],
            ["priority", "Priority", ["all", "Critical", "High", "Medium", "Low"]],
            ["risk", "Risk", ["all", "High", "Medium", "Low"]],
            ["owner", "Owner", ["all", ...owners]],
            ["source", "Source", ["all", ...sources]],
            ["approvalRequired", "Approval required", ["all", "yes", "no"]],
            ["dateRange", "Date range", ["today-demo", "7d-demo", "30d-demo"]],
          ] as const
        ).map(([key, label, options]) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <select
              value={filters[key]}
              onChange={(e) => onChange({ ...filters, [key]: e.target.value } as EventStreamFilters)}
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Time", "Event", "Area", "Customer", "Source", "Owner", "Result", "Approval", "Risk", "Correlation"].map(
                (h) => (
                  <th key={h} className="px-2 py-2 text-left font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.eventId} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-2 py-2">{e.timestampLabel}</td>
                <td className="px-2 py-2">{e.eventType}</td>
                <td className="px-2 py-2">{e.businessArea}</td>
                <td className="px-2 py-2">{e.metadata.customerName ?? e.customerId ?? "—"}</td>
                <td className="px-2 py-2">{e.source}</td>
                <td className="px-2 py-2">{e.actor}</td>
                <td className="px-2 py-2">{e.status}</td>
                <td className="px-2 py-2">{e.humanApprovalRequired ? "Required" : "—"}</td>
                <td className="px-2 py-2">{e.riskLevel}</td>
                <td className="px-2 py-2 font-mono text-xs">{e.correlationId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
