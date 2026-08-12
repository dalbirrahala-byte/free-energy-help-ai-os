import assert from "node:assert/strict";
import { test } from "node:test";

import { findPotentialDuplicateLeads, type DuplicateCandidateRow } from "./duplicateDetection.ts";

function candidate(overrides: Partial<DuplicateCandidateRow> = {}): DuplicateCandidateRow {
  return {
    id: 2,
    company_name: "Other Co",
    email: "other@example.com",
    telephone: "01234 000000",
    created_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

test("no matches when neither email nor telephone is set on the current lead", () => {
  const result = findPotentialDuplicateLeads({ id: 1, email: null, telephone: null }, [candidate()]);
  assert.deepEqual(result, []);
});

test("no matches when the candidate list is empty", () => {
  const result = findPotentialDuplicateLeads({ id: 1, email: "a@example.com", telephone: null }, []);
  assert.deepEqual(result, []);
});

test("matches on email, case- and whitespace-insensitive", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: "  Test@Example.com  ", telephone: null },
    [candidate({ id: 2, email: "test@example.com" })],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
  assert.deepEqual(result[0].matchedOn, ["email"]);
});

test("matches on telephone regardless of formatting (spaces, dashes, parentheses)", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: null, telephone: "01234-567 890" },
    [candidate({ id: 2, email: null, telephone: "(01234) 567890" })],
  );
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].matchedOn, ["telephone"]);
});

test("reports both fields when email and telephone both match the same candidate", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: "a@example.com", telephone: "01234567890" },
    [candidate({ id: 2, email: "a@example.com", telephone: "01234567890" })],
  );
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].matchedOn.sort(), ["email", "telephone"]);
});

test("a lead is never reported as its own duplicate, even if the candidate list includes it", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: "a@example.com", telephone: null },
    [candidate({ id: 1, email: "a@example.com" })],
  );
  assert.deepEqual(result, []);
});

test("telephone strings under 10 digits never match (mirrors ingest_public_lead's own minimum)", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: null, telephone: "12345" },
    [candidate({ id: 2, email: null, telephone: "12345" })],
  );
  assert.deepEqual(result, []);
});

test("two independent candidates can both match, sorted by id", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: "a@example.com", telephone: null },
    [candidate({ id: 5, email: "a@example.com" }), candidate({ id: 3, email: "a@example.com" })],
  );
  assert.deepEqual(
    result.map((m) => m.id),
    [3, 5],
  );
});

test("null email/telephone on a candidate never matches null-normalised input", () => {
  const result = findPotentialDuplicateLeads(
    { id: 1, email: "a@example.com", telephone: "01234567890" },
    [candidate({ id: 2, email: null, telephone: null })],
  );
  assert.deepEqual(result, []);
});
