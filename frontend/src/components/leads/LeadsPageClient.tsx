"use client";

import Link from "next/link";

import { WebsiteLeadsPanel } from "@/components/website-leads/WebsiteLeadsPanel";
import { useNewWebsiteLeadCount, useWebsiteLeads } from "@/lib/website-leads/useWebsiteLeads";
import { PriorityBadge, QualificationBadge, NextActionBadge } from "@/components/leads/RevenueBadges";
import type { LeadRevenueView } from "@/lib/revenue-engine/leadRevenueView";

export type CrmLeadRow = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
  notes: string | null;
  lead_source: string | null;
};

type LeadsPageClientProps = {
  crmLeads: CrmLeadRow[];
  supabaseError: boolean;
  revenueViews: Record<number, LeadRevenueView>;
};

function formatLastActivity(view: LeadRevenueView | undefined): string {
  if (!view) {
    return "Not assessed";
  }
  const { activityRecency } = view;
  if (!activityRecency.hasActivity || activityRecency.daysSinceLastActivity === null) {
    return "No activity yet";
  }
  const days = activityRecency.daysSinceLastActivity;
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatContractDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function LeadsPageClient({ crmLeads, supabaseError, revenueViews }: LeadsPageClientProps) {
  const websiteLeads = useWebsiteLeads();
  const newCount = useNewWebsiteLeadCount();

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
            <p className="mt-1 text-slate-500">
              Website enquiries (local) and CRM leads from Supabase.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/business-energy-quote"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Public quote page
            </Link>
            <Link
              href="/leads/new"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              Add Lead
            </Link>
          </div>
        </div>

        <WebsiteLeadsPanel leads={websiteLeads} newLeadCount={newCount} />

        {supabaseError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            CRM leads could not be loaded from Supabase. Website enquiries below still work
            locally.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">CRM leads (Supabase)</h2>
            <p className="text-sm text-slate-500">Existing live transfer and manual leads</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">Company</th>
                  <th className="px-5 py-4 font-semibold">Source</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Telephone</th>
                  <th className="px-5 py-4 font-semibold">Supplier</th>
                  <th className="px-5 py-4 font-semibold">Contract End</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Qualification (Calculated)</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Next Action</th>
                  <th className="px-5 py-4 font-semibold">Last Activity</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {crmLeads.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-5 py-12 text-center text-slate-500">
                      No CRM leads in Supabase yet.
                    </td>
                  </tr>
                ) : (
                  crmLeads.map((lead) => {
                    const view = revenueViews[lead.id];
                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {lead.company_name || "Unnamed company"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {lead.lead_source || "Not specified"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {lead.contact_name || "Not provided"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {lead.telephone || "Not provided"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {lead.supplier || "Not provided"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatContractDate(lead.contract_end)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {lead.status || "New"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {view ? (
                            <QualificationBadge label={view.qualification.qualificationLabel} />
                          ) : (
                            <span className="text-xs text-slate-400">Not assessed</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {view ? (
                            <PriorityBadge label={view.priority.priorityLabel} />
                          ) : (
                            <span className="text-xs text-slate-400">Not assessed</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {view ? (
                            <NextActionBadge label={view.nextAction.action} />
                          ) : (
                            <span className="text-xs text-slate-400">Not assessed</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatLastActivity(view)}</td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
