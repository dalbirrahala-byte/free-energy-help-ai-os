import assert from "node:assert/strict";
import test from "node:test";

import {
  mapCompaniesHouseFilingToIntentSignal,
  normalizeCompaniesHouseFilingHistoryPayload,
  planCompaniesHouseFilingCrawl,
  selectCompaniesHouseTriggerSignals,
} from "./companiesHouseTriggerCrawler.ts";
import { assessIntentRadarSignal } from "./intentRadar.ts";

const company = {
  companyName: "Example Manufacturing Ltd",
  companyNumber: "12345678",
  companyDomain: "example-manufacturing.co.uk",
} as const;

const strongFiling = {
  transactionId: "tx-2026-sh01-1",
  type: "SH01",
  category: "capital",
  description: "Statement of capital following an allotment of shares",
  date: "2026-09-20",
} as const;

test("crawl plan is read-only, credential-free at planning time and does not execute", () => {
  const plan = planCompaniesHouseFilingCrawl("12345678");

  assert.equal(plan.method, "GET");
  assert.equal(plan.readOnly, true);
  assert.equal(plan.apiKeyRequired, true);
  assert.equal(plan.executionPerformed, false);
  assert.equal(plan.credentialAccessed, false);
  assert.equal(plan.maxRequestsPerWindow, 600);
  assert.equal(plan.rateLimitWindowSeconds, 300);
  assert.equal(plan.endpoint, "https://api.company-information.service.gov.uk/company/12345678/filing-history");
});

test("runtime payload normalization accepts official filing-history field names only", () => {
  const filings = normalizeCompaniesHouseFilingHistoryPayload({
    items: [
      {
        transaction_id: "tx-2026-sh01-1",
        type: "SH01",
        category: "capital",
        description: "Statement of capital following an allotment of shares",
        date: "2026-09-20",
        ignored_extra_field: "not persisted",
      },
    ],
    total_count: 1,
    start_index: 0,
    items_per_page: 25,
  });

  assert.deepEqual(filings, [strongFiling]);
  assert.equal(selectCompaniesHouseTriggerSignals(company, filings).length, 1);
});

test("runtime payload normalization fails closed on non-object/non-array provider shapes", () => {
  for (const payload of [null, "items", [], { items: "not-an-array" }]) {
    assert.throws(
      () => normalizeCompaniesHouseFilingHistoryPayload(payload),
      /invalid_filing_history_/,
    );
  }
});

test("runtime payload normalization rejects truthy non-string filing evidence", () => {
  const base = {
    transaction_id: "tx-2026-sh01-1",
    type: "SH01",
    category: "capital",
    description: "Statement of capital following an allotment of shares",
    date: "2026-09-20",
  };

  for (const [field, value] of [
    ["transaction_id", 123],
    ["type", true],
    ["category", { value: "capital" }],
    ["description", ["allotment"]],
    ["date", 20260920],
  ] as const) {
    assert.throws(
      () => normalizeCompaniesHouseFilingHistoryPayload({
        items: [{ ...base, [field]: value }],
      }),
      /invalid_filing_/,
    );
  }
});

test("recognized official filing maps to a verified Intent Radar fact", () => {
  const signal = mapCompaniesHouseFilingToIntentSignal(company, strongFiling);
  assert.ok(signal);
  assert.equal(signal.source, "COMPANIES_HOUSE");
  assert.equal(signal.evidenceBasis, "VERIFIED_FACT");
  assert.equal(signal.sourceVerified, true);
  assert.equal(signal.provenance, "PUBLIC_OFFICIAL");
  assert.equal(signal.signalType, "SHARE_ALLOTMENT_FILED");
  assert.equal(signal.strength, "STRONG");
  assert.equal(signal.observedAt, "2026-09-20T00:00:00.000Z");

  const assessment = assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z");
  assert.equal(assessment.apolloEnrichmentAllowed, true);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});

test("unknown filing types are ignored rather than guessed", () => {
  const signal = mapCompaniesHouseFilingToIntentSignal(company, {
    transactionId: "tx-unknown",
    type: "ZZ99",
    category: "other",
    description: "Unknown filing",
    date: "2026-09-20",
  });

  assert.equal(signal, null);
});

test("AA-prefixed filing types are not guessed as accounts filings", () => {
  const signal = mapCompaniesHouseFilingToIntentSignal(company, {
    transactionId: "tx-aa01",
    type: "AA01",
    category: "accounts",
    description: "Accounting reference date changed",
    date: "2026-09-19",
  });

  assert.equal(signal, null);
});

test("exact AA accounts filing keeps the cautious medium trigger", () => {
  const signal = mapCompaniesHouseFilingToIntentSignal(company, {
    transactionId: "tx-aa-accounts",
    type: "AA",
    category: "accounts",
    description: "Accounts filed",
    date: "2026-09-19",
  });

  assert.ok(signal);
  assert.equal(signal.signalType, "ACCOUNTS_FILED");
  assert.equal(signal.strength, "MEDIUM");
  assert.equal(assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z").apolloEnrichmentAllowed, false);
});

test("invalid and impossible filing dates fail closed instead of rolling forward", () => {
  assert.throws(
    () => mapCompaniesHouseFilingToIntentSignal(company, {
      ...strongFiling,
      transactionId: "tx-bad-shape",
      date: "20/09/2026",
    }),
    /invalid_filing_date/,
  );

  assert.throws(
    () => mapCompaniesHouseFilingToIntentSignal(company, {
      ...strongFiling,
      transactionId: "tx-impossible-date",
      date: "2026-02-31",
    }),
    /invalid_filing_date/,
  );
});

test("selector deduplicates filings and orders newest first", () => {
  const older = {
    transactionId: "tx-ad01",
    type: "AD01",
    category: "address",
    description: "Registered office address changed",
    date: "2026-09-18",
  } as const;

  const signals = selectCompaniesHouseTriggerSignals(company, [older, strongFiling, strongFiling]);
  assert.equal(signals.length, 2);
  assert.equal(signals[0]?.signalType, "SHARE_ALLOTMENT_FILED");
  assert.equal(signals[1]?.signalType, "REGISTERED_OFFICE_CHANGED");
});

test("company numbers require the canonical eight-character API form", () => {
  const alphaPrefix = planCompaniesHouseFilingCrawl("sc123456");
  assert.equal(
    alphaPrefix.endpoint,
    "https://api.company-information.service.gov.uk/company/SC123456/filing-history",
  );

  for (const invalid of [
    "not-a-company-number",
    "1234567",
    "123456789",
    "SC12345",
    "SC1234567",
  ]) {
    assert.throws(() => planCompaniesHouseFilingCrawl(invalid), /invalid_company_number/);
  }
});
