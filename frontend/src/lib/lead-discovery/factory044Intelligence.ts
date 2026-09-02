import { buildPublicWebEvidence, evaluateOpportunityEvidence, type OpportunityEvaluation, type PublicWebEvidence } from "./factory044Discovery.ts";

export type IdentityResolutionState = "CONFIRMED" | "CANDIDATE" | "UNRESOLVED";
export type ComplianceState = "CLEAR" | "REVIEW_REQUIRED" | "BLOCKED";
export type IntelligenceNextBestAction =
  | "HOLD_SUPPRESSED"
  | "HOLD_COMPLIANCE"
  | "REVIEW_COMPLIANCE"
  | "RESEARCH_MORE"
  | "REVIEW_IDENTITY"
  | "REVIEW_OPPORTUNITY"
  | "REVIEW_CONTACT_PATH";

export type FehIntelligenceInput = Readonly<{
  evidence: readonly PublicWebEvidence[];
  identityResolution: IdentityResolutionState;
  complianceState: ComplianceState;
  suppressionMatched: boolean;
  knownCrmRelationship: boolean;
}>;

export type FehIntelligenceDecision = Readonly<{
  opportunity: OpportunityEvaluation;
  identityResolution: IdentityResolutionState;
  complianceState: ComplianceState;
  suppressionMatched: boolean;
  knownCrmRelationship: boolean;
  nextBestAction: IntelligenceNextBestAction;
  promotionStatus: "REVIEW_REQUIRED" | "BLOCKED";
  promotionReasons: readonly string[];
  outreachAllowed: false;
  crmWritePerformed: false;
  executionPerformed: false;
}>;

function failClosedOpportunity(reason: string): OpportunityEvaluation {
  return {
    classification: "INSUFFICIENT_EVIDENCE",
    score: 0,
    reasons: [reason, "Invalid evidence is excluded rather than guessed or repaired."],
    promotionAllowed: false,
  };
}

function evaluateSafely(evidence: readonly PublicWebEvidence[]): OpportunityEvaluation {
  try {
    const validated = evidence.map((item) => buildPublicWebEvidence(item));
    return evaluateOpportunityEvidence(validated);
  } catch {
    return failClosedOpportunity("One or more evidence items failed provenance validation.");
  }
}

export function evaluateFehIntelligence(input: FehIntelligenceInput): FehIntelligenceDecision {
  const opportunity = evaluateSafely(input.evidence);
  const promotionReasons: string[] = [];

  if (input.suppressionMatched) {
    promotionReasons.push("A suppression match is present; progression is blocked.");
  }
  if (input.complianceState === "BLOCKED") {
    promotionReasons.push("Compliance state is blocked.");
  } else if (input.complianceState === "REVIEW_REQUIRED") {
    promotionReasons.push("Compliance review is required before contact-path review.");
  }
  if (input.identityResolution === "UNRESOLVED") {
    promotionReasons.push("Business identity is unresolved.");
  } else if (input.identityResolution === "CANDIDATE") {
    promotionReasons.push("Business identity is only a candidate match and needs review.");
  }
  if (opportunity.classification === "INSUFFICIENT_EVIDENCE") {
    promotionReasons.push("Evidence is insufficient for lead-promotion review.");
  }

  const promotionBlocked =
    input.suppressionMatched ||
    input.complianceState === "BLOCKED" ||
    input.identityResolution === "UNRESOLVED" ||
    opportunity.classification === "INSUFFICIENT_EVIDENCE";

  if (!promotionBlocked) {
    promotionReasons.push("Evidence may be reviewed by a human for CRM promotion; no write is performed here.");
  }

  let nextBestAction: IntelligenceNextBestAction;
  if (input.suppressionMatched) nextBestAction = "HOLD_SUPPRESSED";
  else if (input.complianceState === "BLOCKED") nextBestAction = "HOLD_COMPLIANCE";
  else if (input.complianceState === "REVIEW_REQUIRED") nextBestAction = "REVIEW_COMPLIANCE";
  else if (opportunity.classification === "INSUFFICIENT_EVIDENCE") nextBestAction = "RESEARCH_MORE";
  else if (input.identityResolution !== "CONFIRMED") nextBestAction = "REVIEW_IDENTITY";
  else if (opportunity.classification === "HOT" || opportunity.classification === "WARM") nextBestAction = "REVIEW_CONTACT_PATH";
  else nextBestAction = "REVIEW_OPPORTUNITY";

  return {
    opportunity,
    identityResolution: input.identityResolution,
    complianceState: input.complianceState,
    suppressionMatched: input.suppressionMatched,
    knownCrmRelationship: input.knownCrmRelationship,
    nextBestAction,
    promotionStatus: promotionBlocked ? "BLOCKED" : "REVIEW_REQUIRED",
    promotionReasons,
    outreachAllowed: false,
    crmWritePerformed: false,
    executionPerformed: false,
  };
}
