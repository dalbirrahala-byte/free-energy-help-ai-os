import assert from "node:assert/strict";
import test from "node:test";

import { buildControlledLeadBenchmark } from "./exclusiveLeadBenchmark.ts";

const base = {
  windowStart: "2026-10-01T00:00:00Z",
  windowEnd: "2026-10-31T23:59:59Z",
  qualificationDefinitionVersion: "feh-qualified-opportunity-v1",
} as const;

test("benchmark ranks cost per qualified opportunity and signed contract, not raw volume", () => {
  const benchmark = buildControlledLeadBenchmark(
    {
      ...base,
      sourceKind: "EXCLUSIVE_PROVIDER",
      sourceName: "Controlled Provider A",
      acquisitionCostMinor: 100000,
      rawLeads: 100,
      qualifiedOpportunities: 10,
      signedContracts: 2,
    },
    {
      ...base,
      sourceKind: "FEH_GENERATED",
      sourceName: "FEH Intent Radar",
      acquisitionCostMinor: 45000,
      rawLeads: 35,
      qualifiedOpportunities: 9,
      signedContracts: 3,
    },
  );

  assert.equal(benchmark.status, "READY_FOR_HUMAN_REVIEW");
  assert.equal(benchmark.qualifiedEconomicsWinner, "FEH_GENERATED");
  assert.equal(benchmark.signedContractEconomicsWinner, "FEH_GENERATED");
  assert.equal(benchmark.providerPurchaseAllowed, false);
  assert.equal(benchmark.budgetChangeAllowed, false);
  assert.equal(benchmark.crmWriteAllowed, false);
});

test("different observation windows block the benchmark", () => {
  const benchmark = buildControlledLeadBenchmark(
    {
      ...base,
      sourceKind: "EXCLUSIVE_PROVIDER",
      sourceName: "Controlled Provider A",
      acquisitionCostMinor: 50000,
      rawLeads: 20,
      qualifiedOpportunities: 5,
      signedContracts: 1,
    },
    {
      ...base,
      windowEnd: "2026-11-30T23:59:59Z",
      sourceKind: "FEH_GENERATED",
      sourceName: "FEH Intent Radar",
      acquisitionCostMinor: 50000,
      rawLeads: 20,
      qualifiedOpportunities: 5,
      signedContracts: 1,
    },
  );

  assert.equal(benchmark.status, "BLOCKED");
  assert.equal(benchmark.qualifiedEconomicsWinner, "INSUFFICIENT_DATA");
});

test("different qualification definitions block the benchmark", () => {
  const benchmark = buildControlledLeadBenchmark(
    {
      ...base,
      sourceKind: "EXCLUSIVE_PROVIDER",
      sourceName: "Controlled Provider A",
      acquisitionCostMinor: 50000,
      rawLeads: 20,
      qualifiedOpportunities: 5,
      signedContracts: 1,
    },
    {
      ...base,
      qualificationDefinitionVersion: "different-definition",
      sourceKind: "FEH_GENERATED",
      sourceName: "FEH Intent Radar",
      acquisitionCostMinor: 50000,
      rawLeads: 20,
      qualifiedOpportunities: 5,
      signedContracts: 1,
    },
  );

  assert.equal(benchmark.status, "BLOCKED");
});

test("invalid funnel counts fail closed", () => {
  assert.throws(
    () => buildControlledLeadBenchmark(
      {
        ...base,
        sourceKind: "EXCLUSIVE_PROVIDER",
        sourceName: "Controlled Provider A",
        acquisitionCostMinor: 50000,
        rawLeads: 2,
        qualifiedOpportunities: 3,
        signedContracts: 1,
      },
      {
        ...base,
        sourceKind: "FEH_GENERATED",
        sourceName: "FEH Intent Radar",
        acquisitionCostMinor: 50000,
        rawLeads: 20,
        qualifiedOpportunities: 5,
        signedContracts: 1,
      },
    ),
    /qualified_exceeds_raw_leads/,
  );
});
