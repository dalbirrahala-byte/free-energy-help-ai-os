import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpportunityProfile,
  buildPriorityQueue,
  deduplicateEvidence,
  type IntelligenceEvidence,
} from "./intelligenceOrchestration";

const evidence = (
  source: IntelligenceEvidence["source"],
  sourceReference: string,
  signalFamily = "BUSINESS_CHANGE",
  confidence = 0.9,
): IntelligenceEvidence => ({
  source,
  sourceReference,
  organisationKey: "acme-ltd",
  signalFamily,
  confidence,
  observedAt: "2026-09-01T12:00:00.000Z",
  summary: "Reviewed evidence",
});

const clearIntake = (items: IntelligenceEvidence[]) => ({
  organisationKey: "acme-ltd",
  identityState: "CONFIRMED" as const,
  complianceState: "CLEAR" as const,
  suppressionMatched: false,
  evidence: items,
});

test("deduplicates equivalent evidence and keeps strongest confidence", () => {
  const items = deduplicateEvidence([
    evidence("PUBLIC_WEB", "https://example.com/a", "BUSINESS_CHANGE", 0.6),
    evidence("PUBLIC_WEB", "https://example.com/a", "BUSINESS_CHANGE", 0.9),
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.confidence, 0.9);
});

test("suppression blocks promotion and execution", () => {
  const result = buildOpportunityProfile({ ...clearIntake([evidence("PUBLIC_WEB", "a")]), suppressionMatched: true });
  assert.equal(result.priority, "HOLD");
  assert.equal(result.nextBestAction, "HOLD_SUPPRESSED");
  assert.equal(result.promotionStatus, "BLOCKED");
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.executionPerformed, false);
});

test("candidate identity requires review before promotion", () => {
  const result = buildOpportunityProfile({ ...clearIntake([evidence("PUBLIC_WEB", "a")]), identityState: "CANDIDATE" });
  assert.equal(result.nextBestAction, "REVIEW_IDENTITY");
  assert.equal(result.promotionStatus, "BLOCKED");
});

test("clear diverse evidence reaches high-priority human contact-path review only", () => {
  const result = buildOpportunityProfile(clearIntake([
    evidence("PUBLIC_WEB", "a", "BUSINESS_CHANGE", 1),
    evidence("WEBSITE", "b", "ENERGY_DEMAND", 1),
    evidence("CRM_HISTORY", "c", "PROCUREMENT", 1),
  ]));
  assert.equal(result.priority, "HIGH");
  assert.equal(result.nextBestAction, "REVIEW_CONTACT_PATH");
  assert.equal(result.promotionStatus, "REVIEW_REQUIRED");
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.executionPerformed, false);
});

test("zero evidence fails closed to research more", () => {
  const result = buildOpportunityProfile(clearIntake([]));
  assert.equal(result.priority, "LOW");
  assert.equal(result.nextBestAction, "RESEARCH_MORE");
  assert.equal(result.promotionStatus, "BLOCKED");
});

test("priority queue orders high-value profiles before holds", () => {
  const high = clearIntake([
    evidence("PUBLIC_WEB", "a", "BUSINESS_CHANGE", 1),
    evidence("WEBSITE", "b", "ENERGY_DEMAND", 1),
    evidence("CRM_HISTORY", "c", "PROCUREMENT", 1),
  ]);
  const hold = { ...clearIntake([evidence("PUBLIC_WEB", "d")]), organisationKey: "blocked-ltd", suppressionMatched: true, evidence: [{ ...evidence("PUBLIC_WEB", "d"), organisationKey: "blocked-ltd" }] };
  const queue = buildPriorityQueue([hold, high]);
  assert.equal(queue[0]?.priority, "HIGH");
  assert.equal(queue[1]?.priority, "HOLD");
});
