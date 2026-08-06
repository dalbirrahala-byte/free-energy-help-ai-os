import assert from "node:assert/strict";
import { test } from "node:test";

import { readBooleanFlag } from "./featureFlags.ts";

const FLAG = "TEST_SHARED_FLAG_VALUE";

test("readBooleanFlag: unset env var returns the default (true)", () => {
  delete process.env[FLAG];
  assert.equal(readBooleanFlag(FLAG, true), true);
});

test("readBooleanFlag: unset env var returns the default (false)", () => {
  delete process.env[FLAG];
  assert.equal(readBooleanFlag(FLAG, false), false);
});

test("readBooleanFlag: default true, only exactly 'false' disables", () => {
  process.env[FLAG] = "false";
  try {
    assert.equal(readBooleanFlag(FLAG, true), false);
  } finally {
    delete process.env[FLAG];
  }
});

test("readBooleanFlag: default true, any other value stays enabled", () => {
  process.env[FLAG] = "yes";
  try {
    assert.equal(readBooleanFlag(FLAG, true), true);
  } finally {
    delete process.env[FLAG];
  }
});

test("readBooleanFlag: default false, only exactly 'true' enables", () => {
  process.env[FLAG] = "true";
  try {
    assert.equal(readBooleanFlag(FLAG, false), true);
  } finally {
    delete process.env[FLAG];
  }
});

test("readBooleanFlag: default false, any other value stays disabled", () => {
  process.env[FLAG] = "yes";
  try {
    assert.equal(readBooleanFlag(FLAG, false), false);
  } finally {
    delete process.env[FLAG];
  }
});

test("readBooleanFlag: is case-insensitive and trims whitespace", () => {
  process.env[FLAG] = "  TRUE  ";
  try {
    assert.equal(readBooleanFlag(FLAG, false), true);
  } finally {
    delete process.env[FLAG];
  }
});
