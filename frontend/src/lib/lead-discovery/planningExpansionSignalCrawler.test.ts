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
  assert.equal(plan.aggregateDatasetCanCreateVerifiedCompanyFact, false);
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
  assert.equal(signal.provenance, "PUBLIC_OFFICIAL");

  const assessment = assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z");
  assert.equal(assessment.apolloEnrichmentAllowed, true);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});

test("runtime enum lookalikes fail closed instead of becoming address-match inference", () => {
  assert.throws(
    () => mapPlanningApplicationToIntentSignal(company, {
      ...localAuthorityApplication,
      matchBasis: "CLAIMED_MATCH" as never,
    }),
    /invalid_planning_match_basis/,
  );

  assert.throws(
    () => mapPlanningApplicationToIntentSignal(company, {
      ...localAuthorityApplication,
      sourceTier: "TRUSTED_LOCAL_AUTHORITY" as never,
    }),
    /invalid_planning_source_tier/,
  );
});

test("runtime record fields fail closed instead of throwing through string methods", () => {
  for (const [field, value] of [
    ["applicationReference", 123],
    ["description", { value: "new factory" }],
    ["status", true],
    ["receivedAt", ["2026-09-20T09:00:00Z"]],
    ["sourceUrl", 999],
    ["applicantName", { value: "Example Manufacturing Ltd" }],
    ["siteAddress", ["1 Industrial Way"]],
  ] as const) {
    assert.throws(
      () => mapPlanningApplicationToIntentSignal(
        company,
        { ...localAuthorityApplication, [field]: value } as unknown as typeof localAuthorityApplication,
      ),
      /invalid_planning_/,
    );
  }
});

test("runtime company identity fields are revalidated at the mapper boundary", () => {
  assert.throws(
    () => mapPlanningApplicationToIntentSignal(
      { ...company, companyName: 123 as unknown as string },
      localAuthorityApplication,
    ),
    /invalid_planning_company_name/,
  );

  assert.throws(
    () => mapPlanningApplicationToIntentSignal(
      { ...company, companyNumber: true as unknown as string },
      localAuthorityApplication,
    ),
    /invalid_planning_company_number/,
  );

  assert.throws(
    () => mapPlanningApplicationToIntentSignal(
      { ...company, companyDomain: { value: "example-manufacturing.co.uk" } as unknown as string },
      localAuthorityApplication,
    ),
    /invalid_planning_company_domain/,
  );
});

test("caller-claimed local-authority tier cannot verify an arbitrary web source", () => {
  const signal = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "ABC/2026/UNTRUSTED-SOURCE",
    sourceUrl: "https://planning-example.com/application/ABC-2026-UNTRUSTED-SOURCE",
  });

  assert.ok(signal);
  assert.equal(signal.evidenceBasis, "INFERENCE");
  assert.equal(signal.sourceVerified, false);
  assert.equal(signal.provenance, "PUBLIC_WEB");
  assert.equal(signal.strength, "MEDIUM");
  assert.equal(assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z").apolloEnrichmentAllowed, false);
});

test("aggregate planning host cannot be promoted by relabeling it as local authority", () => {
  const signal = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "MHCLG-MISLABELLED-42",
    sourceUrl: "https://www.planning.data.gov.uk/entity/42",
  });

  assert.ok(signal);
  assert.equal(signal.evidenceBasis, "INFERENCE");
  assert.equal(signal.sourceVerified, false);
  assert.equal(signal.provenance, "PUBLIC_OFFICIAL");
  assert.equal(assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z").apolloEnrichmentAllowed, false);
});

test("claimed exact applicant matches are ignored unless the applicant actually matches the company", () => {
  const signal = mapPlanningApplicationToIntentSignal(company, {
    ...localAuthorityApplication,
    applicationReference: "ABC/2026/FALSE-MATCH",
    applicantName: "Different Manufacturing Ltd",
  });

  assert.equal(signal, null);
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
  assert.equal(signal.provenance, "PUBLIC_OFFICIAL");
  assert.equal(assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z").apolloEnrichmentAllowed, false);
});

test("invalid planning timestamps fail closed", () => {
  assert.throws(
    () => mapPlanningApplicationToIntentSignal(company, {
      ...localAuthorityApplication,
      applicationReference: "ABC/2026/TZ-FREE",
      receivedAt: "2026-09-20T09:00:00",
    }),
    /invalid_planning_date/,
  );

  assert.throws(
    () => mapPlanningApplicationToIntentSignal(company, {
      ...localAuthorityApplication,
      applicationReference: "ABC/2026/IMPOSSIBLE",
      receivedAt: "2026-02-31T09:00:00Z",
    }),
    /invalid_planning_date/,
  );
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
  assert.throws(() => planPlanningApplicationCrawl(Number.MAX_SAFE_INTEGER + 1), /invalid_offset/);
});
