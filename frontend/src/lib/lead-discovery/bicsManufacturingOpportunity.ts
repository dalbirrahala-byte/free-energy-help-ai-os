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

function clean(value: string | null | undefined, max = 500): string | null {
  const cleaned = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
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

export function buildBicsManufacturingObservation(
  input: BicsManufacturingObservationInput,
): BicsManufacturingObservation {
  if (!Number.isInteger(input.wave) || input.wave <= 0) throw new Error("invalid_bics_wave");
  if (input.industry !== "MANUFACTURING") throw new Error("invalid_bics_industry");
  if (input.officialStatisticsInDevelopment !== true) throw new Error("invalid_bics_statistics_status");
  if (!BICS_MANUFACTURING_METRICS.includes(input.metric)) throw new Error("invalid_bics_metric");
  if (!Number.isFinite(input.percentage) || input.percentage < 0 || input.percentage > 100) {
    throw new Error("invalid_bics_percentage");
  }
  const surveyPeriodLabel = clean(input.surveyPeriodLabel, 160);
  if (!surveyPeriodLabel) throw new Error("invalid_bics_period");

  return {
    ...input,
    releaseDate: normalizeDate(input.releaseDate),
    surveyPeriodLabel,
    sourceUrl: normalizeSourceUrl(input.sourceUrl),
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
  if (observations.length === 0) return null;

  const deduped = [...new Map(
    observations.map((item) => [`${item.wave}:${item.metric}:${item.surveyPeriodLabel}`, item]),
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

export function integrateBicsWithIntentRadar(
  snapshot: IntentRadarSnapshot,
  context: BicsManufacturingContext,
): BicsIntentRadarIntegration {
  const strongVerifiedCompanySignalPresent = snapshot.strongVerifiedSignals > 0;
  const reviewPriorityLift = !strongVerifiedCompanySignalPresent
    ? 0
    : context.opportunityContext === "HIGH"
      ? 15
      : context.opportunityContext === "ELEVATED"
        ? 8
        : 0;

  return {
    companyName: snapshot.companyName,
    opportunityContext: context.opportunityContext,
    reviewPriorityLift,
    strongVerifiedCompanySignalPresent,
    apolloEnrichmentAllowed: strongVerifiedCompanySignalPresent && snapshot.apolloEnrichmentAllowed,
    crmWriteAllowed: false,
    outreachAllowed: false,
    explanation: strongVerifiedCompanySignalPresent
      ? "BICS is aggregate manufacturing context only; it may raise human review priority but does not create or strengthen a company fact."
      : "BICS is aggregate manufacturing context only and cannot create a company-level opportunity without an independent verified company signal.",
  };
}
