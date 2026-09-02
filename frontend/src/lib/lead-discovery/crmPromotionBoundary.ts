import type { FehIntelligenceDecision } from "./factory044Intelligence.ts";

export type CrmPromotionReviewStatus =
  | "BLOCKED"
  | "READY_FOR_HUMAN_REVIEW";

export type CrmPromotionReview = Readonly<{
  status: CrmPromotionReviewStatus;
  organisationName: string;
  opportunityScore: number;
  opportunityClassification: string;
  nextBestAction: string;
  reasons: readonly string[];
  humanApprovalRequired: true;
  crmWriteAllowed: false;
  crmWritePerformed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

export function evaluateCrmPromotionReview(
  organisationName: string,
  decision: FehIntelligenceDecision,
): CrmPromotionReview {
  const reasons: string[] = [];

  if (!organisationName.trim()) {
    reasons.push("Organisation name is required.");
  }

  if (decision.suppressionMatched) {
    reasons.push("Suppression match blocks CRM promotion.");
  }

  if (decision.identityResolution !== "CONFIRMED") {
    reasons.push("Business identity must be confirmed.");
  }

  if (decision.complianceState !== "CLEAR") {
    reasons.push("Compliance must be clear before CRM promotion review.");
  }

  if (decision.promotionStatus !== "REVIEW_REQUIRED") {
    reasons.push("Intelligence decision is not eligible for promotion review.");
  }

  if (decision.opportunity.classification === "INSUFFICIENT_EVIDENCE") {
    reasons.push("Evidence is insufficient for CRM promotion review.");
  }

  const blocked = reasons.length > 0;

  if (!blocked) {
    reasons.push(
      "Candidate may be presented to a human for CRM promotion review; no CRM write is authorised.",
    );
  }

  return {
    status: blocked ? "BLOCKED" : "READY_FOR_HUMAN_REVIEW",
    organisationName: organisationName.trim(),
    opportunityScore: decision.opportunity.score,
    opportunityClassification: decision.opportunity.classification,
    nextBestAction: decision.nextBestAction,
    reasons,
    humanApprovalRequired: true,
    crmWriteAllowed: false,
    crmWritePerformed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
