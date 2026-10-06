import assert from "node:assert/strict";
import test from "node:test";
import {
  issueOtpChallenge,
  validateOtpReceipt,
  verifyOtpChallenge,
} from "./otpChallenge.ts";
import { authorizeVerifiedLookup } from "./authorizeVerifiedLookup.ts";

const secret = "test-only-secret-that-is-at-least-32-characters-long";
const now = "2026-10-06T18:00:00Z";

test("OTP is six digits, stored only as a digest, and verifies once", () => {
  const issued = issueOtpChallenge({
    requestId: "lookup-001",
    channel: "SMS",
    destination: "07700 900123",
    now,
    secret,
  });
  assert.match(issued.code, /^\d{6}$/);
  assert.equal(JSON.stringify(issued.challenge).includes(issued.code), false);

  const verified = verifyOtpChallenge({
    challenge: issued.challenge,
    code: issued.code,
    destination: "+447700900123",
    now: "2026-10-06T18:01:00Z",
    secret,
  });
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.equal(verified.challenge.status, "USED");

  const replay = verifyOtpChallenge({
    challenge: verified.challenge,
    code: issued.code,
    destination: "+447700900123",
    now: "2026-10-06T18:02:00Z",
    secret,
  });
  assert.equal(replay.ok, false);
  if (!replay.ok) assert.equal(replay.reason, "ALREADY_USED");
});

test("five wrong guesses lock the challenge", () => {
  const issued = issueOtpChallenge({
    requestId: "lookup-002",
    channel: "EMAIL",
    destination: "owner@example.co.uk",
    now,
    secret,
  });
  let challenge = issued.challenge;
  const wrongCode = issued.code === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i++) {
    const result = verifyOtpChallenge({
      challenge,
      code: wrongCode,
      destination: "owner@example.co.uk",
      now: "2026-10-06T18:01:00Z",
      secret,
    });
    assert.equal(result.ok, false);
    challenge = result.challenge;
  }
  assert.equal(challenge.status, "LOCKED");
  assert.equal(challenge.attemptsRemaining, 0);
});

test("OTP is bound to the verified destination and expires", () => {
  const issued = issueOtpChallenge({
    requestId: "lookup-003",
    channel: "SMS",
    destination: "07700 900123",
    now,
    secret,
  });
  const wrongDestination = verifyOtpChallenge({
    challenge: issued.challenge,
    code: issued.code,
    destination: "07700 900999",
    now: "2026-10-06T18:01:00Z",
    secret,
  });
  assert.equal(wrongDestination.ok, false);
  if (!wrongDestination.ok) assert.equal(wrongDestination.reason, "DESTINATION_MISMATCH");

  const expired = verifyOtpChallenge({
    challenge: issued.challenge,
    code: issued.code,
    destination: "07700 900123",
    now: "2026-10-06T18:11:00Z",
    secret,
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.reason, "EXPIRED");
});

test("tampered signed receipt is rejected", () => {
  const issued = issueOtpChallenge({
    requestId: "lookup-004",
    channel: "EMAIL",
    destination: "owner@example.co.uk",
    now,
    secret,
  });
  const verified = verifyOtpChallenge({
    challenge: issued.challenge,
    code: issued.code,
    destination: "owner@example.co.uk",
    now: "2026-10-06T18:01:00Z",
    secret,
  });
  assert.equal(verified.ok, true);
  if (!verified.ok) return;

  assert.equal(validateOtpReceipt({
    receipt: verified.receipt,
    requestId: "lookup-004",
    channel: "EMAIL",
    destination: "owner@example.co.uk",
    now: "2026-10-06T18:02:00Z",
    secret,
  }), true);

  const tampered = { ...verified.receipt, verifiedValue: "attacker@example.co.uk" };
  assert.equal(validateOtpReceipt({
    receipt: tampered,
    requestId: "lookup-004",
    channel: "EMAIL",
    destination: "attacker@example.co.uk",
    now: "2026-10-06T18:02:00Z",
    secret,
  }), false);
});

test("meter lookup only opens after valid email and SMS receipts", () => {
  const email = issueOtpChallenge({
    requestId: "lookup-005",
    channel: "EMAIL",
    destination: "owner@example.co.uk",
    now,
    secret,
  });
  const phone = issueOtpChallenge({
    requestId: "lookup-005",
    channel: "SMS",
    destination: "07700 900123",
    now,
    secret,
  });
  const emailVerified = verifyOtpChallenge({
    challenge: email.challenge,
    code: email.code,
    destination: "owner@example.co.uk",
    now: "2026-10-06T18:01:00Z",
    secret,
  });
  const phoneVerified = verifyOtpChallenge({
    challenge: phone.challenge,
    code: phone.code,
    destination: "07700 900123",
    now: "2026-10-06T18:01:30Z",
    secret,
  });
  assert.equal(emailVerified.ok, true);
  assert.equal(phoneVerified.ok, true);
  if (!emailVerified.ok || !phoneVerified.ok) return;

  const decision = authorizeVerifiedLookup({
    request: {
      requestId: "lookup-005",
      email: "owner@example.co.uk",
      telephone: "07700 900123",
      postcode: "DE1 2AB",
      relationship: "BUSINESS_OWNER_DIRECTOR",
      authorityDeclared: true,
      botCheckPassed: true,
      rateLimitPassed: true,
      riskFlags: [],
      asOf: "2026-10-06T18:02:00Z",
    },
    emailReceipt: emailVerified.receipt,
    phoneReceipt: phoneVerified.receipt,
    secret,
  });
  assert.equal(decision.status, "ALLOW_LOOKUP");
  assert.equal(decision.lookupAllowed, true);
});
