import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIntroducerReferralAttribution,
  mapIntroducerReferralToIntentSignal,
} from "./professionalIntroducerAttribution.ts";
import { assessIntentRadarSignal } from "./intentRadar.ts";

const referral = {
  introducerReference: "partner-001",
  introducerCategory: "ACCOUNTANT",
  agreementReference: "agreement-2026-001",
  agreementStatus: "ACTIVE",
  companyName: "Example Manufacturing Ltd",
  companyNumber: "12345678",
  companyDomain: "example-manufacturing.co.uk",
  referralReference: "referral-42",
  introducedAt: "2026-09-23T14:00:00Z",
  businessReason: "Client asked for an independent review of its business energy contract.",
  contactPermissionEvidence: "BUSINESS_INTRODUCTION_CONFIRMED",
} as const;

test("active professional introduction is attributed for review but cannot accrue/pay commission or contact", () => {
  const attribution = buildIntroducerReferralAttribution(referral);

  assert.equal(attribution.attributionStatus, "ATTRIBUTED_FOR_REVIEW");
  assert.equal(attribution.attributionKey, "introducer:partner-001:referral-42");
  assert.equal(attribution.commissionAccrualAllowed, false);
  assert.equal(attribution.commissionPaymentAllowed, false);
  assert.equal(attribution.crmWriteAllowed, false);
  assert.equal(attribution.outreachAllowed, false);
});

test("inactive agreement blocks referral attribution", () => {
  const attribution = buildIntroducerReferralAttribution({ ...referral, agreementStatus: "EXPIRED" });
  assert.equal(attribution.attributionStatus, "BLOCKED");
  assert.ok(attribution.reasons.some((reason) => reason.includes("not verified active")));
});

test("unknown business-introduction permission blocks referral attribution", () => {
  const attribution = buildIntroducerReferralAttribution({
    ...referral,
    contactPermissionEvidence: "UNKNOWN",
  });
  assert.equal(attribution.attributionStatus, "BLOCKED");
  assert.equal(mapIntroducerReferralToIntentSignal({ ...referral, contactPermissionEvidence: "UNKNOWN" }), null);
});

test("verified introduction becomes a strong Intent Radar fact but still grants no outbound capability", () => {
  const signal = mapIntroducerReferralToIntentSignal(referral);
  assert.ok(signal);
  assert.equal(signal.source, "INTRODUCER");
  assert.equal(signal.provenance, "INTRODUCER");
  assert.equal(signal.evidenceBasis, "VERIFIED_FACT");
  assert.equal(signal.strength, "STRONG");

  const assessment = assessIntentRadarSignal(signal, "2026-09-23T20:00:00Z");
  assert.equal(assessment.apolloEnrichmentAllowed, true);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});
