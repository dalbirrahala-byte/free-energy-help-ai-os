import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicWebEvidence } from "./factory044Discovery.ts";
import { evaluateFehIntelligence } from "./factory044Intelligence.ts";

const evidence = [
  buildPublicWebEvidence({
    candidateName: "Example Manufacturing Ltd",
    candidateDomain: "example.co.uk",
    sourceUrl: "https://example.com/news/expansion",
    sourceTitle: "Factory expansion announced",
    sourceExcerpt: "New production line and warehouse expansion.",
    observedAt: "2026-09-01T12:00:00.000Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "expansion",
    sourceVerified: true,
    aiInferred: false,
    confidence: 90,
    provenance: "PUBLIC",
  }),
  buildPublicWebEvidence({
    candidateName: "Example Manufacturing Ltd",
    candidateDomain: "example.co.uk",
    sourceUrl: "https://planning.example.gov.uk/example-manufacturing",
    sourceTitle: "Planning application",
    sourceExcerpt: "Extension to industrial premises.",
    observedAt: "2026-09-01T12:05:00.000Z",
    signalFamily: "PROPERTY_DEVELOPMENT",
    signalType: "planning application",
    sourceVerified: true,
    aiInferred: false,
    confidence: 85,
    provenance: "PUBLIC",
  }),
] as const;

test("confirmed, clear opportunities reach human contact-path review but never outreach", () => {
  const decision = evaluateFehIntelligence({
    evidence,
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  assert.equal(decision.nextBestAction, "REVIEW_CONTACT_PATH");
  assert.equal(decision.promotionStatus, "REVIEW_REQUIRED");
  assert.equal(decision.outreachAllowed, false);
  assert.equal(decision.crmWritePerformed, false);
  assert.equal(decision.executionPerformed, false);
});

test("suppression wins over a strong opportunity", () => {
  const decision = evaluateFehIntelligence({
    evidence,
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: true,
    knownCrmRelationship: true,
  });

  assert.equal(decision.nextBestAction, "HOLD_SUPPRESSED");
  assert.equal(decision.promotionStatus, "BLOCKED");
  assert.equal(decision.outreachAllowed, false);
});

test("compliance review is required before contact-path review", () => {
  const decision = evaluateFehIntelligence({
    evidence,
    identityResolution: "CONFIRMED",
    complianceState: "REVIEW_REQUIRED",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  assert.equal(decision.nextBestAction, "REVIEW_COMPLIANCE");
  assert.equal(decision.promotionStatus, "REVIEW_REQUIRED");
});

test("unresolved identity fails closed", () => {
  const decision = evaluateFehIntelligence({
    evidence,
    identityResolution: "UNRESOLVED",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  assert.equal(decision.nextBestAction, "REVIEW_IDENTITY");
  assert.equal(decision.promotionStatus, "BLOCKED");
});

test("no evidence asks for more research", () => {
  const decision = evaluateFehIntelligence({
    evidence: [],
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  assert.equal(decision.opportunity.classification, "INSUFFICIENT_EVIDENCE");
  assert.equal(decision.nextBestAction, "RESEARCH_MORE");
  assert.equal(decision.promotionStatus, "BLOCKED");
});

test("malformed evidence is rejected fail-closed instead of throwing", () => {
  const malformed = [{ ...evidence[0], sourceUrl: "not-a-url" }];
  const decision = evaluateFehIntelligence({
    evidence: malformed,
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  assert.equal(decision.opportunity.score, 0);
  assert.equal(decision.nextBestAction, "RESEARCH_MORE");
  assert.equal(decision.promotionStatus, "BLOCKED");
});
