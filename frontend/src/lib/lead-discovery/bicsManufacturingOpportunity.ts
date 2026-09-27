import type { IntentRadarSnapshot } from "./intentRadar.ts";

export const BICS_MANUFACTURING_METRICS = [
  "ENERGY_PRICE_CONCERN",
  "ENERGY_PRICE_MAIN_CONCERN",
  "RAISING_PRICES_DUE_TO_ENERGY",
  "PRICES_BOUGHT_INCREASED",
  "TURNOVER_EXPECTED_INCREASE",
  "TURNOVER_EXPECTED_DECREASE",
] as const;

export type BicsManufacturingMetric = (typeof BICS_MANUFACTURING_METRICS)[number];

export type BicsManufacturingObservationInput = Readonly<{
  wave: number;
  releaseDate: string;
  surveyPeriodLabel: string;
  industry: "MANUFACTURING";
  metric: BicsManufacturingMetric;
  percentage: number;
  sourceUrl: string;
  officialStatisticsInDevelopment: true;
}>;

export type BicsManufacturingObservation = Readonly<BicsManufacturingObservationInput & {
  releaseDate: string;
  surveyPeriodLabel: string;
  sourceUrl: string;
}>;

export type BicsManufacturingContext = Readonly<{
  industry: "MANUFACTURING";
  latestReleaseDate: string;
  latestWave: number;
  observations: readonly BicsManufacturingObservation[];
  energyPressureScore: number;
  opportunityContext: "HIGH" | "ELEVATED" | "NORMAL";
  companyFact: false;
  sourceVerifiedAtIndustryLevel: true;
  apolloEnrichmentAllowed: false;
  crmWriteAllowed: false;
  outreachAllowed: false;
}>;

export type BicsIntentRadarIntegration = Readonly<{
  companyName: string;
  opportunityContext: BicsManufacturingContext["opportunityContext"];
  reviewPriorityLift: number;
  strongVerifiedCompanySignalPresent: boolean;
  apolloEnrichmentAllowed: boolean;
  crmWriteAllowed: false;
  outreachAllowed: false;
  explanation: string;
}>;

type UnknownRecord = Record<string, unknown>;

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

function normalizeMetric(value: unknown): BicsManufacturingMetric {
  if (
    typeof value !== "string" ||
    !BICS_MANUFACTURING_METRICS.includes(value as BicsManufacturingMetric)
  ) {
    throw new Error("invalid_bics_metric");
  }
  return value as BicsManufacturingMetric;
}

function normalizeObservationRuntime(
  input: unknown,
): BicsManufacturingObservationInput {
  const record = asRecord(input, "invalid_bics_observation");
  if (record.industry !== "MANUFACTURING") throw new Error("invalid_bics_industry");
  if (record.officialStatisticsInDevelopment !== true) {
    throw new Error("invalid_bics_statistics_status");
  }

  return {
    wave: requireNumber(record, "wave", "invalid_bics_wave"),
    releaseDate: requireString(record, "releaseDate", "invalid_bics_release_date"),
    surveyPeriodLabel: requireString(record, "surveyPeriodLabel", "invalid_bics_period"),
    industry: "MANUFACTURING",
    metric: normalizeMetric(record.metric),
    percentage: requireNumber(record, "percentage", "invalid_bics_percentage"),
    sourceUrl: requireString(record, "sourceUrl", "invalid_bics_source_url"),
    officialStatisticsInDevelopment: true,
  };
}

function normalizeDate(value: string): string {
  const cleaned = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (!match) throw new Error("invalid_bics_release_date");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) throw new Error("invalid_bics_release_date");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) throw new Error("invalid_bics_release_date");

  return `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
}

function normalizeSourceUrl(value: string): string {
  const cleaned = clean(value, 2048);
  if (!cleaned) throw new Error("invalid_bics_source_url");
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    throw new Error("invalid_bics_source_url");
  }
  if (url.protocol !== "https:" || url.hostname !== "www.ons.gov.uk") throw new Error("invalid_bics_source_url");
  return url.toString();
}

function validateObservationFields(input: BicsManufacturingObservationInput): string {
  if (!Number.isSafeInteger(input.wave) || input.wave <= 0) throw new Error("invalid_bics_wave");
  if (input.industry !== "MANUFACTURING") throw new Error("invalid_bics_industry");
  if (input.officialStatisticsInDevelopment !== true) throw new Error("invalid_bics_statistics_status");
  if (!BICS_MANUFACTURING_METRICS.includes(input.metric)) throw new Error("invalid_bics_metric");
  if (!Number.isFinite(input.percentage) || input.percentage < 0 || input.percentage > 100) {
    throw new Error("invalid_bics_percentage");
  }
  const surveyPeriodLabel = clean(input.surveyPeriodLabel, 160);
  if (!surveyPeriodLabel) throw new Error("invalid_bics_period");
  return surveyPeriodLabel;
}

export function buildBicsManufacturingObservation(
  input: BicsManufacturingObservationInput,
): BicsManufacturingObservation {
  const normalizedInput = normalizeObservationRuntime(input);
  const surveyPeriodLabel = validateObservationFields(normalizedInput);

  return {
    wave: normalizedInput.wave,
    releaseDate: normalizeDate(normalizedInput.releaseDate),
    surveyPeriodLabel,
    industry: "MANUFACTURING",
    metric: normalizedInput.metric,
    percentage: normalizedInput.percentage,
    sourceUrl: normalizeSourceUrl(normalizedInput.sourceUrl),
    officialStatisticsInDevelopment: true,
  };
}

function revalidateBicsManufacturingObservation(
  input: BicsManufacturingObservation,
): BicsManufacturingObservation {
  const normalizedInput = normalizeObservationRuntime(input);
  const surveyPeriodLabel = validateObservationFields(normalizedInput);
  const releaseMatch = /^(\d{4}-\d{2}-\d{2})T00:00:00\.000Z$/.exec(normalizedInput.releaseDate);
  if (!releaseMatch) throw new Error("invalid_bics_release_date");

  return {
    wave: normalizedInput.wave,
    releaseDate: normalizeDate(releaseMatch[1]),
    surveyPeriodLabel,
    industry: "MANUFACTURING",
    metric: normalizedInput.metric,
    percentage: normalizedInput.percentage,
    sourceUrl: normalizeSourceUrl(normalizedInput.sourceUrl),
    officialStatisticsInDevelopment: true,
  };
}

function latestByMetric(
  observations: readonly BicsManufacturingObservation[],
  metric: BicsManufacturingMetric,
): BicsManufacturingObservation | null {
  return observations
    .filter((item) => item.metric === metric)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0] ?? null;
}

export function buildBicsManufacturingContext(
  observations: readonly BicsManufacturingObservation[],
): BicsManufacturingContext | null {
  if (!Array.isArray(observations)) throw new Error("invalid_bics_observations");
  if (observations.length === 0) return null;

  const validatedObservations = observations.map(revalidateBicsManufacturingObservation);
  const deduped = [...new Map(
    validatedObservations.map((item) => [`${item.wave}:${item.metric}:${item.surveyPeriodLabel}`, item]),
  ).values()];

  const latestRelease = [...deduped].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0];
  const latestCohort = deduped.filter((item) =>
    item.releaseDate === latestRelease.releaseDate &&
    item.wave === latestRelease.wave &&
    item.surveyPeriodLabel === latestRelease.surveyPeriodLabel
  );
  const energyConcern = latestByMetric(latestCohort, "ENERGY_PRICE_CONCERN")?.percentage ?? 0;
  const energyMainConcern = latestByMetric(latestCohort, "ENERGY_PRICE_MAIN_CONCERN")?.percentage ?? 0;
  const priceRiseEnergy = latestByMetric(latestCohort, "RAISING_PRICES_DUE_TO_ENERGY")?.percentage ?? 0;
  const pricesBought = latestByMetric(latestCohort, "PRICES_BOUGHT_INCREASED")?.percentage ?? 0;

  const energyPressureScore = Math.min(
    100,
    Math.round(
      energyConcern * 0.35 +
      energyMainConcern * 0.25 +
      priceRiseEnergy * 0.25 +
      pricesBought * 0.15,
    ),
  );

  const opportunityContext = energyPressureScore >= 45
    ? "HIGH"
    : energyPressureScore >= 25
      ? "ELEVATED"
      : "NORMAL";

  return {
    industry: "MANUFACTURING",
    latestReleaseDate: latestRelease.releaseDate,
    latestWave: latestRelease.wave,
    observations: deduped.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)),
    energyPressureScore,
    opportunityContext,
    companyFact: false,
    sourceVerifiedAtIndustryLevel: true,
    apolloEnrichmentAllowed: false,
    crmWriteAllowed: false,
    outreachAllowed: false,
  };
}

function contextMatchesRebuild(
  context: BicsManufacturingContext,
  rebuilt: BicsManufacturingContext,
): boolean {
  return context.industry === rebuilt.industry &&
    context.latestReleaseDate === rebuilt.latestReleaseDate &&
    context.latestWave === rebuilt.latestWave &&
    context.energyPressureScore === rebuilt.energyPressureScore &&
    context.opportunityContext === rebuilt.opportunityContext &&
    context.companyFact === false &&
    context.sourceVerifiedAtIndustryLevel === true &&
    context.apolloEnrichmentAllowed === false &&
    context.crmWriteAllowed === false &&
    context.outreachAllowed === false;
}

export function integrateBicsWithIntentRadar(
  snapshot: IntentRadarSnapshot,
  context: BicsManufacturingContext,
): BicsIntentRadarIntegration {
  const strongVerifiedCompanySignalPresent = snapshot.strongVerifiedSignals > 0;

  let rebuiltContext: BicsManufacturingContext | null = null;
  try {
    rebuiltContext = buildBicsManufacturingContext(context.observations);
  } catch {
    rebuiltContext = null;
  }
  const canonicalContext = rebuiltContext !== null && contextMatchesRebuild(context, rebuiltContext)
    ? rebuiltContext
    : null;
  const opportunityContext = canonicalContext?.opportunityContext ?? "NORMAL";
  const reviewPriorityLift = !strongVerifiedCompanySignalPresent || canonicalContext === null
    ? 0
    : opportunityContext === "HIGH"
      ? 15
      : opportunityContext === "ELEVATED"
        ? 8
        : 0;

  return {
    companyName: snapshot.companyName,
    opportunityContext,
    reviewPriorityLift,
    strongVerifiedCompanySignalPresent,
    apolloEnrichmentAllowed: canonicalContext !== null && strongVerifiedCompanySignalPresent && snapshot.apolloEnrichmentAllowed,
    crmWriteAllowed: false,
    outreachAllowed: false,
    explanation: canonicalContext === null
      ? "BICS context failed runtime provenance reconstruction and cannot affect company review priority or Apollo readiness."
      : strongVerifiedCompanySignalPresent
        ? "BICS is aggregate manufacturing context only; it may raise human review priority but does not create or strengthen a company fact."
        : "BICS is aggregate manufacturing context only and cannot create a company-level opportunity without an independent verified company signal.",
  };
}
