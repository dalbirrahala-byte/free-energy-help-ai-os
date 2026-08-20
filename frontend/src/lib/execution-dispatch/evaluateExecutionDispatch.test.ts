import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateExecutionDispatch,
  evaluateExecutionDispatchWithLookup,
  type ExecutionDispatchRequest,
  type PersistedExecutionAuthorizationRecord,
} from "./evaluateExecutionDispatch.ts";

const EVAL_TIME = new Date("2026-08-23T10:00:00.000Z");

function record(overrides: Partial<PersistedExecutionAuthorizationRecord> = {}): PersistedExecutionAuthorizationRecord {
  return {
    id: 1,
    action_id: "action-123",
    idempotency_key: "idem-key-abc-123",
    requested_channel: "EMAIL",
    authorization_status: "authorised",
    human_approval_state: "approved",
    policy_version: "feh-execution-authorization-policy@0.1.0-factory041",
    expires_at: null,
    outreach_eligibility_status: "eligible_for_handoff",
    execution_performed: false,
    execution_performed_at: null,
    execution_reference: null,
    ...overrides,
  };
}

function request(overrides: Partial<ExecutionDispatchRequest> = {}): ExecutionDispatchRequest {
  return {
    idempotencyKey: "idem-key-abc-123",
    actionId: "action-123",
    requestedChannel: "EMAIL",
    ...overrides,
  };
}

// 1. authorised persisted record + every condition valid → ready_for_dispatch
test("every condition valid → ready_for_dispatch", () => {
  const result = evaluateExecutionDispatch(record(), request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
  assert.equal(result.readyForDispatch, true);
});

// 2. missing authorization record → fail closed
test("no persisted record (null) → blocked", () => {
  const result = evaluateExecutionDispatch(null, request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.readyForDispatch, false);
});

// 3. blocked authorization → blocked
test("persisted authorization_status = blocked → blocked", () => {
  const result = evaluateExecutionDispatch(record({ authorization_status: "blocked" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 4. needs_review authorization → blocked/not dispatchable
test("persisted authorization_status = needs_review → blocked, not dispatchable", () => {
  const result = evaluateExecutionDispatch(record({ authorization_status: "needs_review" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.notEqual(result.status, "ready_for_dispatch");
});

// 5. evaluation_failed authorization → blocked/not dispatchable
test("persisted authorization_status = evaluation_failed → blocked, not dispatchable", () => {
  const result = evaluateExecutionDispatch(record({ authorization_status: "evaluation_failed" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 6. revoked authorization → blocked
test("persisted authorization_status = revoked → blocked, never reviewable", () => {
  const result = evaluateExecutionDispatch(record({ authorization_status: "revoked" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 7. expired status → blocked
test("persisted authorization_status = expired → blocked", () => {
  const result = evaluateExecutionDispatch(record({ authorization_status: "expired" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 8. expires_at in past → blocked
test("expires_at strictly in the past → blocked", () => {
  const result = evaluateExecutionDispatch(record({ expires_at: "2026-01-01T00:00:00.000Z" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.expiryState, "expired");
});

// 9. future expires_at → may dispatch
test("expires_at in the future → ready_for_dispatch (given everything else passes)", () => {
  const result = evaluateExecutionDispatch(record({ expires_at: "2026-12-01T00:00:00.000Z" }), request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
  assert.equal(result.evidence.expiryState, "future");
});

// 10. null expires_at → allowed if everything else passes
test("null expires_at → no expiry restriction, ready_for_dispatch given everything else passes", () => {
  const result = evaluateExecutionDispatch(record({ expires_at: null }), request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
  assert.equal(result.evidence.expiryState, "none");
});

test("expires_at exactly equal to evaluation time is treated as expired (boundary is exclusive)", () => {
  const result = evaluateExecutionDispatch(record({ expires_at: EVAL_TIME.toISOString() }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.expiryState, "expired");
});

test("unparseable expires_at value → blocked, fails closed", () => {
  const result = evaluateExecutionDispatch(record({ expires_at: "not-a-real-timestamp" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.expiryState, "invalid");
});

// 11. channel mismatch → blocked
test("persisted channel differs from requested dispatch channel → blocked, never rewritten", () => {
  const result = evaluateExecutionDispatch(record({ requested_channel: "PHONE" }), request({ requestedChannel: "EMAIL" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("PHONE authorization cannot release EMAIL", () => {
  const result = evaluateExecutionDispatch(record({ requested_channel: "PHONE" }), request({ requestedChannel: "EMAIL" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("EMAIL authorization cannot release WHATSAPP", () => {
  const result = evaluateExecutionDispatch(record({ requested_channel: "EMAIL" }), request({ requestedChannel: "WHATSAPP" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("WHATSAPP authorization cannot release SMS", () => {
  const result = evaluateExecutionDispatch(record({ requested_channel: "WHATSAPP" }), request({ requestedChannel: "SMS" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 12. missing dispatch channel → blocked
// (requestedChannel is a required field on the type; this proves an
// exact-match check still blocks when the persisted record's channel is
// itself missing/empty rather than one of the four valid values.)
test("persisted requested_channel is empty/malformed → blocked (cannot match any valid dispatch channel)", () => {
  const result = evaluateExecutionDispatch(record({ requested_channel: "" }), request({ requestedChannel: "EMAIL" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 13. execution_performed true → blocked
test("execution_performed = true → blocked, cannot be dispatched again", () => {
  const result = evaluateExecutionDispatch(record({ execution_performed: true }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.executionState, "already_performed");
});

// 14. execution_performed_at unexpectedly populated → blocked
test("execution_performed = false but execution_performed_at is populated → blocked, inconsistent state", () => {
  const result = evaluateExecutionDispatch(record({ execution_performed: false, execution_performed_at: "2026-08-01T00:00:00.000Z" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.executionState, "inconsistent");
});

// 15. unexpected execution_reference → blocked/fail closed
test("execution_performed = false but execution_reference is populated → blocked, inconsistent state", () => {
  const result = evaluateExecutionDispatch(record({ execution_performed: false, execution_reference: "call-ref-999" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.executionState, "inconsistent");
});

// 16. human approval rejected → blocked
test("human_approval_state = rejected → blocked", () => {
  const result = evaluateExecutionDispatch(record({ human_approval_state: "rejected" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 17. human approval required → blocked
test("human_approval_state = required → blocked (not needs_review — ambiguity must be resolved upstream)", () => {
  const result = evaluateExecutionDispatch(record({ human_approval_state: "required" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.notEqual(result.status, "needs_review");
});

// 18. human approval unknown → blocked
test("human_approval_state = unknown → blocked, never assumed approved", () => {
  const result = evaluateExecutionDispatch(record({ human_approval_state: "unknown" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 19. human approval approved → passes that gate
test("human_approval_state = approved → passes the approval gate (ready_for_dispatch given everything else passes)", () => {
  const result = evaluateExecutionDispatch(record({ human_approval_state: "approved" }), request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
});

// 20. human approval not_required → passes that gate
test("human_approval_state = not_required → passes the approval gate (ready_for_dispatch given everything else passes)", () => {
  const result = evaluateExecutionDispatch(record({ human_approval_state: "not_required" }), request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
});

// 21. outreach eligibility not eligible_for_handoff → blocked
test("outreach_eligibility_status != eligible_for_handoff → blocked", () => {
  for (const status of ["blocked", "needs_review", "evaluation_failed"]) {
    const result = evaluateExecutionDispatch(record({ outreach_eligibility_status: status }), request(), EVAL_TIME);
    assert.equal(result.status, "blocked", `expected blocked for outreach_eligibility_status=${status}`);
  }
});

// 22. malformed action ID → blocked
test("persisted action_id is blank/whitespace-only → blocked", () => {
  const result = evaluateExecutionDispatch(record({ action_id: "   " }), request({ actionId: null }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("dispatch request actionId mismatches the persisted action_id → blocked", () => {
  const result = evaluateExecutionDispatch(record({ action_id: "action-123" }), request({ actionId: "action-999" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 23. malformed idempotency key → blocked
test("persisted idempotency_key is blank/whitespace-only → blocked", () => {
  const result = evaluateExecutionDispatch(record({ idempotency_key: "   " }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("persisted idempotency_key exceeds the usable length bound → blocked", () => {
  const result = evaluateExecutionDispatch(record({ idempotency_key: "x".repeat(201) }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// --- Targeted hardening: request-side idempotency cross-check ---
// The pure evaluator must independently re-verify request.idempotencyKey
// against record.idempotency_key rather than trusting the database
// lookup's own .eq() filter blindly.

// 1. Exact match → may continue through the remaining gates and reach ready_for_dispatch when everything else passes.
test("hardening: request idempotencyKey exactly matching the persisted idempotency_key allows dispatch when every other gate passes", () => {
  const result = evaluateExecutionDispatch(record({ idempotency_key: "idem-key-abc-123" }), request({ idempotencyKey: "idem-key-abc-123" }), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
  assert.equal(result.readyForDispatch, true);
});

// 2. Mismatch → blocked.
test("hardening: request idempotencyKey differing from the persisted idempotency_key → blocked", () => {
  const result = evaluateExecutionDispatch(record({ idempotency_key: "idem-key-abc-123" }), request({ idempotencyKey: "idem-key-DIFFERENT-999" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.readyForDispatch, false);
});

// 3. Request-side blank/whitespace-only key → blocked.
test("hardening: request idempotencyKey that is blank/whitespace-only → blocked", () => {
  const result = evaluateExecutionDispatch(record(), request({ idempotencyKey: "   " }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 4. Request-side key exceeding the existing length bound → blocked.
test("hardening: request idempotencyKey exceeding the existing length bound → blocked", () => {
  const result = evaluateExecutionDispatch(record(), request({ idempotencyKey: "x".repeat(201) }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 5. Mismatch cannot be overridden by an otherwise-perfect authorization state.
test("hardening: an idempotency mismatch blocks even when every other field on the record is perfectly valid", () => {
  const result = evaluateExecutionDispatch(
    record({
      idempotency_key: "idem-key-abc-123",
      authorization_status: "authorised",
      human_approval_state: "approved",
      outreach_eligibility_status: "eligible_for_handoff",
      execution_performed: false,
      execution_performed_at: null,
      execution_reference: null,
      expires_at: null,
    }),
    request({ idempotencyKey: "idem-key-DIFFERENT-999", actionId: "action-123", requestedChannel: "EMAIL" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 6. executionPerformed remains literally false for mismatch cases.
test("hardening: executionPerformed remains literally false on an idempotency mismatch", () => {
  const result = evaluateExecutionDispatch(record({ idempotency_key: "idem-key-abc-123" }), request({ idempotencyKey: "different-key" }), EVAL_TIME);
  assert.equal(result.executionPerformed, false);
});

test("hardening: an exact idempotency match alone is not sufficient — every other gate still applies", () => {
  const result = evaluateExecutionDispatch(
    record({ idempotency_key: "idem-key-abc-123", authorization_status: "blocked" }),
    request({ idempotencyKey: "idem-key-abc-123" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 24. missing policy version → blocked
test("persisted policy_version is blank → blocked", () => {
  const result = evaluateExecutionDispatch(record({ policy_version: "" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

test("persisted policy_version is whitespace-only → blocked", () => {
  const result = evaluateExecutionDispatch(record({ policy_version: "   " }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 26. no commercial/opportunity signal can override a failure
test("this module has no opportunity/commercial field at all — a blocked record stays blocked regardless of any external attractiveness", () => {
  // There is no opportunityScore/estimatedValue field anywhere on
  // PersistedExecutionAuthorizationRecord or ExecutionDispatchRequest by
  // design (see module header) — this test documents that the omission
  // is intentional by confirming a block is unconditional given only the
  // fields that actually exist.
  const result = evaluateExecutionDispatch(record({ authorization_status: "blocked" }), request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 27. deterministic
test("is deterministic: identical input produces identical output", () => {
  const r = record();
  const req = request();
  const first = evaluateExecutionDispatch(r, req, EVAL_TIME);
  const second = evaluateExecutionDispatch(r, req, EVAL_TIME);
  assert.deepEqual(first, second);
});

// 28. does not mutate inputs
test("never mutates its record or request arguments", () => {
  const r = record();
  const req = request();
  const recordSnapshot = JSON.parse(JSON.stringify(r));
  const requestSnapshot = JSON.parse(JSON.stringify(req));

  evaluateExecutionDispatch(r, req, EVAL_TIME);

  assert.deepEqual(r, recordSnapshot);
  assert.deepEqual(req, requestSnapshot);
});

// 29. executionPerformed is always false
test("executionPerformed is always literally false, on every status", () => {
  const scenarios: Array<[PersistedExecutionAuthorizationRecord | null, ExecutionDispatchRequest]> = [
    [record(), request()],
    [null, request()],
    [record({ authorization_status: "blocked" }), request()],
  ];
  for (const [r, req] of scenarios) {
    const result = evaluateExecutionDispatch(r, req, EVAL_TIME);
    assert.equal(result.executionPerformed, false);
  }
});

// 31. no provider/external execution call exists — structural: confirm the decision never implies delivery.
test("no field on the decision ever implies a provider was contacted", () => {
  const result = evaluateExecutionDispatch(record(), request(), EVAL_TIME);
  const serialised = JSON.stringify(result).toLowerCase();
  assert.ok(!serialised.includes("call_placed"));
  assert.ok(!serialised.includes("message_sent"));
  assert.ok(!serialised.includes("delivered"));
});

test("evidence never exposes raw email or telephone", () => {
  const result = evaluateExecutionDispatch(record(), request(), EVAL_TIME);
  const serialised = JSON.stringify(result.evidence);
  assert.ok(!/[^\s"]+@[^\s".]+\.[a-z]{2,}/i.test(serialised));
});

// --- Async lookup wrapper (evaluateExecutionDispatchWithLookup) ---

type MockResult = { data: PersistedExecutionAuthorizationRecord | null; error: { message: string } | null };

function makeMockSupabase(result: MockResult) {
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return { maybeSingle: () => Promise.resolve(result) };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

test("evaluateExecutionDispatchWithLookup: a clean read with a valid record resolves to ready_for_dispatch", async () => {
  const supabase = makeMockSupabase({ data: record(), error: null });
  const result = await evaluateExecutionDispatchWithLookup(supabase, request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
});

test("evaluateExecutionDispatchWithLookup: a clean read with zero rows (null) resolves to blocked, not evaluation_failed", async () => {
  const supabase = makeMockSupabase({ data: null, error: null });
  const result = await evaluateExecutionDispatchWithLookup(supabase, request(), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 25. DB read failure → evaluation_failed
test("evaluateExecutionDispatchWithLookup: a database read error resolves to evaluation_failed, never ready_for_dispatch or blocked-as-a-guess", async () => {
  const supabase = makeMockSupabase({ data: null, error: { message: "connection reset" } });
  const result = await evaluateExecutionDispatchWithLookup(supabase, request(), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.notEqual(result.status, "ready_for_dispatch");
});

// 30. no database write is performed — structural: the mock exposes no insert/update/delete/upsert method at all; if the module tried to call one, this test would throw (method not a function).
test("evaluateExecutionDispatchWithLookup: the writer performs only a read — no insert/update/delete/upsert method exists on the mock client", async () => {
  const supabase = makeMockSupabase({ data: record(), error: null });
  const result = await evaluateExecutionDispatchWithLookup(supabase, request(), EVAL_TIME);
  assert.equal(result.status, "ready_for_dispatch");
  assert.ok(typeof (supabase as { insert?: unknown }).insert === "undefined");
  assert.ok(typeof (supabase as { update?: unknown }).update === "undefined");
  assert.ok(typeof (supabase as { delete?: unknown }).delete === "undefined");
  assert.ok(typeof (supabase as { upsert?: unknown }).upsert === "undefined");
});
