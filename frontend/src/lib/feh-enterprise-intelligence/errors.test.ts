import assert from "node:assert/strict";
import { test } from "node:test";

import { isolateCapabilityError, safeFailure } from "./errors.ts";

test("safeFailure returns a plain typed object, never throws", () => {
  const result = safeFailure("renewalIntelligence", "TEST_CODE", "A message.");
  assert.equal(result.capabilityId, "renewalIntelligence");
  assert.equal(result.code, "TEST_CODE");
  assert.equal(result.message, "A message.");
});

test("isolateCapabilityError never leaks a stack trace", () => {
  const error = new Error("boom");
  const failure = isolateCapabilityError("renewalIntelligence", error);
  assert.ok(!failure.message.includes("at "), "message should not contain stack-trace-style content");
});

test("isolateCapabilityError sanitises messages that look like they contain secrets", () => {
  const error = new Error("Failed reading ANTHROPIC_API_KEY from environment");
  const failure = isolateCapabilityError("renewalIntelligence", error);
  assert.equal(failure.message, "An internal error occurred while executing this capability.");
});

test("isolateCapabilityError sanitises messages that look like file paths", () => {
  const error = new Error("Cannot find module C:\\Projects\\ai-energy-sales-os\\secret.json");
  const failure = isolateCapabilityError("renewalIntelligence", error);
  assert.equal(failure.message, "An internal error occurred while executing this capability.");
});

test("isolateCapabilityError passes through an ordinary, safe message unchanged", () => {
  const error = new Error("Unexpected value for status");
  const failure = isolateCapabilityError("renewalIntelligence", error);
  assert.equal(failure.message, "Unexpected value for status");
});

test("isolateCapabilityError handles non-Error throwables safely", () => {
  const failure = isolateCapabilityError("renewalIntelligence", "a raw string throw");
  assert.equal(failure.message, "Unknown error.");
});
