import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isSetPasswordOtpType, passwordValidationError, safeAuthNext } from "./recovery.ts";

test("auth redirects only allow same-site paths", () => {
  assert.equal(safeAuthNext("/reset-password"), "/reset-password");
  assert.equal(safeAuthNext("https://evil.example"), "/reset-password");
  assert.equal(safeAuthNext("//evil.example"), "/reset-password");
});

test("only invitation and recovery OTPs may open password setup", () => {
  assert.equal(isSetPasswordOtpType("invite"), true);
  assert.equal(isSetPasswordOtpType("recovery"), true);
  assert.equal(isSetPasswordOtpType("magiclink"), false);
  assert.equal(isSetPasswordOtpType(null), false);
});

test("new passwords must be long enough and match", () => {
  assert.equal(passwordValidationError("short", "short"), "Use at least 12 characters.");
  assert.equal(passwordValidationError("long-enough-password", "different-password"), "The passwords do not match.");
  assert.equal(passwordValidationError("long-enough-password", "long-enough-password"), null);
});

test("recovery callback persists Supabase session cookies on the redirect response", async () => {
  const routeSource = await readFile(
    new URL("../../app/auth/confirm/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /createServerClient/);
  assert.match(routeSource, /response\.cookies\.set\(name, value, options\)/);
  assert.match(routeSource, /verifyOtp/);
  assert.match(routeSource, /return response/);
});
