import assert from "node:assert/strict";
import test from "node:test";

import { buildControlledLeadBenchmark } from "./exclusiveLeadBenchmark.ts";

const base = {
  windowStart: "2026-10-01T00:00:00Z",
  windowEnd: "2026-10-31T23:59:59Z",
  qualificationDefinitionVersion: "feh-qualified-opportunity-v1",
} as const;

function exclusive(overrides = {}) {
  return {
    ...base,
    sourceKind: "EXCLUSIVE_PROVIDER" as const,
    sourceName: "Controlled Provider A",
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
  assert.equal(benchmark.providerPurchaseAllowed, false);
  assert.equal(benchmark.budgetChangeAllowed, false);
  assert.equal(benchmark.crmWriteAllowed, false);
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

test("invalid funnel counts fail closed", () => {
  assert.throws(
    () => buildControlledLeadBenchmark(
      exclusive({ acquisitionCostMinor: 50000, rawLeads: 2, qualifiedOpportunities: 3, signedContracts: 1 }),
      feh({ acquisitionCostMinor: 50000, rawLeads: 20, qualifiedOpportunities: 5, signedContracts: 1 }),
    ),
    /qualified_exceeds_raw_leads/,
  );
});
