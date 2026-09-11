import assert from "node:assert/strict";
import test from "node:test";

import {
  decideAdminMfaRoute,
  hasAal2,
  normalizeAssuranceLevel,
  requiresMfaChallenge,
  safeMfaRedirectTarget,
} from "./mfa.ts";

test("normalizes only supported assurance levels", () => {
  assert.equal(normalizeAssuranceLevel("aal1"), "aal1");
  assert.equal(normalizeAssuranceLevel("aal2"), "aal2");
  assert.equal(normalizeAssuranceLevel("aal3"), null);
  assert.equal(normalizeAssuranceLevel(undefined), null);
  assert.equal(normalizeAssuranceLevel(null), null);
});

test("requires challenge only when aal2 is available but not yet satisfied", () => {
  assert.equal(requiresMfaChallenge({ currentLevel: "aal1", nextLevel: "aal2" }), true);
  assert.equal(requiresMfaChallenge({ currentLevel: "aal2", nextLevel: "aal2" }), false);
  assert.equal(requiresMfaChallenge({ currentLevel: "aal1", nextLevel: "aal1" }), false);
});

test("hasAal2 accepts only an aal2 current session", () => {
  assert.equal(hasAal2({ currentLevel: "aal2", nextLevel: "aal2" }), true);
  assert.equal(hasAal2({ currentLevel: "aal1", nextLevel: "aal2" }), false);
});

test("admin without an enrolled factor is forced to enroll", () => {
  assert.equal(decideAdminMfaRoute(true, { currentLevel: "aal1", nextLevel: "aal1" }), "enroll");
  assert.equal(decideAdminMfaRoute(true, { currentLevel: null, nextLevel: null }), "enroll");
});

test("enrolled admin at aal1 is forced to challenge", () => {
  assert.equal(decideAdminMfaRoute(true, { currentLevel: "aal1", nextLevel: "aal2" }), "challenge");
});

test("admin at aal2 is allowed through", () => {
  assert.equal(decideAdminMfaRoute(true, { currentLevel: "aal2", nextLevel: "aal2" }), "allow");
});

test("non-admin roles remain unchanged by the admin MFA policy", () => {
  assert.equal(decideAdminMfaRoute(false, { currentLevel: "aal1", nextLevel: "aal1" }), "allow");
  assert.equal(decideAdminMfaRoute(false, { currentLevel: "aal1", nextLevel: "aal2" }), "allow");
});

test("MFA redirect target stays on-site and cannot loop into MFA routes", () => {
  assert.equal(safeMfaRedirectTarget("/leads"), "/leads");
  assert.equal(safeMfaRedirectTarget("https://evil.example"), "/");
  assert.equal(safeMfaRedirectTarget("//evil.example"), "/");
  assert.equal(safeMfaRedirectTarget("/mfa/challenge?redirectTo=/leads"), "/");
  assert.equal(safeMfaRedirectTarget("/mfa/enroll?redirectTo=/leads"), "/");
});
