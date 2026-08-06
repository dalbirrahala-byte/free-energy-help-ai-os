import assert from "node:assert/strict";
import { test } from "node:test";

import { hasText } from "./textUtils.ts";

test("hasText: true for a non-empty string", () => {
  assert.equal(hasText("hello"), true);
});

test("hasText: false for null", () => {
  assert.equal(hasText(null), false);
});

test("hasText: false for undefined", () => {
  assert.equal(hasText(undefined), false);
});

test("hasText: false for an empty string", () => {
  assert.equal(hasText(""), false);
});

test("hasText: false for a whitespace-only string", () => {
  assert.equal(hasText("   "), false);
});

test("hasText: false for non-string values", () => {
  assert.equal(hasText(42), false);
  assert.equal(hasText(true), false);
  assert.equal(hasText({}), false);
});
