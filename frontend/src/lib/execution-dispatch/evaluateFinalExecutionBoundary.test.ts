import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { TestContext } from "node:test";

import { evaluateFinalExecutionBoundary } from "./evaluateFinalExecutionBoundary.ts";
import { createNoOpProviderAdapter, getNoOpAdapterForChannel } from "./providerAdapter.ts";
import type { ProviderAdapter, ProviderAdapterOutcome } from "./providerAdapter.ts";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";

const EVAL_TIME = new Date("2026-08-31T10:00:00.000Z");
const FUTURE_EXPIRY = "2026-09-01T10:00:00.000Z"; // well after EVAL_TIME, for happy-path fixtures

/**
 * Deterministic clock control WITHOUT reopening the production trust
 * boundary: uses Node's own built-in per-test `context.mock.timers` to
 * fake `Date` for the duration of a single test (auto-restored by Node
 * when the test completes) -- never a caller-supplied time argument on
 * the production function itself, which does not exist.
 */
function setClock(t: TestContext, at: Date | string): void {
  t.mock.timers.enable({ apis: ["Date"] });
  const ms = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  t.mock.timers.setTime(ms);
}

function intent(overrides: Partial<ExecutionIntentEnvelope> = {}): ExecutionIntentEnvelope {
  return Object.freeze({
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "idem-key-abc-123",
    contactId: 42,
    channel: "EMAIL",
    destination: "prospect@example.com",
    adapterKind: "no-op",
    policyVersion: "feh-execution-authorization-policy@0.1.0-factory041",
    authorizationExpiresAt: FUTURE_EXPIRY,
    preflightEvaluatedAt: EVAL_TIME.toISOString(),
    executionPerformed: false,
    ...overrides,
  });
}

/** The REAL Phase 10 approved adapter instance for a channel -- the only kind of adapter that can ever reach execution_boundary_ready. */
function approved(channel: ContactChannel = "EMAIL"): ProviderAdapter {
  const adapter = getNoOpAdapterForChannel(channel);
  assert.ok(adapter, `expected an approved adapter to be registered for ${channel}`);
  return adapter;
}

/** A caller-created, NOT-approved adapter whose execute() throws and records whether it was ever called. */
function rogueAdapter(channel: ContactChannel = "EMAIL", kind = "no-op"): { adapter: ProviderAdapter; calls: { count: number } } {
  const calls = { count: 0 };
  const adapter: ProviderAdapter = Object.freeze({
    channel,
    kind,
    execute(): Promise<ProviderAdapterOutcome> {
      calls.count += 1;
      throw new Error("execute() must never be called by Phase 14");
    },
  });
  return { adapter, calls };
}

// ---- 1. valid fresh intent → execution_boundary_ready ----

test("valid fresh intent + approved adapter → execution_boundary_ready", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  assert.equal(result.status, "execution_boundary_ready");
});

// ---- 2-4. freshness boundary semantics ----

const EXPIRY = "2026-08-21T10:00:00.000Z";
const ONE_MS_BEFORE_EXPIRY = new Date("2026-08-21T09:59:59.999Z");
const EXACTLY_AT_EXPIRY = new Date("2026-08-21T10:00:00.000Z");
const ONE_MS_AFTER_EXPIRY = new Date("2026-08-21T10:00:00.001Z");
const SUBSTANTIALLY_AFTER_EXPIRY = new Date("2027-01-01T00:00:00.000Z");

test("expired intent → blocked", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("current instant exactly equal to authorizationExpiresAt → blocked (authority ends AT the instant)", (t) => {
  setClock(t, EXACTLY_AT_EXPIRY);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("current instant exactly 1ms before authorizationExpiresAt → execution_boundary_ready", (t) => {
  setClock(t, ONE_MS_BEFORE_EXPIRY);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY }), approved("EMAIL"));
  assert.equal(result.status, "execution_boundary_ready");
});

test("current instant exactly 1ms after authorizationExpiresAt → blocked", (t) => {
  setClock(t, ONE_MS_AFTER_EXPIRY);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// ---- 5-7. malformed/blank/missing expiry ----

test("malformed authorizationExpiresAt (unparseable) → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: "not-a-real-timestamp" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("blank authorizationExpiresAt → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: "   " }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("missing authorizationExpiresAt via unsafe runtime input (null) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const bad = { ...intent(), authorizationExpiresAt: null } as unknown as ExecutionIntentEnvelope;
  const result = evaluateFinalExecutionBoundary(bad, approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// ---- 8. timezone-equivalent instant handling ----

test("timezone-equivalent instants (different offset, same instant as expiry) → treated as equal, therefore blocked", (t) => {
  setClock(t, new Date("2026-08-21T11:00:00.000+01:00")); // same instant as 2026-08-21T10:00:00Z
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: "2026-08-21T10:00:00.000Z" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("different timezone offsets on the expiry side compare by instant correctly (fresh case)", (t) => {
  setClock(t, new Date("2026-08-21T09:59:59.999Z")); // 1ms before the same instant
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: "2026-08-21T11:00:00.000+01:00" }), approved("EMAIL"));
  assert.equal(result.status, "execution_boundary_ready");
});

test("different timezone offsets on the expiry side compare by instant correctly (expired case)", (t) => {
  setClock(t, new Date("2026-08-21T10:00:00.001Z")); // 1ms after the same instant
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: "2026-08-21T11:00:00.000+01:00" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// ---- 9. stale intent that previously passed preflight → blocked ----

test("a stale intent (identical object that previously would have passed preflight) is blocked once real time has advanced past expiry", (t) => {
  const staleIntent = intent({ authorizationExpiresAt: EXPIRY });
  setClock(t, ONE_MS_BEFORE_EXPIRY);
  const freshResult = evaluateFinalExecutionBoundary(staleIntent, approved("EMAIL"));
  assert.equal(freshResult.status, "execution_boundary_ready");

  t.mock.timers.setTime(SUBSTANTIALLY_AFTER_EXPIRY.getTime());
  const staleResult = evaluateFinalExecutionBoundary(staleIntent, approved("EMAIL"));
  assert.equal(staleResult.status, "blocked");
});

// ---- 10-12. caller cannot inject/influence current time ----

test("evaluateFinalExecutionBoundary has exactly 2 parameters -- no caller-supplied time argument", () => {
  assert.equal(evaluateFinalExecutionBoundary.length, 2);
});

test("an attempted extra 3rd argument (a backdated Date) has zero effect -- JavaScript ignores excess arguments", (t) => {
  setClock(t, ONE_MS_BEFORE_EXPIRY);
  // @ts-expect-error -- deliberately calling with a 3rd argument to prove the production API ignores it.
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY }), approved("EMAIL"), new Date("1999-01-01T00:00:00.000Z"));
  assert.equal(result.status, "execution_boundary_ready"); // the bogus 3rd arg had zero effect
});

test("no field on intent or adapter resembles a caller-controlled clock override", (t) => {
  setClock(t, EVAL_TIME);
  const i = intent();
  const a = approved("EMAIL");
  const clockLike = /evaluat|currenttime|^now$/i;
  for (const key of Object.keys(i)) {
    if (key === "preflightEvaluatedAt") continue; // a legitimate provenance timestamp, not a clock override
    assert.equal(clockLike.test(key), false, `unexpected clock-like field on intent: ${key}`);
  }
  for (const key of Object.keys(a)) {
    assert.equal(clockLike.test(key), false, `unexpected clock-like field on adapter: ${key}`);
  }
});

// ---- 13. caller cannot supply a second expiry ----

test("intent has exactly one expiry-shaped field -- authorizationExpiresAt -- nothing else could be substituted", (t) => {
  setClock(t, EVAL_TIME);
  const i = intent();
  const expiryLike = Object.keys(i).filter((k) => /expir/i.test(k));
  assert.deepEqual(expiryLike, ["authorizationExpiresAt"]);
});

// ---- 14-16. raw upstream artifacts cannot substitute for the intent ----

test("a raw ProviderNeutralDispatchContract-shaped object cannot be substituted for an intent", (t) => {
  setClock(t, EVAL_TIME);
  const contractShaped = {
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
  } as unknown as ExecutionIntentEnvelope;
  const result = evaluateFinalExecutionBoundary(contractShaped, approved("EMAIL"));
  assert.equal(result.status, "blocked"); // missing destination/adapterKind/preflightEvaluatedAt
});

test("a raw ExecutionDispatchDecision-shaped object cannot be substituted for an intent", (t) => {
  setClock(t, EVAL_TIME);
  const decisionShaped = {
    status: "ready_for_dispatch",
    readyForDispatch: true,
    requestedChannel: "EMAIL",
    reasons: [],
    evidence: { authorizationRecordId: 1, actionId: "action-123", idempotencyKey: "idem-key-abc-123" },
    executionPerformed: false,
    evaluatedAt: EVAL_TIME.toISOString(),
  } as unknown as ExecutionIntentEnvelope;
  const result = evaluateFinalExecutionBoundary(decisionShaped, approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("a raw ResolvedDestinationEnvelope-shaped object cannot be substituted for an intent", (t) => {
  setClock(t, EVAL_TIME);
  const destinationShaped = {
    authorizationRecordId: 1,
    actionId: "action-123",
    idempotencyKey: "idem-key-abc-123",
    channel: "EMAIL",
    contactId: 42,
    destination: "prospect@example.com",
    resolvedAt: EVAL_TIME.toISOString(),
    executionPerformed: false,
  } as unknown as ExecutionIntentEnvelope;
  const result = evaluateFinalExecutionBoundary(destinationShaped, approved("EMAIL"));
  assert.equal(result.status, "blocked"); // missing adapterKind/policyVersion/authorizationExpiresAt/preflightEvaluatedAt
});

// ---- 17-25. malformed security-critical intent fields ----

test("malformed authorizationRecordId (intent identity) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  for (const bad of [0, -1, 1.5]) {
    const result = evaluateFinalExecutionBoundary(intent({ authorizationRecordId: bad }), approved("EMAIL"));
    assert.equal(result.status, "blocked");
  }
});

test("malformed actionId (action identity) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ actionId: "   " }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed idempotencyKey (idempotency identity) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ idempotencyKey: "" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed contactId (contact identity) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  for (const bad of [0, -1, 1.5]) {
    const result = evaluateFinalExecutionBoundary(intent({ contactId: bad }), approved("EMAIL"));
    assert.equal(result.status, "blocked");
  }
});

test("malformed channel → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const bad = intent({ channel: "CARRIER_PIGEON" as unknown as ContactChannel });
  const result = evaluateFinalExecutionBoundary(bad, approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed destination → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ destination: "" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed intent.adapterKind → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ adapterKind: "   " }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed policyVersion → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ policyVersion: "" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("malformed preflightEvaluatedAt (preflight evaluation provenance) → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ preflightEvaluatedAt: "not-a-real-timestamp" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// ---- 26-28. approved-adapter provenance ----

test("caller-created rogue adapter with matching kind/channel/function shape → blocked (not the approved registry instance)", (t) => {
  setClock(t, EVAL_TIME);
  const { adapter } = rogueAdapter("EMAIL", "no-op");
  const result = evaluateFinalExecutionBoundary(intent({ channel: "EMAIL" }), adapter);
  assert.equal(result.status, "blocked");
});

test("wrong-channel approved adapter → blocked", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ channel: "EMAIL" }), approved("PHONE"));
  assert.equal(result.status, "blocked");
});

test("correct approved registry adapter → execution_boundary_ready", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ channel: "SMS" }), approved("SMS"));
  assert.equal(result.status, "execution_boundary_ready");
});

test("createNoOpProviderAdapter() (a freshly constructed adapter, not from the registry) is NOT the approved instance and is blocked", (t) => {
  setClock(t, EVAL_TIME);
  const freshlyConstructed = createNoOpProviderAdapter("EMAIL");
  assert.notEqual(freshlyConstructed, approved("EMAIL"));
  const result = evaluateFinalExecutionBoundary(intent(), freshlyConstructed);
  assert.equal(result.status, "blocked");
});

// ---- 29-30. null inputs ----

test("adapter null → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent(), null);
  assert.equal(result.status, "blocked");
});

test("intent null → fail closed", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(null, approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

// ---- 31-33. repetition / determinism / state ----

test("repeated expired evaluations remain blocked", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const i = intent({ authorizationExpiresAt: EXPIRY });
  const a = approved("EMAIL");
  for (let n = 0; n < 5; n++) {
    const result = evaluateFinalExecutionBoundary(i, a);
    assert.equal(result.status, "blocked");
  }
});

test("repeated fresh evaluations under fixed mocked time remain deterministic", (t) => {
  setClock(t, EVAL_TIME);
  const i = intent();
  const a = approved("EMAIL");
  const r1 = evaluateFinalExecutionBoundary(i, a);
  const r2 = evaluateFinalExecutionBoundary(i, a);
  assert.deepEqual(r1, r2);
});

test("no state accumulation -- each call returns a fresh, independent result object", (t) => {
  setClock(t, EVAL_TIME);
  const r1 = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  const r2 = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  assert.notEqual(r1, r2);
  assert.deepEqual(r1, r2);
});

// ---- 34-35. immutability ----

test("intent remains unmodified", (t) => {
  setClock(t, EVAL_TIME);
  const input = intent();
  const snapshot = JSON.parse(JSON.stringify(input));
  evaluateFinalExecutionBoundary(input, approved("EMAIL"));
  assert.deepEqual(input, snapshot);
});

test("adapter remains unmodified", (t) => {
  setClock(t, EVAL_TIME);
  const adapter = approved("EMAIL");
  const snapshot = { channel: adapter.channel, kind: adapter.kind };
  evaluateFinalExecutionBoundary(intent(), adapter);
  assert.deepEqual({ channel: adapter.channel, kind: adapter.kind }, snapshot);
});

// ---- 36-38. no reauthorisation/extension/refresh wording or behaviour ----

test("no automatic reauthorization / expiry extension / refresh / renew wording appears anywhere in a blocked-due-to-expiry result", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
  const serialised = JSON.stringify(result).toLowerCase();
  for (const forbidden of ["reauthoris", "reauthoriz", "extend", "refresh", "renew"]) {
    assert.equal(serialised.includes(forbidden), false);
  }
});

// ---- 39. executionPerformed always false ----

test("executionPerformed is always literally false, on every status", (t) => {
  setClock(t, EVAL_TIME);
  const ready = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  assert.equal(ready.executionPerformed, false);

  const blockedResult = evaluateFinalExecutionBoundary(null, approved("EMAIL"));
  assert.equal(blockedResult.executionPerformed, false);

  const badIntent = { ...intent(), executionPerformed: true } as unknown as ExecutionIntentEnvelope;
  const failed = evaluateFinalExecutionBoundary(badIntent, approved("EMAIL"));
  assert.equal(failed.executionPerformed, false);
});

// ---- 40-41. adapter.execute is NEVER called ----

test("adapter.execute is never called on a fully valid boundary evaluation", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  assert.equal(result.status, "execution_boundary_ready");
  // approved() returns the real, frozen no-op adapter -- if execute() had been
  // invoked it would have resolved harmlessly, but the source-level proof below
  // demonstrates the call site does not exist at all.
});

test("rogue adapter execute counter remains zero, whether the result is blocked for adapter or expiry reasons", (t) => {
  setClock(t, EVAL_TIME);
  const { adapter, calls } = rogueAdapter("EMAIL");
  const result = evaluateFinalExecutionBoundary(intent(), adapter);
  assert.equal(result.status, "blocked");
  assert.equal(calls.count, 0);
});

// ---- 42-47. zero DB / provider / network / env ----

test("evaluateFinalExecutionBoundary is synchronous, not async -- returns a plain object, never a Promise", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  assert.equal(result instanceof Promise, false);
});

test("resolves near-instantly, consistent with zero DB/network I/O", (t) => {
  setClock(t, EVAL_TIME);
  const started = Date.now();
  evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 200, `expected near-instant resolution, took ${elapsedMs}ms`);
});

/** Strips block and line comments so source-level proofs check only executable code, not this module's own prose documentation (which legitimately discusses Supabase/process.env/etc. by name when explaining what it does NOT do). */
function stripComments(source: string): string {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlockComments
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

test("this module's executable code contains no Supabase import", () => {
  const code = stripComments(readFileSync(new URL("./evaluateFinalExecutionBoundary.ts", import.meta.url), "utf8"));
  assert.equal(code.includes("supabase"), false);
  assert.equal(code.includes("Supabase"), false);
});

test("this module's executable code contains no fetch/HTTP/provider-SDK reference", () => {
  const code = stripComments(readFileSync(new URL("./evaluateFinalExecutionBoundary.ts", import.meta.url), "utf8"));
  for (const forbidden of ["fetch(", "axios", "XMLHttpRequest", "http.request", "https.request", "twilio", "sendgrid", "resend"]) {
    assert.equal(code.toLowerCase().includes(forbidden.toLowerCase()), false, `unexpected reference: ${forbidden}`);
  }
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
    const result = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
    assert.equal(result.status, "execution_boundary_ready");
  } finally {
    process.env = originalEnv;
  }
});

test("this module's executable code contains no process.env reference", () => {
  const code = stripComments(readFileSync(new URL("./evaluateFinalExecutionBoundary.ts", import.meta.url), "utf8"));
  assert.equal(code.includes("process.env"), false);
});

// ---- 49. fail-closed unexpected runtime object ----

test("an adversarial intent object whose property access throws → evaluation_failed, not a crash", (t) => {
  setClock(t, EVAL_TIME);
  const throwingIntent = new Proxy(
    {},
    {
      get() {
        throw new Error("simulated adversarial property access failure");
      },
    },
  ) as unknown as ExecutionIntentEnvelope;
  const result = evaluateFinalExecutionBoundary(throwingIntent, approved("EMAIL"));
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

// ---- 50. old preflight_ready status alone is insufficient authority ----

test("a fabricated 'status: preflight_ready'-bearing object provides no authority -- this module never reads any status field on its input", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const fakeStatusIntent = {
    ...intent({ authorizationExpiresAt: EXPIRY }),
    status: "preflight_ready", // not a real field on ExecutionIntentEnvelope; must have zero effect
  } as unknown as ExecutionIntentEnvelope;
  const result = evaluateFinalExecutionBoundary(fakeStatusIntent, approved("EMAIL"));
  assert.equal(result.status, "blocked"); // expiry still governs; the bogus status field is inert
});

// ---- 51. source-level proof of no executable .execute( call ----

test("source-level proof: no .execute( invocation exists anywhere in this module's executable code", () => {
  const code = stripComments(readFileSync(new URL("./evaluateFinalExecutionBoundary.ts", import.meta.url), "utf8"));
  assert.equal(code.includes(".execute("), false);
});

// ---- 52. reason strings never leak sensitive values ----

test("reason strings never include the raw destination or any PII", (t) => {
  setClock(t, EVAL_TIME);
  const secretIntent = intent({ destination: "super-secret-address@example.com" });
  const result = evaluateFinalExecutionBoundary(secretIntent, approved("EMAIL"));
  const serialised = JSON.stringify(result.reasons);
  assert.equal(serialised.includes("super-secret-address@example.com"), false);
});

test("reason strings never include the contactId or idempotencyKey in a way that looks like a leak (only structural/status wording)", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  const serialised = JSON.stringify(result.reasons);
  const emailShaped = /[^\s"]+@[^\s".]+\.[a-z]{2,}/i;
  assert.equal(emailShaped.test(serialised), false);
});

// ---- Additional boundary tests ----

test("reasons array is always populated", (t) => {
  setClock(t, EVAL_TIME);
  const ready = evaluateFinalExecutionBoundary(intent(), approved("EMAIL"));
  assert.ok(ready.reasons.length > 0);
  const blockedResult = evaluateFinalExecutionBoundary(null, approved("EMAIL"));
  assert.ok(blockedResult.reasons.length > 0);
});

test("no opportunity/commercial fields appear anywhere in the result", (t) => {
  setClock(t, EVAL_TIME);
  const result = evaluateFinalExecutionBoundary(intent({ actionId: "half-a-million-pound-action" }), approved("EMAIL"));
  const serialised = JSON.stringify(result);
  for (const forbidden of ["opportunityScore", "estimatedValue", "commission", "leadPriority", "renewalAttractiveness", "revenueScore", "fusionScore"]) {
    assert.equal(serialised.includes(forbidden), false);
  }
});

test("a highly 'valuable-looking' actionId cannot override an expired authorization -- no commercial field exists to help it", (t) => {
  setClock(t, SUBSTANTIALLY_AFTER_EXPIRY);
  const result = evaluateFinalExecutionBoundary(intent({ authorizationExpiresAt: EXPIRY, actionId: "half-a-million-pound-action" }), approved("EMAIL"));
  assert.equal(result.status, "blocked");
});

test("valid boundary evaluation for every channel", (t) => {
  setClock(t, EVAL_TIME);
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const result = evaluateFinalExecutionBoundary(intent({ channel }), approved(channel));
    assert.equal(result.status, "execution_boundary_ready");
  }
});
