import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateSuppression,
  evaluateSuppressionWithLookup,
  loadSuppressionCandidates,
  type SuppressionEvaluationInput,
  type SuppressionRecordCandidate,
} from "./evaluateSuppression.ts";

const EVAL_TIME = new Date("2026-08-20T12:00:00.000Z");

function record(overrides: Partial<SuppressionRecordCandidate> = {}): SuppressionRecordCandidate {
  return {
    id: 1,
    organisation_id: null,
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
    ...overrides,
  };
}

function input(overrides: Partial<SuppressionEvaluationInput> = {}): SuppressionEvaluationInput {
  return {
    organisationId: null,
    contactId: null,
    email: null,
    telephone: null,
    domain: null,
    sourceId: null,
    campaignId: null,
    channel: null,
    ...overrides,
  };
}

// 1. No suppression candidates → allowed.
test("no candidates at all → allowed", () => {
  const result = evaluateSuppression(input({ organisationId: 5 }), [], EVAL_TIME);
  assert.equal(result.status, "allowed");
});

// 2. Permanent organisation suppression → suppressed.
test("permanent organisation suppression → suppressed", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [record({ id: 10, organisation_id: 5, scope: "PERMANENT" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
  if (result.status === "suppressed") {
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0].recordId, 10);
    assert.deepEqual(result.matches[0].matchedFields, ["organisation_id"]);
  }
});

// 3. Contact-specific suppression → suppressed.
test("contact-specific suppression → suppressed", () => {
  const result = evaluateSuppression(
    input({ contactId: 42 }),
    [record({ id: 11, contact_id: 42 })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 4. Exact email suppression → suppressed.
test("exact email suppression → suppressed", () => {
  const result = evaluateSuppression(
    input({ email: "prospect@example.com" }),
    [record({ id: 12, email: "prospect@example.com" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 5. Exact telephone suppression → suppressed.
test("exact telephone suppression → suppressed", () => {
  const result = evaluateSuppression(
    input({ telephone: "01234567890" }),
    [record({ id: 13, telephone: "01234567890" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 6. Domain suppression → suppressed.
test("domain suppression → suppressed", () => {
  const result = evaluateSuppression(
    input({ domain: "example.com" }),
    [record({ id: 14, domain: "example.com" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 7. Source-specific suppression → suppressed only for matching source.
test("source-specific suppression blocks the matching source", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, sourceId: 100 }),
    [record({ id: 15, organisation_id: 5, source_id: 100, scope: "SOURCE_SPECIFIC" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

test("source-specific suppression does not block a different source", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, sourceId: 999 }),
    [record({ id: 15, organisation_id: 5, source_id: 100, scope: "SOURCE_SPECIFIC" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

test("source-specific suppression does not block when no sourceId is supplied at all", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [record({ id: 15, organisation_id: 5, source_id: 100, scope: "SOURCE_SPECIFIC" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

// 8. Campaign-specific suppression → suppressed only for matching campaign.
test("campaign-specific suppression blocks the matching campaign", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, campaignId: "spring-2026" }),
    [record({ id: 16, organisation_id: 5, campaign_id: "spring-2026", scope: "CAMPAIGN_SPECIFIC" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

test("campaign-specific suppression does not block a different campaign", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, campaignId: "autumn-2026" }),
    [record({ id: 16, organisation_id: 5, campaign_id: "spring-2026", scope: "CAMPAIGN_SPECIFIC" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

// 9. PHONE suppression does not automatically block EMAIL.
test("PHONE-channel suppression does not block an EMAIL action", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, channel: "EMAIL" }),
    [record({ id: 17, organisation_id: 5, channel: "PHONE", reason: "DO_NOT_CALL" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

test("PHONE-channel suppression blocks a PHONE action", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, channel: "PHONE" }),
    [record({ id: 17, organisation_id: 5, channel: "PHONE", reason: "DO_NOT_CALL" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 10. Null-channel suppression applies regardless of requested channel where identity matches.
test("null-channel suppression applies across every channel", () => {
  for (const channel of ["PHONE", "EMAIL", "WHATSAPP", "SMS"] as const) {
    const result = evaluateSuppression(
      input({ organisationId: 5, channel }),
      [record({ id: 18, organisation_id: 5, channel: null, reason: "GLOBAL" })],
      EVAL_TIME,
    );
    assert.equal(result.status, "suppressed", `expected suppressed for channel ${channel}`);
  }
});

// 11. Active temporary suppression → suppressed.
test("active temporary suppression (within window) → suppressed", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [
      record({
        id: 19,
        organisation_id: 5,
        scope: "TEMPORARY",
        starts_at: "2026-08-01T00:00:00.000Z",
        ends_at: "2026-09-01T00:00:00.000Z",
      }),
    ],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 12. Expired temporary suppression → allowed.
test("expired temporary suppression → allowed", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [
      record({
        id: 20,
        organisation_id: 5,
        scope: "TEMPORARY",
        starts_at: "2026-01-01T00:00:00.000Z",
        ends_at: "2026-02-01T00:00:00.000Z",
      }),
    ],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

// 13. Future temporary suppression → allowed until start time.
test("future temporary suppression (not yet started) → allowed", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [
      record({
        id: 21,
        organisation_id: 5,
        scope: "TEMPORARY",
        starts_at: "2026-09-01T00:00:00.000Z",
        ends_at: "2026-10-01T00:00:00.000Z",
      }),
    ],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

test("ends_at exactly equal to evaluation time is treated as expired (boundary is exclusive)", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [record({ id: 22, organisation_id: 5, scope: "TEMPORARY", starts_at: "2026-08-01T00:00:00.000Z", ends_at: EVAL_TIME.toISOString() })],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

test("starts_at exactly equal to evaluation time is treated as active (boundary is inclusive)", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [record({ id: 23, organisation_id: 5, starts_at: EVAL_TIME.toISOString(), ends_at: null })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 14. Multiple applicable suppressions → all relevant evidence retained.
test("multiple applicable suppressions are all retained as evidence", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5, email: "prospect@example.com" }),
    [
      record({ id: 24, organisation_id: 5, reason: "GLOBAL" }),
      record({ id: 25, email: "prospect@example.com", reason: "CONSENT_WITHDRAWN" }),
    ],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
  if (result.status === "suppressed") {
    assert.equal(result.matches.length, 2);
    assert.deepEqual(
      result.matches.map((m) => m.recordId).sort(),
      [24, 25],
    );
  }
});

// 15. Non-matching identifier → allowed.
test("non-matching identifier → allowed", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [record({ id: 26, organisation_id: 999 })],
    EVAL_TIME,
  );
  assert.equal(result.status, "allowed");
});

// 16. Normalised email comparison.
test("email comparison is case- and whitespace-insensitive", () => {
  const result = evaluateSuppression(
    input({ email: "  Prospect@Example.com  " }),
    [record({ id: 27, email: "prospect@example.com" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 17. Normalised telephone comparison.
test("telephone comparison ignores formatting (spaces, dashes, parentheses)", () => {
  const result = evaluateSuppression(
    input({ telephone: "(01234) 567-890" }),
    [record({ id: 28, telephone: "01234 567890" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 18. Normalised domain comparison.
test("domain comparison strips protocol-less www and trailing slash", () => {
  const result = evaluateSuppression(
    input({ domain: "www.example.com/" }),
    [record({ id: 29, domain: "example.com" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
});

// 19. Empty/unusable evaluation identity must not fabricate a match.
test("completely empty evaluation input never matches, even against a real suppression row", () => {
  const result = evaluateSuppression(input(), [record({ id: 30, organisation_id: 5 })], EVAL_TIME);
  assert.equal(result.status, "allowed");
});

test("a row with no populated identifying columns can never match anything", () => {
  // Guarded at the database layer by suppression_records_has_identifying_scope_check,
  // but the evaluator must not assume the constraint always held historically —
  // it independently refuses to treat a fully-empty row as a match.
  const emptyRow = record({
    id: 31,
    organisation_id: null,
    contact_id: null,
    email: null,
    telephone: null,
    domain: null,
    source_id: null,
    campaign_id: null,
    channel: null,
  });
  const result = evaluateSuppression(input({ organisationId: 5, email: "a@example.com" }), [emptyRow], EVAL_TIME);
  assert.equal(result.status, "allowed");
});

// 20. Pure deterministic function: same input gives same output.
test("is deterministic: identical input produces identical output", () => {
  const candidates = [record({ id: 32, organisation_id: 5 })];
  const evalInput = input({ organisationId: 5 });

  const first = evaluateSuppression(evalInput, candidates, EVAL_TIME);
  const second = evaluateSuppression(evalInput, candidates, EVAL_TIME);

  assert.deepEqual(first, second);
});

// 21. Inputs are not mutated.
test("never mutates its candidates or input arguments", () => {
  const candidates = [record({ id: 33, organisation_id: 5 })];
  const evalInput = input({ organisationId: 5 });
  const candidatesSnapshot = JSON.parse(JSON.stringify(candidates));
  const inputSnapshot = JSON.parse(JSON.stringify(evalInput));

  evaluateSuppression(evalInput, candidates, EVAL_TIME);

  assert.deepEqual(candidates, candidatesSnapshot);
  assert.deepEqual(evalInput, inputSnapshot);
});

// 22. Database read failure must not become `allowed` — covered against
// the composed async function in a separate describe block below, since
// evaluateSuppression() itself (the pure function) has no failure mode:
// it is exercised here only to confirm it truly cannot express failure.
test("the pure evaluator itself has no 'evaluation_failed' path — that only exists on the async composed function", () => {
  const result = evaluateSuppression(input({ organisationId: 5 }), [], EVAL_TIME);
  assert.notEqual(result.status, "evaluation_failed");
});

// Additional edge case: multiple identifying columns on one row must ALL match (AND, not OR).
test("a row with organisation_id AND source_id set requires both to match, not either", () => {
  const row = record({ id: 34, organisation_id: 5, source_id: 100, scope: "SOURCE_SPECIFIC" });

  const bothMatch = evaluateSuppression(input({ organisationId: 5, sourceId: 100 }), [row], EVAL_TIME);
  assert.equal(bothMatch.status, "suppressed");

  const onlyOrgMatches = evaluateSuppression(input({ organisationId: 5, sourceId: 999 }), [row], EVAL_TIME);
  assert.equal(onlyOrgMatches.status, "allowed");

  const onlySourceMatches = evaluateSuppression(input({ organisationId: 999, sourceId: 100 }), [row], EVAL_TIME);
  assert.equal(onlySourceMatches.status, "allowed");
});

// Additional edge case: reason values are preserved exactly, never reinterpreted.
test("stored reason value is preserved verbatim on the match", () => {
  const result = evaluateSuppression(
    input({ organisationId: 5 }),
    [record({ id: 35, organisation_id: 5, reason: "CONSENT_WITHDRAWN", legal_basis: "Article 21 objection" })],
    EVAL_TIME,
  );
  assert.equal(result.status, "suppressed");
  if (result.status === "suppressed") {
    assert.equal(result.matches[0].reason, "CONSENT_WITHDRAWN");
    assert.equal(result.matches[0].legalBasis, "Article 21 objection");
  }
});

// --- Database-read layer (loadSuppressionCandidates / evaluateSuppressionWithLookup) ---
// Mocks the minimum Supabase chain this module actually calls: .from(table).select(cols).or(conditions).
// Matches the hand-built mock-client style already used elsewhere in this codebase
// (e.g. lib/revenue-engine/syncLeadQualification.test.ts) rather than a real connection.

type MockSupabaseResult = { data: SuppressionRecordCandidate[] | null; error: { message: string } | null };

function makeMockSupabase(result: MockSupabaseResult) {
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
    // deliberately no insert/update/delete on this mock — the module under
    // test must never call them; if it tried, this mock would throw.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

test("loadSuppressionCandidates returns success:false on a query error, never an empty-but-successful result", async () => {
  const supabase = makeMockSupabase({ data: null, error: { message: "connection reset" } });
  const result = await loadSuppressionCandidates(supabase, input({ organisationId: 5 }));
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, "connection reset");
  }
});

// 22. Database read failure must not become `allowed`.
test("evaluateSuppressionWithLookup: a database read failure resolves to evaluation_failed, never allowed", async () => {
  const supabase = makeMockSupabase({ data: null, error: { message: "connection reset" } });
  const result = await evaluateSuppressionWithLookup(supabase, input({ organisationId: 5 }), EVAL_TIME);
  assert.equal(result.status, "evaluation_failed");
  assert.notEqual(result.status, "allowed");
});

test("evaluateSuppressionWithLookup: a successful empty query genuinely means allowed", async () => {
  const supabase = makeMockSupabase({ data: [], error: null });
  const result = await evaluateSuppressionWithLookup(supabase, input({ organisationId: 5 }), EVAL_TIME);
  assert.equal(result.status, "allowed");
});

test("evaluateSuppressionWithLookup: a successful query with a matching row resolves to suppressed", async () => {
  const supabase = makeMockSupabase({ data: [record({ id: 40, organisation_id: 5 })], error: null });
  const result = await evaluateSuppressionWithLookup(supabase, input({ organisationId: 5 }), EVAL_TIME);
  assert.equal(result.status, "suppressed");
});

test("loadSuppressionCandidates does not query at all when the input carries no identifier", async () => {
  let queried = false;
  const supabase = {
    from(_table: string) {
      queried = true;
      return { select: () => ({ or: () => Promise.resolve({ data: [], error: null }) }) };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const result = await loadSuppressionCandidates(supabase, input());
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.candidates, []);
  }
  assert.equal(queried, false, "expected no query to be issued for an empty input");
});
