// Factory 024 Phase 2D: human-visible routing advice only.
//
// This is deliberately NOT a second scoring engine — it composes the
// already-computed, already-tested Factory 023 Phase 2A/2B
// LeadPriorityResult (priorityLabel/confidence/missingData/explanation)
// into a short recommended-next-step label. It recalculates nothing and
// never touches the database: calling this function has no side effect,
// writes nothing, and triggers no automated contact of any kind.

import type { LeadPriorityResult } from "./prioritization";

export type RoutingRecommendation = {
  /** Short, human-readable next step. Advice only — never enacted automatically. */
  recommendation: string;
  /** Why this recommendation was derived, reusing the priority result's own explanation/missing-data wherever possible. */
  reason: string;
};

/**
 * Pure — takes the lead's already-computed priority result and derives the
 * smallest sensible advisory mapping. A "Low" priority driven by missing
 * data is treated differently from a "Low" priority backed by complete
 * data: the former may not reflect genuine low urgency, so it's surfaced
 * as "confirm details" rather than a confident "monitor" verdict.
 */
export function deriveRoutingRecommendation(priority: LeadPriorityResult): RoutingRecommendation {
  switch (priority.priorityLabel) {
    case "Critical":
      return {
        recommendation: "Immediate human follow-up",
        reason: priority.explanation,
      };
    case "High":
      return {
        recommendation: "Priority follow-up this week",
        reason: priority.explanation,
      };
    case "Medium":
      return {
        recommendation: "Standard follow-up",
        reason: priority.explanation,
      };
    case "Low":
    default:
      if (priority.missingData.length > 0) {
        return {
          recommendation: "Confirm missing details before follow-up",
          reason: `Priority scored Low, but ${priority.missingData.length} input${
            priority.missingData.length === 1 ? " is" : "s are"
          } missing (${priority.missingData.join(", ")}) — this may not reflect genuine low urgency.`,
        };
      }
      return {
        recommendation: "Monitor — low urgency",
        reason: priority.explanation,
      };
  }
}
