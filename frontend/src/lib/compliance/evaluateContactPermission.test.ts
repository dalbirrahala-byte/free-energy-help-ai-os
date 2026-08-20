import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateContactPermission,
  evaluateContactPermissionWithLookup,
  type ContactPermissionEvaluationInput,
} from "./evaluateContactPermission.ts";
import type { SuppressionDecision, SuppressionMatch, SuppressionRecordCandidate } from "../suppression/evaluateSuppression.ts";

const EVAL_TIME = new Date("2026-08-20T12:00:00.000Z");

const ALLOWED: SuppressionDecision = { status: "allowed", evaluatedAt: EVAL_TIME.toISOString() };

function suppressed(overrides: Partial<SuppressionMatch> = {}): SuppressionDecision {
  return {
    status: "suppressed",
    evaluatedAt: EVAL_TIME.toISOString(),
    matches: [
      {
        recordId: 1,
        reason: "GLOBAL",
        scope: "PERMANENT",
        requestedBy: "INTERNAL",
        channel: null,
        matchedFields: ["organisation_id"],
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: null,
        legalBasis: null,
        evidenceReference: null,
        notes: null,
        ...overrides,
      },
    ],
  };
}

const SUPPRESSION_FAILED: SuppressionDecision = { status: "evaluation_failed", evaluatedAt: EVAL_TIME.toISOString(), reason: "connection reset" };

function input(overrides: Partial<ContactPermissionEvaluationInput> = {}): ContactPermissionEvaluationInput {
  return {
    organisationId: 5,
    contactId: null,
    email: "prospect@example.com",
    telephone: null,
    domain: null,
    sourceId: null,
    campaignId: null,
    requestedChannel: "EMAIL",
    identityConfidence: 95,
    identityTier: "deterministic",
    consentStatus: "consented",
    consentSource: null,
    legalBasis: null,
    contactabilityStatus: null,
    ...overrides,
  };
}

// 1. Suppressed contact → blocked.
test("suppressed contact → blocked, regardless of every other positive signal", () => {
  const result = evaluateContactPermission(input(), suppressed(), EVAL_TIME);
  assert.equal(result.status, "blocked");
  assert.equal(result.reviewRequired, false);
});

// 2. Suppression evaluation failure → evaluation_failed.
test("suppression evaluation failure → evaluation_failed, never allowed or blocked-as-final-answer", () => {
  const result = evaluateContactPermission(input(), SUPPRESSION_FAILED, EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
});

// 3. Deterministic identity + valid channel contactability + valid permission → eligible.
test("deterministic identity + contactable EMAIL + consented → eligible", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
});

// 4. High-confidence identity + valid permission → eligible if policy allows.
test("high_confidence identity + contactable + permitted → eligible (policy: high_confidence is sufficient)", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "high_confidence", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "contractual" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
});

// 5. Ambiguous identity → needs_review.
test("ambiguous identity → needs_review", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "ambiguous", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.reviewRequired, true);
});

// 6. No identity evidence → needs_review or blocked according to explicit policy.
test("no identity evidence supplied (unresolved tier) → needs_review, per this module's documented policy default", () => {
  const result = evaluateContactPermission(
    input({ identityTier: null, requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.identityDecision.tier, "unresolved");
});

// 7. Missing telephone for PHONE → not eligible.
test("missing telephone for a PHONE request → blocked (not eligible)", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "PHONE", telephone: null, consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.notEqual(result.status, "eligible");
  assert.equal(result.status, "blocked");
});

// 8. Missing email for EMAIL → not eligible.
test("missing email for an EMAIL request → blocked (not eligible)", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: null, consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.notEqual(result.status, "eligible");
  assert.equal(result.status, "blocked");
});

// 9. PHONE contactability does not authorize EMAIL.
test("having a telephone number does not make an EMAIL request contactable", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: null, telephone: "01234567890", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.contactabilityDecision.status, "not_contactable");
});

// 10. EMAIL permission does not authorize PHONE.
test("having an email address does not make a PHONE request contactable", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "PHONE", telephone: null, email: "a@example.com", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.contactabilityDecision.status, "not_contactable");
});

// 11. Withdrawn consent → blocked.
test("withdrawn consent → blocked, even with a strong identity match and contactable channel", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "withdrawn" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.permissionDecision.effectiveBasis, "withdrawn");
});

// 12. Unknown legal basis → needs_review.
test("unknown legal basis (both consentStatus and legalBasis unset) → needs_review", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: null, legalBasis: null }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.permissionDecision.effectiveBasis, "unknown");
});

// 13. Explicitly not permitted → blocked.
test("explicit not_permitted → blocked", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "not_permitted" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 14. Valid contractual basis → eligible when other gates pass.
test("contractual basis → eligible when identity and contactability also pass", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "contractual" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
  assert.equal(result.permissionDecision.effectiveBasis, "contractual");
});

// 15. Legitimate-interest basis → structured evaluation only, not automatic legal conclusion.
test("legitimate_interest basis is reported exactly as supplied, not reinterpreted", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "legitimate_interest" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
  assert.equal(result.permissionDecision.effectiveBasis, "legitimate_interest");
});

// --- Targeted correction: an explicit "unknown" alongside a positive
// value must never be outweighed by that positive value. Materially
// incomplete/conflicting permission evidence must resolve to
// needs_review, never eligible. ---

test("consented + unknown → needs_review, not eligible", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented", legalBasis: "unknown" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.permissionDecision.verdict, "requires_review");
});

test("unknown + contractual → needs_review, not eligible", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "unknown", legalBasis: "contractual" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.permissionDecision.verdict, "requires_review");
});

test("unknown + legitimate_interest → needs_review, not eligible", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "unknown", legalBasis: "legitimate_interest" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.permissionDecision.verdict, "requires_review");
});

test("unknown + regulatory → needs_review, not eligible", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "unknown", legalBasis: "regulatory" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "needs_review");
  assert.equal(result.permissionDecision.verdict, "requires_review");
});

test("withdrawn + unknown → blocked (withdrawal remains an absolute block regardless of the other field)", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "withdrawn", legalBasis: "unknown" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.permissionDecision.effectiveBasis, "withdrawn");
});

test("not_permitted + unknown → blocked (not_permitted remains an absolute block regardless of the other field)", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "not_permitted", legalBasis: "unknown" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.permissionDecision.effectiveBasis, "not_permitted");
});

test("a single unambiguous positive basis with the other field genuinely absent (null, not 'unknown') still resolves eligible — existing approved policy is unchanged", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "contractual", legalBasis: null }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
  assert.equal(result.permissionDecision.verdict, "permitted");
  assert.equal(result.permissionDecision.effectiveBasis, "contractual");
});

test("two agreeing positive values (consented + contractual) remain eligible — not treated as a conflict", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented", legalBasis: "contractual" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
  assert.equal(result.permissionDecision.verdict, "permitted");
});

// 16. Null/missing optional evidence does not fabricate permission.
test("a mostly-empty input never fabricates eligibility", () => {
  const result = evaluateContactPermission(
    { requestedChannel: "EMAIL" },
    ALLOWED,
    EVAL_TIME,
  );
  assert.notEqual(result.status, "eligible");
});

// 17. Conflicting evidence → needs_review.
test("conflicting consentStatus/legalBasis values (one positive, one withdrawn) → blocked, not silently resolved to permitted", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented", legalBasis: "withdrawn" }),
    ALLOWED,
    EVAL_TIME,
  );
  // The withdrawn signal must win — this is the fail-closed conflict resolution,
  // not a "needs_review" outcome, since RULE 6 makes withdrawal an absolute block.
  assert.equal(result.status, "blocked");
});

// 18. Same input produces same result.
test("is deterministic: identical input produces identical output", () => {
  const evalInput = input({ requestedChannel: "EMAIL", email: "a@example.com" });
  const first = evaluateContactPermission(evalInput, ALLOWED, EVAL_TIME);
  const second = evaluateContactPermission(evalInput, ALLOWED, EVAL_TIME);
  assert.deepEqual(first, second);
});

// 19. Inputs are not mutated.
test("never mutates its input or suppressionDecision arguments", () => {
  const evalInput = input({ requestedChannel: "EMAIL", email: "a@example.com" });
  const decision = suppressed();
  const inputSnapshot = JSON.parse(JSON.stringify(evalInput));
  const decisionSnapshot = JSON.parse(JSON.stringify(decision));

  evaluateContactPermission(evalInput, decision, EVAL_TIME);

  assert.deepEqual(evalInput, inputSnapshot);
  assert.deepEqual(decision, decisionSnapshot);
});

// 20. Opportunity/commercial score cannot override compliance failure.
test("this module has no opportunity-score concept at all — a blocked consent state stays blocked regardless of any external attractiveness", () => {
  // There is no opportunityScore field on the input type by design (see
  // module header's CORE ARCHITECTURAL RULE) — this test documents that
  // omission is intentional by confirming a compliance block is
  // unconditional given only the fields that actually exist.
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "not_permitted" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 21. Strong identity confidence cannot override suppression.
test("deterministic identity + fully permitted consent still blocked by an active suppression", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "deterministic", identityConfidence: 100, requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    suppressed(),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 22. Valid contact data cannot override suppression.
test("having a valid, contactable email still blocked by an active suppression", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    suppressed({ reason: "DO_NOT_EMAIL" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
});

// 23. Channel mismatch cannot become eligible.
test("no requested channel at all → needs_review, never eligible", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: null, consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.notEqual(result.status, "eligible");
  assert.equal(result.contactabilityDecision.status, "unknown");
});

// 24. Dependency failure cannot become eligible.
test("evaluateContactPermissionWithLookup: a suppression dependency failure propagates to evaluation_failed, never eligible", async () => {
  const supabase = {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            or(_conditions: string) {
              return Promise.resolve({ data: null, error: { message: "network error" } });
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const result = await evaluateContactPermissionWithLookup(
    supabase,
    input({ requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "evaluation_failed");
  assert.notEqual(result.status, "eligible");
});

test("evaluateContactPermissionWithLookup: a clean suppression lookup with no rows composes through to eligible", async () => {
  const supabase = {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            or(_conditions: string) {
              const rows: SuppressionRecordCandidate[] = [];
              return Promise.resolve({ data: rows, error: null });
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const result = await evaluateContactPermissionWithLookup(
    supabase,
    input({ identityTier: "deterministic", requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    EVAL_TIME,
  );
  assert.equal(result.status, "eligible");
});

// Additional edge case: identity confidence value is preserved on the decision, never fabricated.
test("identity confidence is passed through unchanged, never recalculated", () => {
  const result = evaluateContactPermission(
    input({ identityTier: "high_confidence", identityConfidence: 73, requestedChannel: "EMAIL", email: "a@example.com", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.identityDecision.confidence, 73);
});

// Additional edge case: evidence snapshot never includes raw email/telephone strings.
test("the evidence field is a non-PII snapshot — never the raw email/telephone value", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: "verysecret@example.com", telephone: "01234567890" }),
    ALLOWED,
    EVAL_TIME,
  );
  const serialised = JSON.stringify(result.evidence);
  assert.ok(!serialised.includes("verysecret@example.com"));
  assert.ok(!serialised.includes("01234567890"));
  assert.equal(result.evidence.hasEmail, true);
  assert.equal(result.evidence.hasTelephone, true);
});

// Additional edge case: explicit caller-supplied not_contactable overrides raw field presence.
test("an explicit contactabilityStatus of not_contactable overrides a present-looking email field", () => {
  const result = evaluateContactPermission(
    input({ requestedChannel: "EMAIL", email: "a@example.com", contactabilityStatus: "not_contactable", consentStatus: "consented" }),
    ALLOWED,
    EVAL_TIME,
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.contactabilityDecision.status, "not_contactable");
});
