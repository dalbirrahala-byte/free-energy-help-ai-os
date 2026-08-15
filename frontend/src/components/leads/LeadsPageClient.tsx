"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { WebsiteLeadsPanel } from "@/components/website-leads/WebsiteLeadsPanel";
import { useNewWebsiteLeadCount, useWebsiteLeads } from "@/lib/website-leads/useWebsiteLeads";
import { PriorityBadge, QualificationReadinessBadge, NextActionBadge, LeadQualityBadge } from "@/components/leads/RevenueBadges";
import type { LeadRevenueView } from "@/lib/revenue-engine/leadRevenueView";
import type { LeadQualityClassification } from "@/lib/revenue-engine/leadQualityClassification";

export type CrmLeadRow = {
  id: number;
  created_at?: string;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
  notes: string | null;
  lead_source: string | null;
  /** Factory 027's persisted classification — null means "never scored yet", distinct from any classification value. */
  qualification_classification?: string | null;
  qualification_score?: number | null;
  qualification_computed_at?: string | null;
};

type LeadsPageClientProps = {
  crmLeads: CrmLeadRow[];
  supabaseError: boolean;
  revenueViews: Record<number, LeadRevenueView>;
  /** Factory 028: bulk-scores every lead with qualification_classification IS NULL, reusing syncLeadQualification.ts per lead. */
  recomputeUnscoredLeadQualifications: () => void;
};

/**
 * Operational worklist order per the approved Factory 028 design: work the
 * Hot/Warm/Nurture leads first, know which leads still need scoring, and
 * keep Reject out of the default working queue without ever deleting it.
 */
const WORKLIST_RANK: Record<string, number> = {
  Hot: 0,
  Warm: 1,
  Nurture: 2,
  __unscored__: 3,
  Reject: 4,
};

function worklistRank(classification: string | null | undefined): number {
  if (!classification) return WORKLIST_RANK.__unscored__;
  return WORKLIST_RANK[classification] ?? WORKLIST_RANK.__unscored__;
}

const QUALITY_COUNT_CHIP_STYLES: Record<string, string> = {
  Hot: "border-red-200 bg-red-50 text-red-800",
  Warm: "border-amber-200 bg-amber-50 text-amber-900",
  Nurture: "border-blue-200 bg-blue-50 text-blue-800",
  "Not yet scored": "border-slate-200 bg-slate-50 text-slate-500",
};

function QualityCountChip({ label, count }: { label: string; count: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        QUALITY_COUNT_CHIP_STYLES[label] ?? "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {label}
      <span className="rounded-full bg-white/60 px-1.5">{count}</span>
    </span>
  );
}

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

export function LeadsPageClient({
  crmLeads,
  supabaseError,
  revenueViews,
  recomputeUnscoredLeadQualifications,
}: LeadsPageClientProps) {
  const websiteLeads = useWebsiteLeads();
  const newCount = useNewWebsiteLeadCount();
  const [showRejected, setShowRejected] = useState(false);

  const qualityCounts = useMemo(() => {
    const counts = { Hot: 0, Warm: 0, Nurture: 0, Reject: 0, unscored: 0 };
    for (const lead of crmLeads) {
      const classification = lead.qualification_classification;
      if (!classification) {
        counts.unscored += 1;
      } else if (classification in counts) {
        counts[classification as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [crmLeads]);

  const worklistLeads = useMemo(() => {
    const visible = showRejected
      ? crmLeads
      : crmLeads.filter((lead) => lead.qualification_classification !== "Reject");

    return [...visible].sort((a, b) => {
      const rankDiff = worklistRank(a.qualification_classification) - worklistRank(b.qualification_classification);
      if (rankDiff !== 0) return rankDiff;

      // Within the same classification, prioritise by the already-computed
      // priority score so newer/more urgent leads aren't buried by an
      // arbitrary secondary sort, then fall back to most-recently-created.
      const scoreDiff = (revenueViews[b.id]?.priority.priorityScore ?? 0) - (revenueViews[a.id]?.priority.priorityScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [crmLeads, revenueViews, showRejected]);

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">CRM leads (Supabase)</h2>
                <p className="text-sm text-slate-500">
                  Existing live transfer and manual leads, worked Hot → Warm → Nurture first.
                </p>
              </div>

              {qualityCounts.unscored > 0 && (
                <form action={recomputeUnscoredLeadQualifications}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    title="Scores every lead that has never been classified (Factory 027 qualification engine, reused verbatim)"
                  >
                    Recompute {qualityCounts.unscored} unscored lead{qualityCounts.unscored === 1 ? "" : "s"}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <QualityCountChip label="Hot" count={qualityCounts.Hot} />
              <QualityCountChip label="Warm" count={qualityCounts.Warm} />
              <QualityCountChip label="Nurture" count={qualityCounts.Nurture} />
              <QualityCountChip label="Not yet scored" count={qualityCounts.unscored} />
              <button
                type="button"
                onClick={() => setShowRejected((prev) => !prev)}
                className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${
                  showRejected
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {showRejected ? "Hide" : "Show"} rejected leads ({qualityCounts.Reject})
              </button>
            </div>
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
                  <th className="px-5 py-4 font-semibold">Lead Quality</th>
                  <th className="px-5 py-4 font-semibold">Qualification Readiness</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Next Action</th>
                  <th className="px-5 py-4 font-semibold">Last Activity</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {worklistLeads.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-5 py-12 text-center text-slate-500">
                      {crmLeads.length === 0
                        ? "No CRM leads in Supabase yet."
                        : "No leads to work right now — rejected leads are hidden. Use \"Show rejected leads\" to view them."}
                    </td>
                  </tr>
                ) : (
                  worklistLeads.map((lead) => {
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
                          {lead.qualification_classification ? (
                            <div className="flex items-center gap-1.5">
                              <LeadQualityBadge label={lead.qualification_classification as LeadQualityClassification} />
                              <span className="text-xs text-slate-400">{lead.qualification_score ?? 0}/100</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Not yet scored</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {view ? (
                            <QualificationReadinessBadge label={view.qualification.readinessLabel} />
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
