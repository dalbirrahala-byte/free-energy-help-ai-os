// Factory 031: Action Eligibility / Authorization Audit boundary.
//
// Pure — no I/O, no AI, no new scoring or classification. Composes exactly
// two already-existing, already-tested gates: leadQualityClassification.ts's
// Reject rule and isMarketingEligible() consent check. Nothing here decides
// WHAT to do (that remains leadActionRecommendation.ts's job) — only
// whether the existing, human-controlled task-creation workflow may
// proceed for a given lead/action pair.
//
// Scope boundary (explicit, per the approved Factory 031 design):
// "eligible: true" means only "the existing manual workflow may proceed."
// It never means a customer was contacted, a message was sent, a call was
// placed, or any external provider was invoked — none of that exists in
// this codebase yet, and this module must not imply otherwise.

import { isMarketingEligible, type LeadQualityClassification } from "./leadQualityClassification.ts";
import type { LeadActionRecommendationLabel } from "./leadActionRecommendation.ts";
import type { CanonicalLead } from "../shared/domain";

export type ActionEligibilityBasis =
  | "rejected"
  | "marketing-consent-missing"
  | "direct-response-allowed"
  | "marketing-allowed";

export type ActionEligibilityResult = {
  leadId: number;
  action: LeadActionRecommendationLabel;
  eligible: boolean;
  reason: string;
  basis: ActionEligibilityBasis;
  /** True for recommendations this module treats as outbound/marketing-style contact, which therefore require isMarketingEligible() rather than only Reject protection. */
  isMarketingAction: boolean;
};

/**
 * Recommendation labels classified as marketing/outbound-style contact for
 * eligibility purposes, versus direct-response/operational actions taken
 * in response to an already-qualifying enquiry. This is a first-pass
 * eligibility-gate classification, not a legal determination — final
 * compliance classification (PECR/UK GDPR) remains a business decision.
 * "Nurture — follow-up later" is the one label in this codebase's
 * vocabulary that describes a later, lower-urgency, campaign-style touch
 * rather than a direct response to something already in motion, so it is
 * the only one gated by marketing consent.
 */
const MARKETING_ACTIONS = new Set<LeadActionRecommendationLabel>(["Nurture — follow-up later"]);

export function isMarketingAction(action: LeadActionRecommendationLabel): boolean {
  return MARKETING_ACTIONS.has(action);
}

/**
 * `classification` should be the lead's current, already-persisted Factory
 * 027 classification — this function never recomputes it. Deterministic:
 * identical input always produces identical output.
 */
export function evaluateActionEligibility(
  lead: Pick<CanonicalLead, "id" | "consent_given">,
  classification: LeadQualityClassification,
  action: LeadActionRecommendationLabel,
): ActionEligibilityResult {
  const marketing = isMarketingAction(action);

  if (classification === "Reject") {
    return {
      leadId: lead.id,
      action,
      eligible: false,
      reason: "Lead is classified Reject — no sales action, marketing or otherwise, may proceed for this lead.",
      basis: "rejected",
      isMarketingAction: marketing,
    };
  }

  if (marketing && !isMarketingEligible(lead, classification)) {
    return {
      leadId: lead.id,
      action,
      eligible: false,
      reason:
        lead.consent_given === true
          ? "Marketing eligibility check failed despite consent on file — classification does not permit marketing contact."
          : "No marketing consent on file for this lead — this action must not proceed as outbound marketing contact.",
      basis: "marketing-consent-missing",
      isMarketingAction: marketing,
    };
  }

  if (marketing) {
    return {
      leadId: lead.id,
      action,
      eligible: true,
      reason: "Marketing consent is on file and the lead is not Rejected — this outbound action may proceed through the existing manual workflow.",
      basis: "marketing-allowed",
      isMarketingAction: marketing,
    };
  }

  return {
    leadId: lead.id,
    action,
    eligible: true,
    reason: "Direct-response/operational action on a non-Rejected lead — this does not require marketing consent and may proceed through the existing manual workflow.",
    basis: "direct-response-allowed",
    isMarketingAction: marketing,
  };
}
