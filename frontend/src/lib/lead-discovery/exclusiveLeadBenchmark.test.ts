import assert from "node:assert/strict";
import test from "node:test";

import { buildControlledLeadBenchmark } from "./exclusiveLeadBenchmark.ts";

const base = {
  windowStart: "2026-10-01T00:00:00Z",
  windowEnd: "2026-10-31T23:59:59Z",
  qualificationDefinitionVersion: "feh-qualified-opportunity-v1",
  evidenceBasis: "OBSERVED_VERIFIED" as const,
} as const;

function exclusive(overrides = {}) {
  return {
    ...base,
    sourceKind: "EXCLUSIVE_PROVIDER" as const,
    sourceName: "Controlled Provider A",
    sourceReference: "provider-trial-ledger:2026-10",
    acquisitionCostMinor: 100000,
    rawLeads: 100,
    qualifiedOpportunities: 10,
    signedContracts: 2,
    ...overrides,
  };
}

function feh(overrides = {}) {
  return {
    ...base,
    sourceKind: "FEH_GENERATED" as const,
    sourceName: "FEH Intent Radar",
    sourceReference: "feh-channel-ledger:2026-10",
    acquisitionCostMinor: 45000,
    rawLeads: 35,
    qualifiedOpportunities: 9,
    signedContracts: 3,
    ...overrides,
  };
}

test("benchmark ranks cost per qualified opportunity and signed contract, not raw volume", () => {
  const benchmark = buildControlledLeadBenchmark(exclusive(), feh());

  assert.equal(benchmark.status, "READY_FOR_HUMAN_REVIEW");
  assert.equal(benchmark.qualifiedEconomicsWinner, "FEH_GENERATED");
  assert.equal(benchmark.signedContractEconomicsWinner, "FEH_GENERATED");
  assert.equal(benchmark.exclusiveProvider.sourceReference, "provider-trial-ledger:2026-10");
  assert.equal(benchmark.fehGenerated.sourceReference, "feh-channel-ledger:2026-10");
  assert.equal(benchmark.providerPurchaseAllowed, false);
  assert.equal(benchmark.budgetChangeAllowed, false);
  assert.equal(benchmark.crmWriteAllowed, false);
});

test("estimated provider claims cannot be declared an economics winner", () => {
  const benchmark = buildControlledLeadBenchmark(
    exclusive({
      evidenceBasis: "ESTIMATED",
      sourceReference: "public-provider-price-page:2026-09-23",
    }),
    feh(),
  );

  assert.equal(benchmark.status, "BLOCKED");
  assert.equal(benchmark.qualifiedEconomicsWinner, "INSUFFICIENT_DATA");
  assert.equal(benchmark.signedContractEconomicsWinner, "INSUFFICIENT_DATA");
  assert.ok(benchmark.reasons.some((reason) => reason.includes("observed verified cohort data")));
});

test("different observation windows block the benchmark", () => {
  const benchmark = buildControlledLeadBenchmark(
    exclusive({ acquisitionCostMinor: 50000, rawLeads: 20, qualifiedOpportunities: 5, signedContracts: 1 }),
    feh({
      windowEnd: "2026-11-30T23:59:59Z",
      acquisitionCostMinor: 50000,
      rawLeads: 20,
      qualifiedOpportunities: 5,
      signedContracts: 1,
    }),
  );

  assert.equal(benchmark.status, "BLOCKED");
  assert.equal(benchmark.qualifiedEconomicsWinner, "INSUFFICIENT_DATA");
});

test("different qualification definitions block the benchmark", () => {
  const benchmark = buildControlledLeadBenchmark(
    exclusive({ acquisitionCostMinor: 50000, rawLeads: 20, qualifiedOpportunities: 5, signedContracts: 1 }),
    feh({
      qualificationDefinitionVersion: "different-definition",
      acquisitionCostMinor: 50000,
      rawLeads: 20,
      qualifiedOpportunities: 5,
      signedContracts: 1,
    }),
  );

  assert.equal(benchmark.status, "BLOCKED");
});

test("benchmark windows require explicit timezone and real calendar instants", () => {
  assert.throws(
    () => buildControlledLeadBenchmark(exclusive({ windowStart: "2026-10-01T00:00:00" }), feh()),
    /invalid_window_start/,
  );
  assert.throws(
    () => buildControlledLeadBenchmark(exclusive({ windowEnd: "2026-02-31T23:59:59Z" }), feh({ windowEnd: "2026-02-31T23:59:59Z" })),
    /invalid_window_end/,
  );
});

test("invalid or missing provenance fails closed", () => {
  assert.throws(
    () => buildControlledLeadBenchmark(exclusive({ sourceReference: "" }), feh()),
    /invalid_benchmark_source_reference/,
  );
  assert.throws(
    () => buildControlledLeadBenchmark(exclusive({ evidenceBasis: "GUESSED" }), feh()),
    /invalid_benchmark_evidence_basis/,
  );
});

test("invalid funnel counts fail closed", () => {
  assert.throws(
    () => buildControlledLeadBenchmark(
      exclusive({ acquisitionCostMinor: 50000, rawLeads: 2, qualifiedOpportunities: 3, signedContracts: 1 }),
      feh({ acquisitionCostMinor: 50000, rawLeads: 20, qualifiedOpportunities: 5, signedContracts: 1 }),
    ),
    /qualified_exceeds_raw_leads/,
  );
});
