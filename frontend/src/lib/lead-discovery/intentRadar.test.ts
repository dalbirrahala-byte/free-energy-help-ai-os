import assert from "node:assert/strict";
import test from "node:test";

import {
  assessIntentRadarSignal,
  buildIntentRadarSignal,
  buildIntentRadarSnapshot,
} from "./intentRadar.ts";

const asOf = "2026-09-23T20:00:00.000Z";

function companiesHouseSignal() {
  return buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyNumber: "12345678",
    companyDomain: "example-manufacturing.co.uk",
    source: "COMPANIES_HOUSE",
    sourceReference: "filing:accounts:2026-09-22",
    sourceUrl: "https://find-and-update.company-information.service.gov.uk/company/12345678/filing-history",
    observedAt: "2026-09-22T12:00:00Z",
    expiresAt: "2026-10-22T12:00:00Z",
    signalFamily: "BUSINESS_CHANGE",
    signalType: "RECENT_FILING_CHANGE",
    summary: "Recent Companies House filing indicates a material business change.",
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence: 95,
    strength: "STRONG",
    provenance: "PUBLIC_OFFICIAL",
  });
}

test("strong verified official signal is eligible for Apollo enrichment review only", () => {
  const signal = companiesHouseSignal();
  const assessment = assessIntentRadarSignal(signal, asOf);

  assert.equal(assessment.status, "STRONG_VERIFIED_SIGNAL");
  assert.equal(assessment.apolloEnrichmentAllowed, true);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
  assert.match(signal.idempotencyKey, /^intent-radar:companies_house:12345678:/);
});

test("inference cannot be mislabeled as source verified", () => {
  assert.throws(
    () => buildIntentRadarSignal({
      companyName: "Example Manufacturing Ltd",
      companyDomain: "example-manufacturing.co.uk",
      source: "PLANNING",
      sourceReference: "planning:reference:abc",
      sourceUrl: "https://planning.example.gov.uk/application/abc",
      observedAt: "2026-09-22T12:00:00Z",
      signalFamily: "PROPERTY_DEVELOPMENT",
      signalType: "POSSIBLE_EXPANSION",
      summary: "Planning context may suggest expansion.",
      evidenceBasis: "INFERENCE",
      sourceVerified: true,
      confidence: 70,
      strength: "MEDIUM",
      provenance: "PUBLIC_OFFICIAL",
    }),
    /inference_cannot_be_source_verified/,
  );
});

test("website identification alone cannot trigger Apollo enrichment", () => {
  const signal = buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    source: "WEBSITE_IDENTIFICATION",
    sourceReference: "visit:anonymous-company-match:42",
    sourceUrl: "https://example-manufacturing.co.uk/",
    observedAt: "2026-09-23T18:00:00Z",
    signalFamily: "DIGITAL_INTENT",
    signalType: "COMPANY_IDENTIFIED_ON_SITE",
    summary: "A website identification service matched the visiting company domain.",
    evidenceBasis: "VERIFIED_FACT",
    sourceVerified: true,
    confidence: 92,
    strength: "STRONG",
    provenance: "PROVIDER_ENRICHMENT",
  });

  const assessment = assessIntentRadarSignal(signal, asOf);
  assert.equal(assessment.status, "REVIEW_ONLY");
  assert.equal(assessment.apolloEnrichmentAllowed, false);
  assert.ok(assessment.reasons.some((reason) => reason.includes("cannot independently trigger Apollo")));
});

test("expired signal fails closed even when it was previously strong and verified", () => {
  const signal = buildIntentRadarSignal({
    ...companiesHouseSignal(),
    sourceReference: "filing:accounts:2026-08-01",
    observedAt: "2026-08-01T12:00:00Z",
    expiresAt: "2026-09-01T12:00:00Z",
  });

  const assessment = assessIntentRadarSignal(signal, asOf);
  assert.equal(assessment.status, "REVIEW_ONLY");
  assert.equal(assessment.apolloEnrichmentAllowed, false);
  assert.ok(assessment.reasons.includes("Signal is expired."));
});

test("snapshot preserves verified facts versus inference, deduplicates evidence and grants no write/contact capability", () => {
  const verified = companiesHouseSignal();
  const inference = buildIntentRadarSignal({
    companyName: "Example Manufacturing Ltd",
    companyNumber: "12345678",
    companyDomain: "example-manufacturing.co.uk",
    source: "SOCIAL_PUBLIC",
    sourceReference: "public-post:energy-growth-discussion",
    sourceUrl: "https://example.com/public-post",
    observedAt: "2026-09-23T10:00:00Z",
    signalFamily: "COMMERCIAL_INTELLIGENCE",
    signalType: "POSSIBLE_GROWTH_INTENT",
    summary: "Public discussion may indicate business growth, but requires verification.",
    evidenceBasis: "INFERENCE",
    sourceVerified: false,
    confidence: 55,
    strength: "WEAK",
    provenance: "PUBLIC_WEB",
  });

  const snapshot = buildIntentRadarSnapshot([verified, verified, inference], asOf);
  assert.ok(snapshot);
  assert.equal(snapshot.totalSignals, 2);
  assert.equal(snapshot.verifiedFacts, 1);
  assert.equal(snapshot.inferences, 1);
  assert.equal(snapshot.strongVerifiedSignals, 1);
  assert.equal(snapshot.apolloEnrichmentAllowed, true);
  assert.equal(snapshot.crmWriteAllowed, false);
  assert.equal(snapshot.outreachAllowed, false);
  assert.equal(snapshot.promotionAllowed, false);
});

test("mixed company identities are rejected instead of being combined", () => {
  const first = companiesHouseSignal();
  const second = buildIntentRadarSignal({
    ...companiesHouseSignal(),
    companyName: "Different Company Ltd",
    companyNumber: "87654321",
    companyDomain: "different-company.co.uk",
    sourceReference: "filing:accounts:other",
  });

  assert.throws(() => buildIntentRadarSnapshot([first, second], asOf), /mixed_company_identity/);
});
