import assert from "node:assert/strict";
import { test } from "node:test";

import { matchesProviderDispatchAdapterIdentity } from "./providerDispatchAdapter.ts";
import type { ProviderDispatchAdapter, ProviderDispatchAdapterIdentity } from "./providerDispatchAdapter.ts";

const EXPECTED: ProviderDispatchAdapterIdentity = {
  provider: "TELNYX",
  channel: "PHONE",
  adapterKey: "TELNYX_PHONE_V1",
};

function adapter(overrides: Partial<ProviderDispatchAdapter<unknown>> = {}): ProviderDispatchAdapter<unknown> {
  return {
    ...EXPECTED,
    async dispatch() {
      return { status: "indeterminate" };
    },
    ...overrides,
  };
}

test("accepts an exact provider, channel, and adapter-key match with a dispatch function", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter(), EXPECTED), true);
});

test("rejects provider substitution", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter({ provider: "OTHER" }), EXPECTED), false);
});

test("rejects cross-channel substitution", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter({ channel: "SMS" }), EXPECTED), false);
});

test("rejects an unrecognized channel even when both identities contain it", () => {
  const invalidExpected = { ...EXPECTED, channel: "FAX" } as unknown as ProviderDispatchAdapterIdentity;
  const invalidAdapter = adapter({ channel: "FAX" as unknown as ProviderDispatchAdapter<unknown>["channel"] });

  assert.equal(matchesProviderDispatchAdapterIdentity(invalidAdapter, invalidExpected), false);
});

test("rejects adapter-version substitution", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter({ adapterKey: "TELNYX_PHONE_V2" }), EXPECTED), false);
});

test("rejects malformed, blank, and overlong identities", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(null, EXPECTED), false);
  assert.equal(matchesProviderDispatchAdapterIdentity({}, EXPECTED), false);
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter({ provider: " " }), EXPECTED), false);
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter({ adapterKey: "x".repeat(201) }), EXPECTED), false);
});

test("rejects an identity-only object with no dispatch implementation", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(EXPECTED, EXPECTED), false);
});

test("rejects an invalid expected identity rather than weakening the match", () => {
  assert.equal(matchesProviderDispatchAdapterIdentity(adapter(), { ...EXPECTED, adapterKey: "" }), false);
});
