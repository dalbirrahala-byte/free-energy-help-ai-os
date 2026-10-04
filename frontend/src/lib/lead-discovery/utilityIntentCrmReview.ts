import { assessUtilityIntentResearch } from "./utilityIntentRadar.ts";

export type UtilityIntentCrmReviewStatus = "BLOCKED" | "READY_FOR_HUMAN_REVIEW";

export type UtilityIntentCrmReviewProjection = Readonly<{
  status: UtilityIntentCrmReviewStatus;
  organisationName: string;
  claimedCompanyNumber: string | null;
  claimedCompanyDomain: string | null;
  signalFamily: string;
  signalType: string;
  intentKind: string;
  sourceAdapter: string;
  sourceTier: string;
  sourceUrl: string;
  sourceReference: string;
  provenance: string;
  exactEvidence: string;
  observedAt: string;
  publishedAt: string | null;
  eventAt: string | null;
  expiresAt: string | null;
  sourceConfidenceClaim: number;
  evidenceBasis: "INFERENCE";
  contactability: "AMBER" | "RED";
  identityStatus: "UNVERIFIED";
  evidenceBindingStatus: "UNVERIFIED";
  duplicateDetected: boolean;
  complianceStatus: "BLOCKED" | "REVIEW_REQUIRED";
  reviewStatus: "BLOCKED" | "READY_FOR_HUMAN_REVIEW";
  nextAction: string;
  sourceRecordKey: string;
  deduplicationKeys: readonly string[];
  reasons: readonly string[];
  crmWriteAllowed: false;
  crmWritePerformed: false;
  apolloEnrichmentAllowed: false;
  creditsSpendAllowed: false;
  sequenceEnrollmentAllowed: false;
  outreachAllowed: false;
  executionPerformed: false;
}>;

function immutableStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

export function buildUtilityIntentCrmReviewProjection(
  researchInput: unknown,
  reviewInstant: string,
  priorResearchKeys: readonly string[] = [],
  priorCrmReviewKeys: readonly string[] = [],
): UtilityIntentCrmReviewProjection | null {
  const assessment = assessUtilityIntentResearch(researchInput, reviewInstant, priorResearchKeys);
  if (assessment.status === "EXCLUDED") return null;

  const duplicateDetected =
    assessment.scores.duplication_penalty === 100 ||
    assessment.deduplicationKeys.some((key) => priorCrmReviewKeys.includes(key));
  const expired =
    assessment.signal.expiresAt !== null &&
    Date.parse(assessment.signal.expiresAt) <= Date.parse(assessment.asOf);
  const complianceBlocked = assessment.contactability === "RED";

  const reasons: string[] = [];
  if (duplicateDetected) reasons.push("Duplicate evidence is already represented in research or the CRM review queue.");
  if (expired) reasons.push("Signal is expired and must be revalidated before further review.");
  if (complianceBlocked) reasons.push("Compliance/contactability state is RED; no enrichment or outreach review may proceed.");
  reasons.push("Identity, source-to-company binding, contact route, and contact basis remain unverified until human review.");

  const blocked = duplicateDetected || expired || complianceBlocked;
  const nextAction = duplicateDetected
    ? "Review the existing research/CRM review record; do not create a duplicate."
    : expired
      ? "Revalidate the source and create a fresh evidence record only if the signal is still current."
      : complianceBlocked
        ? "Resolve the compliance/suppression issue; do not enrich or contact."
        : "Human review: verify company identity, bind the source claim to the business, review contact route and suppression, then decide whether a separate Apollo-enrichment review is justified.";

  return Object.freeze({
    status: blocked ? "BLOCKED" : "READY_FOR_HUMAN_REVIEW",
    organisationName: assessment.signal.companyName,
    claimedCompanyNumber: assessment.signal.companyNumber,
    claimedCompanyDomain: assessment.signal.companyDomain,
    signalFamily: assessment.signal.signalFamily,
    signalType: assessment.signal.signalType,
    intentKind: assessment.interpretation.kind,
    sourceAdapter: assessment.adapter,
    sourceTier: assessment.sourceTier,
    sourceUrl: assessment.sourceUrl,
    sourceReference: assessment.signal.sourceReference,
    provenance: assessment.signal.provenance,
    exactEvidence: assessment.exactEvidence,
    observedAt: assessment.signal.observedAt,
    publishedAt: assessment.publishedAt,
    eventAt: assessment.eventAt,
    expiresAt: assessment.signal.expiresAt,
    sourceConfidenceClaim: assessment.signal.confidence,
    evidenceBasis: "INFERENCE",
    contactability: assessment.contactability,
    identityStatus: "UNVERIFIED",
    evidenceBindingStatus: "UNVERIFIED",
    duplicateDetected,
    complianceStatus: complianceBlocked ? "BLOCKED" : "REVIEW_REQUIRED",
    reviewStatus: blocked ? "BLOCKED" : "READY_FOR_HUMAN_REVIEW",
    nextAction,
    sourceRecordKey: assessment.sourceRecordKey,
    deduplicationKeys: immutableStrings(assessment.deduplicationKeys),
    reasons: immutableStrings(reasons),
    crmWriteAllowed: false,
    crmWritePerformed: false,
    apolloEnrichmentAllowed: false,
    creditsSpendAllowed: false,
    sequenceEnrollmentAllowed: false,
    outreachAllowed: false,
    executionPerformed: false,
  });
}
