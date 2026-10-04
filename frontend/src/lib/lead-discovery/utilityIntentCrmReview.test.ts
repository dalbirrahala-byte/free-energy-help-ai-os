import assert from "node:assert/strict";
import test from "node:test";

import { buildUtilityIntentCrmReviewProjection } from "./utilityIntentCrmReview.ts";

const asOf = "2026-09-28T12:00:00Z";

function fixture() {
  return {
    adapter: "COMPANY_NEWSROOM",
    access: {
      publiclyAvailable: true,
      termsPermitted: true,
      robotsPermitted: true,
      rateLimitsRespected: true,
      requiresLogin: false,
      requiresCaptcha: false,
      accessCircumvention: false,
      publisherReviewed: true,
      reviewReference: "synthetic-source-review-1",
    },
    signal: {
      companyName: "Synthetic Energy Works Ltd",
      companyNumber: "12345678",
      companyDomain: "example.com",
      source: "PUBLIC_WEB_SIGNAL",
      sourceReference: "synthetic-announcement-1",
      sourceUrl: "https://example.com/news/prices",
      observedAt: "2026-09-28T10:00:00Z",
      expiresAt: null,
      signalFamily: "PROCUREMENT",
      signalType: "ENERGY_PRICE_REQUEST",
      summary: "The company says it is seeking business energy prices.",
      evidenceBasis: "VERIFIED_FACT",
      sourceVerified: true,
      confidence: 95,
      strength: "STRONG",
      provenance: "PUBLIC_WEB",
    },
    exactEvidence: "We are seeking business energy prices.",
    publishedAt: "2026-09-27T10:00:00Z",
    eventAt: null,
    interpretation: {
      kind: "SEEKING_PRICES_COMPARISON",
      basis: "VERIFIED_FACT",
      reviewReference: "synthetic-quote-review-1",
    },
    fit: {
      category: "UK_COMMERCIAL_ENERGY",
      reviewReference: "synthetic-energy-fit-1",
    },
    contactReview: {
      companyNumber: "12345678",
      countryCode: "GB",
      identityVerified: true,
      legalForm: "LIMITED_COMPANY",
      contactRoute: "ORDINARY_CORPORATE",
      namedPersonData: false,
      suppression: "CLEAR",
      objection: false,
      reviewedAt: asOf,
      reviewReference: "synthetic-contact-review-1",
      identityEvidenceReference: "synthetic-company-register-1",
      routeEvidenceReference: "synthetic-corporate-route-1",
      suppressionEvidenceReference: "synthetic-suppression-check-1",
    },
  };
}

test("projects admitted public-web research into human review without granting execution", () => {
  const review = buildUtilityIntentCrmReviewProjection(fixture(), asOf);
  assert.ok(review);
  assert.equal(review.status, "READY_FOR_HUMAN_REVIEW");
  assert.equal(review.evidenceBasis, "INFERENCE");
  assert.equal(review.identityStatus, "UNVERIFIED");
  assert.equal(review.evidenceBindingStatus, "UNVERIFIED");
  assert.equal(review.contactability, "AMBER");
  assert.equal(review.sourceConfidenceClaim, 95);
  assert.equal(review.crmWriteAllowed, false);
  assert.equal(review.crmWritePerformed, false);
  assert.equal(review.apolloEnrichmentAllowed, false);
  assert.equal(review.creditsSpendAllowed, false);
  assert.equal(review.sequenceEnrollmentAllowed, false);
  assert.equal(review.outreachAllowed, false);
  assert.equal(review.executionPerformed, false);
  assert.ok(Object.isFrozen(review));
  assert.ok(Object.isFrozen(review.deduplicationKeys));
});

test("duplicate research is blocked and points to the existing review", () => {
  const first = buildUtilityIntentCrmReviewProjection(fixture(), asOf);
  assert.ok(first);
  const duplicate = buildUtilityIntentCrmReviewProjection(
    fixture(),
    asOf,
    [],
    first.deduplicationKeys,
  );
  assert.ok(duplicate);
  assert.equal(duplicate.status, "BLOCKED");
  assert.equal(duplicate.duplicateDetected, true);
  assert.match(duplicate.nextAction, /existing/i);
});

test("suppression and objection remain RED and block review promotion", () => {
  for (const change of [{ suppression: "SUPPRESSED" }, { objection: true }]) {
    const input = fixture();
    Object.assign(input.contactReview, change);
    const review = buildUtilityIntentCrmReviewProjection(input, asOf);
    assert.ok(review);
    assert.equal(review.status, "BLOCKED");
    assert.equal(review.contactability, "RED");
    assert.equal(review.complianceStatus, "BLOCKED");
    assert.equal(review.apolloEnrichmentAllowed, false);
    assert.equal(review.outreachAllowed, false);
  }
});

test("expired research is blocked until the public evidence is revalidated", () => {
  const input = fixture();
  input.signal.expiresAt = asOf;
  const review = buildUtilityIntentCrmReviewProjection(input, asOf);
  assert.ok(review);
  assert.equal(review.status, "BLOCKED");
  assert.match(review.nextAction, /Revalidate/);
});

test("restricted access is excluded before a CRM review projection exists", () => {
  const input = fixture();
  input.access.requiresLogin = true;
  const review = buildUtilityIntentCrmReviewProjection(input, asOf);
  assert.equal(review, null);
});
