// Factory 024 Phase 1: deterministic, evidence-based recommended next action.
//
// Pure, advisory only — composes already-computed qualification, priority,
// and activity-recency results into one recommended next step. This never
// enacts anything: calling this function has no side effect, writes
// nothing, and triggers no automated contact of any kind, the same
// contract already established by routingRecommendation.ts. It is
// deliberately a separate, more evidence-specific recommendation from
// routingRecommendation.ts's priority-only advisory text — that module is
// left unchanged.

import type { LeadQualificationResult } from "./qualification.ts";
import type { LeadPriorityResult } from "./prioritization.ts";
import type { ActivityRecencySummary } from "./activityRecency.ts";

export type NextActionLabel =
  | "Call lead"
  | "Request missing information"
  | "Follow up"
  | "Review opportunity"
  | "No immediate action";

export type NextActionResult = {
  action: NextActionLabel;
  reason: string;
};

/** Statuses treated as closed — no follow-up is recommended once a lead has already won or lost. Mirrors PIPELINE_STATUSES in lib/dashboard/dates.ts. */
const CLOSED_STATUSES = new Set(["Won", "Lost"]);

const HIGH_URGENCY_LABELS = new Set<LeadPriorityResult["priorityLabel"]>(["Critical", "High"]);

export type NextActionInput = {
  qualification: LeadQualificationResult;
  priority: LeadPriorityResult;
  activityRecency: ActivityRecencySummary;
  status: string | null;
};

/**
 * Rules are applied in order and the first match wins:
 * 1. Closed lead (Won/Lost) -> No immediate action.
 * 2. Unqualified (missing core data) -> Request missing information first.
 * 3. Never contacted -> Call lead.
 * 4. High/Critical priority, no recent activity -> Follow up.
 * 5. High/Critical priority, recently actioned -> Review opportunity.
 * 6. Any other stale lead -> Follow up.
 * 7. Otherwise -> No immediate action.
 */
export function determineNextAction(input: NextActionInput): NextActionResult {
  const { qualification, priority, activityRecency, status } = input;

  if (status && CLOSED_STATUSES.has(status)) {
    return {
      action: "No immediate action",
      reason: `Lead status is already "${status}".`,
    };
  }

  if (qualification.qualificationLabel === "Unqualified") {
    return {
      action: "Request missing information",
      reason: `Only ${qualification.metCount} of ${qualification.totalCount} qualification criteria are met — gather missing details before investing further follow-up time.`,
    };
  }

  if (!activityRecency.hasActivity) {
    return {
      action: "Call lead",
      reason: "No activity has ever been logged for this lead.",
    };
  }

  const isHighUrgency = HIGH_URGENCY_LABELS.has(priority.priorityLabel);

  if (isHighUrgency && activityRecency.isStale) {
    return {
      action: "Follow up",
      reason: `Priority is ${priority.priorityLabel} and no activity has been logged in the last ${
        activityRecency.daysSinceLastActivity ?? "14+"
      } day(s).`,
    };
  }

  if (isHighUrgency) {
    return {
      action: "Review opportunity",
      reason: `Priority is ${priority.priorityLabel} and this lead has been actioned recently — review for next steps.`,
    };
  }

  if (activityRecency.isStale) {
    return {
      action: "Follow up",
      reason: "No activity has been logged within the last 14 days.",
    };
  }

  return {
    action: "No immediate action",
    reason: "Lead is qualified, recently actioned, and not high priority.",
  };
}
