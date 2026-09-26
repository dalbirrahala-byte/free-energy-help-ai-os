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

function websiteObservation(overrides: Partial<Parameters<typeof buildWebsiteCompanyObservation>[0]> = {}) {
  return buildWebsiteCompanyObservation({
    providerName: "Example Provider",
    providerEventReference: "event-42",
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    firstSeenAt: "2026-09-23T10:00:00Z",
    lastSeenAt: "2026-09-23T10:10:00Z",
    matchConfidence: 92,
    providerMatchVerified: true,
    visitedPaths: ["/free-business-energy-health-check"],
    ...overrides,
  });
}

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

test("trial evidence must use real booleans, reviewed currency and safe integer economics", () => {
  for (const forgedCandidate of [
    { ...candidate, apiAvailable: "true" as never },
    { ...candidate, companyLevelIdentification: 1 as never },
    { ...candidate, privacyDocumentationAvailable: "yes" as never },
    { ...candidate, dpaAvailable: {} as never },
  ]) {
    assert.throws(
      () => evaluateWebsiteIdentificationTrial(forgedCandidate, 5000),
      /invalid_trial_evidence/,
    );
  }

  assert.throws(
    () => evaluateWebsiteIdentificationTrial({ ...candidate, currency: "BTC" as never }, 5000),
    /invalid_trial_currency/,
  );
  assert.throws(
    () => evaluateWebsiteIdentificationTrial(candidate, Number.MAX_SAFE_INTEGER + 1),
    /invalid_budget/,
  );
  assert.throws(
    () => evaluateWebsiteIdentificationTrial({ ...candidate, monthlyPriceMinor: Number.MAX_SAFE_INTEGER + 1 }, 5000),
    /invalid_monthly_price/,
  );
});

test("trial candidate runtime record fields are validated before use", () => {
  assert.throws(
    () => evaluateWebsiteIdentificationTrial({ ...candidate, providerName: 123 as unknown as string }, 5000),
    /invalid_provider_name/,
  );
  assert.throws(
    () => evaluateWebsiteIdentificationTrial({ ...candidate, monthlyPriceMinor: "4900" as unknown as number }, 5000),
    /invalid_monthly_price/,
  );
  assert.throws(
    () => evaluateWebsiteIdentificationTrial({ ...candidate, freeTrialDays: "14" as unknown as number }, 5000),
    /invalid_trial_days/,
  );
});

test("website observation strips query strings/fragments and ignores absolute external URLs", () => {
  const observation = websiteObservation({
    visitedPaths: [
      "/free-business-energy-health-check?email=person@example.com#form",
      "/business-energy",
      "https://other.example/private",
    ],
  });

  assert.deepEqual(observation.visitedPaths, ["/free-business-energy-health-check", "/business-energy"]);
});

test("possible direct identifiers in URL paths are discarded instead of persisted", () => {
  const observation = websiteObservation({
    visitedPaths: [
      "/business-energy",
      "/contact/person%40example.com",
      "/contact/person%2540example.com",
      "/account/1234567890",
      "/session/550e8400-e29b-41d4-a716-446655440000",
    ],
  });

  assert.deepEqual(observation.visitedPaths, ["/business-energy"]);
});

test("provider event references reject obvious personal/network identifiers", () => {
  for (const providerEventReference of [
    "person@example.com",
    "192.168.10.24",
    "https://provider.example/event/42",
    "2001:db8::1",
  ]) {
    assert.throws(
      () => websiteObservation({ providerEventReference }),
      /invalid_provider_event_reference/,
    );
  }
});

test("website observation timestamps require explicit timezone and real calendar dates", () => {
  assert.throws(
    () => websiteObservation({ firstSeenAt: "2026-09-23T10:00:00" }),
    /invalid_first_seen_at/,
  );
  assert.throws(
    () => websiteObservation({ lastSeenAt: "2026-02-31T10:10:00Z" }),
    /invalid_last_seen_at/,
  );
});

test("malformed company domains are rejected before they become company identity", () => {
  for (const companyDomain of [
    "example-manufacturing.co.uk:443",
    "bad domain.co.uk",
    "example-manufacturing.co.uk?visitor=1",
    "192.168.1.1",
  ]) {
    assert.throws(
      () => websiteObservation({ companyDomain }),
      /invalid_company_domain/,
    );
  }
});

test("website observation runtime record fields fail closed and extras are stripped", () => {
  const base = {
    providerName: "Example Provider",
    providerEventReference: "event-42",
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    firstSeenAt: "2026-09-23T10:00:00Z",
    lastSeenAt: "2026-09-23T10:10:00Z",
    matchConfidence: 92,
    providerMatchVerified: true,
    visitedPaths: ["/business-energy"],
  } as const;

  for (const [field, value] of [
    ["providerName", 123],
    ["providerEventReference", { value: "event-42" }],
    ["companyName", ["Example Manufacturing Ltd"]],
    ["companyDomain", 42],
    ["firstSeenAt", true],
    ["lastSeenAt", 20260923],
    ["matchConfidence", "92"],
    ["providerMatchVerified", "true"],
    ["visitedPaths", "/business-energy"],
    ["visitedPaths", ["/business-energy", 123]],
  ] as const) {
    assert.throws(
      () => buildWebsiteCompanyObservation(
        { ...base, [field]: value } as unknown as Parameters<typeof buildWebsiteCompanyObservation>[0],
      ),
      /invalid_|provider_event/,
    );
  }

  const withExtra = buildWebsiteCompanyObservation({
    ...base,
    unreviewedProviderField: "discard-me",
  } as typeof base & { unreviewedProviderField: string });
  assert.equal("unreviewedProviderField" in withExtra, false);
});

test("provider verification must be a real boolean before provenance is derived", () => {
  for (const providerMatchVerified of ["true", 1]) {
    assert.throws(
      () => websiteObservation({ providerMatchVerified: providerMatchVerified as never }),
      /invalid_provider_match_verification/,
    );
  }

  const forgedObservation = {
    ...websiteObservation(),
    providerMatchVerified: "true" as never,
  };

  assert.throws(
    () => mapWebsiteCompanyObservationToIntentSignal(forgedObservation),
    /invalid_provider_match_verification/,
  );
});

test("direct mapper revalidates the full observation instead of trusting typed callers", () => {
  const canonical = websiteObservation();
  assert.throws(
    () => mapWebsiteCompanyObservationToIntentSignal({
      ...canonical,
      matchConfidence: "99" as unknown as number,
    }),
    /invalid_match_confidence/,
  );
  assert.throws(
    () => mapWebsiteCompanyObservationToIntentSignal({
      ...canonical,
      visitedPaths: ["/business-energy", 42] as unknown as string[],
    }),
    /invalid_visited_paths/,
  );
});

test("strong company identification stays website context and cannot bootstrap Apollo", () => {
  const observation = websiteObservation();

  const signal = mapWebsiteCompanyObservationToIntentSignal(observation);
  const assessment = assessWebsiteCompanySignal(signal, "2026-09-23T20:00:00Z");

  assert.equal(signal.source, "WEBSITE_IDENTIFICATION");
  assert.equal(signal.strength, "STRONG");
  assert.equal(assessment.apolloEnrichmentAllowed, false);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});

test("unverified provider match is explicitly inference", () => {
  const observation = websiteObservation({
    providerEventReference: "event-weak",
    matchConfidence: 58,
    providerMatchVerified: false,
    visitedPaths: [],
  });

  const signal = mapWebsiteCompanyObservationToIntentSignal(observation);
  assert.equal(signal.evidenceBasis, "INFERENCE");
  assert.equal(signal.sourceVerified, false);
  assert.equal(signal.strength, "WEAK");
});
