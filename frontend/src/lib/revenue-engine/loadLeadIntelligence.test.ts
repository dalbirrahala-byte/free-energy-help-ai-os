import assert from "node:assert/strict";
import { test } from "node:test";

import { buildConvertedLeadIdSet } from "./loadLeadIntelligence.ts";

test("empty customer rows produce an empty set", () => {
  const result = buildConvertedLeadIdSet([]);
  assert.equal(result.size, 0);
});

test("rows with a source_lead_id are added to the set", () => {
  const result = buildConvertedLeadIdSet([{ source_lead_id: 1 }, { source_lead_id: 2 }]);
  assert.deepEqual(Array.from(result).sort(), [1, 2]);
});

test("rows with a null source_lead_id (organic customers, not converted from a lead) are excluded", () => {
  const result = buildConvertedLeadIdSet([{ source_lead_id: 1 }, { source_lead_id: null }, { source_lead_id: 3 }]);
  assert.deepEqual(Array.from(result).sort(), [1, 3]);
});

test("duplicate source_lead_id values are deduplicated", () => {
  const result = buildConvertedLeadIdSet([{ source_lead_id: 5 }, { source_lead_id: 5 }]);
  assert.equal(result.size, 1);
  assert.ok(result.has(5));
});

test("all-null input produces an empty set, not an error", () => {
  const result = buildConvertedLeadIdSet([{ source_lead_id: null }, { source_lead_id: null }]);
  assert.equal(result.size, 0);
});
