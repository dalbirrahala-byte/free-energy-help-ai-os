// Factory 030: Controlled Action Queue.
//
// A read-only composition of already-persisted classification (Factory 027)
// and the already-computed Recommended Action (Factory 029) into one
// operational worklist. This is deliberately the seam a future, separately
// reviewed communication dispatcher will attach to — it is NOT a
// dispatcher itself. Nothing in this file sends a message, places a call,
// or writes to the database. No new scoring, qualification, or
// recommendation logic is introduced here; every field is either read
// directly off a lead's already-persisted columns or taken verbatim from
// leadActionRecommendation.ts / leadRevenueView.ts's existing output.
//
// Honesty rule (matches leadActionRecommendation.ts): this module never
// invents a communication state. "Task summary" below is a literal count of
// real `tasks` rows for a lead — it is not, and must never become, a stand-in
// for "contacted" / "dispatched" / "delivered" / "replied", none of which
// exist anywhere in this schema.

import { leadWorklistRank } from "./leadWorklistOrder.ts";
import { deriveLeadActionRecommendation, type LeadActionRecommendation } from "./leadActionRecommendation.ts";
import type { LeadRevenueView } from "./leadRevenueView.ts";
import type { LeadQualityClassification } from "./leadQualityClassification.ts";

export type ActionQueueTaskSummary = {
  /** Count of this lead's tasks with status "Open" (or any status other than "Completed"/"Cancelled" — never guessed, only counted). */
  openCount: number;
  /** Count of this lead's tasks with status exactly "Completed". */
  completedCount: number;
  /** Earliest due_date among this lead's open tasks, if any — display only. */
  nextDueDate: string | null;
};

const EMPTY_TASK_SUMMARY: ActionQueueTaskSummary = { openCount: 0, completedCount: 0, nextDueDate: null };

export type ActionQueueTaskRow = {
  lead_id: number | null;
  status: string | null;
  due_date: string | null;
};

/**
 * Pure aggregation of raw task rows into a per-lead summary. Never queries
 * the database itself — the caller fetches `tasks` under the existing
 * `leads_select_authenticated`-equivalent tasks RLS policy, exactly the same
 * table and columns already read on the lead detail page
 * (`leads/[id]/page.tsx`), just batched across every lead in one query
 * instead of one query per lead.
 */
export function summarizeTasksByLead(rows: ActionQueueTaskRow[]): Record<number, ActionQueueTaskSummary> {
  const summaries: Record<number, ActionQueueTaskSummary> = {};

  for (const row of rows) {
    if (row.lead_id === null) continue;

    const existing = summaries[row.lead_id] ?? { ...EMPTY_TASK_SUMMARY };
    const isCompleted = row.status === "Completed";
    const isCancelled = row.status === "Cancelled";

    if (isCompleted) {
      existing.completedCount += 1;
    } else if (!isCancelled) {
      existing.openCount += 1;
      if (row.due_date && (existing.nextDueDate === null || row.due_date < existing.nextDueDate)) {
        existing.nextDueDate = row.due_date;
      }
    }

    summaries[row.lead_id] = existing;
  }

  return summaries;
}

export type ActionQueueLeadInput = {
  id: number;
  company_name: string | null;
  contact_name: string | null;
  status: string | null;
  /** Factory 027's persisted classification. Null means "never scored" — never guessed here. */
  qualification_classification: LeadQualityClassification | null;
  qualification_score: number | null;
  /** Factory 027's persisted jsonb reasons array — read only to recover a Reject lead's real reject reason, never to re-derive classification. */
  qualification_reasons: unknown;
};

export type ActionQueueItem = {
  leadId: number;
  companyName: string | null;
  contactName: string | null;
  classification: LeadQualityClassification | null;
  score: number | null;
  /** Null only when the lead has never been scored — there is nothing honest to recommend yet. */
  recommendation: LeadActionRecommendation | null;
  tasks: ActionQueueTaskSummary;
};

export type ActionQueue = {
  /** Hot/Warm/Nurture leads with a real recommendation, ordered Hot -> Warm -> Nurture then by priority score (same order as the Leads list). */
  actionable: ActionQueueItem[];
  /** Leads with no persisted classification yet — shown separately, never given a fabricated recommendation. Point staff at the existing "Recompute unscored" action on /leads rather than duplicating it here. */
  unscored: ActionQueueItem[];
  /** Reject-classified leads — included only so staff can see them if they explicitly ask; never carries an actionable recommendation, always last, never hidden or deleted. */
  rejected: ActionQueueItem[];
};

function extractRejectReason(reasons: unknown): string | null {
  if (!Array.isArray(reasons)) return null;
  const entry = reasons.find(
    (candidate): candidate is { factor: string; detail: string } =>
      typeof candidate === "object" && candidate !== null && (candidate as { factor?: unknown }).factor === "Reject reason",
  );
  return entry?.detail ?? null;
}

/**
 * `revenueViews` should come from loadLeadRevenueViews.ts, already computed
 * by the caller for the same lead set (identical to how the Leads list
 * already builds it) — this function performs no I/O and recomputes
 * nothing that module already provides.
 */
export function buildActionQueue(
  leads: ActionQueueLeadInput[],
  revenueViews: Record<number, LeadRevenueView>,
  tasksByLead: Record<number, ActionQueueTaskSummary>,
): ActionQueue {
  const actionable: ActionQueueItem[] = [];
  const unscored: ActionQueueItem[] = [];
  const rejected: ActionQueueItem[] = [];

  for (const lead of leads) {
    const tasks = tasksByLead[lead.id] ?? EMPTY_TASK_SUMMARY;
    const classification = lead.qualification_classification;
    const view = revenueViews[lead.id];

    if (!classification || !view) {
      unscored.push({
        leadId: lead.id,
        companyName: lead.company_name,
        contactName: lead.contact_name,
        classification: classification ?? null,
        score: lead.qualification_score,
        recommendation: null,
        tasks,
      });
      continue;
    }

    const recommendation = deriveLeadActionRecommendation(
      { id: lead.id, status: lead.status },
      { classification, rejectReason: extractRejectReason(lead.qualification_reasons) },
      view.qualification,
      view.priority,
      view.nextAction,
    );

    const item: ActionQueueItem = {
      leadId: lead.id,
      companyName: lead.company_name,
      contactName: lead.contact_name,
      classification,
      score: lead.qualification_score,
      recommendation,
      tasks,
    };

    if (classification === "Reject") {
      rejected.push(item);
    } else {
      actionable.push(item);
    }
  }

  actionable.sort((a, b) => {
    const rankDiff = leadWorklistRank(a.classification) - leadWorklistRank(b.classification);
    if (rankDiff !== 0) return rankDiff;

    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    return a.leadId - b.leadId;
  });

  return { actionable, unscored, rejected };
}
