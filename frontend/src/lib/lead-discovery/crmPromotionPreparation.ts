import type { CrmPromotionReview } from "./crmPromotionBoundary.ts";
import type { CrmPromotionDecisionRecord } from "./crmPromotionDecision.ts";

export type CrmPromotionPreparationStatus =
  | "BLOCKED"
  | "PREPARED_FOR_CONTROLLED_WRITE_REVIEW";

export type CrmPromotionPreparation = Readonly<{
  status: CrmPromotionPreparationStatus;
  organisationName: string;
  reviewerReference: string;
  opportunityScore: number;
  opportunityClassification: string;
  nextBestAction: string;
  reviewReasons: readonly string[];
  decisionReasons: readonly string[];
  reasons: readonly string[];
  crmWriteReviewRequired: true;
  crmWriteAllowed: false;
  crmWritePerformed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

export function prepareCrmPromotionCandidate(
  review: CrmPromotionReview,
  decision: CrmPromotionDecisionRecord,
): CrmPromotionPreparation {
  const reasons: string[] = [];
  const organisationName = review.organisationName.trim();
  const reviewerReference = decision.reviewerReference.trim();

  if (review.status !== "READY_FOR_HUMAN_REVIEW") {
    reasons.push("CRM promotion review is not ready for preparation.");
  }

  if (decision.status !== "APPROVED_FOR_PREPARATION") {
    reasons.push("Human CRM promotion decision has not approved preparation.");
  }

  if (!organisationName) {
    reasons.push("Organisation name is required for CRM promotion preparation.");
  }

  if (decision.organisationName.trim() !== organisationName) {
    reasons.push("Review and decision organisation identity must match.");
  }

  if (!reviewerReference) {
    reasons.push("Reviewer provenance is required for CRM promotion preparation.");
  }

  if (reasons.length > 0) {
    return {
      status: "BLOCKED",
      organisationName,
      reviewerReference,
      opportunityScore: review.opportunityScore,
      opportunityClassification: review.opportunityClassification,
      nextBestAction: review.nextBestAction,
      reviewReasons: [...review.reasons],
      decisionReasons: [...decision.reasons],
      reasons,
      crmWriteReviewRequired: true,
      crmWriteAllowed: false,
      crmWritePerformed: false,
      outreachAllowed: false,
      executionPerformed: false,
    };
  }

  return {
    status: "PREPARED_FOR_CONTROLLED_WRITE_REVIEW",
    organisationName,
    reviewerReference,
    opportunityScore: review.opportunityScore,
    opportunityClassification: review.opportunityClassification,
    nextBestAction: review.nextBestAction,
    reviewReasons: [...review.reasons],
    decisionReasons: [...decision.reasons],
    reasons: [
      "Human-approved candidate has been prepared for a separate controlled CRM write review.",
      "Preparation does not authorise or perform a CRM database write, outreach, or provider execution.",
    ],
    crmWriteReviewRequired: true,
    crmWriteAllowed: false,
    crmWritePerformed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
