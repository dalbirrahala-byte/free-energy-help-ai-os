import assert from "node:assert/strict";
import { test } from "node:test";

import type { RenewalIntelligence } from "@/lib/renewal-intelligence";

import { compareRenewalOutputs, runRenewalShadowDeployment } from "./renewalShadowDeployment.ts";
import type { LeadRecord, RenewalIntelligenceV2Result } from "./types";

function makeV1(overrides: Partial<{ urgency: string; days: number | null; contractEnd: string; tender: string }> = {}): RenewalIntelligence {
  const days = overrides.days ?? 9;
  return {
    contractEnd: { value: overrides.contractEnd ?? "13 Aug 2026", explanation: "x" },
    daysRemaining: { value: `${days} days`, explanation: "x", days },
    urgency: { value: overrides.urgency ?? "Critical", tier: (overrides.urgency ?? "Critical") as RenewalIntelligence["urgency"]["tier"], explanation: "x" },
    procurementStatus: { value: "Immediate tender or renewal action required", explanation: "x" },
    recommendedNextAction: { value: "Immediate tender or renewal action required", explanation: "x" },
    suggestedTenderWindow: { value: overrides.tender ?? "Tender window already open", explanation: "x" },
  };
}

function makeV2(overrides: Partial<RenewalIntelligenceV2Result> = {}): RenewalIntelligenceV2Result {
  return {
    contractEndDate: "2026-08-13",
    daysRemaining: 9,
    urgency: "Critical",
    procurementStatus: "Immediate tender or renewal action required",
    tenderStartDate: "2026-02-14",
    tenderWindowStatus: "Open",
    recommendedNextAction: "Immediate tender or renewal action required",
    explanation: "y",
    confidence: "High",
    dataSource: "lead.contract_end",
    calculatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("compareRenewalOutputs: identical results match", () => {
  const result = compareRenewalOutputs(makeV1(), makeV2());
  assert.equal(result.matches, true);
  assert.deepEqual(result.mismatches, []);
});

test("compareRenewalOutputs: differing urgency is caught", () => {
  const result = compareRenewalOutputs(makeV1({ urgency: "Critical" }), makeV2({ urgency: "Urgent" }));
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.startsWith("urgency:")));
});

test("compareRenewalOutputs: differing daysRemaining is caught", () => {
  const result = compareRenewalOutputs(makeV1({ days: 9 }), makeV2({ daysRemaining: 10 }));
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.startsWith("daysRemaining:")));
});

test("compareRenewalOutputs: differing procurementStatus is caught", () => {
  const v2 = makeV2({ procurementStatus: "Something else entirely" });
  const result = compareRenewalOutputs(makeV1(), v2);
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.startsWith("procurementStatus:")));
});

test("compareRenewalOutputs: differing contract end date is caught", () => {
  const result = compareRenewalOutputs(makeV1({ contractEnd: "13 Aug 2026" }), makeV2({ contractEndDate: "2026-08-14" }));
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.startsWith("contractEnd:")));
});

test("compareRenewalOutputs: same tender-window date in different formats is NOT a false mismatch", () => {
  // V1 displays "14 Feb 2026"; V2 stores the same calendar date as ISO "2026-02-14".
  const v1 = makeV1({ tender: "14 Feb 2026" });
  const v2 = makeV2({ tenderWindowStatus: "Scheduled", tenderStartDate: "2026-02-14" });
  const result = compareRenewalOutputs(v1, v2);
  assert.equal(result.matches, true);
});

test("compareRenewalOutputs: genuinely different tender-window dates are caught", () => {
  const v1 = makeV1({ tender: "14 Feb 2026" });
  const v2 = makeV2({ tenderWindowStatus: "Scheduled", tenderStartDate: "2026-02-20" });
  const result = compareRenewalOutputs(v1, v2);
  assert.equal(result.matches, false);
  assert.ok(result.mismatches.some((m) => m.startsWith("tenderWindow:")));
});

function makeLead(contractEnd: string | null): LeadRecord {
  return {
    id: 999,
    created_at: "2026-01-01T00:00:00.000Z",
    company_name: "Shadow Test Co",
    contact_name: null,
    telephone: null,
    email: null,
    supplier: null,
    contract_end: contractEnd,
    status: "New",
    notes: null,
    lead_source: null,
    source_detail: null,
    source_provenance: "user-entered",
  };
}

test("runRenewalShadowDeployment: real V1 and V2 agree on real input, so V2 is displayed", () => {
  delete process.env.USE_COMMERCIAL_INTELLIGENCE_V2;

  const today = new Date(2027, 0, 1);
  const lead = makeLead("2027-01-10");
  const outcome = runRenewalShadowDeployment(lead, today);

  assert.equal(outcome.source, "v2-validated");
  assert.equal(outcome.result.urgency.tier, "Critical");
  assert.equal(outcome.result.daysRemaining.days, 9);
});

test("runRenewalShadowDeployment: flag disabled skips V2 entirely and returns V1", () => {
  process.env.USE_COMMERCIAL_INTELLIGENCE_V2 = "false";

  try {
    const today = new Date(2027, 0, 1);
    const lead = makeLead("2027-01-10");
    const outcome = runRenewalShadowDeployment(lead, today);

    assert.equal(outcome.source, "v1-flag-disabled");
    assert.equal(outcome.result.urgency.tier, "Critical");
  } finally {
    delete process.env.USE_COMMERCIAL_INTELLIGENCE_V2;
  }
});

test("runRenewalShadowDeployment: missing contract end date fails safe on both engines and still matches", () => {
  delete process.env.USE_COMMERCIAL_INTELLIGENCE_V2;

  const today = new Date(2027, 0, 1);
  const lead = makeLead(null);
  const outcome = runRenewalShadowDeployment(lead, today);

  assert.equal(outcome.source, "v2-validated");
  assert.equal(outcome.result.urgency.tier, "Unknown");
  assert.equal(outcome.result.daysRemaining.days, null);
});
