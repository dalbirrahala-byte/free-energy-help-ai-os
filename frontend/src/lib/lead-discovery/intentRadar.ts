import type { Factory044SignalFamily } from "./factory044Discovery.ts";

export const INTENT_RADAR_SOURCES = [
  "COMPANIES_HOUSE",
  "PLANNING",
  "BICS_MANUFACTURING",
  "WEBSITE_IDENTIFICATION",
  "INTRODUCER",
  "TENDER_CONTRACT",
  "ONLINE_DIRECT",
  "SOCIAL_PUBLIC",
  "APOLLO_ENRICHMENT",
] as const;

export type IntentRadarSource = (typeof INTENT_RADAR_SOURCES)[number];

export const INTENT_RADAR_PROVENANCE = [
  "PUBLIC_OFFICIAL",
  "PUBLIC_WEB",
  "FIRST_PARTY",
  "INTRODUCER",
  "PROVIDER_ENRICHMENT",
] as const;

export type IntentRadarProvenance = (typeof INTENT_RADAR_PROVENANCE)[number];
export type IntentRadarEvidenceBasis = "VERIFIED_FACT" | "INFERENCE";
export type IntentRadarSignalStrength = "STRONG" | "MEDIUM" | "WEAK";

export type IntentRadarSignalInput = Readonly<{
  companyName: string;
  companyNumber?: string | null;
  companyDomain?: string | null;
  source: IntentRadarSource;
  sourceReference: string;
  sourceUrl?: string | null;
  observedAt: string;
  expiresAt?: string | null;
  signalFamily: Factory044SignalFamily;
  signalType: string;
  summary: string;
  evidenceBasis: IntentRadarEvidenceBasis;
  sourceVerified: boolean;
  confidence: number;
  strength: IntentRadarSignalStrength;
  provenance: IntentRadarProvenance;
}>;

export type IntentRadarSignal = Readonly<IntentRadarSignalInput & {
  companyName: string;
  companyNumber: string | null;
  companyDomain: string | null;
  sourceReference: string;
  sourceUrl: string | null;
  observedAt: string;
  expiresAt: string | null;
  signalType: string;
  summary: string;
  idempotencyKey: string;
}>;

export type IntentRadarSignalAssessment = Readonly<{
  status: "STRONG_VERIFIED_SIGNAL" | "REVIEW_ONLY";
  strongVerifiedTrigger: boolean;
  companyIdentityReady: boolean;
  apolloEnrichmentAllowed: boolean;
  crmWriteAllowed: false;
  outreachAllowed: false;
  reasons: readonly string[];
}>;

export type IntentRadarSnapshot = Readonly<{
  companyName: string;
  companyNumber: string | null;
  companyDomain: string | null;
  totalSignals: number;
  verifiedFacts: number;
  inferences: number;
  strongVerifiedSignals: number;
  apolloEnrichmentAllowed: boolean;
  crmWriteAllowed: false;
  outreachAllowed: false;
  promotionAllowed: false;
  signals: readonly IntentRadarSignal[];
}>;

const APOLLO_TRIGGER_SOURCES: ReadonlySet<IntentRadarSource> = new Set([
  "COMPANIES_HOUSE",
  "PLANNING",
  "INTRODUCER",
  "TENDER_CONTRACT",
  "ONLINE_DIRECT",
]);

function cleanText(value: string | null | undefined, maxLength = 240): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanCompanyNumber(value: string | null | undefined): string | null {
  const cleaned = cleanText(value, 16)?.replace(/\s+/g, "").toUpperCase() ?? null;
  if (!cleaned) return null;
  if (!/^[A-Z0-9]{6,10}$/.test(cleaned)) throw new Error("invalid_company_number");
  return cleaned;
}

function cleanDomain(value: string | null | undefined): string | null {
  const cleaned = cleanText(value, 253)?.toLowerCase() ?? null;
  if (!cleaned) return null;
  const withoutProtocol = cleaned.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (withoutProtocol.includes("/") || !withoutProtocol.includes(".")) throw new Error("invalid_company_domain");
  return withoutProtocol;
}

function normalizeInstant(value: string, errorCode: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(errorCode);
  return parsed.toISOString();
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const cleaned = cleanText(value, 2048);
  if (!cleaned) return null;
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("invalid_source_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("invalid_source_url");
  return parsed.toString();
}

function canonical(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._:-]/g, "");
}

export function buildIntentRadarSignal(input: IntentRadarSignalInput): IntentRadarSignal {
  const companyName = cleanText(input.companyName, 200);
  const sourceReference = cleanText(input.sourceReference, 300);
  const signalType = cleanText(input.signalType, 120);
  const summary = cleanText(input.summary, 1000);
  if (!companyName || !sourceReference || !signalType || !summary) throw new Error("invalid_signal_text");

  if (!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100) {
    throw new Error("invalid_confidence");
  }
  if (input.evidenceBasis === "VERIFIED_FACT" && !input.sourceVerified) {
    throw new Error("verified_fact_requires_verified_source");
  }
  if (input.evidenceBasis === "INFERENCE" && input.sourceVerified) {
    throw new Error("inference_cannot_be_source_verified");
  }

  const companyNumber = cleanCompanyNumber(input.companyNumber);
  const companyDomain = cleanDomain(input.companyDomain);
  const observedAt = normalizeInstant(input.observedAt, "invalid_observed_at");
  const expiresAt = input.expiresAt ? normalizeInstant(input.expiresAt, "invalid_expires_at") : null;
  if (expiresAt && new Date(expiresAt).getTime() <= new Date(observedAt).getTime()) {
    throw new Error("expiry_must_follow_observation");
  }

  const sourceUrl = normalizeOptionalUrl(input.sourceUrl);
  const companyIdentity = companyNumber ?? companyDomain ?? canonical(companyName);
  const idempotencyKey = [
    "intent-radar",
    canonical(input.source),
    canonical(companyIdentity),
    canonical(sourceReference),
  ].join(":");

  return {
    ...input,
    companyName,
    companyNumber,
    companyDomain,
    sourceReference,
    sourceUrl,
    observedAt,
    expiresAt,
    signalType,
    summary,
    idempotencyKey,
  };
}

export function assessIntentRadarSignal(
  signal: IntentRadarSignal,
  asOf: string,
): IntentRadarSignalAssessment {
  const asOfInstant = normalizeInstant(asOf, "invalid_as_of");
  const expired = signal.expiresAt !== null && new Date(signal.expiresAt).getTime() <= new Date(asOfInstant).getTime();
  const companyIdentityReady = Boolean(signal.companyNumber || signal.companyDomain);
  const strongVerifiedTrigger =
    !expired &&
    signal.evidenceBasis === "VERIFIED_FACT" &&
    signal.sourceVerified &&
    signal.strength === "STRONG" &&
    signal.confidence >= 80 &&
    APOLLO_TRIGGER_SOURCES.has(signal.source);

  const reasons: string[] = [];
  if (expired) reasons.push("Signal is expired.");
  if (signal.evidenceBasis === "INFERENCE") reasons.push("Inference cannot be promoted as a verified fact.");
  if (!signal.sourceVerified) reasons.push("Source is not verified.");
  if (signal.strength !== "STRONG" || signal.confidence < 80) reasons.push("Signal is below the strong verified threshold.");
  if (!APOLLO_TRIGGER_SOURCES.has(signal.source)) reasons.push("Source may inform identity/context but cannot independently trigger Apollo enrichment.");
  if (!companyIdentityReady) reasons.push("A durable company number or domain is required before provider enrichment.");
  if (strongVerifiedTrigger && companyIdentityReady) reasons.push("Strong verified signal is eligible for enrichment review only.");
  reasons.push("Intent Radar never grants CRM write or outbound contact permission.");

  return {
    status: strongVerifiedTrigger ? "STRONG_VERIFIED_SIGNAL" : "REVIEW_ONLY",
    strongVerifiedTrigger,
    companyIdentityReady,
    apolloEnrichmentAllowed: strongVerifiedTrigger && companyIdentityReady,
    crmWriteAllowed: false,
    outreachAllowed: false,
    reasons,
  };
}

export function buildIntentRadarSnapshot(
  signals: readonly IntentRadarSignal[],
  asOf: string,
): IntentRadarSnapshot | null {
  if (signals.length === 0) return null;

  const deduped = [...new Map(signals.map((signal) => [signal.idempotencyKey, signal])).values()];
  const identities = new Set(deduped.map((signal) => signal.companyNumber ?? signal.companyDomain ?? canonical(signal.companyName)));
  if (identities.size !== 1) throw new Error("mixed_company_identity");

  const first = deduped[0];
  const assessments = deduped.map((signal) => assessIntentRadarSignal(signal, asOf));
  const apolloEnrichmentAllowed = assessments.some((assessment) => assessment.apolloEnrichmentAllowed);

  return {
    companyName: first.companyName,
    companyNumber: first.companyNumber,
    companyDomain: first.companyDomain,
    totalSignals: deduped.length,
    verifiedFacts: deduped.filter((signal) => signal.evidenceBasis === "VERIFIED_FACT").length,
    inferences: deduped.filter((signal) => signal.evidenceBasis === "INFERENCE").length,
    strongVerifiedSignals: assessments.filter((assessment) => assessment.strongVerifiedTrigger).length,
    apolloEnrichmentAllowed,
    crmWriteAllowed: false,
    outreachAllowed: false,
    promotionAllowed: false,
    signals: deduped,
  };
}
