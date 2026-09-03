import type { CrmWriteAuthorization } from "./crmWriteAuthorization.ts";

export type CrmWriteExecutionPreparationStatus =
  | "BLOCKED"
  | "PREPARED_FOR_CONTROLLED_EXECUTION";

export type CrmWriteExecutionPreparation = Readonly<{
  status: CrmWriteExecutionPreparationStatus;
  organisationName: string;
  reviewerReference: string;
  authorizationReference: string;
  idempotencyKey: string;
  opportunityScore: number;
  opportunityClassification: string;
  nextBestAction: string;
  authorizationReasons: readonly string[];
  reasons: readonly string[];
  crmWriteExecutionReviewRequired: true;
  crmWriteAllowed: boolean;
  crmWritePerformed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

export function prepareControlledCrmWriteExecution(
  authorization: CrmWriteAuthorization,
  idempotencyKey: string,
): CrmWriteExecutionPreparation {
  const reasons: string[] = [];
  const organisationName = authorization.organisationName.trim();
  const reviewerReference = authorization.reviewerReference.trim();
  const authorizationReference = authorization.authorizationReference.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();

  if (authorization.status !== "AUTHORIZED_FOR_CONTROLLED_WRITE") {
    reasons.push("CRM write is not authorised for controlled execution preparation.");
  }

  if (!authorization.crmWriteAllowed) {
    reasons.push("CRM write permission must be explicitly granted before execution preparation.");
  }

  if (!organisationName) {
    reasons.push("Organisation name is required for CRM write execution preparation.");
  }

  if (!reviewerReference) {
    reasons.push("CRM write authoriser provenance is required for execution preparation.");
  }

  if (!authorizationReference) {
    reasons.push("CRM write authorisation reference is required for execution preparation.");
  }

  if (!normalizedIdempotencyKey) {
    reasons.push("A CRM write idempotency key is required for execution preparation.");
  }

  if (reasons.length > 0) {
    return {
      status: "BLOCKED",
      organisationName,
      reviewerReference,
      authorizationReference,
      idempotencyKey: normalizedIdempotencyKey,
      opportunityScore: authorization.opportunityScore,
      opportunityClassification: authorization.opportunityClassification,
      nextBestAction: authorization.nextBestAction,
      authorizationReasons: [...authorization.reasons],
      reasons,
      crmWriteExecutionReviewRequired: true,
      crmWriteAllowed: false,
      crmWritePerformed: false,
      outreachAllowed: false,
      executionPerformed: false,
    };
  }

  return {
    status: "PREPARED_FOR_CONTROLLED_EXECUTION",
    organisationName,
    reviewerReference,
    authorizationReference,
    idempotencyKey: normalizedIdempotencyKey,
    opportunityScore: authorization.opportunityScore,
    opportunityClassification: authorization.opportunityClassification,
    nextBestAction: authorization.nextBestAction,
    authorizationReasons: [...authorization.reasons],
    reasons: [
      "Authorised CRM write has been prepared for a separate controlled execution review.",
      "The idempotency key and authorisation provenance are carried forward for downstream duplicate-write protection and audit.",
      "Preparation does not perform the CRM database write, outreach, or provider execution.",
    ],
    crmWriteExecutionReviewRequired: true,
    crmWriteAllowed: true,
    crmWritePerformed: false,
    outreachAllowed: false,
    executionPerformed: false,
  };
}
