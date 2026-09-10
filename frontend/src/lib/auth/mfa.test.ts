import assert from "node:assert/strict";
import test from "node:test";

import { hasAal2, requiresMfaChallenge, safeMfaRedirectTarget } from "./mfa";

test("requires challenge only when aal2 is available but not yet satisfied", () => {
  assert.equal(requiresMfaChallenge({ currentLevel: "aal1", nextLevel: "aal2" }), true);
  assert.equal(requiresMfaChallenge({ currentLevel: "aal2", nextLevel: "aal2" }), false);
  assert.equal(requiresMfaChallenge({ currentLevel: "aal1", nextLevel: "aal1" }), false);
});

test("hasAal2 accepts only an aal2 current session", () => {
  assert.equal(hasAal2({ currentLevel: "aal2", nextLevel: "aal2" }), true);
  assert.equal(hasAal2({ currentLevel: "aal1", nextLevel: "aal2" }), false);
});

test("MFA redirect target stays on-site and cannot loop into challenge", () => {
  assert.equal(safeMfaRedirectTarget("/leads"), "/leads");
  assert.equal(safeMfaRedirectTarget("https://evil.example"), "/");
  assert.equal(safeMfaRedirectTarget("//evil.example"), "/");
  assert.equal(safeMfaRedirectTarget("/mfa/challenge?redirectTo=/leads"), "/");
});
