import assert from "node:assert/strict";
import test from "node:test";

import {
  mapPlanningApplicationToIntentSignal,
  planPlanningApplicationCrawl,
  selectPlanningExpansionSignals,
} from "./planningExpansionSignalCrawler.ts";
import { assessIntentRadarSignal } from "./intentRadar.ts";

const company = {
  companyName: "Example Manufacturing Ltd",
  companyNumber: "12345678",
  companyDomain: "example-manufacturing.co.uk",
} as const;

const localAuthorityApplication = {
  applicationReference: "ABC/2026/1001",
  description: "Erection of a new factory and production facility with associated loading yard",
  status: "full-application-submitted",
  receivedAt: "2026-09-20T09:00:00Z",
  sourceUrl: "https://planning.example.gov.uk/application/ABC-2026-1001",
  sourceTier: "LOCAL_AUTHORITY",
  applicantName: "Example Manufacturing Ltd",
  siteAddress: "1 Industrial Way, Derby",
  matchBasis: "EXACT_APPLICANT_NAME",
} as const;

test("planning crawl plan is public read-only preparation with no execution", () => {
  const plan = planPlanningApplicationCrawl(100);

  assert.equal(plan.method, "GET");
  assert.equal(plan.dataset, "planning-application");
  assert.equal(plan.readOnly, true);
  assert.equal(plan.politeRateLimitRequired, true);
  assert.equal(plan.bulkDownloadPreferredForLargeScans, true);
  assert.equal(plan.executionPerformed, false);
  assert.match(plan.endpoint, /dataset=planning-application/);
  assert.match(plan.endpoint, /limit=100/);
  assert.match(plan.endpoint, /offset=100/);
});

test("authoritative exact-applicant expansion can become a strong verified review signal", () => {
  const signal = mapPlanningApplicationToIntentSignal(company, localAuthorityApplication);
  assert.ok(signal);
  assert.equal(signal.evidenceBasis, "VERIFIED_FACT");
  assert.equal(signal.sourceVerified, true);
  assert.equal(signal.strength, "STRONG");
  assert.equal(signal.source, "PLANNING");

  const assessment = assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z");
  assert.equal(assessment.apolloEnrichmentAllowed, true);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});

test("MHCLG aggregate or address-only association remains inference", () => {
  const signal = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "MHCLG-42",
    sourceUrl: "https://www.planning.data.gov.uk/entity/42",
    sourceTier: "MHCLG_AGGREGATE",
    matchBasis: "CRM_SITE_ADDRESS",
    applicantName: null,
  });

  assert.ok(signal);
  assert.equal(signal.evidenceBasis, "INFERENCE");
  assert.equal(signal.sourceVerified, false);
  assert.equal(signal.strength, "MEDIUM");
  assert.equal(assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z").apolloEnrichmentAllowed, false);
});

test("negative terminal outcomes are ignored", () => {
  const signal = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "ABC/2026/REFUSED",
    status: "refused",
  });

  assert.equal(signal, null);
});

test("no company match or no expansion language is ignored instead of guessed", () => {
  const noMatch = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "ABC/2026/NOMATCH",
    matchBasis: "NONE",
  });
  assert.equal(noMatch, null);

  const noExpansion = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "ABC/2026/SIGN",
    description: "Replacement illuminated fascia sign",
  });
  assert.equal(noExpansion, null);
});

test("selector deduplicates planning records", () => {
  const signals = selectPlanningExpansionSignals(company, [localAuthorityApplication, localAuthorityApplication]);
  assert.equal(signals.length, 1);
});

test("invalid offsets fail closed", () => {
  assert.throws(() => planPlanningApplicationCrawl(-1), /invalid_offset/);
  assert.throws(() => planPlanningApplicationCrawl(1.5), /invalid_offset/);
});
