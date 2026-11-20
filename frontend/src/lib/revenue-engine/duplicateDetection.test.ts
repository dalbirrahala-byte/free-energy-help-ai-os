import assert from "node:assert/strict";
import { test } from "node:test";

import { createServerClient } from "@supabase/ssr";

import { findPotentialDuplicateLeads, loadPotentialDuplicateLeads, type DuplicateCandidateRow } from "./duplicateDetection.ts";

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
    [candidate({ id: 1, email: "a@example.com" }), candidate({ id: "1", email: "a@example.com" })],
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

test("the duplicate loader keeps adjacent bigint matches distinct and in numeric order", async () => {
  const ids = ["9007199254740993", "10", "9007199254740992", "2"];
  const queries: URL[] = [];
  const client = createServerClient("https://fixture.invalid", "synthetic-only", {
    cookies: { getAll: () => [], setAll: () => {} },
    global: { fetch: async (input, init) => {
      assert.equal(init?.method, "GET");
      const url = new URL(String(input));
      queries.push(url);
      const exact = url.searchParams.get("select")?.split(",").includes("id:id::text");
      const rows = ids.map(id => ({
        ...candidate({ email: "match@example.invalid" }),
        id: exact ? id : Number(id),
        company_name: `Synthetic ${id}`,
      }));
      return Response.json(rows);
    } },
  });
  const matches = await loadPotentialDuplicateLeads(client, {
    id: 42, email: "match@example.invalid", telephone: null,
  });
  await assert.rejects(loadPotentialDuplicateLeads(client, {
    id: Number("9007199254740993"), email: "match@example.invalid", telephone: null,
  }), RangeError);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].pathname, "/rest/v1/leads");
  assert.equal(queries[0].searchParams.get("id"), "neq.42");
  assert.deepEqual(matches.map(match => [String(match.id), match.companyName]), [
    ["2", "Synthetic 2"], ["10", "Synthetic 10"],
    ["9007199254740992", "Synthetic 9007199254740992"],
    ["9007199254740993", "Synthetic 9007199254740993"],
  ]);
});
