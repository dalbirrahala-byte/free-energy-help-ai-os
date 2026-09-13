import assert from "node:assert/strict";
import test from "node:test";

import {
  requiresMfaForRoleLookup,
  type RoleLookupResult,
} from "./mfaRoleResolution.ts";

function fakeLookup(result: RoleLookupResult | Error) {
  return () => {
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve(result);
  };
}

test("confirmed admin requires MFA", async () => {
  assert.equal(
    await requiresMfaForRoleLookup(fakeLookup({ data: { role: "admin" }, error: null })),
    true,
  );
});

test("confirmed non-admin does not gain an admin MFA requirement", async () => {
  for (const role of ["manager", "operations", "consultant", "read_only"]) {
    assert.equal(
      await requiresMfaForRoleLookup(fakeLookup({ data: { role }, error: null })),
      false,
    );
  }
});

test("role query error fails closed", async () => {
  assert.equal(
    await requiresMfaForRoleLookup(fakeLookup({ data: null, error: { message: "lookup failed" } })),
    true,
  );
});

test("malformed role fails closed", async () => {
  for (const role of ["Admin", "", 123, null]) {
    assert.equal(
      await requiresMfaForRoleLookup(fakeLookup({ data: { role }, error: null })),
      true,
    );
  }
});

test("clean no-row result intentionally requires MFA for an unprovisioned user", async () => {
  assert.equal(
    await requiresMfaForRoleLookup(fakeLookup({ data: null, error: null })),
    true,
  );
});

test("thrown role lookup fails closed", async () => {
  assert.equal(
    await requiresMfaForRoleLookup(fakeLookup(new Error("network failure"))),
    true,
  );
});
