// Factory 024 Phase 1: deterministic last-activity / inactivity summary.
//
// Pure — no I/O, no AI. Reuses the same "needs follow-up" threshold Mission
// Control's dashboard already uses (FOLLOW_UP_DAYS, 14 days —
// lib/dashboard/dates.ts) so a lead is never called stale here while
// Mission Control still treats it as current, or vice versa.

import { daysUntil, mostRecentDate } from "../shared/dateUtils.ts";
import { FOLLOW_UP_DAYS } from "../dashboard/dates.ts";

export type ActivityRecencyInput = {
  activity_date: string | null;
};

export type ActivityRecencySummary = {
  hasActivity: boolean;
  lastActivityDate: string | null;
  /** Whole days between the last activity and `today`. Null when there is no dated activity on file. */
  daysSinceLastActivity: number | null;
  /** True when the most recent activity is within FOLLOW_UP_DAYS of today. */
  isRecent: boolean;
  /** True when this lead needs follow-up: no activity ever, or the last one is older than FOLLOW_UP_DAYS. */
  isStale: boolean;
};

/**
 * `activities` should be exactly what the caller already fetched (or could
 * already fetch) from `public.activities` — this function never queries the
 * database itself, it only summarises what it's given.
 */
export function summarizeActivityRecency(activities: ActivityRecencyInput[], today: Date): ActivityRecencySummary {
  const hasActivity = activities.length > 0;
  const lastActivityDate = mostRecentDate(activities.map((activity) => activity.activity_date));

  if (!lastActivityDate) {
    return {
      hasActivity,
      lastActivityDate: null,
      daysSinceLastActivity: null,
      isRecent: false,
      isStale: true,
    };
  }

  const daysUntilLast = daysUntil(lastActivityDate, today);
  // `0 - x` rather than unary `-x` so a same-day activity yields +0, not -0.
  const daysSinceLastActivity = daysUntilLast === null ? null : 0 - daysUntilLast;
  const isRecent = daysSinceLastActivity !== null && daysSinceLastActivity <= FOLLOW_UP_DAYS;

  return {
    hasActivity,
    lastActivityDate,
    daysSinceLastActivity,
    isRecent,
    isStale: !isRecent,
  };
}
