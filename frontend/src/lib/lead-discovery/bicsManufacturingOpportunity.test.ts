import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBicsManufacturingContext,
  buildBicsManufacturingObservation,
  integrateBicsWithIntentRadar,
} from "./bicsManufacturingOpportunity.ts";
import { buildIntentRadarSignal, buildIntentRadarSnapshot } from "./intentRadar.ts";

const sourceUrl = "https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/businessinsightsandimpactontheukeconomy";

function observation(metric: Parameters<typeof buildBicsManufacturingObservation>[0]["metric"], percentage: number) {
  return buildBicsManufacturingObservation({
    wave: 163,
    releaseDate: "2026-09-03",
    surveyPeriodLabel: "BICS Wave 163",
    industry: "MANUFACTURING",
    metric,
    percentage,
    sourceUrl,
    officialStatisticsInDevelopment: true,
  });
}

function strongSnapshot() {
  const signal = buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyNumber: "12345678",
    companyDomain: "example-manufacturing.co.uk",
    source: "COMPANIES_HOUSE",
    sourceReference: "filing:strong",
    sourceUrl: "https://find-and-update.company-information.service.gov.uk/company/12345678/filing-history",
    observedAt: "2026-09-20T10:00:00Z",
    expiresAt: "2026-10-20T10:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "SHARE_ALLOTMENT_FILED",
    summary: "Verified capital filing.",
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence: 95,
    strength: "STRONG",
    provenance: "PUBLIC_OFFICIAL",
  });
  const snapshot = buildIntentRadarSnapshot([signal], "2026-09-23T20:00:00Z");
  assert.ok(snapshot);
  return snapshot;
}

test("BICS observations require official ONS provenance and bounded percentages", () => {
  assert.throws(
    () => buildBicsManufacturingObservation({
      wave: 163,
      releaseDate: "2026-09-03",
      surveyPeriodLabel: "Wave 163",
      industry: "MANUFACTURING",
      metric: "ENERGY_PRICE_CONCERN",
      percentage: 101,
      sourceUrl,
      officialStatisticsInDevelopment: true,
    }),
    /invalid_bics_percentage/,
  );

  assert.throws(
    () => buildBicsManufacturingObservation({
      wave: 163,
      releaseDate: "2026-09-03",
      surveyPeriodLabel: "Wave 163",
      industry: "MANUFACTURING",
      metric: "ENERGY_PRICE_CONCERN",
      percentage: 60,
      sourceUrl: "https://example.com/bics",
      officialStatisticsInDevelopment: true,
    }),
    /invalid_bics_source_url/,
  );
});

test("BICS release dates and runtime provenance markers fail closed", () => {
  assert.throws(
    () => buildBicsManufacturingObservation({
      wave: 163,
      releaseDate: "2026-02-31",
      surveyPeriodLabel: "Wave 163",
      industry: "MANUFACTURING",
      metric: "ENERGY_PRICE_CONCERN",
      percentage: 60,
      sourceUrl,
      officialStatisticsInDevelopment: true,
    }),
    /invalid_bics_release_date/,
  );

  assert.throws(
    () => buildBicsManufacturingObservation({
      wave: 163,
      releaseDate: "2026-09-03",
      surveyPeriodLabel: "Wave 163",
      industry: "RETAIL" as never,
      metric: "ENERGY_PRICE_CONCERN",
      percentage: 60,
      sourceUrl,
      officialStatisticsInDevelopment: true,
    }),
    /invalid_bics_industry/,
  );

  assert.throws(
    () => buildBicsManufacturingObservation({
      wave: 163,
      releaseDate: "2026-09-03",
      surveyPeriodLabel: "Wave 163",
      industry: "MANUFACTURING",
      metric: "ENERGY_PRICE_CONCERN",
      percentage: 60,
      sourceUrl,
      officialStatisticsInDevelopment: false as never,
    }),
    /invalid_bics_statistics_status/,
  );
});

test("high manufacturing energy pressure remains aggregate context with no company action capability", () => {
  const context = buildBicsManufacturingContext([
    observation("ENERGY_PRICE_CONCERN", 76),
    observation("ENERGY_PRICE_MAIN_CONCERN", 18),
    observation("RAISING_PRICES_DUE_TO_ENERGY", 48),
    observation("PRICES_BOUGHT_INCREASED", 54),
  ]);

  assert.ok(context);
  assert.equal(context.opportunityContext, "HIGH");
  assert.equal(context.companyFact, false);
  assert.equal(context.apolloEnrichmentAllowed, false);
  assert.equal(context.crmWriteAllowed, false);
  assert.equal(context.outreachAllowed, false);
});

test("BICS can raise review priority only when an independent strong verified company signal already exists", () => {
  const context = buildBicsManufacturingContext([
    observation("ENERGY_PRICE_CONCERN", 76),
    observation("ENERGY_PRICE_MAIN_CONCERN", 18),
    observation("RAISING_PRICES_DUE_TO_ENERGY", 48),
    observation("PRICES_BOUGHT_INCREASED", 54),
  ]);
  assert.ok(context);

  const integration = integrateBicsWithIntentRadar(strongSnapshot(), context);
  assert.equal(integration.strongVerifiedCompanySignalPresent, true);
  assert.equal(integration.reviewPriorityLift, 15);
  assert.equal(integration.apolloEnrichmentAllowed, true);
  assert.equal(integration.crmWriteAllowed, false);
  assert.equal(integration.outreachAllowed, false);
});

test("BICS cannot bootstrap a company opportunity from weak context alone", () => {
  const weakSignal = buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    source: "SOCIAL_PUBLIC",
    sourceReference: "public-post:weak",
    sourceUrl: "https://example.org/post",
    observedAt: "2026-09-22T10:00:00Z",
    signalFamily: "COMMERCIAL_INTELLIGENCE",
    signalType: "POSSIBLE_COST_PRESSURE",
    summary: "Unverified public context.",
    evidenceBasis: "INFERENCE",
    sourceVerified: false,
    confidence: 50,
    strength: "WEAK",
    provenance: "PUBLIC_WEB",
  });
  const snapshot = buildIntentRadarSnapshot([weakSignal], "2026-09-23T20:00:00Z");
  assert.ok(snapshot);

  const context = buildBicsManufacturingContext([
    observation("ENERGY_PRICE_CONCERN", 80),
    observation("RAISING_PRICES_DUE_TO_ENERGY", 55),
  ]);
  assert.ok(context);

  const integration = integrateBicsWithIntentRadar(snapshot, context);
  assert.equal(integration.strongVerifiedCompanySignalPresent, false);
  assert.equal(integration.reviewPriorityLift, 0);
  assert.equal(integration.apolloEnrichmentAllowed, false);
});
