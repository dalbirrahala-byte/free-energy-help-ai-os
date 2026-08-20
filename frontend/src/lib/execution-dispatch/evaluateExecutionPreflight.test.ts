import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { evaluateExecutionPreflight } from "./evaluateExecutionPreflight.ts";
import { createNoOpProviderAdapter, getNoOpAdapterForChannel } from "./providerAdapter.ts";
import type { ProviderAdapter, ProviderAdapterOutcome } from "./providerAdapter.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";
import type { ResolvedDestinationEnvelope } from "./resolveExecutionDestination.ts";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";

const EVAL_TIME = new Date("2026-08-31T10:00:00.000Z");

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
 * since Phase 12 now requires exact reference equality against this
 * registry lookup.
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

test("registered approved EMAIL adapter + valid EMAIL chain → preflight_ready", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "preflight_ready");
  assert.notEqual(result.intent, null);
});

test("registered approved PHONE adapter + valid PHONE chain → preflight_ready", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), destination({ channel: "PHONE" }), approved("PHONE"), EVAL_TIME);
  assert.equal(result.status, "preflight_ready");
});

test("registered approved WHATSAPP adapter + valid WHATSAPP chain → preflight_ready", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "WHATSAPP" }), destination({ channel: "WHATSAPP" }), approved("WHATSAPP"), EVAL_TIME);
  assert.equal(result.status, "preflight_ready");
});

test("registered approved SMS adapter + valid SMS chain → preflight_ready", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "SMS" }), destination({ channel: "SMS" }), approved("SMS"), EVAL_TIME);
  assert.equal(result.status, "preflight_ready");
});

// ---- 5-8. approved-adapter provenance hardening ----

// 5. arbitrary caller-created EMAIL adapter with matching channel → blocked.
test("arbitrary caller-created EMAIL adapter with matching channel/kind → blocked (not the approved registry instance)", () => {
  const { adapter } = rogueAdapter("EMAIL", "no-op"); // same channel AND same kind text as the real approved adapter
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), adapter, EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

// 6. arbitrary adapter with the SAME kind text as the approved adapter → blocked, because the chosen trust
// mechanism is exact registry reference identity, not the caller-controlled `kind` string.
test("arbitrary adapter with identical kind text to the approved adapter is still blocked -- kind text alone proves nothing", () => {
  const real = approved("EMAIL");
  const { adapter } = rogueAdapter("EMAIL", real.kind);
  assert.equal(adapter.kind, real.kind); // same text, deliberately
  assert.notEqual(adapter, real); // but NOT the same object
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), adapter, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 7. arbitrary adapter with a different kind → blocked.
test("arbitrary adapter with a different kind → blocked", () => {
  const { adapter } = rogueAdapter("EMAIL", "totally-different-kind");
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), adapter, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 8. approved EMAIL adapter cannot approve a PHONE contract.
test("approved EMAIL adapter cannot approve a PHONE contract → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), destination({ channel: "PHONE" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 9. no registered adapter for a channel -- structurally unreachable given contract.channel is already
// validated against the same 4-channel VALID_CHANNELS set that the Phase 10 registry is built from, so
// every valid contract.channel always has a registered adapter. Documented here rather than fabricated
// via unsafe global-registry mutation, matching this codebase's "reserved but unreachable" precedent
// (e.g. Phase 8's `needs_review` status).
test("every recognised channel has a registered approved adapter (documents why 'no registered adapter' is unreachable)", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    assert.notEqual(getNoOpAdapterForChannel(channel), null);
  }
});

// ---- 10-11. adapter.execute is NEVER called ----

test("adapter.execute is never called on a fully valid preflight (rogue adapter, blocked path)", () => {
  const { adapter, calls } = rogueAdapter("EMAIL");
  const result = evaluateExecutionPreflight(contract(), destination(), adapter, EVAL_TIME);
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
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  assert.equal(withoutLineComments.includes(".execute("), false);
});

test("real approved adapter used directly in a full valid preflight still never gets its execute() awaited (function remains synchronous)", () => {
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "preflight_ready");
  assert.equal(result instanceof Promise, false);
});

// ---- 12. intent.adapterKind comes from the verified approved adapter ----

test("intent.adapterKind is sourced from the verified approved adapter's kind", () => {
  const real = approved("EMAIL");
  const result = evaluateExecutionPreflight(contract(), destination(), real, EVAL_TIME);
  assert.equal(result.intent?.adapterKind, real.kind);
  assert.equal(result.intent?.adapterKind, "no-op");
});

// ---- 13. contract/destination/idempotency/contact/action/channel provenance unchanged ----

test("authorizationRecordId mismatch (contract vs destination) → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 1 }), destination({ authorizationRecordId: 2 }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("actionId mismatch (contract vs destination) → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ actionId: "action-A" }), destination({ actionId: "action-B" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("idempotencyKey mismatch (contract vs destination) → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ idempotencyKey: "key-A" }), destination({ idempotencyKey: "key-B" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("contactId mismatch (contract vs destination) → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ contactId: 42 }), destination({ contactId: 999 }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("contract/destination channel mismatch → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "PHONE" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("contract/adapter channel mismatch → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "EMAIL" }), destination({ channel: "EMAIL" }), approved("PHONE"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// Note: given contract.channel === destinationEnvelope.channel here, the
// contract/adapter and destination/adapter checks are transitively
// equivalent (see module comment) -- this test exercises the observable
// "destination and adapter channels disagree" scenario end-to-end; it does
// not assert which of the two internal checks fired first.
test("destination/adapter channel mismatch → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), destination({ channel: "PHONE" }), approved("SMS"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("Contact A contract + Contact B destination → blocked", () => {
  const contactA = contract({ contactId: 42 });
  const contactBDestination = destination({ contactId: 999 });
  const result = evaluateExecutionPreflight(contactA, contactBDestination, approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("canonical idempotency key passes through unchanged", () => {
  const key = "Odd_Format-Key.999-DO-NOT-TOUCH";
  const result = evaluateExecutionPreflight(contract({ idempotencyKey: key }), destination({ idempotencyKey: key }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent?.idempotencyKey, key);
  assert.notEqual(result.intent?.idempotencyKey, key.toLowerCase());
});

test("actionId passes through unchanged", () => {
  const result = evaluateExecutionPreflight(contract({ actionId: "special-action-777" }), destination({ actionId: "special-action-777" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent?.actionId, "special-action-777");
});

test("authorizationRecordId passes through unchanged", () => {
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 999 }), destination({ authorizationRecordId: 999 }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent?.authorizationRecordId, 999);
});

test("contactId passes through unchanged", () => {
  const result = evaluateExecutionPreflight(contract({ contactId: 555 }), destination({ contactId: 555 }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent?.contactId, 555);
});

test("channel passes through unchanged", () => {
  const result = evaluateExecutionPreflight(contract({ channel: "SMS" }), destination({ channel: "SMS" }), approved("SMS"), EVAL_TIME);
  assert.equal(result.intent?.channel, "SMS");
});

test("destination passes through only on successful preflight", () => {
  const result = evaluateExecutionPreflight(contract(), destination({ destination: "prospect@example.com" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "preflight_ready");
  assert.equal(result.intent?.destination, "prospect@example.com");
});

test("destination absent from blocked result", () => {
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 1 }), destination({ authorizationRecordId: 2 }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent, null);
});

test("destination absent from evaluation_failed result", () => {
  const badContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(badContract, destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.intent, null);
});

// ---- 14. executionPerformed always false ----

test("contract.executionPerformed true (unsafe cast) → evaluation_failed, never preflight_ready", () => {
  const badContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(badContract, destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

test("destinationEnvelope.executionPerformed true (unsafe cast) → evaluation_failed", () => {
  const badDestination = { ...destination(), executionPerformed: true } as unknown as ResolvedDestinationEnvelope;
  const result = evaluateExecutionPreflight(contract(), badDestination, approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

test("Phase 12 executionPerformed is always literally false, on every status", () => {
  const ready = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(ready.executionPerformed, false);

  const blockedResult = evaluateExecutionPreflight(null, destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(blockedResult.executionPerformed, false);

  const badContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const failed = evaluateExecutionPreflight(badContract, destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(failed.executionPerformed, false);
});

// ---- adapter kind structural validation (rogue adapters still fail closed structurally) ----

test("invalid adapter.kind (blank) → blocked", () => {
  const adapter: ProviderAdapter = Object.freeze({ channel: "EMAIL", kind: "   ", async execute() { return { status: "accepted_noop", executionPerformed: false } as ProviderAdapterOutcome; } });
  const result = evaluateExecutionPreflight(contract(), destination(), adapter, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("invalid adapter.kind (oversized) → blocked", () => {
  const adapter: ProviderAdapter = Object.freeze({ channel: "EMAIL", kind: "x".repeat(201), async execute() { return { status: "accepted_noop", executionPerformed: false } as ProviderAdapterOutcome; } });
  const result = evaluateExecutionPreflight(contract(), destination(), adapter, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("malformed adapter.channel → blocked", () => {
  const adapter = { channel: "CARRIER_PIGEON" as unknown as ContactChannel, kind: "bad-adapter", async execute() { return { status: "accepted_noop", executionPerformed: false } as ProviderAdapterOutcome; } };
  const result = evaluateExecutionPreflight(contract(), destination(), adapter, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// ---- immutability ----

test("does not mutate the contract argument", () => {
  const input = contract();
  const snapshot = JSON.parse(JSON.stringify(input));
  evaluateExecutionPreflight(input, destination(), approved("EMAIL"), EVAL_TIME);
  assert.deepEqual(input, snapshot);
});

test("does not mutate the destinationEnvelope argument", () => {
  const input = destination();
  const snapshot = JSON.parse(JSON.stringify(input));
  evaluateExecutionPreflight(contract(), input, approved("EMAIL"), EVAL_TIME);
  assert.deepEqual(input, snapshot);
});

test("does not mutate the adapter argument", () => {
  const adapter = approved("EMAIL");
  const snapshot = { channel: adapter.channel, kind: adapter.kind };
  evaluateExecutionPreflight(contract(), destination(), adapter, EVAL_TIME);
  assert.deepEqual({ channel: adapter.channel, kind: adapter.kind }, snapshot);
});

test("intent output is frozen / read-only", () => {
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(Object.isFrozen(result.intent), true);
});

// ---- deterministic ----

test("is deterministic: identical input produces identical output", () => {
  const c = contract();
  const d = destination();
  const a = evaluateExecutionPreflight(c, d, approved("EMAIL"), EVAL_TIME);
  const b = evaluateExecutionPreflight(c, d, approved("EMAIL"), EVAL_TIME);
  assert.deepEqual(a, b);
});

// ---- 15-18. no DB / network / secret / persistence ----

test("evaluateExecutionPreflight accepts no database/Supabase client parameter", () => {
  assert.equal(evaluateExecutionPreflight.length, 4);
});

test("evaluateExecutionPreflight is synchronous, not async -- returns a plain object, never a Promise", () => {
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result instanceof Promise, false);
});

test("resolves near-instantly, consistent with zero network I/O", () => {
  const started = Date.now();
  evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 200, `expected near-instant resolution, took ${elapsedMs}ms`);
});

test("no environment/provider-secret access occurs", () => {
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
    const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
    assert.equal(result.status, "preflight_ready");
  } finally {
    process.env = originalEnv;
  }
});

test("no persistence occurs -- output is a fresh in-memory object each call, never cached/shared", () => {
  const a = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  const b = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.notEqual(a.intent, b.intent);
  assert.deepEqual(a.intent, b.intent);
});

// ---- 19-20. no PII / no commercial fields ----

test("no PII appears in failure reasons", () => {
  const result = evaluateExecutionPreflight(contract({ authorizationRecordId: 1 }), destination({ authorizationRecordId: 2 }), approved("EMAIL"), EVAL_TIME);
  const serialised = JSON.stringify(result.reasons);
  const emailShaped = /[^\s"]+@[^\s".]+\.[a-z]{2,}/i;
  assert.equal(emailShaped.test(serialised), false);
});

test("raw destination never appears in failure reasons", () => {
  const secretDestination = destination({ destination: "super-secret-address@example.com", channel: "PHONE" });
  const result = evaluateExecutionPreflight(contract({ channel: "PHONE" }), secretDestination, approved("PHONE"), EVAL_TIME);
  const serialised = JSON.stringify(result.reasons);
  assert.equal(serialised.includes("super-secret-address@example.com"), false);
});

test("no opportunity/commercial fields appear in the intent envelope", () => {
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.ok(result.intent);
  const keys = Object.keys(result.intent);
  for (const forbidden of ["opportunityScore", "estimatedValue", "commission", "leadPriority", "renewalAttractiveness", "revenueScore", "signalStrength", "fusionScore"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

test("no FEH FUSION/opportunity data can override a mismatch -- there is no such field on any input type", () => {
  const result = evaluateExecutionPreflight(
    contract({ actionId: "high-value-action-999", authorizationRecordId: 1 }),
    destination({ actionId: "high-value-action-999", authorizationRecordId: 2 }), // the only failing condition
    approved("EMAIL"),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.intent, null);
});

test("a highly 'approved-looking' rogue adapter cannot override channel binding or provenance -- no commercial/urgency field exists to help it", () => {
  const { adapter } = rogueAdapter("EMAIL", "no-op");
  const result = evaluateExecutionPreflight(
    contract({ channel: "EMAIL", actionId: "high-priority-action-999" }),
    destination({ channel: "EMAIL" }),
    adapter,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// ---- malformed/missing inputs ----

test("malformed contract (blank idempotencyKey) → fail closed", () => {
  const result = evaluateExecutionPreflight(contract({ idempotencyKey: "" }), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("malformed destination envelope (blank destination) → fail closed", () => {
  const result = evaluateExecutionPreflight(contract(), destination({ destination: "" }), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("null contract → fail closed", () => {
  const result = evaluateExecutionPreflight(null, destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("null destination envelope → fail closed", () => {
  const result = evaluateExecutionPreflight(contract(), null, approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("null adapter → fail closed", () => {
  const result = evaluateExecutionPreflight(contract(), destination(), null, EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("malformed evaluatedAt (Invalid Date) → fail closed", () => {
  const invalidDate = new Date("not-a-real-date");
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), invalidDate);
  assert.equal(result.status, "blocked");
});

test("an adversarial contract object whose property access throws → evaluation_failed, not a crash", () => {
  const throwingContract = new Proxy(
    {},
    {
      get() {
        throw new Error("simulated adversarial property access failure");
      },
    },
  ) as unknown as ProviderNeutralDispatchContract;
  const result = evaluateExecutionPreflight(throwingContract, destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.intent, null);
  assert.equal(result.executionPerformed, false);
});

// ---- Additional boundary tests ----

test("missing policyVersion on contract → blocked", () => {
  const result = evaluateExecutionPreflight(contract({ policyVersion: "" }), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("policyVersion is preserved exactly on the intent envelope", () => {
  const result = evaluateExecutionPreflight(contract({ policyVersion: "feh-execution-authorization-policy@9.9.9-custom" }), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent?.policyVersion, "feh-execution-authorization-policy@9.9.9-custom");
});

test("reasons array is always populated", () => {
  const ready = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.ok(ready.reasons.length > 0);
  const blockedResult = evaluateExecutionPreflight(null, destination(), approved("EMAIL"), EVAL_TIME);
  assert.ok(blockedResult.reasons.length > 0);
});

test("preflightEvaluatedAt reflects the supplied evaluatedAt timestamp", () => {
  const result = evaluateExecutionPreflight(contract(), destination(), approved("EMAIL"), EVAL_TIME);
  assert.equal(result.intent?.preflightEvaluatedAt, EVAL_TIME.toISOString());
});

test("a mismatched authorizationRecordId cannot be masked by every other field being perfectly consistent", () => {
  const result = evaluateExecutionPreflight(
    contract({ authorizationRecordId: 1, actionId: "action-123", idempotencyKey: "idem-key-abc-123", contactId: 42, channel: "EMAIL" }),
    destination({ authorizationRecordId: 2, actionId: "action-123", idempotencyKey: "idem-key-abc-123", contactId: 42, channel: "EMAIL" }),
    approved("EMAIL"),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

test("createNoOpProviderAdapter() (a freshly constructed adapter, not from the registry) is NOT the approved instance and is blocked", () => {
  // Proves the trust mechanism is registry identity, not "any adapter created via the sanctioned factory function".
  const freshlyConstructed = createNoOpProviderAdapter("EMAIL");
  assert.notEqual(freshlyConstructed, approved("EMAIL"));
  const result = evaluateExecutionPreflight(contract(), destination(), freshlyConstructed, EVAL_TIME);
  assert.equal(result.status, "blocked");
});
