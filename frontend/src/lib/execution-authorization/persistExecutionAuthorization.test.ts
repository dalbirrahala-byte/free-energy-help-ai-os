import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildExecutionAuthorizationPersistencePayload,
  persistExecutionAuthorization,
  type PersistExecutionAuthorizationReferences,
} from "./persistExecutionAuthorization.ts";
import {
  DEFAULT_POLICY_VERSION,
  evaluateExecutionAuthorization,
  type ExecutionAuthorizationDecision,
  type ExecutionAuthorizationStatus,
} from "./evaluateExecutionAuthorization.ts";
import type { OutreachEligibilityDecision, OutreachEligibilityStatus } from "../outreach/evaluateOutreachEligibility.ts";
import type { ContactPermissionDecision } from "../compliance/evaluateContactPermission.ts";

const EVAL_TIME = new Date("2026-08-22T14:00:00.000Z");

function contactPermissionDecision(): ContactPermissionDecision {
  return {
    status: "eligible",
    requestedChannel: "EMAIL",
    suppressionDecision: { status: "allowed", evaluatedAt: EVAL_TIME.toISOString() },
    identityDecision: { tier: "deterministic", confidence: 95, verdict: "sufficient" },
    contactabilityDecision: { status: "contactable", verdict: "contactable" },
    permissionDecision: { effectiveBasis: "consented", consentSource: null, verdict: "permitted" },
    reasons: [{ factor: "Overall", detail: "fixture" }],
    evidence: {
      hasOrganisationId: true,
      hasContactId: false,
      hasEmail: true,
      hasTelephone: false,
      hasDomain: false,
      requestedChannel: "EMAIL",
      identityTier: "deterministic",
      identityConfidence: 95,
      consentStatus: "consented",
      legalBasis: null,
    },
    reviewRequired: false,
    evaluatedAt: EVAL_TIME.toISOString(),
  };
}

function outreachDecision(status: OutreachEligibilityStatus, overrides: Partial<OutreachEligibilityDecision> = {}): OutreachEligibilityDecision {
  return {
    status,
    requestedChannel: "EMAIL",
    contactPermissionDecision: contactPermissionDecision(),
    handoffAllowed: status === "eligible_for_handoff",
    reviewRequired: status === "needs_review",
    executionPerformed: false,
    reasons: [{ factor: "Contact permission", detail: "fixture" }],
    evidence: { contactPermissionStatus: "eligible", opportunityContext: null },
    evaluatedAt: EVAL_TIME.toISOString(),
    ...overrides,
  };
}

function authDecision(status: ExecutionAuthorizationStatus, overrides: Partial<ExecutionAuthorizationDecision> = {}): ExecutionAuthorizationDecision {
  const hasValidClaim = overrides.authorizationClaim !== null;
  return {
    status,
    authorisationAllowed: status === "authorised",
    requestedChannel: "EMAIL",
    outreachEligibilityDecision: outreachDecision(status === "authorised" ? "eligible_for_handoff" : "blocked"),
    humanApproval: "approved",
    idempotency: { keyProvided: true, valid: true },
    policyVersion: DEFAULT_POLICY_VERSION,
    reasons: [{ factor: "Overall", detail: "fixture" }],
    evidence: {
      outreachEligibilityStatus: "eligible_for_handoff",
      humanApprovalState: "approved",
      requestedChannel: "EMAIL",
      phase5Channel: "EMAIL",
      channelConsistent: true,
      hasActionId: true,
      idempotencyKeyValid: true,
      policyVersion: DEFAULT_POLICY_VERSION,
    },
    authorizationClaim: hasValidClaim
      ? {
          actionId: "action-123",
          requestedChannel: "EMAIL",
          policyVersion: DEFAULT_POLICY_VERSION,
          evaluatedAt: EVAL_TIME.toISOString(),
          idempotencyKey: "idem-key-abc-123",
          authorizationStatus: status,
        }
      : null,
    executionPerformed: false,
    evaluatedAt: EVAL_TIME.toISOString(),
    ...overrides,
  };
}

const REFS: PersistExecutionAuthorizationReferences = { organisationId: 5, contactId: null, sourceId: 2, campaignId: "spring-2026", actorId: "user-1" };

// --- Pure payload builder ---

// 1. Valid authorised decision maps to a valid persistence payload.
test("an authorised decision with a valid claim maps to a complete persistence payload", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  assert.ok(payload);
  assert.equal(payload!.authorization_status, "authorised");
  assert.equal(payload!.action_id, "action-123");
  assert.equal(payload!.idempotency_key, "idem-key-abc-123");
});

// 2. Blocked decision maps without becoming authorised.
test("a blocked decision maps to a payload with authorization_status = blocked, never authorised", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("blocked"), REFS);
  assert.ok(payload);
  assert.equal(payload!.authorization_status, "blocked");
  assert.notEqual(payload!.authorization_status, "authorised");
});

// 3. needs_review decision maps without becoming authorised.
test("a needs_review decision maps to a payload with authorization_status = needs_review, never authorised", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("needs_review"), REFS);
  assert.equal(payload!.authorization_status, "needs_review");
});

// 4. evaluation_failed maps without becoming authorised.
test("an evaluation_failed decision maps to a payload with authorization_status = evaluation_failed, never authorised", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("evaluation_failed"), REFS);
  assert.equal(payload!.authorization_status, "evaluation_failed");
});

// 5. action ID is preserved.
test("action_id is preserved exactly from the authorizationClaim", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  assert.equal(payload!.action_id, "action-123");
});

// 6. idempotency key is preserved.
test("idempotency_key is preserved exactly from the authorizationClaim", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  assert.equal(payload!.idempotency_key, "idem-key-abc-123");
});

// 7. channel is preserved.
test("requested_channel is preserved exactly from the authorizationClaim", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  assert.equal(payload!.requested_channel, "EMAIL");
});

// 8. policy version is preserved.
test("policy_version is preserved exactly from the authorizationClaim, not recomputed", () => {
  const decision = authDecision("authorised", {
    policyVersion: "feh-policy@9.9.9",
    authorizationClaim: {
      actionId: "action-123",
      requestedChannel: "EMAIL",
      policyVersion: "feh-policy@9.9.9",
      evaluatedAt: EVAL_TIME.toISOString(),
      idempotencyKey: "idem-key-abc-123",
      authorizationStatus: "authorised",
    },
  });
  const payload = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.equal(payload!.policy_version, "feh-policy@9.9.9");
});

// 9. human approval state is preserved.
test("human_approval_state is preserved exactly from the decision", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("blocked", { humanApproval: "rejected" }), REFS);
  assert.equal(payload!.human_approval_state, "rejected");
});

// 10. executionPerformed remains false on newly created records.
test("execution_performed is always false in the built payload", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  assert.equal(payload!.execution_performed, false);
  assert.equal(payload!.execution_performed_at, null);
});

// 11/12. No raw email/telephone in evidence.
test("no raw email or telephone ever appears in the payload's free-form fields (evidence/notes)", () => {
  // Scoped to evidence/notes specifically, not the whole serialised
  // payload — policy_version legitimately contains "@" as a semver-style
  // separator (e.g. "...policy@0.1.0-..."), which is not a PII leak.
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  const freeform = JSON.stringify({ evidence: payload!.evidence, notes: payload!.notes });
  assert.ok(!/[^\s"]+@[^\s".]+\.[a-z]{2,}/i.test(freeform));
  assert.ok(!/\b\d{10,}\b/.test(freeform));
});

test("the payload contains no dedicated email or telephone column at all", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("authorised"), REFS);
  assert.ok(!("email" in payload!));
  assert.ok(!("telephone" in payload!));
});

// 17. Same input produces deterministic payload.
test("buildExecutionAuthorizationPersistencePayload is deterministic", () => {
  const decision = authDecision("authorised");
  const first = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  const second = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.deepEqual(first, second);
});

// 18. Inputs are not mutated.
test("never mutates its decision or references arguments", () => {
  const decision = authDecision("authorised");
  const refs = { ...REFS };
  const decisionSnapshot = JSON.parse(JSON.stringify(decision));
  const refsSnapshot = JSON.parse(JSON.stringify(refs));

  buildExecutionAuthorizationPersistencePayload(decision, refs);

  assert.deepEqual(decision, decisionSnapshot);
  assert.deepEqual(refs, refsSnapshot);
});

// 19. writer does not recompute authorization.
test("authorization_status is a direct, unaltered copy of decision.status — never recomputed", () => {
  for (const status of ["authorised", "blocked", "needs_review", "evaluation_failed"] as ExecutionAuthorizationStatus[]) {
    const payload = buildExecutionAuthorizationPersistencePayload(authDecision(status), REFS);
    assert.equal(payload!.authorization_status, status);
  }
});

// 20. commercial opportunity score does not alter authorization status.
test("a massive opportunity context on the nested outreach decision has zero effect on the persisted payload", () => {
  const withOpportunity = authDecision("blocked", {
    outreachEligibilityDecision: outreachDecision("blocked", {
      evidence: { contactPermissionStatus: "blocked", opportunityContext: { opportunityScore: 100, estimatedValue: 9_999_999 } },
    }),
  });
  const payload = buildExecutionAuthorizationPersistencePayload(withOpportunity, REFS);
  assert.equal(payload!.authorization_status, "blocked");
});

// 21. blocked Phase 6 decision cannot be stored as authorised.
test("a blocked decision's payload can never read authorization_status = authorised", () => {
  const payload = buildExecutionAuthorizationPersistencePayload(authDecision("blocked"), REFS);
  assert.notEqual(payload!.authorization_status, "authorised");
});

// 22. policy version cannot be silently replaced.
test("policy version from the claim is used verbatim, never substituted with the module's own default", () => {
  const decision = authDecision("authorised", {
    authorizationClaim: {
      actionId: "action-123",
      requestedChannel: "EMAIL",
      policyVersion: "feh-policy@custom",
      evaluatedAt: EVAL_TIME.toISOString(),
      idempotencyKey: "idem-key-abc-123",
      authorizationStatus: "authorised",
    },
  });
  const payload = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.equal(payload!.policy_version, "feh-policy@custom");
  assert.notEqual(payload!.policy_version, DEFAULT_POLICY_VERSION);
});

// 23. blank action ID is rejected before persistence.
test("a decision with authorizationClaim = null (invalid action id) builds no payload at all", () => {
  const decision = authDecision("blocked", { authorizationClaim: null });
  const payload = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.equal(payload, null);
});

// --- Phase 7 hardening: end-to-end whitespace behaviour, through the
// REAL Phase 6 evaluator (not a hand-crafted authorizationClaim: null
// fixture) — proves the actual integration, not just "if given null,
// reject it." ---

test("end-to-end: a whitespace-only actionId, run through the real Phase 6 evaluator, is rejected before persistence", () => {
  const decision = evaluateExecutionAuthorization(
    {
      outreachEligibilityDecision: outreachDecision("eligible_for_handoff"),
      actionId: "   ",
      requestedChannel: "EMAIL",
      humanApproval: "approved",
      idempotencyKey: "idem-key-abc-123",
      policyVersion: null,
    },
    EVAL_TIME,
  );
  assert.equal(decision.authorizationClaim, null);
  const payload = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.equal(payload, null);
});

test("end-to-end: a whitespace-only idempotencyKey, run through the real Phase 6 evaluator, is rejected before persistence", () => {
  const decision = evaluateExecutionAuthorization(
    {
      outreachEligibilityDecision: outreachDecision("eligible_for_handoff"),
      actionId: "action-123",
      requestedChannel: "EMAIL",
      humanApproval: "approved",
      idempotencyKey: "   ",
      policyVersion: null,
    },
    EVAL_TIME,
  );
  assert.equal(decision.authorizationClaim, null);
  const payload = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.equal(payload, null);
});

test("end-to-end: leading/trailing whitespace on a genuinely usable actionId/idempotencyKey is trimmed before it ever reaches the persistence payload", () => {
  const decision = evaluateExecutionAuthorization(
    {
      outreachEligibilityDecision: outreachDecision("eligible_for_handoff"),
      actionId: "  action-123  ",
      requestedChannel: "EMAIL",
      humanApproval: "approved",
      idempotencyKey: "  idem-key-abc-123  ",
      policyVersion: null,
    },
    EVAL_TIME,
  );
  assert.ok(decision.authorizationClaim);
  assert.equal(decision.authorizationClaim!.actionId, "action-123");
  assert.equal(decision.authorizationClaim!.idempotencyKey, "idem-key-abc-123");

  const payload = buildExecutionAuthorizationPersistencePayload(decision, REFS);
  assert.ok(payload);
  assert.equal(payload!.action_id, "action-123");
  assert.equal(payload!.idempotency_key, "idem-key-abc-123");
});

// 25. executionPerformed cannot accidentally be persisted as true from this writer.
test("there is no code path in this module capable of setting execution_performed to true", () => {
  for (const status of ["authorised", "blocked", "needs_review", "evaluation_failed"] as ExecutionAuthorizationStatus[]) {
    const payload = buildExecutionAuthorizationPersistencePayload(authDecision(status), REFS);
    assert.equal(payload!.execution_performed, false);
  }
});

// --- Async writer (persistExecutionAuthorization) ---

type MockRow = { id: number; authorization_status: string };

function makeMockSupabase(options: {
  insertResult: { data: MockRow | null; error: { code?: string; message: string } | null };
  conflictReadResult?: { data: MockRow | null; error?: { message: string } | null };
}) {
  return {
    from(_table: string) {
      return {
        insert(_payload: unknown) {
          return {
            select(_cols: string) {
              return { single: () => Promise.resolve(options.insertResult) };
            },
          };
        },
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return { maybeSingle: () => Promise.resolve(options.conflictReadResult ?? { data: null, error: null }) };
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// 23 (rejected before persistence, at the async layer too)
test("persistExecutionAuthorization: a decision with authorizationClaim = null is rejected before any Supabase call", async () => {
  let called = false;
  const supabase = {
    from(_table: string) {
      called = true;
      throw new Error("should never be called");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const result = await persistExecutionAuthorization(supabase, authDecision("blocked", { authorizationClaim: null }), REFS);
  assert.equal(result.outcome, "rejected");
  assert.equal(called, false);
});

// 24. blank idempotency key is rejected before persistence — same code path as action id, proven via the same null-claim mechanism.
test("persistExecutionAuthorization: rejection reason explains a missing/invalid action id or idempotency key", async () => {
  const supabase = makeMockSupabase({ insertResult: { data: null, error: null } });
  const result = await persistExecutionAuthorization(supabase, authDecision("blocked", { authorizationClaim: null }), REFS);
  assert.equal(result.outcome, "rejected");
  if (result.outcome === "rejected") {
    assert.ok(result.reason.toLowerCase().includes("action id") || result.reason.toLowerCase().includes("idempotency"));
  }
});

test("persistExecutionAuthorization: a clean insert returns created with the new row id", async () => {
  const supabase = makeMockSupabase({ insertResult: { data: { id: 42, authorization_status: "authorised" }, error: null } });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(result.outcome, "created");
  if (result.outcome === "created") {
    assert.equal(result.id, 42);
  }
});

// 13. Duplicate idempotency conflict does not create a second authorization.
test("persistExecutionAuthorization: a unique-violation error resolves to duplicate, not created", async () => {
  const supabase = makeMockSupabase({
    insertResult: { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"execution_authorizations_idempotency_key_idx\"" } },
    conflictReadResult: { data: { id: 7, authorization_status: "authorised" } },
  });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(result.outcome, "duplicate");
  if (result.outcome === "duplicate") {
    assert.equal(result.existingId, 7);
    assert.equal(result.existingAuthorizationStatus, "authorised");
  }
});

// 14. Duplicate idempotency handling does not overwrite the first record.
test("persistExecutionAuthorization: duplicate outcome never attempts an update/overwrite — only a read-only follow-up select", async () => {
  let updateCalled = false;
  const supabase = {
    from(_table: string) {
      return {
        insert(_payload: unknown) {
          return {
            select(_cols: string) {
              return {
                single: () =>
                  Promise.resolve({
                    data: null,
                    error: { code: "23505", message: "duplicate key value violates unique constraint" },
                  }),
              };
            },
          };
        },
        select(_cols: string) {
          return { eq: (_c: string, _v: unknown) => ({ maybeSingle: () => Promise.resolve({ data: { id: 7, authorization_status: "authorised" } }) }) };
        },
        update(_payload: unknown) {
          updateCalled = true;
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(updateCalled, false);
});

// 15. Database insert failure returns explicit failure.
test("persistExecutionAuthorization: a non-conflict insert error resolves to failed, never created or duplicate", async () => {
  const supabase = makeMockSupabase({ insertResult: { data: null, error: { code: "08006", message: "connection failure" } } });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(result.outcome, "failed");
  if (result.outcome === "failed") {
    assert.ok(result.error.includes("connection failure"));
  }
});

// 16. Database read/check failure never becomes success.
test("persistExecutionAuthorization: a unique conflict whose enrichment read succeeds but finds no row (no error, empty result) is still reported as duplicate, not silently upgraded to created/failed", async () => {
  const supabase = makeMockSupabase({
    insertResult: { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } },
    conflictReadResult: { data: null, error: null },
  });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(result.outcome, "duplicate");
  if (result.outcome === "duplicate") {
    assert.equal(result.existingId, null);
  }
});

// Issue 1 hardening: a unique conflict whose enrichment read ITSELF
// errors (RLS/network/database failure while verifying) must fail
// closed — never a confirmed "duplicate" with unverifiable null
// metadata, and never silently upgraded to "created".
test("persistExecutionAuthorization: a unique conflict whose enrichment read errors resolves to failed, never duplicate or created", async () => {
  const supabase = makeMockSupabase({
    insertResult: { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"execution_authorizations_idempotency_key_idx\"" } },
    conflictReadResult: { data: null, error: { message: "RLS policy denied read access" } },
  });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(result.outcome, "failed");
  assert.notEqual(result.outcome, "duplicate");
  assert.notEqual(result.outcome, "created");
  if (result.outcome === "failed") {
    assert.ok(result.error.includes("RLS policy denied read access"));
    assert.ok(result.error.toLowerCase().includes("idempotency conflict"));
  }
});

// Unique-violation classification hardening: a CHECK-constraint failure
// (e.g. the new canonical-storage constraint, code 23514) whose message
// happens to mention "idempotency_key" must NOT be misclassified as a
// duplicate — only a genuine 23505 (or the exact unique-index name) may.
test("persistExecutionAuthorization: a CHECK-constraint violation mentioning 'idempotency_key' in its message is classified failed, never duplicate", async () => {
  const supabase = makeMockSupabase({
    insertResult: {
      data: null,
      error: {
        code: "23514",
        message: "new row for relation \"execution_authorizations\" violates check constraint \"execution_authorizations_idempotency_key_canonical_check\"",
      },
    },
  });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  assert.equal(result.outcome, "failed");
  assert.notEqual(result.outcome, "duplicate");
});

// 26. writer performs no provider execution — structural: confirm the result object never implies delivery.
test("persistExecutionAuthorization: no result outcome ever implies a call/message/task was created", async () => {
  const supabase = makeMockSupabase({ insertResult: { data: { id: 1, authorization_status: "authorised" }, error: null } });
  const result = await persistExecutionAuthorization(supabase, authDecision("authorised"), REFS);
  const serialised = JSON.stringify(result).toLowerCase();
  assert.ok(!serialised.includes("call_placed"));
  assert.ok(!serialised.includes("message_sent"));
  assert.ok(!serialised.includes("delivered"));
});
