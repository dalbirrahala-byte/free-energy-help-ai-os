import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDiscoveryQueries,
  buildPublicWebEvidence,
  evaluateOpportunityEvidence,
  type PublicWebEvidence,
} from "./factory044Discovery.ts";

test("query planning is deterministic and produces explicit signal searches", () => {
  const request = {
    sector: "manufacturing",
    locations: ["Derby", "Burton upon Trent", "Derby"],
    signalFamilies: ["PROPERTY_DEVELOPMENT", "BUSINESS_CHANGE"] as const,
  };
  const first = buildDiscoveryQueries(request);
  const second = buildDiscoveryQueries(request);
  assert.deepEqual(first, second);
  assert.equal(first.length, 12);
  assert.ok(first.some((item) => item.query.includes('"planning application"')));
  assert.ok(first.some((item) => item.query.includes('"expansion"')));
});

test("named-business planning produces copyable exact-phrase searches", () => {
  const queries = buildDiscoveryQueries({
    businessName: "Example Engineering Ltd",
    locations: ["East Midlands"],
    signalFamilies: ["ENERGY_DEMAND"],
  });
  assert.deepEqual(queries.map((item) => item.query), [
    '"Example Engineering Ltd" "new machinery" "East Midlands"',
    '"Example Engineering Ltd" "production expansion" "East Midlands"',
    '"Example Engineering Ltd" "high energy use" "East Midlands"',
  ]);
});

test("planner fails closed when no business or sector anchor is supplied", () => {
  assert.deepEqual(buildDiscoveryQueries({ locations: ["Derby"], signalFamilies: ["BUSINESS_CHANGE"] }), []);
});

test("public-web evidence preserves provenance and rejects unsafe source shapes", () => {
  const evidence = buildPublicWebEvidence({
    candidateName: "Example Engineering Ltd",
    candidateDomain: "example.test",
    sourceUrl: "https://example.test/news/expansion",
    sourceTitle: "Factory expansion",
    sourceExcerpt: "New production line planned.",
    observedAt: "2026-09-01T10:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "expansion",
    sourceVerified: true,
    aiInferred: false,
    confidence: 90,
    provenance: "PUBLIC",
  });
  assert.equal(evidence.provenance, "PUBLIC");
  assert.throws(() => buildPublicWebEvidence({ ...evidence, sourceUrl: "javascript:alert(1)" }), /invalid_source_url/);
  assert.throws(() => buildPublicWebEvidence({ ...evidence, aiInferred: true, sourceVerified: true }), /inference_cannot_be_source_verified/);
});

test("opportunity evaluation is explainable and never self-promotes", () => {
  const base: PublicWebEvidence = {
    candidateName: "Example Engineering Ltd",
    candidateDomain: "example.test",
    sourceUrl: "https://example.test/news/expansion",
    sourceTitle: "Factory expansion",
    sourceExcerpt: "New production line planned.",
    observedAt: "2026-09-01T10:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "expansion",
    sourceVerified: true,
    aiInferred: false,
    confidence: 90,
    provenance: "PUBLIC",
  };

  const evaluation = evaluateOpportunityEvidence([
    base,
    { ...base, sourceUrl: "https://planning.example.gov/application/123", signalFamily: "PROPERTY_DEVELOPMENT", signalType: "planning_application", confidence: 95 },
    { ...base, sourceUrl: "https://trade.example.org/story", signalFamily: "ENERGY_DEMAND", signalType: "new_machinery", confidence: 85 },
  ]);

  assert.equal(evaluation.classification, "HOT");
  assert.equal(evaluation.promotionAllowed, false);
  assert.ok(evaluation.reasons.some((reason) => reason.includes("never grants contact permission")));
});

test("zero evidence is explicitly insufficient", () => {
  assert.deepEqual(evaluateOpportunityEvidence([]), {
    classification: "INSUFFICIENT_EVIDENCE",
    score: 0,
    reasons: ["No public-web evidence supplied."],
    promotionAllowed: false,
  });
});
