export type IntelligenceSource =
  | "PUBLIC_WEB"
  | "CRM_HISTORY"
  | "WEBSITE"
  | "HEALTH_CHECK"
  | "APOLLO"
  | "LINKEDIN"
  | "META"
  | "WHATSAPP";

export type IdentityState = "CONFIRMED" | "CANDIDATE" | "UNRESOLVED";
export type ComplianceState = "CLEAR" | "REVIEW_REQUIRED" | "BLOCKED";
export type PriorityBand = "HIGH" | "MEDIUM" | "LOW" | "HOLD";

export interface IntelligenceEvidence {
  source: IntelligenceSource;
  sourceReference: string;
  organisationKey: string;
  signalFamily: string;
  confidence: number;
  observedAt: string;
  summary: string;
}

export interface IntelligenceIntake {
  organisationKey: string;
  identityState: IdentityState;
  complianceState: ComplianceState;
  suppressionMatched: boolean;
  evidence: IntelligenceEvidence[];
}

export interface OpportunityProfile {
  organisationKey: string;
  evidence: IntelligenceEvidence[];
  sourceCount: number;
  signalFamilyCount: number;
  score: number;
  priority: PriorityBand;
  reasons: string[];
  nextBestAction:
    | "RESEARCH_MORE"
    | "REVIEW_IDENTITY"
    | "REVIEW_COMPLIANCE"
    | "HOLD_SUPPRESSED"
    | "HOLD_COMPLIANCE"
    | "REVIEW_OPPORTUNITY"
    | "REVIEW_CONTACT_PATH";
  promotionStatus: "BLOCKED" | "REVIEW_REQUIRED";
  outreachAllowed: false;
  crmWritePerformed: false;
  executionPerformed: false;
}

const normalise = (value: string) => value.trim().toLowerCase();

export function deduplicateEvidence(
  evidence: IntelligenceEvidence[],
): IntelligenceEvidence[] {
  const unique = new Map<string, IntelligenceEvidence>();

  for (const item of evidence) {
    if (
      !item.organisationKey.trim() ||
      !item.sourceReference.trim() ||
      !item.signalFamily.trim() ||
      !item.summary.trim() ||
      !Number.isFinite(item.confidence) ||
      item.confidence < 0 ||
      item.confidence > 1 ||
      Number.isNaN(Date.parse(item.observedAt))
    ) {
      continue;
    }

    const key = [
      item.source,
      normalise(item.sourceReference),
      normalise(item.signalFamily),
      normalise(item.organisationKey),
    ].join("|");

    const existing = unique.get(key);
    if (!existing || item.confidence > existing.confidence) unique.set(key, item);
  }

  return [...unique.values()].sort((a, b) =>
    `${a.source}|${a.sourceReference}|${a.signalFamily}`.localeCompare(
      `${b.source}|${b.sourceReference}|${b.signalFamily}`,
    ),
  );
}

export function buildOpportunityProfile(
  intake: IntelligenceIntake,
): OpportunityProfile {
  const evidence = deduplicateEvidence(intake.evidence).filter(
    (item) => normalise(item.organisationKey) === normalise(intake.organisationKey),
  );
  const sourceCount = new Set(evidence.map((item) => item.source)).size;
  const signalFamilyCount = new Set(evidence.map((item) => item.signalFamily)).size;
  const confidenceScore = evidence.reduce(
    (sum, item) => sum + Math.round(item.confidence * 20),
    0,
  );
  const diversityBonus = Math.min(sourceCount * 8, 24) + Math.min(signalFamilyCount * 6, 18);
  const score = Math.min(100, confidenceScore + diversityBonus);
  const reasons = [
    `${evidence.length} unique evidence item(s) retained.`,
    `${sourceCount} source type(s) represented.`,
    `${signalFamilyCount} signal family/families represented.`,
  ];

  const base = {
    organisationKey: intake.organisationKey,
    evidence,
    sourceCount,
    signalFamilyCount,
    score,
    reasons,
    outreachAllowed: false as const,
    crmWritePerformed: false as const,
    executionPerformed: false as const,
  };

  if (intake.suppressionMatched) {
    return { ...base, priority: "HOLD", nextBestAction: "HOLD_SUPPRESSED", promotionStatus: "BLOCKED" };
  }
  if (intake.complianceState === "BLOCKED") {
    return { ...base, priority: "HOLD", nextBestAction: "HOLD_COMPLIANCE", promotionStatus: "BLOCKED" };
  }
  if (intake.identityState === "UNRESOLVED") {
    return { ...base, priority: "LOW", nextBestAction: "RESEARCH_MORE", promotionStatus: "BLOCKED" };
  }
  if (intake.identityState === "CANDIDATE") {
    return { ...base, priority: "LOW", nextBestAction: "REVIEW_IDENTITY", promotionStatus: "BLOCKED" };
  }
  if (intake.complianceState === "REVIEW_REQUIRED") {
    return { ...base, priority: "LOW", nextBestAction: "REVIEW_COMPLIANCE", promotionStatus: "BLOCKED" };
  }
  if (evidence.length === 0 || score < 35) {
    return { ...base, priority: "LOW", nextBestAction: "RESEARCH_MORE", promotionStatus: "BLOCKED" };
  }
  if (score >= 70 && sourceCount >= 2) {
    return { ...base, priority: "HIGH", nextBestAction: "REVIEW_CONTACT_PATH", promotionStatus: "REVIEW_REQUIRED" };
  }
  return { ...base, priority: "MEDIUM", nextBestAction: "REVIEW_OPPORTUNITY", promotionStatus: "REVIEW_REQUIRED" };
}

export function buildPriorityQueue(
  intakes: IntelligenceIntake[],
): OpportunityProfile[] {
  const rank: Record<PriorityBand, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, HOLD: 3 };
  return intakes
    .map(buildOpportunityProfile)
    .sort((a, b) => rank[a.priority] - rank[b.priority] || b.score - a.score || a.organisationKey.localeCompare(b.organisationKey));
}
