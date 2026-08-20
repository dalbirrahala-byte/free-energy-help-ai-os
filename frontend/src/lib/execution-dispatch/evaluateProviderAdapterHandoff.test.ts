import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateProviderAdapterHandoff } from "./evaluateProviderAdapterHandoff.ts";
import { getNoOpAdapterForChannel } from "./providerAdapter.ts";
import type { ProviderAdapter, ProviderAdapterOutcome } from "./providerAdapter.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";

const EVAL_TIME = new Date("2026-08-27T10:00:00.000Z");
const CONTRACT_CREATED_AT = new Date("2026-08-27T09:59:00.000Z").toISOString();

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
    contractCreatedAt: CONTRACT_CREATED_AT,
    executionPerformed: false,
    ...overrides,
  });
}

// ---- 1-4. valid contract + matching-channel no-op adapter → accepted_noop ----

test("valid EMAIL contract + EMAIL no-op adapter → accepted_noop", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "EMAIL" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "accepted_noop");
});

test("valid PHONE contract + PHONE no-op adapter → accepted_noop", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "PHONE" }), getNoOpAdapterForChannel("PHONE"), EVAL_TIME);
  assert.equal(result.status, "accepted_noop");
});

test("valid WHATSAPP contract + WHATSAPP no-op adapter → accepted_noop", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "WHATSAPP" }), getNoOpAdapterForChannel("WHATSAPP"), EVAL_TIME);
  assert.equal(result.status, "accepted_noop");
});

test("valid SMS contract + SMS no-op adapter → accepted_noop", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "SMS" }), getNoOpAdapterForChannel("SMS"), EVAL_TIME);
  assert.equal(result.status, "accepted_noop");
});

// ---- 5-8. channel mismatch → rejected, no fallback ----

test("EMAIL contract + PHONE adapter → rejected", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "EMAIL" }), getNoOpAdapterForChannel("PHONE"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("PHONE contract + EMAIL adapter → rejected", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "PHONE" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("WHATSAPP contract + SMS adapter → rejected", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "WHATSAPP" }), getNoOpAdapterForChannel("SMS"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("SMS contract + WHATSAPP adapter → rejected", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ channel: "SMS" }), getNoOpAdapterForChannel("WHATSAPP"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 9. null/missing contract → fail closed ----

test("null contract → fail closed, rejected", async () => {
  const result = await evaluateProviderAdapterHandoff(null, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
  assert.equal(result.executionPerformed, false);
});

// ---- 10. malformed authorizationRecordId ----

test("authorizationRecordId null → fail closed", async () => {
  const c = { ...contract(), authorizationRecordId: null } as unknown as ProviderNeutralDispatchContract;
  const result = await evaluateProviderAdapterHandoff(c, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("authorizationRecordId zero/negative/non-integer → fail closed", async () => {
  for (const bad of [0, -1, 1.5]) {
    const c = { ...contract(), authorizationRecordId: bad } as unknown as ProviderNeutralDispatchContract;
    const result = await evaluateProviderAdapterHandoff(c, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
    assert.equal(result.status, "rejected");
  }
});

// ---- 11. malformed actionId ----

test("actionId blank/whitespace-only → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ actionId: "   " }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("actionId exceeds usable length bound → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ actionId: "x".repeat(201) }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 12. malformed idempotencyKey ----

test("idempotencyKey blank/whitespace-only → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ idempotencyKey: "   " }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("idempotencyKey exceeds usable length bound → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ idempotencyKey: "x".repeat(201) }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 13. missing policyVersion ----

test("policyVersion missing/blank → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ policyVersion: "" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 14. invalid humanApprovalState ----

test("humanApprovalState blank → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ humanApprovalState: "" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 15. invalid outreachEligibilityStatus ----

test("outreachEligibilityStatus blank → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ outreachEligibilityStatus: "" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 16. malformed contractCreatedAt ----

test("contractCreatedAt unparseable → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ contractCreatedAt: "not-a-real-timestamp" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("contractCreatedAt blank → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract({ contractCreatedAt: "" }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 17. executionPerformed true at runtime → fail closed ----

test("contract.executionPerformed not literally false (unsafe cast) → evaluation_failed", async () => {
  const c = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const result = await evaluateProviderAdapterHandoff(c, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

// ---- 18. idempotency key passes through byte-for-byte ----

test("idempotencyKey passes through to evidence byte-for-byte, unmodified", async () => {
  const key = "Odd_Format-Key.123-DO-NOT-TOUCH";
  const result = await evaluateProviderAdapterHandoff(contract({ idempotencyKey: key }), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.evidence.idempotencyKey, key);
  assert.notEqual(result.evidence.idempotencyKey, key.toLowerCase());
});

// ---- 19. adapter does not mutate contract ----

test("evaluateProviderAdapterHandoff never mutates the contract argument", async () => {
  const input = contract();
  const snapshot = JSON.parse(JSON.stringify(input));
  await evaluateProviderAdapterHandoff(input, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.deepEqual(input, snapshot);
});

// ---- 20. deterministic ----

test("is deterministic: identical input produces identical output", async () => {
  const c = contract();
  const adapter = getNoOpAdapterForChannel("EMAIL");
  const a = await evaluateProviderAdapterHandoff(c, adapter, EVAL_TIME);
  const b = await evaluateProviderAdapterHandoff(c, adapter, EVAL_TIME);
  assert.deepEqual(a, b);
});

// ---- 21. executionPerformed always false ----

test("executionPerformed is always literally false, on every status", async () => {
  const accepted = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(accepted.executionPerformed, false);

  const rejected = await evaluateProviderAdapterHandoff(null, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(rejected.executionPerformed, false);

  const failedContract = { ...contract(), executionPerformed: true } as unknown as ProviderNeutralDispatchContract;
  const failed = await evaluateProviderAdapterHandoff(failedContract, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(failed.executionPerformed, false);
});

// ---- 22. no provider reference is generated ----

test("no provider reference/message id field appears anywhere in the result", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  const serialised = JSON.stringify(result);
  for (const forbidden of ["providerReference", "messageId", "callSid", "executionReference"]) {
    assert.equal(serialised.includes(forbidden), false);
  }
});

// ---- 23. no destination PII appears ----

test("no PII (email/telephone-shaped values) appears anywhere in the result", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  const serialised = JSON.stringify(result);
  const emailShaped = /[^\s"]+@[^\s".]+\.[a-z]{2,}/i;
  assert.equal(emailShaped.test(serialised), false);
  const keys = Object.keys(result.evidence);
  for (const forbidden of ["email", "telephone", "phoneNumber", "whatsappNumber", "smsNumber", "destination"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

// ---- 24. no commercial fields appear ----

test("no opportunity/commercial fields appear anywhere in the result", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  const keys = Object.keys(result.evidence);
  for (const forbidden of ["opportunityScore", "estimatedValue", "commission", "leadPriority", "renewalAttractiveness", "revenueScore", "signalStrength"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

// ---- 25. no DB access occurs ----

test("evaluateProviderAdapterHandoff accepts no database/Supabase client parameter", () => {
  assert.equal(evaluateProviderAdapterHandoff.length, 3);
});

// ---- 26. no network/provider call occurs ----

test("handoff resolves near-instantly with no mocked network layer required -- consistent with zero network I/O", async () => {
  const started = Date.now();
  await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  const elapsedMs = Date.now() - started;
  assert.ok(elapsedMs < 200, `expected near-instant resolution, took ${elapsedMs}ms`);
});

// ---- 27. no environment/provider-secret access occurs ----

test("no environment/provider-secret access occurs", async () => {
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
    const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
    assert.equal(result.status, "accepted_noop");
  } finally {
    process.env = originalEnv;
  }
});

// ---- 28. adapter exception → evaluation_failed ----

test("adapter.execute() throwing synchronously → evaluation_failed", async () => {
  const throwingAdapter: ProviderAdapter = Object.freeze({
    channel: "EMAIL",
    kind: "throwing-test-adapter",
    async execute(): Promise<ProviderAdapterOutcome> {
      throw new Error("simulated adapter failure");
    },
  });
  const result = await evaluateProviderAdapterHandoff(contract(), throwingAdapter, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

test("adapter.execute() rejecting its Promise → evaluation_failed", async () => {
  const rejectingAdapter: ProviderAdapter = Object.freeze({
    channel: "EMAIL",
    kind: "rejecting-test-adapter",
    execute(): Promise<ProviderAdapterOutcome> {
      return Promise.reject(new Error("simulated rejection"));
    },
  });
  const result = await evaluateProviderAdapterHandoff(contract(), rejectingAdapter, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

// ---- 29. malformed adapter result → evaluation_failed ----

test("adapter returning executionPerformed: true → evaluation_failed", async () => {
  const badAdapter: ProviderAdapter = Object.freeze({
    channel: "EMAIL",
    kind: "bad-test-adapter",
    async execute() {
      return { status: "accepted_noop", executionPerformed: true } as unknown as ProviderAdapterOutcome;
    },
  });
  const result = await evaluateProviderAdapterHandoff(contract(), badAdapter, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

test("adapter returning an unrecognised status → evaluation_failed", async () => {
  const badAdapter: ProviderAdapter = Object.freeze({
    channel: "EMAIL",
    kind: "bad-test-adapter",
    async execute() {
      return { status: "sent", executionPerformed: false } as unknown as ProviderAdapterOutcome;
    },
  });
  const result = await evaluateProviderAdapterHandoff(contract(), badAdapter, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

test("adapter returning null → evaluation_failed", async () => {
  const badAdapter: ProviderAdapter = Object.freeze({
    channel: "EMAIL",
    kind: "bad-test-adapter",
    async execute() {
      return null as unknown as ProviderAdapterOutcome;
    },
  });
  const result = await evaluateProviderAdapterHandoff(contract(), badAdapter, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

// ---- 30. missing adapter for channel → fail closed if registry is used ----

test("registry lookup miss (unrecognised channel) yields null → harness fails closed", async () => {
  const missingAdapter = getNoOpAdapterForChannel("CARRIER_PIGEON" as unknown as "EMAIL");
  assert.equal(missingAdapter, null);
  const result = await evaluateProviderAdapterHandoff(contract(), missingAdapter, EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("adapter supplied as null → fail closed", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), null, EVAL_TIME);
  assert.equal(result.status, "rejected");
});

test("adapter without an execute() function → fail closed", async () => {
  const malformedAdapter = { channel: "EMAIL", kind: "no-execute" } as unknown as ProviderAdapter;
  const result = await evaluateProviderAdapterHandoff(contract(), malformedAdapter, EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 31. valid contract does not itself imply execution ----

test("accepted_noop never implies execution occurred", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "accepted_noop");
  assert.equal(result.executionPerformed, false);
  const serialised = JSON.stringify(result);
  assert.equal(serialised.includes('"executionPerformed":true'), false);
});

// ---- 32. no Phase 8 decision can be supplied directly in place of a Phase 9 contract ----

test("a Phase-8-decision-shaped object cannot be substituted for a Phase 9 contract", async () => {
  const phase8ShapedObject = {
    status: "ready_for_dispatch",
    readyForDispatch: true,
    requestedChannel: "EMAIL",
    reasons: [],
    evidence: { authorizationRecordId: 1, actionId: "action-123", idempotencyKey: "idem-key-abc-123" },
    executionPerformed: false,
    evaluatedAt: EVAL_TIME.toISOString(),
  } as unknown as ProviderNeutralDispatchContract;
  const result = await evaluateProviderAdapterHandoff(phase8ShapedObject, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.status, "rejected");
});

// ---- 33. no raw persisted Phase 7 record can be supplied directly ----

test("a raw Phase 7 persisted-record-shaped object cannot be substituted for a Phase 9 contract", async () => {
  const phase7ShapedObject = {
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
  } as unknown as ProviderNeutralDispatchContract;
  const result = await evaluateProviderAdapterHandoff(phase7ShapedObject, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  // Fails closed either way -- this object has no `executionPerformed: false`
  // field at all, so it is caught by the runtime consistency check before
  // the structural field checks even run. Either fail-closed status is
  // acceptable; what matters is that no contract is ever produced.
  assert.ok(result.status === "rejected" || result.status === "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

// ---- 34. no raw destination/contact value is accepted ----

test("a raw destination/contact-shaped object cannot be substituted for a Phase 9 contract", async () => {
  const rawContactShapedObject = {
    telephone: "+441234567890",
    email: "prospect@example.com",
    whatsapp: "+441234567890",
  } as unknown as ProviderNeutralDispatchContract;
  const result = await evaluateProviderAdapterHandoff(rawContactShapedObject, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  // Fails closed either way -- see note above. No contract is ever produced.
  assert.ok(result.status === "rejected" || result.status === "evaluation_failed");
  assert.equal(result.executionPerformed, false);
});

// ---- 35. contract remains readonly/unchanged where practical ----

test("the contract fixture itself is frozen, and remains frozen after being passed through the harness", async () => {
  const input = contract();
  assert.equal(Object.isFrozen(input), true);
  await evaluateProviderAdapterHandoff(input, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(Object.isFrozen(input), true);
});

// ---- Additional boundary tests ----

test("evidence.adapterKind reflects the adapter's kind on acceptance", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.evidence.adapterKind, "no-op");
});

test("reasons array is always populated", async () => {
  const accepted = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.ok(accepted.reasons.length > 0);
  const rejected = await evaluateProviderAdapterHandoff(null, getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.ok(rejected.reasons.length > 0);
});

test("evaluatedAt reflects the supplied evaluation timestamp", async () => {
  const result = await evaluateProviderAdapterHandoff(contract(), getNoOpAdapterForChannel("EMAIL"), EVAL_TIME);
  assert.equal(result.evaluatedAt, EVAL_TIME.toISOString());
});

test("a highly 'ready-looking' contract on the wrong channel is still rejected -- no commercial or urgency field exists to override channel binding", async () => {
  const result = await evaluateProviderAdapterHandoff(
    contract({ channel: "PHONE", actionId: "high-priority-action-999" }),
    getNoOpAdapterForChannel("EMAIL"),
    EVAL_TIME,
  );
  assert.equal(result.status, "rejected");
});
