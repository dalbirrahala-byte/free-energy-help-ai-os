import assert from "node:assert/strict";
import { test } from "node:test";

import {
  issueOtpChallenge,
  verifyOtpChallenge,
} from "../verified-meter-lookup/otpChallenge.ts";
import { reviewVerifiedLeadOtp } from "./verifiedLeadOtpReview.ts";

const secret = "synthetic-review-only-secret-000000000000000000";
const requestId = "health-check-review-001";
const telephone = "07400 123456";
const issuedAt = "2026-10-23T16:00:00+01:00";

function verifiedReceipt() {
  const issued = issueOtpChallenge({
    requestId,
    channel: "SMS",
    destination: telephone,
    now: issuedAt,
    secret,
  });

  const verified = verifyOtpChallenge({
    challenge: issued.challenge,
    code: issued.code,
    destination: telephone,
    now: "2026-10-23T16:01:00+01:00",
    secret,
  });

  assert.equal(verified.ok, true);
  if (!verified.ok) throw new Error("synthetic verification failed");
  return verified.receipt;
}

test("valid bound SMS receipt verifies the mobile without enabling execution", () => {
  const result = reviewVerifiedLeadOtp({
    receipt: verifiedReceipt(),
    requestId,
    telephone,
    now: "2026-10-23T16:02:00+01:00",
    secret,
  });

  assert.equal(result.status, "VERIFIED");
  assert.equal(result.mobileVerification, "VERIFIED");
  assert.equal(result.crmHotLeadEligible, true);
  assert.equal(result.executionAllowed, false);
});

test("missing receipt fails closed", () => {
  const result = reviewVerifiedLeadOtp({
    receipt: null,
    requestId,
    telephone,
    now: "2026-10-23T16:02:00+01:00",
    secret,
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.mobileVerification, "UNVERIFIED");
  assert.equal(result.crmHotLeadEligible, false);
});

test("receipt cannot be replayed for a different telephone", () => {
  const result = reviewVerifiedLeadOtp({
    receipt: verifiedReceipt(),
    requestId,
    telephone: "07400 654321",
    now: "2026-10-23T16:02:00+01:00",
    secret,
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.reason, "invalid_or_expired_receipt");
});

test("expired receipt fails closed", () => {
  const result = reviewVerifiedLeadOtp({
    receipt: verifiedReceipt(),
    requestId,
    telephone,
    now: "2026-10-23T16:20:01+01:00",
    secret,
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.crmHotLeadEligible, false);
});

test("receipt is bound to the Health Check request id", () => {
  const result = reviewVerifiedLeadOtp({
    receipt: verifiedReceipt(),
    requestId: "different-request",
    telephone,
    now: "2026-10-23T16:02:00+01:00",
    secret,
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.executionAllowed, false);
});
