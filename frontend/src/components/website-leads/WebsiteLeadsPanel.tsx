"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  PRIORITY_FILTER_OPTIONS,
  type PriorityFilter,
} from "@/lib/website-leads/constants";
import { priorityBadgeClass } from "@/lib/website-leads/priority";
import type { WebsiteLead } from "@/lib/website-leads/types";

type WebsiteLeadsPanelProps = {
  leads: WebsiteLead[];
  newLeadCount: number;
};

export function WebsiteLeadsPanel({ leads, newLeadCount }: WebsiteLeadsPanelProps) {
  const [filter, setFilter] = useState<PriorityFilter>("All");

  const filtered = useMemo(() => {
    if (filter === "All") {
      return leads;
    }

    return leads.filter((lead) => lead.priority === filter);
  }, [filter, leads]);

  return (
    <SectionCard
      title="Website enquiries"
      description="Leads captured from /business-energy-quote (stored in this browser only)"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{newLeadCount}</span> new website lead
          {newLeadCount === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by priority">
          {PRIORITY_FILTER_OPTIONS.map((option) => {
            const selected = filter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  selected
                    ? "bg-emerald-500 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          No website enquiries yet. Share{" "}
          <Link href="/business-energy-quote" className="font-semibold text-emerald-600">
            /business-energy-quote
          </Link>{" "}
          to capture leads.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Lead reference</th>
                  <th className="px-4 py-3 font-semibold">Business</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Telephone</th>
                  <th className="px-4 py-3 font-semibold">Renewal timing</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date received</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <WebsiteLeadRow key={lead.leadReference} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-4 lg:hidden">
            {filtered.map((lead) => (
              <li key={lead.leadReference}>
                <WebsiteLeadCard lead={lead} />
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

function WebsiteLeadRow({ lead }: { lead: WebsiteLead }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
        {lead.leadReference}
      </td>
      <td className="px-4 py-3 font-semibold text-slate-900">{lead.businessName}</td>
      <td className="px-4 py-3 text-slate-600">{lead.contactName}</td>
      <td className="px-4 py-3 text-slate-600">{lead.telephone}</td>
      <td className="px-4 py-3 text-slate-600">{lead.renewalTimingLabel}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityBadgeClass(lead.priority)}`}
        >
          {lead.priority}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{lead.status}</td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{lead.createdAtLabel}</td>
      <td className="px-4 py-3">
        <Link
          href={`/leads/web/${encodeURIComponent(lead.leadReference)}`}
          className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Open Lead
        </Link>
      </td>
    </tr>
  );
}

function WebsiteLeadCard({ lead }: { lead: WebsiteLead }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-mono text-xs font-semibold text-slate-500">{lead.leadReference}</p>
      <h3 className="mt-1 font-bold text-slate-900">{lead.businessName}</h3>
      <p className="text-sm text-slate-600">{lead.contactName}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Renewal</dt>
          <dd>{lead.renewalTimingLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Priority</dt>
          <dd>{lead.priority}</dd>
        </div>
      </dl>
      <Link
        href={`/leads/web/${encodeURIComponent(lead.leadReference)}`}
        className="mt-4 inline-block rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
      >
        Open Lead
      </Link>
    </article>
  );
}
