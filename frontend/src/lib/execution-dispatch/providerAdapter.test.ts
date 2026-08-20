import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createNoOpProviderAdapter,
  getNoOpAdapterForChannel,
  NO_OP_ADAPTER_KIND,
  NO_OP_ADAPTER_REGISTRY,
} from "./providerAdapter.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";

const EVAL_TIME_ISO = "2026-08-27T10:00:00.000Z";

function contract(overrides: Partial<ProviderNeutralDispatchContract> = {}): ProviderNeutralDispatchContract {
  return Object.freeze({
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "idem-key-abc-123",
    channel: "EMAIL",
    policyVersion: "feh-execution-authorization-policy@0.1.0-factory041",
    humanApprovalState: "approved",
    outreachEligibilityStatus: "eligible_for_handoff",
    contractCreatedAt: EVAL_TIME_ISO,
    executionPerformed: false,
    ...overrides,
  });
}

test("createNoOpProviderAdapter binds to the exact channel supplied", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const adapter = createNoOpProviderAdapter(channel);
    assert.equal(adapter.channel, channel);
  }
});

test("createNoOpProviderAdapter reports kind 'no-op'", () => {
  const adapter = createNoOpProviderAdapter("EMAIL");
  assert.equal(adapter.kind, NO_OP_ADAPTER_KIND);
});

test("no-op execute() resolves to accepted_noop with executionPerformed false", async () => {
  const adapter = createNoOpProviderAdapter("EMAIL");
  const outcome = await adapter.execute(contract());
  assert.equal(outcome.status, "accepted_noop");
  assert.equal(outcome.executionPerformed, false);
});

test("no-op execute() never mutates the contract it is given", async () => {
  const adapter = createNoOpProviderAdapter("PHONE");
  const input = contract({ channel: "PHONE" });
  const snapshot = JSON.parse(JSON.stringify(input));
  await adapter.execute(input);
  assert.deepEqual(input, snapshot);
});

test("no-op execute() output is identical regardless of contract content -- it never reads the contract", async () => {
  const adapter = createNoOpProviderAdapter("SMS");
  const a = await adapter.execute(contract({ channel: "SMS", actionId: "action-A", idempotencyKey: "key-A" }));
  const b = await adapter.execute(contract({ channel: "SMS", actionId: "totally-different-action", idempotencyKey: "totally-different-key" }));
  assert.deepEqual(a, b);
});

test("no-op execute() returns a Promise (async interface honoured)", () => {
  const adapter = createNoOpProviderAdapter("WHATSAPP");
  const result = adapter.execute(contract({ channel: "WHATSAPP" }));
  assert.ok(result instanceof Promise);
});

test("no-op adapter is frozen / read-only", () => {
  const adapter = createNoOpProviderAdapter("EMAIL");
  assert.equal(Object.isFrozen(adapter), true);
});

test("no-op execute() result is frozen / read-only", async () => {
  const adapter = createNoOpProviderAdapter("EMAIL");
  const outcome = await adapter.execute(contract());
  assert.equal(Object.isFrozen(outcome), true);
});

test("NO_OP_ADAPTER_REGISTRY contains all four channels", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    assert.equal(NO_OP_ADAPTER_REGISTRY.has(channel), true);
    assert.equal(NO_OP_ADAPTER_REGISTRY.get(channel)?.channel, channel);
  }
});

test("getNoOpAdapterForChannel returns the correctly bound adapter for each channel", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const adapter = getNoOpAdapterForChannel(channel);
    assert.ok(adapter);
    assert.equal(adapter.channel, channel);
    assert.equal(adapter.kind, NO_OP_ADAPTER_KIND);
  }
});

test("getNoOpAdapterForChannel fails closed (null) for an unrecognised channel", () => {
  // Simulates a caller bypassing the ContactChannel type at runtime.
  const adapter = getNoOpAdapterForChannel("CARRIER_PIGEON" as unknown as "EMAIL");
  assert.equal(adapter, null);
});

test("registry never returns cross-channel adapters -- PHONE lookup never returns an EMAIL-bound adapter, etc.", () => {
  const phone = getNoOpAdapterForChannel("PHONE");
  const email = getNoOpAdapterForChannel("EMAIL");
  const whatsapp = getNoOpAdapterForChannel("WHATSAPP");
  const sms = getNoOpAdapterForChannel("SMS");
  assert.notEqual(phone?.channel, "EMAIL");
  assert.notEqual(email?.channel, "PHONE");
  assert.notEqual(whatsapp?.channel, "SMS");
  assert.notEqual(sms?.channel, "WHATSAPP");
});
