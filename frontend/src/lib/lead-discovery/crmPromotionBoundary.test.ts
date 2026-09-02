import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCrmPromotionReview,
} from "./crmPromotionBoundary.ts";
import {
  evaluateFehIntelligence,
} from "./factory044Intelligence.ts";
import {
  buildPublicWebEvidence,
} from "./factory044Discovery.ts";

function strongEvidence() {
  return [
    buildPublicWebEvidence({
      candidateName: "Factory Example Ltd",
      sourceUrl: "https://example.com/factory-expansion",
      sourceTitle: "Factory expansion announced",
      sourceExcerpt: null,
      observedAt: "2026-09-02T12:00:00.000Z",
      signalFamily: "BUSINESS_CHANGE",
      signalType: "expansion",
      sourceVerified: true,
      aiInferred: false,
      confidence: 90,
      provenance: "PUBLIC",
    }),
    buildPublicWebEvidence({
      candidateName: "Factory Example Ltd",
      sourceUrl: "https://example.org/new-site",
      sourceTitle: "New industrial site confirmed",
      sourceExcerpt: null,
      observedAt: "2026-09-02T12:05:00.000Z",
      signalFamily: "PROPERTY_DEVELOPMENT",
      signalType: "new_site",
      sourceVerified: true,
      aiInferred: false,
      confidence: 90,
      provenance: "PUBLIC",
    }),
  ];
}

test("allows only human review when intelligence gates are clear", () => {
  const decision = evaluateFehIntelligence({
    evidence: strongEvidence(),
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  const result = evaluateCrmPromotionReview(
    "Factory Example Ltd",
    decision,
  );

  assert.equal(result.status, "READY_FOR_HUMAN_REVIEW");
  assert.equal(result.humanApprovalRequired, true);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});

test("blocks promotion when compliance is not clear", () => {
  const decision = evaluateFehIntelligence({
    evidence: strongEvidence(),
    identityResolution: "CONFIRMED",
    complianceState: "REVIEW_REQUIRED",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  const result = evaluateCrmPromotionReview(
    "Factory Example Ltd",
    decision,
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /Compliance must be clear/);
  assert.equal(result.crmWritePerformed, false);
});

test("blocks promotion when identity is not confirmed", () => {
  const decision = evaluateFehIntelligence({
    evidence: strongEvidence(),
    identityResolution: "CANDIDATE",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  const result = evaluateCrmPromotionReview(
    "Factory Example Ltd",
    decision,
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /identity must be confirmed/i);
});

test("blocks promotion when suppression is matched", () => {
  const decision = evaluateFehIntelligence({
    evidence: strongEvidence(),
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: true,
    knownCrmRelationship: false,
  });

  const result = evaluateCrmPromotionReview(
    "Factory Example Ltd",
    decision,
  );

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /Suppression match/);
});

test("blocks promotion when organisation name is missing", () => {
  const decision = evaluateFehIntelligence({
    evidence: strongEvidence(),
    identityResolution: "CONFIRMED",
    complianceState: "CLEAR",
    suppressionMatched: false,
    knownCrmRelationship: false,
  });

  const result = evaluateCrmPromotionReview("   ", decision);

  assert.equal(result.status, "BLOCKED");
  assert.match(result.reasons.join(" "), /Organisation name is required/);
});
