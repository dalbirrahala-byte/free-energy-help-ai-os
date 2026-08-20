import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateOutreachEligibility,
  evaluateOutreachEligibilityWithLookup,
  type OutreachEligibilityInput,
  type OutreachOpportunityContext,
} from "./evaluateOutreachEligibility.ts";
import type { ContactPermissionDecision, ContactPermissionStatus } from "../compliance/evaluateContactPermission.ts";

const EVAL_TIME = new Date("2026-08-21T09:00:00.000Z");

function contactPermissionDecision(status: ContactPermissionStatus, overrides: Partial<ContactPermissionDecision> = {}): ContactPermissionDecision {
  return {
    status,
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
    reviewRequired: status === "needs_review",
    evaluatedAt: EVAL_TIME.toISOString(),
    ...overrides,
  };
}

const HIGH_OPPORTUNITY: OutreachOpportunityContext = {
  opportunityId: 999,
  opportunityScore: 100,
  opportunityReason: "Major expansion signal, extremely high commercial value",
  renewalWindow: "30 days",
  estimatedValue: 1_000_000,
};

// 1. Phase 4 eligible → eligible_for_handoff.
test("Phase 4 eligible → eligible_for_handoff", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("eligible"), null, EVAL_TIME);
  assert.equal(result.status, "eligible_for_handoff");
  assert.equal(result.handoffAllowed, true);
});

// 2. Phase 4 blocked → blocked.
test("Phase 4 blocked → blocked", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("blocked"), null, EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.handoffAllowed, false);
});

// 3. Phase 4 needs_review → needs_review.
test("Phase 4 needs_review → needs_review", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("needs_review"), null, EVAL_TIME);
  assert.equal(result.status, "needs_review");
  assert.equal(result.handoffAllowed, false);
  assert.equal(result.reviewRequired, true);
});

// 4. Phase 4 evaluation_failed → evaluation_failed.
test("Phase 4 evaluation_failed → evaluation_failed", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("evaluation_failed"), null, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.handoffAllowed, false);
});

// 5. High opportunity score cannot override blocked.
test("a maximal opportunity score cannot override a blocked contact-permission decision", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("blocked"), HIGH_OPPORTUNITY, EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.handoffAllowed, false);
});

// 6. High opportunity score cannot override needs_review.
test("a maximal opportunity score cannot override a needs_review contact-permission decision", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("needs_review"), HIGH_OPPORTUNITY, EVAL_TIME);
  assert.equal(result.status, "needs_review");
  assert.equal(result.handoffAllowed, false);
});

// 7. High opportunity score cannot override evaluation_failed.
test("a maximal opportunity score cannot override an evaluation_failed contact-permission decision", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("evaluation_failed"), HIGH_OPPORTUNITY, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.equal(result.handoffAllowed, false);
});

// 8. Missing opportunity score does not prevent a valid compliant handoff.
test("no opportunity context at all still allows a clean eligible decision to hand off", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("eligible"), null, EVAL_TIME);
  assert.equal(result.status, "eligible_for_handoff");
  assert.equal(result.evidence.opportunityContext, null);
});

test("a fully empty opportunity context object also does not block an eligible decision", () => {
  const result = evaluateOutreachEligibility(contactPermissionDecision("eligible"), {}, EVAL_TIME);
  assert.equal(result.status, "eligible_for_handoff");
});

// 9. Requested channel is preserved exactly.
test("requestedChannel is preserved exactly from the Phase 4 decision", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const result = evaluateOutreachEligibility(contactPermissionDecision("eligible", { requestedChannel: channel }), null, EVAL_TIME);
    assert.equal(result.requestedChannel, channel);
  }
});

// 10. Contact permission decision is preserved as evidence.
test("the full Phase 4 ContactPermissionDecision is preserved verbatim on the result", () => {
  const decision = contactPermissionDecision("eligible");
  const result = evaluateOutreachEligibility(decision, null, EVAL_TIME);
  assert.deepEqual(result.contactPermissionDecision, decision);
});

// 11. Reasons are preserved or safely summarized.
test("reasons include a summary of the Phase 4 status and, when supplied, note the commercial context was informational only", () => {
  const withOpportunity = evaluateOutreachEligibility(contactPermissionDecision("eligible"), HIGH_OPPORTUNITY, EVAL_TIME);
  assert.ok(withOpportunity.reasons.some((r) => r.factor === "Contact permission"));
  assert.ok(withOpportunity.reasons.some((r) => r.factor === "Commercial context" && r.detail.includes("did not affect")));

  const withoutOpportunity = evaluateOutreachEligibility(contactPermissionDecision("eligible"), null, EVAL_TIME);
  assert.ok(!withoutOpportunity.reasons.some((r) => r.factor === "Commercial context"));
});

// 12. Same input produces same output.
test("is deterministic: identical input produces identical output", () => {
  const decision = contactPermissionDecision("eligible");
  const first = evaluateOutreachEligibility(decision, HIGH_OPPORTUNITY, EVAL_TIME);
  const second = evaluateOutreachEligibility(decision, HIGH_OPPORTUNITY, EVAL_TIME);
  assert.deepEqual(first, second);
});

// 13. Inputs are not mutated.
test("never mutates its contactPermissionDecision or opportunityContext arguments", () => {
  const decision = contactPermissionDecision("eligible");
  const opportunity = { ...HIGH_OPPORTUNITY };
  const decisionSnapshot = JSON.parse(JSON.stringify(decision));
  const opportunitySnapshot = JSON.parse(JSON.stringify(opportunity));

  evaluateOutreachEligibility(decision, opportunity, EVAL_TIME);

  assert.deepEqual(decision, decisionSnapshot);
  assert.deepEqual(opportunity, opportunitySnapshot);
});

// 14. handoffAllowed is true only for eligible_for_handoff.
test("handoffAllowed is true only for eligible_for_handoff, false for every other status", () => {
  const statuses: ContactPermissionStatus[] = ["eligible", "blocked", "needs_review", "evaluation_failed"];
  for (const status of statuses) {
    const result = evaluateOutreachEligibility(contactPermissionDecision(status), null, EVAL_TIME);
    assert.equal(result.handoffAllowed, result.status === "eligible_for_handoff");
  }
});

// 15. reviewRequired is true only where human review is required.
test("reviewRequired is true only for needs_review, false for every other status", () => {
  const statuses: ContactPermissionStatus[] = ["eligible", "blocked", "needs_review", "evaluation_failed"];
  for (const status of statuses) {
    const result = evaluateOutreachEligibility(contactPermissionDecision(status), null, EVAL_TIME);
    assert.equal(result.reviewRequired, result.status === "needs_review");
  }
});

// 16. No execution field ever implies a call/message was actually sent.
test("executionPerformed is always literally false, on every status", () => {
  const statuses: ContactPermissionStatus[] = ["eligible", "blocked", "needs_review", "evaluation_failed"];
  for (const status of statuses) {
    const result = evaluateOutreachEligibility(contactPermissionDecision(status), HIGH_OPPORTUNITY, EVAL_TIME);
    assert.equal(result.executionPerformed, false);
  }
});

// --- Async orchestration wrapper (evaluateOutreachEligibilityWithLookup) ---
// Mocks the minimum Supabase chain Phase 3's suppression lookup actually
// calls (.from(table).select(cols).or(conditions)), matching the same
// hand-built mock-client convention used in Phase 3/4's own test files.

type MockResult = { data: unknown[] | null; error: { message: string } | null };

function makeMockSupabase(result: MockResult) {
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            or(_conditions: string) {
              return Promise.resolve(result);
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function orchestrationInput(overrides: Partial<OutreachEligibilityInput> = {}): OutreachEligibilityInput {
  return {
    organisationId: 5,
    requestedChannel: "EMAIL",
    email: "prospect@example.com",
    identityTier: "deterministic",
    identityConfidence: 95,
    consentStatus: "consented",
    ...overrides,
  };
}

// 17. Wrapper dependency failure cannot become eligible_for_handoff.
test("evaluateOutreachEligibilityWithLookup: a suppression lookup failure propagates to evaluation_failed, never eligible_for_handoff", async () => {
  const supabase = makeMockSupabase({ data: null, error: { message: "connection reset" } });
  const result = await evaluateOutreachEligibilityWithLookup(supabase, orchestrationInput({ opportunityContext: HIGH_OPPORTUNITY }), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.notEqual(result.status, "eligible_for_handoff");
});

// 18. Suppression cannot be bypassed through orchestration.
test("evaluateOutreachEligibilityWithLookup: an active suppression match still results in blocked, even with maximal opportunity context", async () => {
  const supabase = makeMockSupabase({
    data: [
      {
        id: 1,
        organisation_id: 5,
        contact_id: null,
        email: null,
        telephone: null,
        domain: null,
        source_id: null,
        channel: null,
        campaign_id: null,
        reason: "GLOBAL",
        legal_basis: null,
        requested_by: "INTERNAL",
        scope: "PERMANENT",
        starts_at: "2026-01-01T00:00:00.000Z",
        ends_at: null,
        evidence_reference: null,
        notes: null,
      },
    ],
    error: null,
  });
  const result = await evaluateOutreachEligibilityWithLookup(supabase, orchestrationInput({ opportunityContext: HIGH_OPPORTUNITY }), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.contactPermissionDecision.suppressionDecision.status, "suppressed");
});

// 19. Identity ambiguity cannot be bypassed through orchestration.
test("evaluateOutreachEligibilityWithLookup: ambiguous identity tier still results in needs_review through the full orchestration path", async () => {
  const supabase = makeMockSupabase({ data: [], error: null });
  const result = await evaluateOutreachEligibilityWithLookup(
    supabase,
    orchestrationInput({ identityTier: "ambiguous", opportunityContext: HIGH_OPPORTUNITY }),
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
});

// 20. Contactability failure cannot be bypassed through orchestration.
test("evaluateOutreachEligibilityWithLookup: missing channel-specific contact data still results in blocked through the full orchestration path", async () => {
  const supabase = makeMockSupabase({ data: [], error: null });
  const result = await evaluateOutreachEligibilityWithLookup(
    supabase,
    orchestrationInput({ requestedChannel: "EMAIL", email: null, opportunityContext: HIGH_OPPORTUNITY }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 21. Legal/compliance block cannot be bypassed through orchestration.
test("evaluateOutreachEligibilityWithLookup: withdrawn consent still results in blocked through the full orchestration path", async () => {
  const supabase = makeMockSupabase({ data: [], error: null });
  const result = await evaluateOutreachEligibilityWithLookup(
    supabase,
    orchestrationInput({ consentStatus: "withdrawn", opportunityContext: HIGH_OPPORTUNITY }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

test("evaluateOutreachEligibilityWithLookup: a fully clean path (no suppression, sufficient evidence) does reach eligible_for_handoff", async () => {
  const supabase = makeMockSupabase({ data: [], error: null });
  const result = await evaluateOutreachEligibilityWithLookup(supabase, orchestrationInput(), EVAL_TIME);
  assert.equal(result.status, "eligible_for_handoff");
  assert.equal(result.handoffAllowed, true);
  assert.equal(result.executionPerformed, false);
});
