import {
  assessIntentRadarSignal,
  buildIntentRadarSignal,
  type IntentRadarSignal,
} from "./intentRadar.ts";

export type WebsiteIdentificationTrialCandidate = Readonly<{
  providerName: string;
  monthlyPriceMinor: number | null;
  currency: "GBP" | "EUR" | "USD";
  freeTrialDays: number;
  creditCardRequiredForTrial: boolean;
  apiAvailable: boolean;
  companyLevelIdentification: boolean;
  privacyDocumentationAvailable: boolean;
  dpaAvailable: boolean;
}>;

export type WebsiteIdentificationTrialDecision = Readonly<{
  status: "ELIGIBLE_FOR_HUMAN_TRIAL_REVIEW" | "BLOCKED";
  withinBudget: boolean;
  reasons: readonly string[];
  trackerInstallAllowed: false;
  paidActivationAllowed: false;
  crmWriteAllowed: false;
  outreachAllowed: false;
}>;

export type WebsiteCompanyObservationInput = Readonly<{
  providerName: string;
  providerEventReference: string;
  companyName: string;
  companyDomain: string;
  firstSeenAt: string;
  lastSeenAt: string;
  matchConfidence: number;
  providerMatchVerified: boolean;
  visitedPaths: readonly string[];
}>;

export type WebsiteCompanyObservation = Readonly<WebsiteCompanyObservationInput & {
  providerName: string;
  providerEventReference: string;
  companyName: string;
  companyDomain: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitedPaths: readonly string[];
}>;

type UnknownRecord = Record<string, unknown>;

const TRIAL_CURRENCIES = new Set(["GBP", "EUR", "USD"] as const);

function clean(value: string | null | undefined, max = 500): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function asRecord(value: unknown, errorCode: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  return value as UnknownRecord;
}

function requireString(record: UnknownRecord, key: string, errorCode: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error(errorCode);
  return value;
}

function requireNumber(record: UnknownRecord, key: string, errorCode: string): number {
  const value = record[key];
  if (typeof value !== "number") throw new Error(errorCode);
  return value;
}

function requireBoolean(record: UnknownRecord, key: string, errorCode: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(errorCode);
  return value;
}

function normalizeTrialCandidateRuntime(candidate: unknown): WebsiteIdentificationTrialCandidate {
  const record = asRecord(candidate, "invalid_trial_candidate");
  const currency = record.currency;
  if (typeof currency !== "string" || !TRIAL_CURRENCIES.has(currency as "GBP" | "EUR" | "USD")) {
    throw new Error("invalid_trial_currency");
  }

  const monthlyPriceMinor = record.monthlyPriceMinor;
  if (monthlyPriceMinor !== null && typeof monthlyPriceMinor !== "number") {
    throw new Error("invalid_monthly_price");
  }

  return {
    providerName: requireString(record, "providerName", "invalid_provider_name"),
    monthlyPriceMinor,
    currency: currency as "GBP" | "EUR" | "USD",
    freeTrialDays: requireNumber(record, "freeTrialDays", "invalid_trial_days"),
    creditCardRequiredForTrial: requireBoolean(record, "creditCardRequiredForTrial", "invalid_trial_evidence"),
    apiAvailable: requireBoolean(record, "apiAvailable", "invalid_trial_evidence"),
    companyLevelIdentification: requireBoolean(record, "companyLevelIdentification", "invalid_trial_evidence"),
    privacyDocumentationAvailable: requireBoolean(record, "privacyDocumentationAvailable", "invalid_trial_evidence"),
    dpaAvailable: requireBoolean(record, "dpaAvailable", "invalid_trial_evidence"),
  };
}

function normalizeObservationRuntime(input: unknown): WebsiteCompanyObservationInput {
  const record = asRecord(input, "invalid_website_company_observation");
  if (!Array.isArray(record.visitedPaths) || record.visitedPaths.some((path) => typeof path !== "string")) {
    throw new Error("invalid_visited_paths");
  }

  return {
    providerName: requireString(record, "providerName", "invalid_provider_name"),
    providerEventReference: requireString(record, "providerEventReference", "invalid_provider_event_reference"),
    companyName: requireString(record, "companyName", "invalid_website_company_observation"),
    companyDomain: requireString(record, "companyDomain", "invalid_company_domain"),
    firstSeenAt: requireString(record, "firstSeenAt", "invalid_first_seen_at"),
    lastSeenAt: requireString(record, "lastSeenAt", "invalid_last_seen_at"),
    matchConfidence: requireNumber(record, "matchConfidence", "invalid_match_confidence"),
    providerMatchVerified: requireBoolean(record, "providerMatchVerified", "invalid_provider_match_verification"),
    visitedPaths: record.visitedPaths as string[],
  };
}

function normalizeInstant(value: string, error: string): string {
  const cleaned = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(cleaned);
  if (!match) throw new Error(error);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) throw new Error(error);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) throw new Error(error);
  if (hour > 23 || minute > 59 || second > 59) throw new Error(error);

  if (match[8] !== "Z") {
    const offsetHour = Number(match[10]);
    const offsetMinute = Number(match[11]);
    if (offsetHour > 14 || offsetMinute > 59) throw new Error(error);
    if (offsetHour === 14 && offsetMinute !== 0) throw new Error(error);
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) throw new Error(error);
  return parsed.toISOString();
}

function normalizeDomain(value: string): string {
  const cleaned = clean(value, 253)?.toLowerCase();
  if (!cleaned) throw new Error("invalid_company_domain");
  const normalized = cleaned.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (/[\/?#@:]/.test(normalized) || normalized.endsWith(".")) {
    throw new Error("invalid_company_domain");
  }

  const labels = normalized.split(".");
  const topLevelDomain = labels.at(-1) ?? "";
  if (labels.length < 2 || !/[a-z]/.test(topLevelDomain) || labels.some((label) =>
    !label ||
    label.length > 63 ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  )) {
    throw new Error("invalid_company_domain");
  }
  return normalized;
}

function normalizeProviderEventReference(value: string): string {
  const cleaned = clean(value, 160);
  if (!cleaned || !/^[A-Za-z0-9._:-]+$/.test(cleaned)) throw new Error("invalid_provider_event_reference");
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(cleaned)) throw new Error("invalid_provider_event_reference");
  if ((cleaned.match(/:/g)?.length ?? 0) > 1) throw new Error("invalid_provider_event_reference");
  return cleaned;
}

function sanitizeVisitedPath(value: string): string | null {
  const cleaned = clean(value, 1000);
  if (!cleaned) return null;
  let url: URL;
  try {
    url = new URL(cleaned, "https://feh.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://feh.invalid") return null;

  let decodedPath = url.pathname;
  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const decoded = decodeURIComponent(decodedPath);
      if (decoded === decodedPath) break;
      decodedPath = decoded;
    }
  } catch {
    return null;
  }

  const segments = decodedPath.split("/").filter(Boolean);
  const containsPossibleDirectIdentifier =
    /[^/\s]+@[^/\s]+/.test(decodedPath) ||
    /\d{8,}/.test(decodedPath) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(decodedPath) ||
    segments.some((segment) => segment.length > 80);
  if (containsPossibleDirectIdentifier) return null;

  return url.pathname.replace(/\/+/g, "/").slice(0, 300) || "/";
}

export function evaluateWebsiteIdentificationTrial(
  candidate: WebsiteIdentificationTrialCandidate,
  maxMonthlyPriceMinor: number,
): WebsiteIdentificationTrialDecision {
  const normalizedCandidate = normalizeTrialCandidateRuntime(candidate);
  const providerName = clean(normalizedCandidate.providerName, 120);
  if (!providerName) throw new Error("invalid_provider_name");
  if (!Number.isSafeInteger(maxMonthlyPriceMinor) || maxMonthlyPriceMinor < 0) throw new Error("invalid_budget");
  if (normalizedCandidate.monthlyPriceMinor !== null && (!Number.isSafeInteger(normalizedCandidate.monthlyPriceMinor) || normalizedCandidate.monthlyPriceMinor < 0)) {
    throw new Error("invalid_monthly_price");
  }
  if (!Number.isSafeInteger(normalizedCandidate.freeTrialDays) || normalizedCandidate.freeTrialDays < 0) throw new Error("invalid_trial_days");

  const withinBudget = normalizedCandidate.monthlyPriceMinor !== null && normalizedCandidate.monthlyPriceMinor <= maxMonthlyPriceMinor;
  const reasons: string[] = [];
  if (normalizedCandidate.freeTrialDays < 7) reasons.push("Trial is shorter than the minimum evaluation window.");
  if (normalizedCandidate.creditCardRequiredForTrial) reasons.push("Trial requires payment details.");
  if (!normalizedCandidate.apiAvailable) reasons.push("No API is available for a controlled CRM integration test.");
  if (!normalizedCandidate.companyLevelIdentification) reasons.push("Provider does not meet the company-level identification boundary.");
  if (!normalizedCandidate.privacyDocumentationAvailable || !normalizedCandidate.dpaAvailable) reasons.push("Privacy/DPA evidence is incomplete.");
  if (!withinBudget) reasons.push("Published monthly price is unknown or above the supplied trial budget.");

  const eligible =
    normalizedCandidate.freeTrialDays >= 7 &&
    !normalizedCandidate.creditCardRequiredForTrial &&
    normalizedCandidate.apiAvailable &&
    normalizedCandidate.companyLevelIdentification &&
    normalizedCandidate.privacyDocumentationAvailable &&
    normalizedCandidate.dpaAvailable &&
    withinBudget;

  if (eligible) reasons.push("Candidate is suitable for human review before any tracker installation or paid activation.");

  return {
    status: eligible ? "ELIGIBLE_FOR_HUMAN_TRIAL_REVIEW" : "BLOCKED",
    withinBudget,
    reasons,
    trackerInstallAllowed: false,
    paidActivationAllowed: false,
    crmWriteAllowed: false,
    outreachAllowed: false,
  };
}

export function buildWebsiteCompanyObservation(input: WebsiteCompanyObservationInput): WebsiteCompanyObservation {
  const normalizedInput = normalizeObservationRuntime(input);
  const providerName = clean(normalizedInput.providerName, 120);
  const providerEventReference = normalizeProviderEventReference(normalizedInput.providerEventReference);
  const companyName = clean(normalizedInput.companyName, 200);
  if (!providerName || !companyName) throw new Error("invalid_website_company_observation");
  if (!Number.isInteger(normalizedInput.matchConfidence) || normalizedInput.matchConfidence < 0 || normalizedInput.matchConfidence > 100) {
    throw new Error("invalid_match_confidence");
  }

  const firstSeenAt = normalizeInstant(normalizedInput.firstSeenAt, "invalid_first_seen_at");
  const lastSeenAt = normalizeInstant(normalizedInput.lastSeenAt, "invalid_last_seen_at");
  if (new Date(lastSeenAt).getTime() < new Date(firstSeenAt).getTime()) throw new Error("last_seen_before_first_seen");

  const visitedPaths = [...new Set(normalizedInput.visitedPaths.map(sanitizeVisitedPath).filter((path): path is string => path !== null))]
    .slice(0, 20);

  return {
    providerName,
    providerEventReference,
    companyName,
    companyDomain: normalizeDomain(normalizedInput.companyDomain),
    firstSeenAt,
    lastSeenAt,
    matchConfidence: normalizedInput.matchConfidence,
    providerMatchVerified: normalizedInput.providerMatchVerified,
    visitedPaths,
  };
}

export function mapWebsiteCompanyObservationToIntentSignal(
  observation: WebsiteCompanyObservation,
): IntentRadarSignal {
  const normalizedObservation = buildWebsiteCompanyObservation(observation);
  const highConfidence = normalizedObservation.providerMatchVerified && normalizedObservation.matchConfidence >= 85;
  const pageContext = normalizedObservation.visitedPaths.length > 0
    ? ` Visited paths: ${normalizedObservation.visitedPaths.join(", ")}.`
    : "";

  return buildIntentRadarSignal({
    companyName: normalizedObservation.companyName,
    companyDomain: normalizedObservation.companyDomain,
    source: "WEBSITE_IDENTIFICATION",
    sourceReference: `website-id:${normalizedObservation.providerName}:${normalizedObservation.providerEventReference}`,
    sourceUrl: null,
    observedAt: normalizedObservation.lastSeenAt,
    expiresAt: new Date(new Date(normalizedObservation.lastSeenAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    signalFamily: "DIGITAL_INTENT",
    signalType: "COMPANY_IDENTIFIED_ON_FEH_WEBSITE",
    summary: `${normalizedObservation.providerName} identified ${normalizedObservation.companyName} at company level with stated match confidence ${normalizedObservation.matchConfidence}.${pageContext}`,
    evidenceBasis: normalizedObservation.providerMatchVerified ? "VERIFIED_FACT" : "INFERENCE",
    sourceVerified: normalizedObservation.providerMatchVerified,
    confidence: normalizedObservation.matchConfidence,
    strength: highConfidence ? "STRONG" : normalizedObservation.matchConfidence >= 60 ? "MEDIUM" : "WEAK",
    provenance: "PROVIDER_ENRICHMENT",
  });
}

export function assessWebsiteCompanySignal(
  signal: IntentRadarSignal,
  asOf: string,
) {
  const assessment = assessIntentRadarSignal(signal, asOf);
  return {
    ...assessment,
    apolloEnrichmentAllowed: false as const,
    reason: "Website identification is intent/context evidence only and cannot independently authorize Apollo enrichment.",
  };
}
