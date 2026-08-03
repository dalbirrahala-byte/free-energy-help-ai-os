"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { SectionCard } from "@/components/dashboard/SectionCard";
import { WEBSITE_LEAD_STATUSES } from "@/lib/website-leads/constants";
import { priorityBadgeClass } from "@/lib/website-leads/priority";
import {
  addWebsiteLeadNote,
  setWebsiteLeadStatus,
} from "@/lib/website-leads/storage";
import type { WebsiteLeadStatus } from "@/lib/website-leads/types";
import { useWebsiteLead } from "@/lib/website-leads/useWebsiteLeads";

type WebsiteLeadWorkspaceProps = {
  leadReference: string;
};

export function WebsiteLeadWorkspace({ leadReference }: WebsiteLeadWorkspaceProps) {
  const lead = useWebsiteLead(leadReference);
  const [noteDraft, setNoteDraft] = useState("");

  if (lead === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-700">Lead not found in this browser.</p>
        <Link href="/leads" className="mt-4 inline-block font-semibold text-emerald-600">
          Back to Leads
        </Link>
      </div>
    );
  }

  function handleStatusChange(status: WebsiteLeadStatus) {
    setWebsiteLeadStatus(leadReference, status);
  }

  function handleAddNote() {
    addWebsiteLeadNote(leadReference, noteDraft);
    setNoteDraft("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Website lead</p>
          <h1 className="text-2xl font-bold text-slate-900">{lead.businessName}</h1>
          <p className="font-mono text-sm text-slate-500">{lead.leadReference}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${priorityBadgeClass(lead.priority)}`}
        >
          {lead.priority}
        </span>
      </div>

      <SectionCard title="Recommended next action" description="Assigned automatically on submission">
        <p className="text-sm font-medium text-slate-800">{lead.recommendedNextAction}</p>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Contact details" description="From website enquiry form">
          <dl className="space-y-3 text-sm">
            <Detail label="Contact" value={lead.contactName} />
            <Detail
              label="Telephone"
              value={
                <a
                  href={`tel:${lead.telephone.replace(/\s/g, "")}`}
                  className="font-semibold text-emerald-600"
                >
                  {lead.telephone}
                </a>
              }
            />
            <Detail
              label="Email"
              value={
                <a href={`mailto:${lead.email}`} className="font-semibold text-emerald-600">
                  {lead.email}
                </a>
              }
            />
            <Detail label="Postcode" value={lead.postcode} />
            <Detail label="Lead source" value={lead.source} />
            <Detail label="Renewal timing" value={lead.renewalTimingLabel} />
            <Detail label="Date received" value={lead.createdAtLabel} />
          </dl>
        </SectionCard>

        <SectionCard title="Pipeline" description="Update status as you work the lead">
          <label htmlFor="website-lead-status" className="text-sm font-semibold text-slate-700">
            Status
          </label>
          <select
            id="website-lead-status"
            value={lead.status}
            onChange={(event) => handleStatusChange(event.target.value as WebsiteLeadStatus)}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          >
            {WEBSITE_LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </SectionCard>
      </div>

      <SectionCard title="Notes" description="Stored in this browser only">
        <textarea
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          rows={4}
          placeholder="Add call notes or qualification details…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAddNote}
          className="mt-3 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Add Note
        </button>
        {lead.notes.length > 0 && (
          <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {lead.notes.map((note) => (
              <li key={note.id} className="text-sm text-slate-700">
                <span className="text-xs font-semibold text-slate-400">{note.createdLabel}</span>
                <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Link href="/leads" className="inline-block text-sm font-semibold text-emerald-600">
        ← Back to Leads
      </Link>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}
