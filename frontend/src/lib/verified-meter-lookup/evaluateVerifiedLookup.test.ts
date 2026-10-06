import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateVerifiedLookup,
  normalizeUkTelephone,
  type VerifiedLookupInput,
} from "./evaluateVerifiedLookup.ts";

const now = "2026-09-29T06:00:00Z";
function fixture(): VerifiedLookupInput {
  return {
    requestId: "lookup-001",
    email: "owner@example.co.uk",
    telephone: "07700 900123",
    postcode: "DE1 2AB",
    relationship: "BUSINESS_OWNER_DIRECTOR",
    emailVerification: { state: "VERIFIED", verifiedValue: "owner@example.co.uk", verifiedAt: "2026-09-29T05:55:00Z" },
    phoneVerification: { state: "VERIFIED", verifiedValue: "+447700900123", verifiedAt: "2026-09-29T05:56:00Z" },
    authorityDeclared: true,
    botCheckPassed: true,
    rateLimitPassed: true,
    riskFlags: [],
    asOf: now,
  };
}

test("verified owner may cross lookup boundary but cannot write CRM or send outbound", () => {
  const result = evaluateVerifiedLookup(fixture());
  assert.equal(result.status, "ALLOW_LOOKUP");
  assert.equal(result.lookupAllowed, true);
  assert.equal(result.supplierInformationReleaseAllowed, true);
  assert.equal(result.meterInformationReleaseAllowed, true);
  assert.equal(result.crmWriteAllowed, false);
  assert.equal(result.outboundAllowed, false);
  assert.ok(result.verificationBinding);
});

test("screenshot-style repeated fake number is rejected before lookup", () => {
  const input = fixture();
  input.telephone = "01111111111";
  assert.equal(evaluateVerifiedLookup(input).lookupAllowed, false);
  assert.equal(normalizeUkTelephone("01111111111"), null);
});

test("unverified email or phone cannot perform lookup", () => {
  for (const field of ["emailVerification", "phoneVerification"] as const) {
    const input = fixture();
    input[field].state = "UNVERIFIED";
    const result = evaluateVerifiedLookup(input);
    assert.equal(result.reason, "VERIFICATION_REQUIRED");
    assert.equal(result.lookupAllowed, false);
  }
});

test("editing email or telephone after OTP invalidates possession proof", () => {
  const email = fixture();
  email.email = "changed@example.co.uk";
  assert.equal(evaluateVerifiedLookup(email).reason, "VERIFIED_VALUE_MISMATCH");

  const phone = fixture();
  phone.telephone = "07700 900999";
  assert.equal(evaluateVerifiedLookup(phone).reason, "VERIFIED_VALUE_MISMATCH");
});

test("verification expires after fifteen minutes", () => {
  const input = fixture();
  input.asOf = "2026-09-29T06:20:01Z";
  assert.equal(evaluateVerifiedLookup(input).reason, "VERIFICATION_EXPIRED");
});

test("future-dated verification fails closed", () => {
  const input = fixture();
  input.phoneVerification.verifiedAt = "2026-09-29T06:01:00Z";
  assert.equal(evaluateVerifiedLookup(input).reason, "INVALID_INPUT");
});

test("bot or rate-limit failure blocks lookup", () => {
  const bot = fixture(); bot.botCheckPassed = false;
  assert.equal(evaluateVerifiedLookup(bot).reason, "ABUSE_CONTROL_FAILED");
  const rate = fixture(); rate.rateLimitPassed = false;
  assert.equal(evaluateVerifiedLookup(rate).reason, "ABUSE_CONTROL_FAILED");
});

test("authority declaration is mandatory", () => {
  const input = fixture(); input.authorityDeclared = false;
  assert.equal(evaluateVerifiedLookup(input).reason, "AUTHORITY_REQUIRED");
});

test("authorised agents are held for FEH review even after OTP", () => {
  const input = fixture(); input.relationship = "AUTHORISED_AGENT";
  const result = evaluateVerifiedLookup(input);
  assert.equal(result.status, "HOLD_FOR_REVIEW");
  assert.equal(result.lookupAllowed, false);
  assert.ok(result.verificationBinding);
});

test("risk flags hold a verified request without leaking lookup information", () => {
  const input = fixture(); input.riskFlags = ["VELOCITY"];
  const result = evaluateVerifiedLookup(input);
  assert.equal(result.status, "HOLD_FOR_REVIEW");
  assert.equal(result.supplierInformationReleaseAllowed, false);
  assert.equal(result.meterInformationReleaseAllowed, false);
});

test("malformed runtime input fails closed", () => {
  for (const value of [null, undefined, [], "x", 123]) {
    assert.equal(evaluateVerifiedLookup(value).lookupAllowed, false);
  }
});
