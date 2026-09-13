import assert from "node:assert/strict";
import test from "node:test";

import {
  requiresMfaForRoleLookup,
  type RoleLookupClient,
  type RoleLookupResult,
} from "./mfaRoleResolution.ts";

function fakeClient(result: RoleLookupResult | Error): RoleLookupClient {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  if (result instanceof Error) return Promise.reject(result);
                  return Promise.resolve(result);
                },
              };
            },
          };
        },
      };
    },
  };
}

test("confirmed admin requires MFA", async () => {
  const client = fakeClient({ data: { role: "admin" }, error: null });
  assert.equal(await requiresMfaForRoleLookup(client, "user-1"), true);
});

test("confirmed non-admin does not gain an admin MFA requirement", async () => {
  for (const role of ["manager", "operations", "consultant", "read_only"]) {
    const client = fakeClient({ data: { role }, error: null });
    assert.equal(await requiresMfaForRoleLookup(client, "user-1"), false);
  }
});

test("role query error fails closed", async () => {
  const client = fakeClient({ data: null, error: { message: "lookup failed" } });
  assert.equal(await requiresMfaForRoleLookup(client, "user-1"), true);
});

test("malformed role fails closed", async () => {
  for (const role of ["Admin", "", 123, null]) {
    const client = fakeClient({ data: { role }, error: null });
    assert.equal(await requiresMfaForRoleLookup(client, "user-1"), true);
  }
});

test("clean no-row result intentionally requires MFA for an unprovisioned user", async () => {
  const client = fakeClient({ data: null, error: null });
  assert.equal(await requiresMfaForRoleLookup(client, "user-1"), true);
});

test("thrown role lookup fails closed", async () => {
  const client = fakeClient(new Error("network failure"));
  assert.equal(await requiresMfaForRoleLookup(client, "user-1"), true);
});
