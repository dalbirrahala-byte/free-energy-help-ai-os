// Factory 029: deterministic "Recommended Action" — a business-specific
// operational refinement layered ON TOP OF the already-computed Factory
// 023-028 intelligence. This is deliberately additive, not a replacement:
// nextAction.ts's coarse "Next Action" badge (Call lead / Request missing
// information / Follow up / Review opportunity / No immediate action) is
// unchanged and still shown wherever it already is. "Recommended Action" is
// a separate, more specific label a rep sees alongside it, answering "what
// exact next step" rather than nextAction's "is this urgent."
//
// Pure — no I/O, no AI, no fabricated data. Every branch composes fields
// that some other already-tested module already computed
// (leadQualityClassification.ts, qualification.ts, prioritization.ts,
// nextAction.ts) or reads directly off the lead (`status`) — no new scoring
// formula, no new persisted state, nothing enacted automatically.
//
// Honesty rule: a recommendation describes what should happen next, never
// what has already happened. "Request energy bill" means "no supplier is on
// file, ask for one" — it never implies a bill was already requested or
// received, because this codebase has no field that records that. If that
// tracking is ever wanted, it needs its own migration and its own factory;
// this module must not quietly pretend the data exists.

import type { CanonicalLead } from "../shared/domain";
import type { LeadQualityResult } from "./leadQualityClassification.ts";
import type { LeadQualificationResult } from "./qualification.ts";
import type { LeadPriorityResult } from "./prioritization.ts";
import type { NextActionResult } from "./nextAction.ts";

export type LeadActionRecommendationLabel =
  | "Call now — priority contact"
  | "Renewal follow-up"
  | "Request LOA"
  | "Request energy bill"
  | "Verify contract/end-date information"
  | "Manual review"
  | "Nurture — follow-up later"
  | "Hold — no action"
  | "Rejected — no sales action";

export type LeadActionRecommendation = {
  leadId: number;
  action: LeadActionRecommendationLabel;
  reason: string;
};

/** Mirrors nextAction.ts's own closed-pipeline-status gate (Won/Lost) — checked inline rather than imported so nextAction.ts stays completely untouched. */
const CLOSED_STATUSES = new Set(["Won", "Lost"]);

/** Pipeline stages far enough along that a signed Letter of Authority, not a generic call, is the concrete next step. */
const LOA_ELIGIBLE_STATUSES = new Set(["Quote Sent", "Negotiation"]);

/** Same 0-100 urgency scale prioritization.ts's URGENCY_SCORES already uses (Approaching=40 and above counts as near-term). */
const RENEWAL_FOLLOW_UP_URGENCY_THRESHOLD = 40;

/** Only returns a detail for an UNMET criterion — a met criterion's `.detail` is a truthy "present" sentence, not a gap to act on. */
function findUnmetCriterionDetail(qualification: Pick<LeadQualificationResult, "criteria">, criterionName: string): string | null {
  const criterion = qualification.criteria.find((c) => c.criterion === criterionName);
  return criterion && !criterion.met ? criterion.detail : null;
}

function renewalUrgencyValue(priority: Pick<LeadPriorityResult, "contributingFactors">): number {
  return priority.contributingFactors.find((factor) => factor.factor === "Renewal urgency")?.value ?? 0;
}

/**
 * `lead` only needs `id`/`status` — every other signal comes from the
 * caller's already-computed results, the same "recompute nothing, compose
 * everything" contract leadQualityClassification.ts and leadRevenueView.ts
 * already use. Deterministic: identical input always produces identical
 * output.
 */
export function deriveLeadActionRecommendation(
  lead: Pick<CanonicalLead, "id" | "status">,
  quality: Pick<LeadQualityResult, "classification" | "rejectReason">,
  qualification: Pick<LeadQualificationResult, "readinessLabel" | "criteria" | "explanation">,
  priority: Pick<LeadPriorityResult, "contributingFactors" | "explanation">,
  nextAction: Pick<NextActionResult, "action" | "reason">,
): LeadActionRecommendation {
  const leadId = lead.id;

  // Rule 1: Reject is always terminal and never gets an actionable sales
  // recommendation — mirrors leadQualityClassification.ts's own "advisory
  // only, never actioned" contract for Reject.
  if (quality.classification === "Reject") {
    return {
      leadId,
      action: "Rejected — no sales action",
      reason: quality.rejectReason ?? "This lead was classified Reject and is not suitable for sales follow-up.",
    };
  }

  // Rule 2: a closed pipeline status overrides everything else — a Won/Lost
  // lead is never a candidate for "Call now" or "Request LOA" regardless of
  // how it happens to classify.
  if (lead.status && CLOSED_STATUSES.has(lead.status)) {
    return {
      leadId,
      action: "Hold — no action",
      reason: nextAction.reason,
    };
  }

  // Rule 3: incomplete core data — recommend the specific document/detail
  // that would close the gap, sourced directly from qualification.ts's own
  // criterion detail text, not a generic message.
  if (qualification.readinessLabel === "Not Ready") {
    const missingRenewalTiming = findUnmetCriterionDetail(qualification, "Renewal timing known");
    if (missingRenewalTiming) {
      return {
        leadId,
        action: "Verify contract/end-date information",
        reason: `${missingRenewalTiming} Confirm the contract end date before this lead can be prioritised accurately.`,
      };
    }

    const missingEnergyRequirement = findUnmetCriterionDetail(qualification, "Energy requirement present");
    if (missingEnergyRequirement) {
      return {
        leadId,
        action: "Request energy bill",
        reason: `${missingEnergyRequirement} Request a recent energy bill to capture the current supplier and consumption.`,
      };
    }

    return {
      leadId,
      action: "Manual review",
      reason: `${qualification.explanation} Review manually before deciding the next sales step.`,
    };
  }

  // Rule 4: the deal has already progressed far enough that a signed Letter
  // of Authority — not a generic call — is the concrete next step.
  if (
    lead.status &&
    LOA_ELIGIBLE_STATUSES.has(lead.status) &&
    (quality.classification === "Hot" || quality.classification === "Warm")
  ) {
    return {
      leadId,
      action: "Request LOA",
      reason: `Lead status is "${lead.status}" and quality is ${quality.classification} — request a signed Letter of Authority to proceed.`,
    };
  }

  // Rule 5: Hot is only reachable with complete-enough data (Rule 3 already
  // intercepts any urgent-but-data-poor lead as Warm, matching
  // leadQualityClassification.ts's own Hot-vs-Warm split) — safe to
  // recommend direct contact.
  if (quality.classification === "Hot") {
    return {
      leadId,
      action: "Call now — priority contact",
      reason: nextAction.action === "Call lead" ? `${priority.explanation} ${nextAction.reason}` : priority.explanation,
    };
  }

  // Rule 6: Warm splits on whether renewal timing is genuinely near-term —
  // reuses the same urgency value prioritization.ts already computed rather
  // than re-deriving urgency from the contract date a second time.
  if (quality.classification === "Warm") {
    if (renewalUrgencyValue(priority) >= RENEWAL_FOLLOW_UP_URGENCY_THRESHOLD) {
      const renewalFactor = priority.contributingFactors.find((factor) => factor.factor === "Renewal urgency");
      return {
        leadId,
        action: "Renewal follow-up",
        reason: renewalFactor?.explanation ?? priority.explanation,
      };
    }

    return {
      leadId,
      action: "Nurture — follow-up later",
      reason: priority.explanation,
    };
  }

  // Rule 7: Nurture (Low priority, sufficiently complete data).
  if (quality.classification === "Nurture") {
    return {
      leadId,
      action: "Nurture — follow-up later",
      reason: priority.explanation,
    };
  }

  // Defensive fallback — every classification value is handled above, so
  // this should be unreachable, but must never throw.
  return {
    leadId,
    action: "Hold — no action",
    reason: "No specific recommendation criteria were matched for this lead.",
  };
}
