import assert from "node:assert/strict";
import { test } from "node:test";

import { apolloDiscoveryAdapter, prepareLeadPromotionCandidate, publicWebDiscoveryAdapter } from "./discoveryAdapters.ts";
import { buildPublicWebEvidence } from "./factory044Discovery.ts";

const request = {
  sector: "manufacturing",
  locations: ["Derby"],
  signalFamilies: ["BUSINESS_CHANGE"] as const,
};

test("public-web adapter plans only and performs no network execution", () => {
  const plan = publicWebDiscoveryAdapter.plan(request);
  assert.equal(plan.status, "READY");
  assert.equal(plan.executionPerformed, false);
  assert.equal(plan.creditsConsumed, 0);
  assert.equal(plan.queries.length, 3);
});

test("Apollo adapter remains fail-closed and consumes no credits", () => {
  const plan = apolloDiscoveryAdapter.plan(request);
  assert.deepEqual(plan.queries, []);
  assert.equal(plan.status, "UNAVAILABLE");
  assert.equal(plan.executionPerformed, false);
  assert.equal(plan.creditsConsumed, 0);
  assert.match(plan.reason, /credit-spend gate/);
});

test("promotion candidate always requires human review and grants no outreach permission", () => {
  const evidence = buildPublicWebEvidence({
    candidateName: "Example Manufacturing Ltd",
    candidateDomain: "example.test",
    sourceUrl: "https://example.test/news/expansion",
    sourceTitle: "Expansion announced",
    sourceExcerpt: "A new production line is planned.",
    observedAt: "2026-09-01T14:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "expansion",
    sourceVerified: true,
    aiInferred: false,
    confidence: 90,
    provenance: "PUBLIC",
  });
  const candidate = prepareLeadPromotionCandidate([evidence]);
  assert.equal(candidate?.promotionStatus, "REVIEW_REQUIRED");
  assert.equal(candidate?.crmWritePerformed, false);
  assert.equal(candidate?.outreachPermissionGranted, false);
});
