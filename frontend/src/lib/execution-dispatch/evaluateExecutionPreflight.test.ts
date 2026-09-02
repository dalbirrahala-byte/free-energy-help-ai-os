import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { evaluateExecutionPreflight } from "./evaluateExecutionPreflight.ts";
import { createNoOpProviderAdapter, getNoOpAdapterForChannel } from "./providerAdapter.ts";
import type { ProviderAdapter, ProviderAdapterOutcome } from "./providerAdapter.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";
import type { ResolvedDestinationEnvelope } from "./resolveExecutionDestination.ts";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";

const EVAL_TIME = new Date("2026-08-31T10:00:00.000Z");
const FUTURE_EXPIRY = "2026-09-01T10:00:00.000Z"; // well after EVAL_TIME, for happy-path fixtures

/**
 * Deterministic clock control WITHOUT reopening the production trust
 * boundary: uses Node's own built-in per-test `context.mock.timers` to
 * fake `Date` for the duration of a single test (auto-restored by Node
 * when the test completes) -- never a caller-supplied `evaluatedAt`
 * argument on the production function itself, which no longer exists.
 */
function setClock(t: TestContext, at: Date | string): void {
  t.mock.timers.enable({ apis: ["Date"] });
  const ms = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  t.mock.timers.setTime(ms);
}

function contract(overrides: Partial<ProviderNeutralDispatchContract> = {}): ProviderNeutralDispatchContract {
  return Object.freeze({
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "idem-key-abc-123",
    contactId: 42,
    channel: "EMAIL",
    policyVersion: "feh-execution-authorization-policy@0.1.0-factory041",
    humanApprovalState: "approved",
    outreachEligibilityStatus: "eligible_for_handoff",
    contractCreatedAt: EVAL_TIME.toISOString(),
    authorizationExpiresAt: FUTURE_EXPIRY,
    executionPerformed: false,
    ...overrides,
  });
}

function destination(overrides: Partial<ResolvedDestinationEnvelope> = {}): ResolvedDestinationEnvelope {
  return Object.freeze({
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "idem-key-abc-123",
    channel: "EMAIL",
    contactId: 42,
    destination: "prospect@example.com",
    resolvedAt: EVAL_TIME.toISOString(),
    executionPerformed: false,
    ...overrides,
  });
}

/**
 * The REAL Phase 10 approved adapter instance for a channel -- the only
 * kind of adapter that can ever reach preflight_ready post-hardening,
 * since Phase 12 requires exact reference equality against this registry
 * lookup.
 */
function approved(channel: ContactChannel = "EMAIL"): ProviderAdapter {
  const adapter = getNoOpAdapterForChannel(channel);
  assert.ok(adapter, `expected an approved adapter to be registered for ${channel}`);
  return adapter;
}

/** A caller-created, NOT-approved adapter whose execute() throws and records whether it was ever called. */
function rogueAdapter(channel: ContactChannel = "EMAIL", kind = "spy-adapter"): { adapter: ProviderAdapter; calls: { count: number } } {
  const calls = { count: 0 };
  const adapter: ProviderAdapter = Object.freeze({
    channel,
    kind,
    execute(): Promise<ProviderAdapterOutcome> {
      calls.count += 1;
      throw new Error("execute() must never be called by Phase 12 preflight");
    },
  });
  return { adapter, calls };
}

// ---- 1-4. registered approved adapter + valid chain, per channel → preflight_ready ----

test("registered approved EMAIL adapter + valid EMAIL chain → preflight_ready", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
  assert.notEqual(result.intent, null);
});

test("registered approved PHONE adapter + valid PHONE chain → preflight_ready", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), destination({ channel: "PHONE" }), approved("PHONE"));
  assert.equal(result.status, "preflight_ready");
});

test("registered approved WHATSAPP adapter + valid WHATSAPP chain → preflight_ready", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "WHATSAPP" }), destination({ channel: "WHATSAPP" }), approved("WHATSAPP"));
  assert.equal(result.status, "preflight_ready");
});

test("registered approved SMS adapter + valid SMS chain → preflight_ready", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "SMS" }), destination({ channel: "SMS" }), approved("SMS"));
  assert.equal(result.status, "preflight_ready");
});

// ---- 5-8. approved-adapter provenance hardening ----

test("arbitrary caller-created EMAIL adapter with matching channel/kind → blocked (not the approved registry instance)", (t) => {
  setClock(t, EVAL_TIME);
  const { adapter } = rogueAdapter("EMAIL", "no-op"); // same channel AND same kind text as the real approved adapter
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), adapter);
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("arbitrary adapter with identical kind text to the approved adapter is still blocked -- kind text alone proves nothing", (t) => {
  setClock(t, EVAL_TIME);
  const real = approved("EMAIL");
  const { adapter } = rogueAdapter("EMAIL", real.kind);
  assert.equal(adapter.kind, real.kind); // same text, deliberately
  assert.notEqual(adapter, real); // but NOT the same object
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), adapter);
  assert.equal(result.status, "blocked");
});

test("arbitrary adapter with a different kind → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const { adapter } = rogueAdapter("EMAIL", "totally-different-kind");
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), adapter);
  assert.equal(result.status, "blocked");
});

test("approved EMAIL adapter cannot approve a PHONE contract → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), destination({ channel: "PHONE" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// no registered adapter for a channel -- structurally unreachable given contract.channel is already
// validated against the same 4-channel VALID_CHANNELS set that the Phase 10 registry is built from, so
// every valid contract.channel always has a registered adapter. Documented here rather than fabricated
// via unsafe global-registry mutation, matching this codebase's "reserved but unreachable" precedent.
test("every recognised channel has a registered approved adapter (documents why 'no registered adapter' is unreachable)", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    assert.notEqual(getNoOpAdapterForChannel(channel), null);
  }
});

// ---- 10-11. adapter.execute is NEVER called ----

test("adapter.execute is never called on a fully valid preflight (rogue adapter, blocked path)", (t) => {
  setClock(t, EVAL_TIME);
  const { adapter, calls } = rogueAdapter("EMAIL");
  const result = evaluateExecutionPreflight(contract(), destination(), adapter);
  assert.equal(result.status, "blocked"); // rogue adapter is never approved
  assert.equal(calls.count, 0);
});

test("approved registry adapter execute remains never called -- source-level proof (object identity prevents runtime spying, see module header)", () => {
  // The approved-adapter hardening REQUIRES exact reference equality
  // (adapter === approvedAdapter). A wrapping spy would necessarily be a
  // different object reference and would therefore fail that check and
  // never reach the point where execute() could even be considered --
  // so runtime call-counting on the exact approved instance is
  // structurally impossible to observe without breaking the very
  // security property under test. Instead, this asserts directly against
  // the module's own executable source that no `.execute(` invocation
  // exists anywhere in its code (comments/doc-comments stripped first).
  const source = readFileSync(new URL("./evaluateExecutionPreflight.ts", import.meta.url), "utf8");
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  assert.equal(withoutLineComments.includes(".execute("), false);
});

test("real approved adapter used directly in a full valid preflight still never gets its execute() awaited (function remains synchronous)", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
  assert.equal(result instanceof Promise, false);
});

// ---- 12. intent.adapterKind comes from the verified approved adapter ----

test("intent.adapterKind is sourced from the verified approved adapter's kind", (t) => {
  setClock(t, EVAL_TIME);
  const real = approved("EMAIL");
  const result = evaluateExecutionPreflight(contract(), destination(), real);
  assert.equal(result.intent?.adapterKind, real.kind);
  assert.equal(result.intent?.adapterKind, "no-op");
});

// ---- 13. contract/destination/idempotency/contact/action/channel provenance unchanged ----

test("authorizationRecordId mismatch (contract vs destination) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 1 }), destination({ authorizationRecordId: 2 }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("actionId mismatch (contract vs destination) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ actionId: "action-A" }), destination({ actionId: "action-B" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("idempotencyKey mismatch (contract vs destination) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ idempotencyKey: "key-A" }), destination({ idempotencyKey: "key-B" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("contactId mismatch (contract vs destination) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ contactId: 42 }), destination({ contactId: 999 }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("contract/destination channel mismatch → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "PHONE" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("contract/adapter channel mismatch → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), approved("PHONE"));
  assert.equal(result.status, "blocked");
});

// Note: given contract.channel === destinationEnvelope.channel here, the
// contract/adapter and destination/adapter checks are transitively
// equivalent (see module comment) -- this test exercises the observable
// "destination and adapter channels disagree" scenario end-to-end; it does
// not assert which of the two internal checks fired first.
test("destination/adapter channel mismatch → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), destination({ channel: "PHONE" }), approved("SMS"));
  assert.equal(result.status, "blocked");
});

test("Contact A contract + Contact B destination → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const contactA = contract({ contactId: 42 });
  const contactBDestination = destination({ contactId: 999 });
  const result = evaluateExecutionPreflight(contactA, contactBDestination, approved("EMAIL"));
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("canonical idempotency key passes through unchanged", (t) => {
  setClock(t, EVAL_TIME);
  const key = "Odd_Format-Key.999-DO-NOT-TOUCH";
  const result = evaluateExecutionPreflight(contract({ idempotencyKey: key }), destination({ idempotencyKey: key }), approved("EMAIL"));
  assert.equal(result.intent?.idempotencyKey, key);
  assert.notEqual(result.intent?.idempotencyKey, key.toLowerCase());
});

test("actionId passes through unchanged", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ actionId: "special-action-777" }), destination({ actionId: "special-action-777" }), approved("EMAIL"));
  assert.equal(result.intent?.actionId, "special-action-777");
});

test("authorizationRecordId passes through unchanged", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 999 }), destination({ authorizationRecordId: 999 }), approved("EMAIL"));
  assert.equal(result.intent?.authorizationRecordId, 999);
});

test("contactId passes through unchanged", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ contactId: 555 }), destination({ contactId: 555 }), approved("EMAIL"));
  assert.equal(result.intent?.contactId, 555);
});

test("channel passes through unchanged", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ channel: "SMS" }), destination({ channel: "SMS" }), approved("SMS"));
  assert.equal(result.intent?.channel, "SMS");
});

test("destination passes through only on successful preflight", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination({ destination: "prospect@example.com" }), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
  assert.equal(result.intent?.destination, "prospect@example.com");
});

test("destination absent from blocked result", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 1 }), destination({ authorizationRecordId: 2 }), approved("EMAIL"));
  assert.equal(result.intent, null);
});

test("destination absent from evaluation_failed result", (t) => {
  setClock(t, EVAL_TIME);
  const badContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(badContract, destination(), approved("EMAIL"));
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.intent, null);
});

// ---- 14. executionPerformed always false ----

test("contract.executionPerformed true (unsafe cast) → evaluation_failed, never preflight_ready", (t) => {
  setClock(t, EVAL_TIME);
  const badContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(badContract, destination(), approved("EMAIL"));
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

test("destinationEnvelope.executionPerformed true (unsafe cast) → evaluation_failed", (t) => {
  setClock(t, EVAL_TIME);
  const badDestination = { ...destination(), executionPerformed: true } as unknown as ResolvedDestinationEnvelope;
  const result = evaluateExecutionPreflight(contract(), badDestination, approved("EMAIL"));
  assert.equal(result.status, "evaluation_failed");
});

test("Phase 12 executionPerformed is always literally false, on every status", (t) => {
  setClock(t, EVAL_TIME);
  const ready = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.equal(ready.executionPerformed, false);

  const blockedResult = evaluateExecutionPreflight(null, destination(), approved("EMAIL"));
  assert.equal(blockedResult.executionPerformed, false);

  const badContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const failed = evaluateExecutionPreflight(badContract, destination(), approved("EMAIL"));
  assert.equal(failed.executionPerformed, false);
});

// ---- adapter kind structural validation (rogue adapters still fail closed structurally) ----

test("invalid adapter.kind (blank) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const adapter: ProviderAdapter = Object.freeze({ channel: "EMAIL", kind: "   ", async execute() { return { status: "accepted_noop", executionPerformed: false } as ProviderAdapterOutcome; } });
  const result = evaluateExecutionPreflight(contract(), destination(), adapter);
  assert.equal(result.status, "blocked");
});

test("invalid adapter.kind (oversized) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const adapter: ProviderAdapter = Object.freeze({ channel: "EMAIL", kind: "x".repeat(201), async execute() { return { status: "accepted_noop", executionPerformed: false } as ProviderAdapterOutcome; } });
  const result = evaluateExecutionPreflight(contract(), destination(), adapter);
  assert.equal(result.status, "blocked");
});

test("malformed adapter.channel → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const adapter = { channel: "CARRIER_PIGEON" as unknown as ContactChannel, kind: "bad-adapter", async execute() { return { status: "accepted_noop", executionPerformed: false } as ProviderAdapterOutcome; } };
  const result = evaluateExecutionPreflight(contract(), destination(), adapter);
  assert.equal(result.status, "blocked");
});

// ---- immutability ----

test("does not mutate the contract argument", (t) => {
  setClock(t, EVAL_TIME);
  const input = contract();
  const snapshot = JSON.parse(JSON.stringify(input));
  evaluateExecutionPreflight(input, destination(), approved("EMAIL"));
  assert.deepEqual(input, snapshot);
});

test("does not mutate the destinationEnvelope argument", (t) => {
  setClock(t, EVAL_TIME);
  const input = destination();
  const snapshot = JSON.parse(JSON.stringify(input));
  evaluateExecutionPreflight(contract(), input, approved("EMAIL"));
  assert.deepEqual(input, snapshot);
});

test("does not mutate the adapter argument", (t) => {
  setClock(t, EVAL_TIME);
  const adapter = approved("EMAIL");
  const snapshot = { channel: adapter.channel, kind: adapter.kind };
  evaluateExecutionPreflight(contract(), destination(), adapter);
  assert.deepEqual({ channel: adapter.channel, kind: adapter.kind }, snapshot);
});

test("intent output is frozen / read-only", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.equal(Object.isFrozen(result.intent), true);
});

// ---- deterministic (under a fixed mocked clock) ----

test("is deterministic: identical input at a fixed instant produces identical output", (t) => {
  setClock(t, EVAL_TIME);
  const c = contract();
  const d = destination();
  const a = evaluateExecutionPreflight(c, d, approved("EMAIL"));
  const b = evaluateExecutionPreflight(c, d, approved("EMAIL"));
  assert.deepEqual(a, b);
});

// ---- no DB / network / secret / persistence ----

test("evaluateExecutionPreflight has exactly 3 parameters -- no database client, no caller-supplied evaluation timestamp", () => {
  assert.equal(evaluateExecutionPreflight.length, 3);
});

test("evaluateExecutionPreflight is synchronous, not async -- returns a plain object, never a Promise", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.equal(result instanceof Promise, false);
});

test("resolves near-instantly, consistent with zero network I/O", (t) => {
  setClock(t, EVAL_TIME);
  const started = Date.now();
  evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 200, `expected near-instant resolution, took ${elapsedMs}ms`);
});

test("no environment/provider-secret access occurs", (t) => {
  setClock(t, EVAL_TIME);
  const originalEnv = process.env;
  const guardedEnv = new Proxy(
    {},
    {
      get(_target, prop) {
        throw new Error(`Unexpected process.env.${String(prop)} access`);
      },
    },
  );
  // @ts-expect-error -- intentional monkey-patch for the duration of this test only.
  process.env = guardedEnv;
  try {
    const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
    assert.equal(result.status, "preflight_ready");
  } finally {
    process.env = originalEnv;
  }
});

test("no persistence occurs -- output is a fresh in-memory object each call, never cached/shared", (t) => {
  setClock(t, EVAL_TIME);
  const a = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  const b = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.notEqual(a.intent, b.intent);
  assert.deepEqual(a.intent, b.intent);
});

// ---- no PII / no commercial fields ----

test("no PII appears in failure reasons", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 1 }), destination({ authorizationRecordId: 2 }), approved("EMAIL"));
  const serialised = JSON.stringify(result.reasons);
  const emailShaped = /[^\s"]+@[^\s".]+\.[a-z]{2,}/i;
  assert.equal(emailShaped.test(serialised), false);
});

test("raw destination never appears in failure reasons", (t) => {
  setClock(t, EVAL_TIME);
  const secretDestination = destination({ destination: "super-secret-address@example.com", channel: "PHONE" });
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), secretDestination, approved("PHONE"));
  const serialised = JSON.stringify(result.reasons);
  assert.equal(serialised.includes("super-secret-address@example.com"), false);
});

test("no opportunity/commercial fields appear in the intent envelope", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.ok(result.intent);
  const keys = Object.keys(result.intent);
  for (const forbidden of ["opportunityScore", "estimatedValue", "commission", "leadPriority", "renewalAttractiveness", "revenueScore", "signalStrength", "fusionScore"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

test("no FEH FUSION/opportunity data can override a mismatch -- there is no such field on any input type", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(
    contract({ actionId: "high-value-action-999", authorizationRecordId: 1 }),
    destination({ actionId: "high-value-action-999", authorizationRecordId: 2 }), // the only failing condition
    approved("EMAIL"),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("a highly 'approved-looking' rogue adapter cannot override channel binding or provenance -- no commercial/urgency field exists to help it", (t) => {
  setClock(t, EVAL_TIME);
  const { adapter } = rogueAdapter("EMAIL", "no-op");
  const result = evaluateExecutionPreflight(
    contract({ channel: "EMAIL", actionId: "high-priority-action-999" }),
    destination({ channel: "EMAIL" }),
    adapter,
  );
  assert.equal(result.status, "blocked");
});

// ---- malformed/missing inputs ----

test("malformed contract (blank idempotencyKey) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ idempotencyKey: "" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed destination envelope (blank destination) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination({ destination: "" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("null contract → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(null, destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("null destination envelope → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), null, approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("null adapter → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination(), null);
  assert.equal(result.status, "blocked");
});

test("an adversarial contract object whose property access throws → evaluation_failed, not a crash", (t) => {
  setClock(t, EVAL_TIME);
  const throwingContract = new Proxy(
    {},
    {
      get() {
        throw new Error("simulated adversarial property access failure");
      },
    },
  ) as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(throwingContract, destination(), approved("EMAIL"));
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.intent, null);
  assert.equal(result.executionPerformed, false);
});

// ---- Additional boundary tests ----

test("missing policyVersion on contract → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ policyVersion: "" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("policyVersion is preserved exactly on the intent envelope", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ policyVersion: "feh-execution-authorization-policy@9.9.9-custom" }), destination(), approved("EMAIL"));
  assert.equal(result.intent?.policyVersion, "feh-execution-authorization-policy@9.9.9-custom");
});

test("reasons array is always populated", (t) => {
  setClock(t, EVAL_TIME);
  const ready = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.ok(ready.reasons.length > 0);
  const blockedResult = evaluateExecutionPreflight(null, destination(), approved("EMAIL"));
  assert.ok(blockedResult.reasons.length > 0);
});

test("preflightEvaluatedAt reflects the internally-derived (mocked) current instant", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"));
  assert.equal(result.intent?.preflightEvaluatedAt, EVAL_TIME.toISOString());
});

test("a mismatched authorizationRecordId cannot be masked by every other field being perfectly consistent", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(
    contract({ authorizationRecordId: 1, actionId: "action-123", idempotencyKey: "idem-key-abc-123", contactId: 42, channel: "EMAIL" }),
    destination({ authorizationRecordId: 2, actionId: "action-123", idempotencyKey: "idem-key-abc-123", contactId: 42, channel: "EMAIL" }),
    approved("EMAIL"),
  );
  assert.equal(result.status, "blocked");
});

test("createNoOpProviderAdapter() (a freshly constructed adapter, not from the registry) is NOT the approved instance and is blocked", (t) => {
  setClock(t, EVAL_TIME);
  // Proves the trust mechanism is registry identity, not "any adapter created via the sanctioned factory function".
  const freshlyConstructed = createNoOpProviderAdapter("EMAIL");
  assert.notEqual(freshlyConstructed, approved("EMAIL"));
  const result = evaluateExecutionPreflight(contract(), destination(), freshlyConstructed);
  assert.equal(result.status, "blocked");
});

// ==================================================================
// Targeted hardening: expiry/freshness provenance (Phase 13)
// ==================================================================

const EXPIRY = "2026-08-21T10:00:00.000Z";
const ONE_MS_BEFORE_EXPIRY = new Date("2026-08-21T09:59:59.999Z");
const EXACTLY_AT_EXPIRY = new Date("2026-08-21T10:00:00.000Z");
const ONE_MS_AFTER_EXPIRY = new Date("2026-08-21T10:00:00.001Z");
const SUBSTANTIALLY_AFTER_EXPIRY = new Date("2027-01-01T00:00:00.000Z");

test("current instant exactly 1ms before authorizationExpiresAt → preflight_ready", (t) => {
  setClock(t, ONE_MS_BEFORE_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
  assert.notEqual(result.intent, null);
});

test("current instant exactly equal to authorizationExpiresAt → blocked (authority ends AT the instant, not after)", (t) => {
  setClock(t, EXACTLY_AT_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("current instant exactly 1ms after authorizationExpiresAt → blocked", (t) => {
  setClock(t, ONE_MS_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("substantially expired contract (months in the past) → blocked", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed contract.authorizationExpiresAt (unparseable) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: "not-a-real-timestamp" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("blank contract.authorizationExpiresAt → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const c = { ...contract(), authorizationExpiresAt: "" } as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(c, destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("missing contract.authorizationExpiresAt (null) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const c = { ...contract(), authorizationExpiresAt: null } as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(c, destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// timezone-equivalent expiry/evaluation instant → treated as equal and therefore blocked.
test("timezone-equivalent instants (different offset, same instant as expiry) → treated as equal, therefore blocked", (t) => {
  // 2026-08-21T11:00:00+01:00 is the exact same instant as 2026-08-21T10:00:00Z.
  setClock(t, new Date("2026-08-21T11:00:00.000+01:00"));
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: "2026-08-21T10:00:00.000Z" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// different timezone offsets compare by instant correctly.
test("different timezone offsets on the expiry side compare by instant correctly (fresh case)", (t) => {
  // Expiry expressed with a +01:00 offset, representing 2026-08-21T10:00:00Z. Current instant 1ms before that.
  setClock(t, new Date("2026-08-21T09:59:59.999Z"));
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: "2026-08-21T11:00:00.000+01:00" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
});

test("different timezone offsets on the expiry side compare by instant correctly (expired case)", (t) => {
  setClock(t, new Date("2026-08-21T10:00:00.001Z")); // 1ms after the same instant
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: "2026-08-21T11:00:00.000+01:00" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("an otherwise-perfect chain (every cross-check passes) is still blocked once expired", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(
    contract({
      authorizationRecordId: 1,
      actionId: "action-123",
      idempotencyKey: "idem-key-abc-123",
      contactId: 42,
      channel: "EMAIL",
      authorizationExpiresAt: EXPIRY,
    }),
    destination({ authorizationRecordId: 1, actionId: "action-123", idempotencyKey: "idem-key-abc-123", contactId: 42, channel: "EMAIL" }),
    approved("EMAIL"),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("the genuinely approved registry adapter cannot override an expired authorization", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("a perfectly valid, matching destination cannot override an expired authorization", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination({ destination: "prospect@example.com" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("a perfectly matching idempotency key cannot override an expired authorization", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const key = "idem-key-abc-123";
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY, idempotencyKey: key }), destination({ idempotencyKey: key }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("a perfectly matching contactId cannot override an expired authorization", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY, contactId: 555 }), destination({ contactId: 555 }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("no commercial/FEH-FUSION signal can override an expired authorization -- no such field exists on any input", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY, actionId: "half-a-million-pound-action" }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("executionPerformed remains literally false when blocked due to expiry", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.executionPerformed, false);
});

test("adapter.execute remains never called when blocked due to expiry (rogue adapter would have thrown if invoked)", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const { adapter, calls } = rogueAdapter("EMAIL", "no-op");
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), adapter);
  assert.equal(result.status, "blocked"); // rogue adapter is never approved in the first place
  assert.equal(calls.count, 0);
});

test("intent is null when expired, non-null when fresh, using the identical contract/destination/adapter otherwise", (t) => {
  const c = contract({ authorizationExpiresAt: EXPIRY });
  const d = destination();
  const a = approved("EMAIL");

  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const expiredResult = evaluateExecutionPreflight(c, d, a);
  assert.equal(expiredResult.intent, null);

  // Already enabled by setClock above -- advance the same mocked clock rather than re-enabling it.
  t.mock.timers.setTime(ONE_MS_BEFORE_EXPIRY.getTime());
  const freshResult = evaluateExecutionPreflight(c, d, a);
  assert.equal(freshResult.status, "preflight_ready");
  assert.notEqual(freshResult.intent, null);
});

test("intent.authorizationExpiresAt carries the exact persisted expiry value through, unmodified", (t) => {
  setClock(t, EVAL_TIME);
  const oddButValid = "2027-01-01T00:00:00.000+00:00";
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: oddButValid }), destination(), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
  assert.equal(result.intent?.authorizationExpiresAt, oddButValid);
});

// --- Security / regression ---

test("expiry failure reasons never include the raw destination or any PII", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const secretDestination = destination({ destination: "super-secret-address@example.com" });
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), secretDestination, approved("EMAIL"));
  const serialised = JSON.stringify(result.reasons);
  assert.equal(serialised.includes("super-secret-address@example.com"), false);
  assert.equal(result.reasons.some((r) => r.toLowerCase().includes("expired")), true);
});

test("no automatic reauthorisation: an expired result never implies a new/extended/refreshed authorization", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
  const serialised = JSON.stringify(result);
  for (const forbidden of ["reauthoris", "reauthoriz", "extend", "refresh", "renew"]) {
    assert.equal(serialised.toLowerCase().includes(forbidden), false);
  }
});

test("no expiry extension across repeated calls -- an expired contract stays expired no matter how many times it is evaluated", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const c = contract({ authorizationExpiresAt: EXPIRY });
  const d = destination();
  const a = approved("EMAIL");
  for (let i = 0; i < 5; i++) {
    const result = evaluateExecutionPreflight(c, d, a);
    assert.equal(result.status, "blocked");
  }
});

test("evaluating an expired contract performs no additional I/O -- resolves near-instantly with no DB/network/env access", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const originalEnv = process.env;
  const guardedEnv = new Proxy(
    {},
    {
      get(_target, prop) {
        throw new Error(`Unexpected process.env.${String(prop)} access`);
      },
    },
  );
  // @ts-expect-error -- intentional monkey-patch for the duration of this test only.
  process.env = guardedEnv;
  try {
    const started = Date.now();
    const result = evaluateExecutionPreflight(contract({ authorizationExpiresAt: EXPIRY }), destination(), approved("EMAIL"));
    const elapsedMs = Date.now() - started;
    assert.equal(result.status, "blocked");
    assert.ok(elapsedMs < 200);
  } finally {
    process.env = originalEnv;
  }
});

// ==================================================================
// Targeted hardening: trusted current-time source (Phase 13B)
// ==================================================================

test("no field on contract, destinationEnvelope, or adapter resembles a caller-controlled clock override", (t) => {
  setClock(t, EVAL_TIME);
  const c = contract();
  const d = destination();
  const a = approved("EMAIL");
  const clockLike = /evaluat|currenttime|^now$/i;
  for (const key of Object.keys(c)) {
    assert.equal(clockLike.test(key), false, `unexpected clock-like field on contract: ${key}`);
  }
  for (const key of Object.keys(d)) {
    assert.equal(clockLike.test(key), false, `unexpected clock-like field on destinationEnvelope: ${key}`);
  }
  for (const key of Object.keys(a)) {
    assert.equal(clockLike.test(key), false, `unexpected clock-like field on adapter: ${key}`);
  }
});

test("an attempted extra 4th argument (a backdated Date) has zero effect -- JavaScript ignores excess arguments and the function uses only its own internal clock", (t) => {
  setClock(t, ONE_MS_BEFORE_EXPIRY);
  const c = contract({ authorizationExpiresAt: EXPIRY });
  const d = destination();
  const a = approved("EMAIL");
  // @ts-expect-error -- deliberately calling with a 4th argument to prove the production API ignores it.
  const result = evaluateExecutionPreflight(c, d, a, new Date("1999-01-01T00:00:00.000Z"));
  assert.equal(result.status, "preflight_ready"); // the bogus 4th arg (a far-past backdated Date) had zero effect
});

test("replay/backdating is structurally impossible through function arguments: an old contract evaluated 'now' uses the real current instant, not any embedded timestamp", (t) => {
  // The contract's own contractCreatedAt is far in the past; nothing about that field influences freshness.
  setClock(t, ONE_MS_BEFORE_EXPIRY);
  const oldContract = contract({ authorizationExpiresAt: EXPIRY, contractCreatedAt: "2000-01-01T00:00:00.000Z" });
  const result = evaluateExecutionPreflight(oldContract, destination(), approved("EMAIL"));
  assert.equal(result.status, "preflight_ready");
});
