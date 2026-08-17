"use client";

import Link from "next/link";
import { useState } from "react";

import { LeadActionRecommendationBadge, LeadQualityBadge } from "@/components/leads/RevenueBadges";
import { isTaskEligibleRecommendation } from "@/lib/revenue-engine/leadActionRecommendation";
import type { ActionQueue, ActionQueueItem } from "@/lib/revenue-engine/actionQueue";

// Factory 030: Controlled Action Queue — presentation only. Every link on
// this page either navigates to the existing lead detail page (read-only)
// or to the existing, unmodified /tasks/new form (pre-fills fields, never
// auto-submits). Nothing here can contact a customer, and no communication
// state (dispatched/delivered/contacted/failed/replied) is ever displayed,
// because none of that exists in the underlying data.

type ActionQueueClientProps = {
  queue: ActionQueue;
  supabaseError: boolean;
};

function formatDueDate(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function TaskSummaryLine({ item }: { item: ActionQueueItem }) {
  const { openCount, completedCount, nextDueDate } = item.tasks;

  if (openCount === 0 && completedCount === 0) {
    return <span className="text-xs text-slate-400">No tasks logged for this lead yet.</span>;
  }

  const dueLabel = formatDueDate(nextDueDate);

  return (
    <span className="text-xs text-slate-500">
      {openCount > 0 && (
        <>
          {openCount} open task{openCount === 1 ? "" : "s"}
          {dueLabel ? ` · next due ${dueLabel}` : ""}
        </>
      )}
      {openCount > 0 && completedCount > 0 && " · "}
      {completedCount > 0 && `${completedCount} completed`}
    </span>
  );
}

function ActionQueueRow({ item, allowTask }: { item: ActionQueueItem; allowTask: boolean }) {
  const actionEligibleLabel = item.recommendation !== null && isTaskEligibleRecommendation(item.recommendation.action);
  const offerTask = allowTask && actionEligibleLabel && item.eligibility?.eligible === true;
  // Factory 037: reuses Factory 031's already-computed eligibility.eligible unchanged — never re-derived here.
  const showBlockedNotice = allowTask && actionEligibleLabel && item.eligibility !== null && !item.eligibility.eligible;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{item.companyName || "Unnamed company"}</p>
          <p className="text-sm text-slate-500">{item.contactName || "No contact name on file"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.classification ? <LeadQualityBadge label={item.classification} /> : <span className="text-xs text-slate-400">Not yet scored</span>}
          {item.recommendation && <LeadActionRecommendationBadge label={item.recommendation.action} />}
        </div>
      </div>

      {item.recommendation && <p className="mt-3 text-sm text-slate-600">{item.recommendation.reason}</p>}

      {showBlockedNotice && item.eligibility && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-semibold">Not eligible to proceed:</span> {item.eligibility.reason}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <TaskSummaryLine item={item} />

        <div className="flex gap-3">
          <Link href={`/leads/${item.leadId}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            View lead
          </Link>

          {offerTask && item.recommendation && (
            <Link
              href={`/tasks/new?lead_id=${item.leadId}&title=${encodeURIComponent(item.recommendation.action)}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Create task for this action
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActionQueueClient({ queue, supabaseError }: ActionQueueClientProps) {
  const [showRejected, setShowRejected] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Action Queue</h1>
            <p className="mt-1 text-slate-500">
              Every lead with an outstanding Recommended Action, in one place. Advisory only — nothing here contacts a
              customer automatically. Creating a task still requires you to review and submit the form yourself.
            </p>
          </div>

          <Link href="/leads" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Back to Leads
          </Link>
        </div>

        {supabaseError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            The action queue could not be fully loaded from Supabase. Try again shortly.
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">
            Needs attention {queue.actionable.length > 0 && <span className="text-slate-400">({queue.actionable.length})</span>}
          </h2>

          {queue.actionable.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              No Hot, Warm, or Nurture leads with an outstanding recommendation right now.
            </p>
          ) : (
            <div className="space-y-3">
              {queue.actionable.map((item) => (
                <ActionQueueRow key={item.leadId} item={item} allowTask />
              ))}
            </div>
          )}
        </section>

        {queue.unscored.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Not yet scored ({queue.unscored.length})</h2>
            <p className="text-sm text-slate-500">
              These leads have no classification yet, so no recommendation can be shown honestly. Run{" "}
              <Link href="/leads" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Recompute unscored leads
              </Link>{" "}
              on the Leads page first.
            </p>
            <div className="space-y-3">
              {queue.unscored.map((item) => (
                <ActionQueueRow key={item.leadId} item={item} allowTask={false} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setShowRejected((prev) => !prev)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              showRejected ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {showRejected ? "Hide" : "Show"} rejected leads ({queue.rejected.length})
          </button>

          {showRejected && (
            <div className="space-y-3">
              {queue.rejected.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">No rejected leads.</p>
              ) : (
                queue.rejected.map((item) => <ActionQueueRow key={item.leadId} item={item} allowTask={false} />)
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
