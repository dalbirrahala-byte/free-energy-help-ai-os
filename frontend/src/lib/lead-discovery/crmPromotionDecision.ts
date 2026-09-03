import type { CrmPromotionReview } from "./crmPromotionBoundary.ts";

export type HumanCrmPromotionDecision =
  | "APPROVE"
  | "REJECT";

export type CrmPromotionDecisionRecord = Readonly<{
  status:
    | "BLOCKED"
    | "APPROVED_FOR_PREPARATION"
    | "REJECTED_BY_HUMAN";
  organisationName: string;
  decision: HumanCrmPromotionDecision | null;
  reviewerReference: string;
  reasons: readonly string[];
  crmPreparationAllowed: boolean;
  crmWriteAllowed: false;
  crmWritePerformed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

export function recordHumanCrmPromotionDecision(
  review: CrmPromotionReview,
  decision: HumanCrmPromotionDecision,
  reviewerReference: string,
): CrmPromotionDecisionRecord {
  const reviewer = reviewerReference.trim();
  const reasons: string[] = [];

  if (review.status !== "READY_FOR_HUMAN_REVIEW") {
    reasons.push("Candidate is not ready for human CRM promotion approval.");
  }

  if (!reviewer) {
    reasons.push("Reviewer reference is required.");
  }

  if (reasons.length > 0) {
    return {
      status: "BLOCKED",
      organisationName: review.organisationName,
      decision: null,
      reviewerReference: reviewer,
      reasons,
      crmPreparationAllowed: false,
      crmWriteAllowed: false,
      crmWritePerformed: false,
      outreachAllowed: false,
      executionPerformed: false,
    };
  }

  if (decision === "REJECT") {
    return {
      status: "REJECTED_BY_HUMAN",
      organisationName: review.organisationName,
      decision,
      reviewerReference: reviewer,
      reasons: ["Human reviewer rejected CRM promotion."],
      crmPreparationAllowed: false,
      crmWriteAllowed: false,
      crmWritePerformed: false,
      outreachAllowed: false,
      executionPerformed: false,
    };
  }

  return {
    status: "APPROVED_FOR_PREPARATION",
    organisationName: review.organisationName,
    decision,
    reviewerReference: reviewer,
    reasons: [
      "Human reviewer approved preparation of a CRM promotion candidate.",
      "Approval does not authorise a CRM database write or outreach.",
    ],
    crmPreparationAllowed: true,
    crmWriteAllowed: false,
    crmWritePerformed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
