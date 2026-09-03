import type { CrmPromotionPreparation } from "./crmPromotionPreparation.ts";

export type HumanCrmWriteDecision = "APPROVE_WRITE" | "REJECT_WRITE";

export type CrmWriteAuthorizationStatus =
  | "BLOCKED"
  | "AUTHORIZED_FOR_CONTROLLED_WRITE"
  | "REJECTED_BY_HUMAN";

export type CrmWriteAuthorization = Readonly<{
  status: CrmWriteAuthorizationStatus;
  organisationName: string;
  reviewerReference: string;
  authorizationReference: string;
  decision: HumanCrmWriteDecision;
  opportunityScore: number;
  opportunityClassification: string;
  nextBestAction: string;
  preparationReasons: readonly string[];
  reasons: readonly string[];
  crmWriteAllowed: boolean;
  crmWritePerformed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

export function authorizeCrmWrite(
  preparation: CrmPromotionPreparation,
  decision: HumanCrmWriteDecision,
  reviewerReference: string,
  authorizationReference: string,
): CrmWriteAuthorization {
  const reasons: string[] = [];
  const organisationName = preparation.organisationName.trim();
  const reviewer = reviewerReference.trim();
  const authorization = authorizationReference.trim();

  if (preparation.status !== "PREPARED_FOR_CONTROLLED_WRITE_REVIEW") {
    reasons.push("CRM promotion candidate is not prepared for controlled write review.");
  }

  if (!organisationName) {
    reasons.push("Organisation name is required for CRM write authorisation.");
  }

  if (!preparation.reviewerReference.trim()) {
    reasons.push("Preparation reviewer provenance is required for CRM write authorisation.");
  }

  if (!reviewer) {
    reasons.push("CRM write authoriser provenance is required.");
  }

  if (!authorization) {
    reasons.push("A unique CRM write authorisation reference is required.");
  }

  if (reasons.length > 0) {
    return {
      status: "BLOCKED",
      organisationName,
      reviewerReference: reviewer,
      authorizationReference: authorization,
      decision,
      opportunityScore: preparation.opportunityScore,
      opportunityClassification: preparation.opportunityClassification,
      nextBestAction: preparation.nextBestAction,
      preparationReasons: [...preparation.reasons],
      reasons,
      crmWriteAllowed: false,
      crmWritePerformed: false,
      outreachAllowed: false,
      executionPerformed: false,
    };
  }

  if (decision === "REJECT_WRITE") {
    return {
      status: "REJECTED_BY_HUMAN",
      organisationName,
      reviewerReference: reviewer,
      authorizationReference: authorization,
      decision,
      opportunityScore: preparation.opportunityScore,
      opportunityClassification: preparation.opportunityClassification,
      nextBestAction: preparation.nextBestAction,
      preparationReasons: [...preparation.reasons],
      reasons: ["Human CRM write authoriser rejected the controlled write."],
      crmWriteAllowed: false,
      crmWritePerformed: false,
      outreachAllowed: false,
      executionPerformed: false,
    };
  }

  return {
    status: "AUTHORIZED_FOR_CONTROLLED_WRITE",
    organisationName,
    reviewerReference: reviewer,
    authorizationReference: authorization,
    decision,
    opportunityScore: preparation.opportunityScore,
    opportunityClassification: preparation.opportunityClassification,
    nextBestAction: preparation.nextBestAction,
    preparationReasons: [...preparation.reasons],
    reasons: [
      "Human authoriser approved one controlled CRM write for the prepared candidate.",
      "This record grants write permission only; it does not perform the CRM write, outreach, or provider execution.",
    ],
    crmWriteAllowed: true,
    crmWritePerformed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
