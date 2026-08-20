import assert from "node:assert/strict";
import { test } from "node:test";

import { matchOrganisationCandidates, type OrganisationCandidateRow, type SignalMatchInput } from "./organisationMatching.ts";

function candidate(overrides: Partial<OrganisationCandidateRow> = {}): OrganisationCandidateRow {
  return {
    id: 1,
    legal_name: "Acme Widgets Limited",
    trading_name: "Acme Widgets",
    company_number: "01234567",
    domain: "acmewidgets.co.uk",
    ...overrides,
  };
}

function hints(overrides: Partial<SignalMatchInput> = {}): SignalMatchInput {
  return {
    companyNumberHint: null,
    domainHint: null,
    organisationNameHint: null,
    ...overrides,
  };
}

test("returns empty array when the signal carries no hints at all", () => {
  const result = matchOrganisationCandidates(hints(), [candidate()]);
  assert.deepEqual(result, []);
});

test("returns empty array when the candidate list is empty", () => {
  const result = matchOrganisationCandidates(hints({ domainHint: "acmewidgets.co.uk" }), []);
  assert.deepEqual(result, []);
});

test("returns empty array when nothing matches any candidate", () => {
  const result = matchOrganisationCandidates(
    hints({ companyNumberHint: "99999999", domainHint: "unrelated.com", organisationNameHint: "Totally Different Co" }),
    [candidate()],
  );
  assert.deepEqual(result, []);
});

test("exact company number match is classified deterministic, regardless of formatting", () => {
  const result = matchOrganisationCandidates(
    hints({ companyNumberHint: "01 234-567" }),
    [candidate({ company_number: "01234567" })],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].matchTier, "deterministic");
  assert.equal(result[0].organisationId, 1);
  assert.ok(result[0].evidence.some((e) => e.factor === "Company number"));
});

test("exact domain match (no company number hint) is classified high_confidence", () => {
  const result = matchOrganisationCandidates(
    hints({ domainHint: "www.acmewidgets.co.uk/" }),
    [candidate()],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].matchTier, "high_confidence");
  assert.ok(result[0].evidence.some((e) => e.factor === "Domain"));
});

test("exact name match only (no company number or domain hint) is classified ambiguous", () => {
  const result = matchOrganisationCandidates(
    hints({ organisationNameHint: "  ACME   Widgets  " }),
    [candidate()],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].matchTier, "ambiguous");
  assert.ok(result[0].evidence.some((e) => e.factor === "Organisation name"));
});

test("name hint matches against trading_name as well as legal_name", () => {
  const result = matchOrganisationCandidates(
    hints({ organisationNameHint: "Acme Widgets Limited" }),
    [candidate()],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].matchTier, "ambiguous");
});

test("multiple matching factors on the same candidate combine into a higher confidence, tier stays the strongest evidence found", () => {
  const result = matchOrganisationCandidates(
    hints({ companyNumberHint: "01234567", domainHint: "acmewidgets.co.uk", organisationNameHint: "Acme Widgets" }),
    [candidate()],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].matchTier, "deterministic");
  // Raw factor points (60 + 30 + 15 = 105) exceed MAX_CONFIDENCE and are
  // capped to 100 — see the dedicated cap test below for that behaviour.
  assert.equal(result[0].matchConfidence, 100);
  assert.equal(result[0].evidence.length, 3);
});

test("confidence is capped at 100 even if factor points would exceed it", () => {
  // Not reachable with the current three-factor weighting (60+30+15=105 is
  // the real maximum), so this test locks in the cap behaviour explicitly.
  const result = matchOrganisationCandidates(
    hints({ companyNumberHint: "01234567", domainHint: "acmewidgets.co.uk", organisationNameHint: "Acme Widgets" }),
    [candidate()],
  );
  assert.ok(result[0].matchConfidence <= 100);
});

test("multiple candidates: only genuinely matching ones are returned, sorted by confidence descending", () => {
  const strong = candidate({ id: 1, company_number: "01234567", domain: "acmewidgets.co.uk" });
  const weak = candidate({ id: 2, legal_name: "Acme Widgets", trading_name: "Acme Widgets", company_number: "99999999", domain: "different.com" });
  const noMatch = candidate({ id: 3, legal_name: "Unrelated Co", trading_name: "Unrelated", company_number: "11111111", domain: "unrelated.com" });

  const result = matchOrganisationCandidates(
    hints({ companyNumberHint: "01234567", organisationNameHint: "Acme Widgets" }),
    [weak, noMatch, strong],
  );

  assert.equal(result.length, 2);
  assert.equal(result[0].organisationId, 1);
  assert.equal(result[1].organisationId, 2);
  assert.ok(result[0].matchConfidence > result[1].matchConfidence);
});

test("equal-confidence candidates are tie-broken by ascending organisationId, deterministically", () => {
  const a = candidate({ id: 5, legal_name: "Acme Widgets", trading_name: "Acme Widgets", company_number: null, domain: null });
  const b = candidate({ id: 2, legal_name: "Acme Widgets", trading_name: "Acme Widgets", company_number: null, domain: null });

  const result = matchOrganisationCandidates(hints({ organisationNameHint: "Acme Widgets" }), [a, b]);

  assert.equal(result.length, 2);
  assert.equal(result[0].organisationId, 2);
  assert.equal(result[1].organisationId, 5);
});

test("is a pure function: identical input produces identical output, input arrays are never mutated", () => {
  const candidates = [candidate({ id: 1 }), candidate({ id: 2, domain: "other.com" })];
  const input = hints({ domainHint: "acmewidgets.co.uk" });
  const snapshotBefore = JSON.parse(JSON.stringify(candidates));

  const first = matchOrganisationCandidates(input, candidates);
  const second = matchOrganisationCandidates(input, candidates);

  assert.deepEqual(first, second);
  assert.deepEqual(candidates, snapshotBefore);
});

test("never returns a result for a candidate with entirely null identity fields", () => {
  const result = matchOrganisationCandidates(
    hints({ companyNumberHint: "01234567", domainHint: "acmewidgets.co.uk", organisationNameHint: "Acme Widgets" }),
    [candidate({ id: 9, legal_name: null, trading_name: null, company_number: null, domain: null })],
  );
  assert.deepEqual(result, []);
});
