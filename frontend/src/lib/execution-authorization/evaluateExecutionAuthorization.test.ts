import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_POLICY_VERSION,
  evaluateExecutionAuthorization,
  type ExecutionAuthorizationInput,
  type HumanApprovalState,
} from "./evaluateExecutionAuthorization.ts";
import type { OutreachEligibilityDecision, OutreachEligibilityStatus } from "../outreach/evaluateOutreachEligibility.ts";
import type { ContactPermissionDecision } from "../compliance/evaluateContactPermission.ts";

const EVAL_TIME = new Date("2026-08-22T10:00:00.000Z");

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

const MASSIVE_OPPORTUNITY = {
  opportunityId: 1,
  opportunityScore: 100,
  opportunityReason: "Extremely high commercial value",
  renewalWindow: "7 days",
  estimatedValue: 5_000_000,
};

function input(overrides: Partial<ExecutionAuthorizationInput> = {}): ExecutionAuthorizationInput {
  return {
    outreachEligibilityDecision: outreachDecision("eligible_for_handoff"),
    actionId: "action-123",
    requestedChannel: "EMAIL",
    actorId: "user-1",
    humanApproval: "approved",
    idempotencyKey: "idem-key-abc-123",
    policyVersion: null,
    ...overrides,
  };
}

// 1. Phase 5 eligible + valid controls → authorised.
test("Phase 5 eligible_for_handoff + valid action id/channel/idempotency/approval → authorised", () => {
  const result = evaluateExecutionAuthorization(input(), EVAL_TIME);
  assert.equal(result.status, "authorised");
  assert.equal(result.authorisationAllowed, true);
});

// 2. Phase 5 blocked → blocked.
test("Phase 5 blocked → blocked, regardless of otherwise-valid controls", () => {
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: outreachDecision("blocked") }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 3. Phase 5 needs_review → needs_review.
test("Phase 5 needs_review → needs_review", () => {
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: outreachDecision("needs_review") }), EVAL_TIME);
  assert.equal(result.status, "needs_review");
});

// 4. Phase 5 evaluation_failed → evaluation_failed.
test("Phase 5 evaluation_failed → evaluation_failed", () => {
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: outreachDecision("evaluation_failed") }), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

// 5. Human approval rejected → blocked.
test("human approval rejected → blocked", () => {
  const result = evaluateExecutionAuthorization(input({ humanApproval: "rejected" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 6. Human approval required → needs_review.
test("human approval required → needs_review", () => {
  const result = evaluateExecutionAuthorization(input({ humanApproval: "required" }), EVAL_TIME);
  assert.equal(result.status, "needs_review");
});

// 7. Human approval unknown → needs_review.
test("human approval unknown → needs_review", () => {
  const result = evaluateExecutionAuthorization(input({ humanApproval: "unknown" }), EVAL_TIME);
  assert.equal(result.status, "needs_review");
});

test("human approval not supplied at all defaults to unknown → needs_review, never assumed approved", () => {
  const result = evaluateExecutionAuthorization(input({ humanApproval: null }), EVAL_TIME);
  assert.equal(result.status, "needs_review");
  assert.equal(result.humanApproval, "unknown");
});

// 8. Human approval approved → may continue.
test("human approval approved → authorised (given every other gate passes)", () => {
  const result = evaluateExecutionAuthorization(input({ humanApproval: "approved" }), EVAL_TIME);
  assert.equal(result.status, "authorised");
});

// 9. Human approval not_required → may continue.
test("human approval not_required → authorised (given every other gate passes)", () => {
  const result = evaluateExecutionAuthorization(input({ humanApproval: "not_required" }), EVAL_TIME);
  assert.equal(result.status, "authorised");
});

// 10. Missing action ID → not authorised.
test("missing actionId → blocked, not authorised", () => {
  const result = evaluateExecutionAuthorization(input({ actionId: null }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.notEqual(result.status, "authorised");
});

// 11. Blank action ID → not authorised.
test("blank/whitespace-only actionId → blocked, not authorised", () => {
  const result = evaluateExecutionAuthorization(input({ actionId: "   " }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 12. Missing idempotency key → not authorised.
test("missing idempotencyKey → blocked, not authorised", () => {
  const result = evaluateExecutionAuthorization(input({ idempotencyKey: null }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.idempotency.keyProvided, false);
  assert.equal(result.idempotency.valid, false);
});

// 13. Blank idempotency key → not authorised.
test("blank/whitespace-only idempotencyKey → blocked, not authorised", () => {
  const result = evaluateExecutionAuthorization(input({ idempotencyKey: "   " }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.idempotency.keyProvided, true);
  assert.equal(result.idempotency.valid, false);
});

// 14. Excessively long/unusable idempotency key → not authorised.
test("excessively long idempotencyKey (over 200 chars) → blocked, not authorised", () => {
  const result = evaluateExecutionAuthorization(input({ idempotencyKey: "x".repeat(201) }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.idempotency.valid, false);
});

// 15. Valid idempotency key → may continue.
test("a valid, reasonably-sized idempotencyKey → authorised (given every other gate passes)", () => {
  const result = evaluateExecutionAuthorization(input({ idempotencyKey: "x".repeat(200) }), EVAL_TIME);
  assert.equal(result.status, "authorised");
  assert.equal(result.idempotency.valid, true);
});

// 16. Phase 6 requested channel differs from Phase 5 channel → not authorised.
test("requested channel differs from the channel Phase 5 already evaluated → blocked", () => {
  const result = evaluateExecutionAuthorization(
    input({ requestedChannel: "PHONE", outreachEligibilityDecision: outreachDecision("eligible_for_handoff", { requestedChannel: "EMAIL" }) }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.evidence.channelConsistent, false);
});

test("channel is never silently rewritten to match — the mismatch is reported, not corrected", () => {
  const result = evaluateExecutionAuthorization(
    input({ requestedChannel: "PHONE", outreachEligibilityDecision: outreachDecision("eligible_for_handoff", { requestedChannel: "EMAIL" }) }),
    EVAL_TIME,
  );
  assert.equal(result.requestedChannel, "PHONE");
  assert.equal(result.evidence.phase5Channel, "EMAIL");
});

// 17. Matching channel → may continue.
test("matching channel → authorised (given every other gate passes)", () => {
  const result = evaluateExecutionAuthorization(
    input({ requestedChannel: "WHATSAPP", outreachEligibilityDecision: outreachDecision("eligible_for_handoff", { requestedChannel: "WHATSAPP" }) }),
    EVAL_TIME,
  );
  assert.equal(result.status, "authorised");
  assert.equal(result.evidence.channelConsistent, true);
});

// 18. authorisationAllowed true only when status is authorised.
test("authorisationAllowed is true only for status === authorised", () => {
  const statuses: Array<[OutreachEligibilityStatus, HumanApprovalState]> = [
    ["eligible_for_handoff", "approved"],
    ["blocked", "approved"],
    ["needs_review", "approved"],
    ["evaluation_failed", "approved"],
  ];
  for (const [phase5Status, approval] of statuses) {
    const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: outreachDecision(phase5Status), humanApproval: approval }), EVAL_TIME);
    assert.equal(result.authorisationAllowed, result.status === "authorised");
  }
});

// 19. executionPerformed always false.
test("executionPerformed is always literally false, on every status", () => {
  const statuses: OutreachEligibilityStatus[] = ["eligible_for_handoff", "blocked", "needs_review", "evaluation_failed"];
  for (const phase5Status of statuses) {
    const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: outreachDecision(phase5Status) }), EVAL_TIME);
    assert.equal(result.executionPerformed, false);
  }
});

// 20. Opportunity score cannot override blocked Phase 5.
test("a maximal opportunity score attached to the Phase 5 decision cannot override a blocked outcome", () => {
  const blockedWithHugeOpportunity = outreachDecision("blocked", { evidence: { contactPermissionStatus: "blocked", opportunityContext: MASSIVE_OPPORTUNITY } });
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: blockedWithHugeOpportunity }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 21. Opportunity score cannot override human rejection.
test("a maximal opportunity score cannot override an explicit human rejection", () => {
  const eligibleWithHugeOpportunity = outreachDecision("eligible_for_handoff", { evidence: { contactPermissionStatus: "eligible", opportunityContext: MASSIVE_OPPORTUNITY } });
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: eligibleWithHugeOpportunity, humanApproval: "rejected" }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 22. Opportunity score cannot override missing idempotency.
test("a maximal opportunity score cannot override a missing idempotency key", () => {
  const eligibleWithHugeOpportunity = outreachDecision("eligible_for_handoff", { evidence: { contactPermissionStatus: "eligible", opportunityContext: MASSIVE_OPPORTUNITY } });
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: eligibleWithHugeOpportunity, idempotencyKey: null }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 23. Identity strength cannot override blocked Phase 5.
test("maximal identity confidence inside the nested Phase 4 decision cannot override a blocked Phase 5 outcome", () => {
  const blockedDecision = outreachDecision("blocked", {
    contactPermissionDecision: { ...contactPermissionDecision(), status: "blocked", identityDecision: { tier: "deterministic", confidence: 100, verdict: "sufficient" } },
  });
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: blockedDecision }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 24. Positive legal basis cannot override blocked Phase 5.
test("a fully positive legal basis inside the nested Phase 4 decision cannot override a blocked Phase 5 outcome", () => {
  const blockedDecision = outreachDecision("blocked", {
    contactPermissionDecision: { ...contactPermissionDecision(), status: "blocked", permissionDecision: { effectiveBasis: "contractual", consentSource: null, verdict: "permitted" } },
  });
  const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: blockedDecision }), EVAL_TIME);
  assert.equal(result.status, "blocked");
});

// 25. Same input produces same output.
test("is deterministic: identical input produces identical output", () => {
  const evalInput = input();
  const first = evaluateExecutionAuthorization(evalInput, EVAL_TIME);
  const second = evaluateExecutionAuthorization(evalInput, EVAL_TIME);
  assert.deepEqual(first, second);
});

// 26. Inputs are not mutated.
test("never mutates its input argument", () => {
  const evalInput = input();
  const snapshot = JSON.parse(JSON.stringify(evalInput));
  evaluateExecutionAuthorization(evalInput, EVAL_TIME);
  assert.deepEqual(evalInput, snapshot);
});

// 27. Authorization claim contains only non-secret metadata.
test("authorizationClaim contains only structured, non-secret metadata — no PII, no credential", () => {
  const result = evaluateExecutionAuthorization(input(), EVAL_TIME);
  assert.ok(result.authorizationClaim);
  const serialised = JSON.stringify(result.authorizationClaim);
  assert.ok(!serialised.toLowerCase().includes("secret"));
  assert.ok(!serialised.toLowerCase().includes("token"));
  assert.ok(!serialised.toLowerCase().includes("password"));
  assert.deepEqual(Object.keys(result.authorizationClaim!).sort(), ["actionId", "authorizationStatus", "evaluatedAt", "idempotencyKey", "policyVersion", "requestedChannel"].sort());
});

test("authorizationClaim is null when actionId is invalid — nothing trustworthy to populate it with", () => {
  const result = evaluateExecutionAuthorization(input({ actionId: null }), EVAL_TIME);
  assert.equal(result.authorizationClaim, null);
});

// 28. Missing/invalid policy version cannot silently become authorised if policy requires one.
test("missing policyVersion resolves to this module's own explicit default, and does not by itself change the authorization outcome", () => {
  const result = evaluateExecutionAuthorization(input({ policyVersion: null }), EVAL_TIME);
  assert.equal(result.policyVersion, DEFAULT_POLICY_VERSION);
  assert.equal(result.status, "authorised");
});

test("an explicitly supplied policyVersion is honoured and preserved on the decision and claim", () => {
  const result = evaluateExecutionAuthorization(input({ policyVersion: "feh-policy@2.0.0" }), EVAL_TIME);
  assert.equal(result.policyVersion, "feh-policy@2.0.0");
  assert.equal(result.authorizationClaim?.policyVersion, "feh-policy@2.0.0");
});

// 29. Channel is preserved exactly.
test("requestedChannel is preserved exactly on the decision for every channel value", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const result = evaluateExecutionAuthorization(
      input({ requestedChannel: channel, outreachEligibilityDecision: outreachDecision("eligible_for_handoff", { requestedChannel: channel }) }),
      EVAL_TIME,
    );
    assert.equal(result.requestedChannel, channel);
  }
});

// 30. No provider execution occurs — structural, proven by the complete absence of any provider-calling code path;
// this test confirms the decision object itself never carries a field implying otherwise.
test("no field on the decision ever implies a provider was contacted", () => {
  const result = evaluateExecutionAuthorization(input(), EVAL_TIME);
  const serialised = JSON.stringify(result).toLowerCase();
  assert.ok(!serialised.includes("call_placed"));
  assert.ok(!serialised.includes("message_sent"));
  assert.ok(!serialised.includes("delivered"));
  assert.equal(result.executionPerformed, false);
});

// Additional edge case: evidence preserves enough to reconstruct the reasoning without duplicating raw contact PII.
test("evidence carries the Phase 5 status, human approval state, channel consistency, and structural validity flags", () => {
  const result = evaluateExecutionAuthorization(input(), EVAL_TIME);
  assert.equal(result.evidence.outreachEligibilityStatus, "eligible_for_handoff");
  assert.equal(result.evidence.humanApprovalState, "approved");
  assert.equal(result.evidence.channelConsistent, true);
  assert.equal(result.evidence.hasActionId, true);
  assert.equal(result.evidence.idempotencyKeyValid, true);
});

test("reasons array is never empty, always explains the resulting status", () => {
  const statuses: OutreachEligibilityStatus[] = ["eligible_for_handoff", "blocked", "needs_review", "evaluation_failed"];
  for (const phase5Status of statuses) {
    const result = evaluateExecutionAuthorization(input({ outreachEligibilityDecision: outreachDecision(phase5Status) }), EVAL_TIME);
    assert.ok(result.reasons.length > 0);
  }
});
