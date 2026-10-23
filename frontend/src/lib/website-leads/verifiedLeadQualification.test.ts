import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateVerifiedLeadQualification,
  type VerifiedLeadQualificationInput,
} from "./verifiedLeadQualification.ts";

const base: VerifiedLeadQualificationInput = {
  isUkBusiness: true,
  consentGiven: true,
  mobileVerification: "VERIFIED",
  authority: "YES",
  monthlySpendBand: "2000_PLUS",
  renewalTiming: "WITHIN_30_DAYS",
  currentSupplierProvided: true,
};

test("verified authorised urgent meaningful-spend lead is call-now hot", () => {
  const result = evaluateVerifiedLeadQualification(base);
  assert.equal(result.crmState, "VERIFIED_CALL_NOW");
  assert.equal(result.priority, "Hot");
  assert.equal(result.callNowEligible, true);
  assert.equal(result.executionAllowed, false);
});

test("unverified mobile cannot become a hot lead", () => {
  const result = evaluateVerifiedLeadQualification({
    ...base,
    mobileVerification: "UNVERIFIED",
  });
  assert.equal(result.crmState, "UNVERIFIED");
  assert.equal(result.callNowEligible, false);
  assert.ok(result.reasons.includes("mobile_not_verified"));
});

test("missing consent cannot become a hot lead", () => {
  const result = evaluateVerifiedLeadQualification({
    ...base,
    consentGiven: false,
  });
  assert.equal(result.crmState, "UNVERIFIED");
  assert.equal(result.callNowEligible, false);
  assert.ok(result.reasons.includes("contact_consent_missing"));
});

test("authority must be positive rather than inferred", () => {
  const unknown = evaluateVerifiedLeadQualification({
    ...base,
    authority: "UNKNOWN",
  });
  const no = evaluateVerifiedLeadQualification({
    ...base,
    authority: "NO",
  });

  assert.equal(unknown.crmState, "VERIFIED_REVIEW");
  assert.equal(no.crmState, "VERIFIED_REVIEW");
  assert.equal(unknown.callNowEligible, false);
  assert.equal(no.callNowEligible, false);
});

test("non-business submission is blocked", () => {
  const result = evaluateVerifiedLeadQualification({
    ...base,
    isUkBusiness: false,
  });
  assert.equal(result.crmState, "REJECTED_NOT_BUSINESS");
  assert.equal(result.priority, "Blocked");
  assert.equal(result.callNowEligible, false);
});

test("verified authorised but non-urgent lead remains human review", () => {
  const result = evaluateVerifiedLeadQualification({
    ...base,
    renewalTiming: "6_12_MONTHS",
  });
  assert.equal(result.crmState, "VERIFIED_REVIEW");
  assert.equal(result.priority, "Warm");
  assert.equal(result.callNowEligible, false);
});

test("no classification path enables execution", () => {
  const samples: VerifiedLeadQualificationInput[] = [
    base,
    { ...base, mobileVerification: "UNVERIFIED" },
    { ...base, authority: "UNKNOWN" },
    { ...base, consentGiven: false },
    { ...base, isUkBusiness: false },
  ];

  for (const sample of samples) {
    assert.equal(evaluateVerifiedLeadQualification(sample).executionAllowed, false);
  }
});
