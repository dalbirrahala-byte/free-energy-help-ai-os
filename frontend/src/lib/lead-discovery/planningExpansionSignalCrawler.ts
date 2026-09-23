import {
  buildIntentRadarSignal,
  type IntentRadarSignal,
  type IntentRadarSignalStrength,
} from "./intentRadar.ts";

export type PlanningDataCrawlPlan = Readonly<{
  provider: "PLANNING_DATA_GOV_UK";
  method: "GET";
  endpoint: string;
  dataset: "planning-application";
  readOnly: true;
  politeRateLimitRequired: true;
  bulkDownloadPreferredForLargeScans: true;
  executionPerformed: false;
}>;

export type PlanningApplicationSourceTier = "LOCAL_AUTHORITY" | "MHCLG_AGGREGATE";
export type PlanningCompanyMatchBasis = "EXACT_APPLICANT_NAME" | "CRM_SITE_ADDRESS" | "NONE";

export type PlanningApplicationCandidate = Readonly<{
  applicationReference: string;
  description: string;
  status: string;
  receivedAt: string;
  sourceUrl: string;
  sourceTier: PlanningApplicationSourceTier;
  applicantName?: string | null;
  siteAddress?: string | null;
  matchBasis: PlanningCompanyMatchBasis;
}>;

export type PlanningCompanyIdentity = Readonly<{
  companyName: string;
  companyNumber?: string | null;
  companyDomain?: string | null;
}>;

type PlanningTrigger = Readonly<{
  signalType: string;
  strength: IntentRadarSignalStrength;
  confidence: number;
}>;

const TERMINAL_NEGATIVE_STATUSES = new Set([
  "appeal-refused",
  "expired",
  "refused",
  "withdrawn",
]);

const STRONG_TERMS = [
  "new factory",
  "new warehouse",
  "new industrial unit",
  "new production facility",
  "manufacturing facility",
  "distribution centre",
  "distribution center",
  "cold store",
  "data centre",
  "data center",
  "production line",
] as const;

const MEDIUM_TERMS = [
  "extension",
  "expansion",
  "industrial",
  "warehouse",
  "manufacturing",
  "plant room",
  "battery storage",
  "solar pv",
  "solar photovoltaic",
] as const;

function clean(value: string | null | undefined, max = 1000): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeInstant(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid_planning_date");
  return parsed.toISOString();
}

function addDays(value: string, days: number): string {
  const parsed = new Date(value);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString();
}

function normalizeOffset(offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("invalid_offset");
  return offset;
}

function classifyDescription(description: string): PlanningTrigger | null {
  const normalized = description.toLowerCase();
  const strongTerm = STRONG_TERMS.find((term) => normalized.includes(term));
  if (strongTerm) {
    return {
      signalType: "PLANNING_EXPANSION_STRONG",
      strength: "STRONG",
      confidence: 90,
    };
  }

  const mediumTerm = MEDIUM_TERMS.find((term) => normalized.includes(term));
  if (mediumTerm) {
    return {
      signalType: "PLANNING_EXPANSION_POSSIBLE",
      strength: "MEDIUM",
      confidence: 72,
    };
  }

  return null;
}

export function planPlanningApplicationCrawl(offset = 0): PlanningDataCrawlPlan {
  const normalizedOffset = normalizeOffset(offset);
  const params = new URLSearchParams({
    dataset: "planning-application",
    limit: "100",
    offset: String(normalizedOffset),
  });

  return {
    provider: "PLANNING_DATA_GOV_UK",
    method: "GET",
    endpoint: `https://www.planning.data.gov.uk/entity.json?${params.toString()}`,
    dataset: "planning-application",
    readOnly: true,
    politeRateLimitRequired: true,
    bulkDownloadPreferredForLargeScans: true,
    executionPerformed: false,
  };
}

export function mapPlanningApplicationToIntentSignal(
  company: PlanningCompanyIdentity,
  application: PlanningApplicationCandidate,
): IntentRadarSignal | null {
  const reference = clean(application.applicationReference, 240);
  const description = clean(application.description, 1500);
  const status = clean(application.status, 120)?.toLowerCase();
  const sourceUrl = clean(application.sourceUrl, 2048);
  if (!reference || !description || !status || !sourceUrl) throw new Error("invalid_planning_record");
  if (TERMINAL_NEGATIVE_STATUSES.has(status)) return null;
  if (application.matchBasis === "NONE") return null;

  const trigger = classifyDescription(description);
  if (!trigger) return null;

  const observedAt = normalizeInstant(application.receivedAt);
  const exactApplicantMatch = application.matchBasis === "EXACT_APPLICANT_NAME";
  const authoritative = application.sourceTier === "LOCAL_AUTHORITY";
  const verifiedFact = exactApplicantMatch && authoritative;

  const adjustedStrength: IntentRadarSignalStrength = verifiedFact ? trigger.strength : "MEDIUM";
  const adjustedConfidence = verifiedFact ? trigger.confidence : Math.min(trigger.confidence, 68);
  const matchSummary = exactApplicantMatch
    ? `applicant matched ${clean(application.applicantName, 200) ?? "company name"}`
    : `site address matched ${clean(application.siteAddress, 300) ?? "CRM site"}`;

  return buildIntentRadarSignal({
    companyName: company.companyName,
    companyNumber: company.companyNumber ?? null,
    companyDomain: company.companyDomain ?? null,
    source: "PLANNING",
    sourceReference: `planning:${reference}`,
    sourceUrl,
    observedAt,
    expiresAt: addDays(observedAt, verifiedFact ? 90 : 45),
    signalFamily: "PROPERTY_DEVELOPMENT",
    signalType: trigger.signalType,
    summary: `Planning application ${reference}: ${description}. Company association: ${matchSummary}.`,
    evidenceBasis: verifiedFact ? "VERIFIED_FACT" : "INFERENCE",
    sourceVerified: verifiedFact,
    confidence: adjustedConfidence,
    strength: adjustedStrength,
    provenance: "PUBLIC_OFFICIAL",
  });
}

export function selectPlanningExpansionSignals(
  company: PlanningCompanyIdentity,
  applications: readonly PlanningApplicationCandidate[],
): readonly IntentRadarSignal[] {
  const signals = applications
    .map((application) => mapPlanningApplicationToIntentSignal(company, application))
    .filter((signal): signal is IntentRadarSignal => signal !== null);

  return [...new Map(signals.map((signal) => [signal.idempotencyKey, signal])).values()]
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}
