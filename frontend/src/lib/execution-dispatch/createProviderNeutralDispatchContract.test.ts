import assert from "node:assert/strict";
import { test } from "node:test";

import { createProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";
import {
  evaluateExecutionDispatch,
  type ExecutionDispatchDecision,
  type ExecutionDispatchRequest,
  type PersistedExecutionAuthorizationRecord,
} from "./evaluateExecutionDispatch.ts";

const EVAL_TIME = new Date("2026-08-23T10:00:00.000Z");
const CREATED_AT = new Date("2026-08-23T10:00:01.000Z");

function record(overrides: Partial<PersistedExecutionAuthorizationRecord> = {}): PersistedExecutionAuthorizationRecord {
  return {
    id: 1,
    action_id: "action-123",
    idempotency_key: "idem-key-abc-123",
    requested_channel: "EMAIL",
    authorization_status: "authorised",
    human_approval_state: "approved",
    policy_version: "feh-execution-authorization-policy@0.1.0-factory041",
    expires_at: "2026-09-01T00:00:00.000Z",
    outreach_eligibility_status: "eligible_for_handoff",
    execution_performed: false,
    execution_performed_at: null,
    execution_reference: null,
    contact_id: 42,
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

/** Produces a genuine Phase 8 decision by calling the real Phase 8 evaluator, for realistic integration-style tests. */
function readyDecision(recordOverrides: Partial<PersistedExecutionAuthorizationRecord> = {}, requestOverrides: Partial<ExecutionDispatchRequest> = {}): ExecutionDispatchDecision {
  return evaluateExecutionDispatch(record(recordOverrides), request(requestOverrides), EVAL_TIME);
}

/** For adversarial/defensive tests: builds a raw decision object directly, bypassing Phase 8, so Phase 9's own defensiveness can be tested in isolation. */
function rawDecision(overrides: Partial<ExecutionDispatchDecision> = {}): ExecutionDispatchDecision {
  return {
    status: "ready_for_dispatch",
    readyForDispatch: true,
    requestedChannel: "EMAIL",
    reasons: [{ factor: "Overall", detail: "test fixture" }],
    evidence: {
      authorizationRecordId: 1,
      actionId: "action-123",
      idempotencyKey: "idem-key-abc-123",
      contactId: 42,
      requestedChannel: "EMAIL",
      persistedChannel: "EMAIL",
      authorizationStatus: "authorised",
      humanApprovalState: "approved",
      outreachEligibilityStatus: "eligible_for_handoff",
      policyVersion: "feh-execution-authorization-policy@0.1.0-factory041",
      expiresAt: "2026-09-01T00:00:00.000Z",
      expiryState: "future",
      executionState: "not_performed",
    },
    executionPerformed: false,
    evaluatedAt: EVAL_TIME.toISOString(),
    ...overrides,
  };
}

// 1. Phase 8 ready_for_dispatch → contract_ready
test("Phase 8 ready_for_dispatch → contract_ready", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "contract_ready");
  assert.notEqual(result.contract, null);
});

// 2. Phase 8 blocked → no contract
test("Phase 8 blocked → no contract", () => {
  const decision = readyDecision({ authorization_status: "blocked" });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 3. Phase 8 evaluation_failed → no contract
test("Phase 8 evaluation_failed → no contract", () => {
  const decision = rawDecision({ status: "evaluation_failed", readyForDispatch: false });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.contract, null);
});

// 4. Phase 8 needs_review → no contract
test("Phase 8 needs_review → no contract", () => {
  const decision = rawDecision({ status: "needs_review", readyForDispatch: false });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 5. readyForDispatch false → no contract (even if status claims ready_for_dispatch)
test("readyForDispatch literally false while status claims ready_for_dispatch → no contract", () => {
  const decision = rawDecision({ status: "ready_for_dispatch", readyForDispatch: false });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 6. executionPerformed true / inconsistent input → fail closed
test("decision.executionPerformed not literally false (unsafe cast) → fail closed, evaluation_failed", () => {
  const decision = rawDecision({ executionPerformed: true as unknown as false });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.contract, null);
});

// 7. missing authorizationRecordId → no contract
test("missing authorizationRecordId → no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, authorizationRecordId: null } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 8. missing actionId → no contract
test("missing actionId → no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, actionId: null } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 9. malformed actionId → no contract
test("malformed (oversized) actionId → no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, actionId: "x".repeat(201) } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 10. missing idempotency key → no contract
test("missing (blank) request idempotencyKey → no contract", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "   " }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 11. malformed idempotency key → no contract
test("malformed (oversized) request idempotencyKey → no contract", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "x".repeat(201) }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 12. missing policy version → no contract
test("missing policyVersion → no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, policyVersion: "" } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 13. missing/invalid channel → no contract
test("invalid decision.requestedChannel → no contract", () => {
  const decision = rawDecision({ requestedChannel: "CARRIER_PIGEON" as unknown as ExecutionDispatchDecision["requestedChannel"] });
  const result = createProviderNeutralDispatchContract(decision, request({ requestedChannel: "CARRIER_PIGEON" as unknown as ExecutionDispatchRequest["requestedChannel"] }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("mismatched decision/request channel → no contract, no rewriting or fallback", () => {
  const decision = readyDecision({ requested_channel: "EMAIL" }, { requestedChannel: "EMAIL" });
  const result = createProviderNeutralDispatchContract(decision, request({ requestedChannel: "PHONE" }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 14. channel is preserved exactly
test("channel is preserved exactly for every valid channel", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const decision = readyDecision({ requested_channel: channel }, { requestedChannel: channel });
    const result = createProviderNeutralDispatchContract(decision, request({ requestedChannel: channel }), CREATED_AT);
    assert.equal(result.status, "contract_ready");
    assert.equal(result.contract?.channel, channel);
  }
});

// 15. human approval state is preserved
test("humanApprovalState is preserved from decision.evidence", () => {
  const decision = readyDecision({ human_approval_state: "not_required" });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.humanApprovalState, "not_required");
});

// 16. outreach eligibility status is preserved
test("outreachEligibilityStatus is preserved from decision.evidence", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.outreachEligibilityStatus, "eligible_for_handoff");
});

// 17. idempotency key is passed through unchanged
test("idempotencyKey is passed through unchanged, exact value", () => {
  const key = "idem-Key_With-Odd.Format-999";
  const decision = readyDecision({ idempotency_key: key }, { idempotencyKey: key });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: key }), CREATED_AT);
  assert.equal(result.contract?.idempotencyKey, key);
});

// 18. no new idempotency key is generated
test("idempotencyKey is never regenerated, trimmed, case-folded, or reformatted", () => {
  const oddKey = "no_trim-Expected.KEY123";
  const decision = readyDecision({ idempotency_key: oddKey }, { idempotencyKey: oddKey });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: oddKey }), CREATED_AT);
  // Strict identity to the exact input string -- not merely "looks similar".
  assert.equal(result.contract?.idempotencyKey === oddKey, true);
  assert.notEqual(result.contract?.idempotencyKey, oddKey.toLowerCase());
  assert.notEqual(result.contract?.idempotencyKey, oddKey.toUpperCase());
});

// --- Targeted hardening: persisted idempotency provenance ---
// The contract's idempotencyKey must come from decision.evidence.idempotencyKey
// (Phase 8's exposed record.idempotency_key), never merely from request.idempotencyKey.
// The request value is a cross-check only.

// 4. exact persisted/request key match → may produce a contract when all other conditions pass.
test("provenance: evidence.idempotencyKey exactly matching request.idempotencyKey → contract_ready", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "persisted-canonical-key" } });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "persisted-canonical-key" }), CREATED_AT);
  assert.equal(result.status, "contract_ready");
  assert.notEqual(result.contract, null);
});

// 5. persisted/request key mismatch → blocked, no contract.
test("provenance: evidence.idempotencyKey differing from request.idempotencyKey → blocked, no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "persisted-canonical-key" } });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "a-different-structurally-valid-key" }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 6. contract idempotencyKey comes from Phase 8 evidence.
test("provenance: contract.idempotencyKey is sourced from decision.evidence.idempotencyKey", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "persisted-canonical-key" } });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "persisted-canonical-key" }), CREATED_AT);
  assert.equal(result.contract?.idempotencyKey, decision.evidence.idempotencyKey);
});

// 7. malformed/missing Phase 8 evidence idempotencyKey → blocked.
test("provenance: evidence.idempotencyKey null (no persisted record) → blocked, no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: null } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("provenance: evidence.idempotencyKey blank/whitespace-only → blocked, no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "   " } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("provenance: evidence.idempotencyKey exceeding the usable length bound → blocked, no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "x".repeat(201) } });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "x".repeat(201) }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 8. structurally valid but different request key cannot override the persisted key.
test("provenance: a structurally valid but different request idempotencyKey cannot override the persisted evidence key", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "persisted-canonical-key" } });
  const result = createProviderNeutralDispatchContract(
    decision,
    request({ idempotencyKey: "another-perfectly-valid-but-wrong-key" }),
    CREATED_AT,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 9. executionPerformed remains false on a provenance mismatch.
test("provenance: executionPerformed remains literally false on an idempotency provenance mismatch", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, idempotencyKey: "persisted-canonical-key" } });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "mismatched-key" }), CREATED_AT);
  assert.equal(result.executionPerformed, false);
});

// 10. blocked/evaluation_failed Phase 8 results remain incapable of producing a contract,
// even when evidence.idempotencyKey and request.idempotencyKey match perfectly.
test("provenance: a blocked Phase 8 decision produces no contract even with a perfectly matching idempotency key", () => {
  const decision = readyDecision({ idempotency_key: "idem-key-abc-123", authorization_status: "blocked" });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "idem-key-abc-123" }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("provenance: an evaluation_failed Phase 8 decision produces no contract even with a perfectly matching idempotency key", () => {
  const decision = rawDecision({
    status: "evaluation_failed",
    readyForDispatch: false,
    evidence: { ...rawDecision().evidence, idempotencyKey: "idem-key-abc-123" },
  });
  const result = createProviderNeutralDispatchContract(decision, request({ idempotencyKey: "idem-key-abc-123" }), CREATED_AT);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.contract, null);
});

// 19. deterministic
test("is deterministic: identical input produces identical output", () => {
  const decision = readyDecision();
  const req = request();
  const a = createProviderNeutralDispatchContract(decision, req, CREATED_AT);
  const b = createProviderNeutralDispatchContract(decision, req, CREATED_AT);
  assert.deepEqual(a, b);
});

// 20. does not mutate Phase 8 decision
test("never mutates the decision or request arguments", () => {
  const decision = readyDecision();
  const req = request();
  const decisionSnapshot = JSON.parse(JSON.stringify(decision));
  const requestSnapshot = JSON.parse(JSON.stringify(req));
  createProviderNeutralDispatchContract(decision, req, CREATED_AT);
  assert.deepEqual(decision, decisionSnapshot);
  assert.deepEqual(req, requestSnapshot);
});

// 21. contract is immutable/read-only where practical
test("contract is frozen and cannot be mutated", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.ok(result.contract);
  assert.equal(Object.isFrozen(result.contract), true);
  assert.throws(() => {
    "use strict";
    (result.contract as unknown as { channel: string }).channel = "SMS";
  });
});

// 22. executionPerformed is always false
test("executionPerformed is always literally false, on every status", () => {
  const readyResult = createProviderNeutralDispatchContract(readyDecision(), request(), CREATED_AT);
  assert.equal(readyResult.executionPerformed, false);
  assert.equal(readyResult.contract?.executionPerformed, false);

  const blockedResult = createProviderNeutralDispatchContract(readyDecision({ authorization_status: "blocked" }), request(), CREATED_AT);
  assert.equal(blockedResult.executionPerformed, false);

  const failedResult = createProviderNeutralDispatchContract(rawDecision({ status: "evaluation_failed", readyForDispatch: false }), request(), CREATED_AT);
  assert.equal(failedResult.executionPerformed, false);
});

// 23. no PII appears in contract
test("no PII (email/telephone-shaped values) appears anywhere in the contract", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  const serialised = JSON.stringify(result.contract);
  const emailShaped = /[^\s"]+@[^\s".]+\.[a-z]{2,}/i;
  assert.equal(emailShaped.test(serialised), false);
  assert.ok(result.contract);
  const keys = Object.keys(result.contract);
  for (const forbidden of ["email", "telephone", "phoneNumber", "whatsappNumber", "smsNumber", "destination"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

// 24. no opportunity/commercial fields appear in contract
test("no opportunity/commercial fields appear in the contract", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.ok(result.contract);
  const keys = Object.keys(result.contract);
  for (const forbidden of [
    "opportunityScore",
    "estimatedValue",
    "estimatedContractValue",
    "commission",
    "leadPriority",
    "renewalAttractiveness",
    "revenueScore",
    "revenuePotential",
    "signalStrength",
    "commercialRanking",
  ]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

// 25. no provider name/provider credential fields appear
test("no provider name/credential/token/secret fields appear in the contract", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.ok(result.contract);
  const keys = Object.keys(result.contract);
  for (const forbidden of ["provider", "providerName", "apiKey", "token", "secret", "credentials", "webhookUrl"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

// 26. no database call occurs
test("createProviderNeutralDispatchContract accepts no database/Supabase client parameter", () => {
  assert.equal(createProviderNeutralDispatchContract.length, 3);
});

// 27. no external/network/provider call occurs
test("createProviderNeutralDispatchContract is synchronous, not async -- returns a plain object, never a Promise", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result instanceof Promise, false);
  assert.equal(typeof (result as unknown as { then?: unknown }).then, "undefined");
});

// 28. a commercial signal cannot override a blocked Phase 8 result
test("a blocked Phase 8 decision stays blocked regardless of how 'ready-looking' every other field is -- no commercial field exists to override it", () => {
  const decision = readyDecision({
    action_id: "high-value-action-999",
    authorization_status: "blocked", // the only failing gate
    human_approval_state: "approved",
    outreach_eligibility_status: "eligible_for_handoff",
    execution_performed: false,
  });
  const result = createProviderNeutralDispatchContract(decision, request({ actionId: "high-value-action-999" }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// Additional boundary tests

test("request.actionId mismatching decision.evidence.actionId → no contract (mismatched pair guard)", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request({ actionId: "a-completely-different-action" }), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("request.actionId omitted (null) is not required for a contract to be produced", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request({ actionId: null }), CREATED_AT);
  assert.equal(result.status, "contract_ready");
});

test("missing humanApprovalState on evidence → no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, humanApprovalState: "" } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("missing outreachEligibilityStatus on evidence → no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, outreachEligibilityStatus: "" } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("contractCreatedAt reflects the supplied createdAt timestamp, not the decision's evaluatedAt", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.contractCreatedAt, CREATED_AT.toISOString());
  assert.notEqual(result.contract?.contractCreatedAt, decision.evaluatedAt);
});

test("authorizationRecordId is preserved from decision.evidence exactly", () => {
  const decision = readyDecision({ id: 42 });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.authorizationRecordId, 42);
});

// --- Targeted hardening: contact-id provenance (Phase 11) ---

test("provenance: valid decision.evidence.contactId is copied into the sealed contract exactly", () => {
  const decision = readyDecision({ contact_id: 777 });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "contract_ready");
  assert.equal(result.contract?.contactId, 777);
});

test("provenance: missing decision.evidence.contactId (null) → blocked, no contract", () => {
  const decision = readyDecision({ contact_id: null });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("provenance: invalid decision.evidence.contactId (zero/negative/non-integer) → blocked, no contract", () => {
  for (const bad of [0, -1, 1.5]) {
    const decision = rawDecision({ evidence: { ...rawDecision().evidence, contactId: bad } });
    const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
    assert.equal(result.status, "blocked");
    assert.equal(result.contract, null);
  }
});

test("provenance: contract.contactId cannot be substituted -- there is no caller-suppliable contactId field on ExecutionDispatchRequest", () => {
  const decision = readyDecision({ contact_id: 42 });
  const requestKeys = Object.keys(request());
  assert.equal(requestKeys.includes("contactId"), false);
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.contactId, 42);
});

// --- Targeted hardening: expiry/freshness provenance (Phase 13) ---

// 8. valid authoritative expiry → contract contains exact expiry.
test("provenance: valid decision.evidence.expiresAt is copied into the sealed contract exactly", () => {
  const decision = readyDecision({ expires_at: "2027-01-01T00:00:00.000Z" });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "contract_ready");
  assert.equal(result.contract?.authorizationExpiresAt, "2027-01-01T00:00:00.000Z");
});

// 9. missing expiry → blocked.
test("provenance: missing decision.evidence.expiresAt (null) → blocked, no contract", () => {
  const decision = readyDecision({ expires_at: null });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 10. blank expiry → blocked.
test("provenance: blank decision.evidence.expiresAt (whitespace-only) → blocked, no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, expiresAt: "   " } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 11. malformed expiry → blocked.
test("provenance: malformed (unparseable) decision.evidence.expiresAt → blocked, no contract", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, expiresAt: "not-a-real-timestamp" } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

// 12. caller cannot supply a replacement expiry -- there is no expiry field on ExecutionDispatchRequest at all.
test("provenance: contract.authorizationExpiresAt cannot be substituted -- there is no caller-suppliable expiry field on ExecutionDispatchRequest", () => {
  const decision = readyDecision({ expires_at: "2027-01-01T00:00:00.000Z" });
  const requestKeys = Object.keys(request());
  assert.equal(requestKeys.includes("expiresAt"), false);
  assert.equal(requestKeys.includes("authorizationExpiresAt"), false);
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.authorizationExpiresAt, "2027-01-01T00:00:00.000Z");
});

// 13. contract expiry originates from Phase 8 evidence.
test("provenance: contract.authorizationExpiresAt is sourced from decision.evidence.expiresAt", () => {
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, expiresAt: "2028-06-15T12:00:00.000Z" } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.authorizationExpiresAt, decision.evidence.expiresAt);
});

// 14. no trimming/rewriting of a valid persisted timestamp.
test("provenance: a valid persisted expiry timestamp is never trimmed, rewritten, or reformatted", () => {
  const oddButValid = "2027-01-01T00:00:00.000+00:00"; // explicit offset form, deliberately not "Z"
  const decision = rawDecision({ evidence: { ...rawDecision().evidence, expiresAt: oddButValid } });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.authorizationExpiresAt, oddButValid);
});

// 10-11 blocked/evaluation_failed Phase 8 results remain incapable of producing a contract even with a valid expiry.
test("provenance: a blocked Phase 8 decision produces no contract even with a perfectly valid expiry", () => {
  const decision = readyDecision({ expires_at: "2027-01-01T00:00:00.000Z", authorization_status: "blocked" });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "blocked");
  assert.equal(result.contract, null);
});

test("policyVersion is preserved from decision.evidence exactly", () => {
  const decision = readyDecision({ policy_version: "feh-execution-authorization-policy@9.9.9-custom" });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.contract?.policyVersion, "feh-execution-authorization-policy@9.9.9-custom");
});

test("evaluation_failed Phase 8 status is never reported as 'blocked' -- distinct statuses are preserved", () => {
  const decision = rawDecision({ status: "evaluation_failed", readyForDispatch: false });
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.equal(result.status, "evaluation_failed");
});

test("reasons array is always populated, even on contract_ready", () => {
  const decision = readyDecision();
  const result = createProviderNeutralDispatchContract(decision, request(), CREATED_AT);
  assert.ok(result.reasons.length > 0);
});
