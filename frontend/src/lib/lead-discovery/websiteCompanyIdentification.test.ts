import assert from "node:assert/strict";
import test from "node:test";

import {
  assessWebsiteCompanySignal,
  buildWebsiteCompanyObservation,
  evaluateWebsiteIdentificationTrial,
  mapWebsiteCompanyObservationToIntentSignal,
} from "./websiteCompanyIdentification.ts";

const candidate = {
  providerName: "Example Provider",
  monthlyPriceMinor: 4900,
  currency: "USD",
  freeTrialDays: 14,
  creditCardRequiredForTrial: false,
  apiAvailable: true,
  companyLevelIdentification: true,
  privacyDocumentationAvailable: true,
  dpaAvailable: true,
} as const;

test("trial candidate can be prepared for human review without allowing install or payment", () => {
  const decision = evaluateWebsiteIdentificationTrial(candidate, 5000);

  assert.equal(decision.status, "ELIGIBLE_FOR_HUMAN_TRIAL_REVIEW");
  assert.equal(decision.withinBudget, true);
  assert.equal(decision.trackerInstallAllowed, false);
  assert.equal(decision.paidActivationAllowed, false);
  assert.equal(decision.crmWriteAllowed, false);
  assert.equal(decision.outreachAllowed, false);
});

test("unknown price, payment-details requirement or missing privacy evidence blocks trial", () => {
  assert.equal(evaluateWebsiteIdentificationTrial({ ...candidate, monthlyPriceMinor: null }, 5000).status, "BLOCKED");
  assert.equal(evaluateWebsiteIdentificationTrial({ ...candidate, creditCardRequiredForTrial: true }, 5000).status, "BLOCKED");
  assert.equal(evaluateWebsiteIdentificationTrial({ ...candidate, dpaAvailable: false }, 5000).status, "BLOCKED");
});

test("website observation strips query strings/fragments and ignores absolute external URLs", () => {
  const observation = buildWebsiteCompanyObservation({
    providerName: "Example Provider",
    providerEventReference: "event-42",
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    firstSeenAt: "2026-09-23T10:00:00Z",
    lastSeenAt: "2026-09-23T10:10:00Z",
    matchConfidence: 92,
    providerMatchVerified: true,
    visitedPaths: [
      "/free-business-energy-health-check?email=person@example.com#form",
      "/business-energy",
      "https://other.example/private",
    ],
  });

  assert.deepEqual(observation.visitedPaths, ["/free-business-energy-health-check", "/business-energy"]);
});

test("strong company identification stays website context and cannot bootstrap Apollo", () => {
  const observation = buildWebsiteCompanyObservation({
    providerName: "Example Provider",
    providerEventReference: "event-42",
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    firstSeenAt: "2026-09-23T10:00:00Z",
    lastSeenAt: "2026-09-23T10:10:00Z",
    matchConfidence: 92,
    providerMatchVerified: true,
    visitedPaths: ["/free-business-energy-health-check"],
  });

  const signal = mapWebsiteCompanyObservationToIntentSignal(observation);
  const assessment = assessWebsiteCompanySignal(signal, "2026-09-23T20:00:00Z");

  assert.equal(signal.source, "WEBSITE_IDENTIFICATION");
  assert.equal(signal.strength, "STRONG");
  assert.equal(assessment.apolloEnrichmentAllowed, false);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});

test("unverified provider match is explicitly inference", () => {
  const observation = buildWebsiteCompanyObservation({
    providerName: "Example Provider",
    providerEventReference: "event-weak",
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    firstSeenAt: "2026-09-23T10:00:00Z",
    lastSeenAt: "2026-09-23T10:10:00Z",
    matchConfidence: 58,
    providerMatchVerified: false,
    visitedPaths: [],
  });

  const signal = mapWebsiteCompanyObservationToIntentSignal(observation);
  assert.equal(signal.evidenceBasis, "INFERENCE");
  assert.equal(signal.sourceVerified, false);
  assert.equal(signal.strength, "WEAK");
});
