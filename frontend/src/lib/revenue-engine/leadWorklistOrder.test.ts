import assert from "node:assert/strict";
import { test } from "node:test";

import { leadWorklistRank } from "./leadWorklistOrder.ts";

test("Hot ranks before Warm, Warm before Nurture, Nurture before unscored, unscored before Reject", () => {
  const ranks = ["Hot", "Warm", "Nurture", null, "Reject"].map((c) => leadWorklistRank(c));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.ok(ranks[0] < ranks[1]);
  assert.ok(ranks[1] < ranks[2]);
  assert.ok(ranks[2] < ranks[3]);
  assert.ok(ranks[3] < ranks[4]);
});

test("null and undefined classification both rank as unscored", () => {
  assert.equal(leadWorklistRank(null), leadWorklistRank(undefined));
});

test("an unrecognised classification string falls back to the unscored rank rather than throwing", () => {
  assert.equal(leadWorklistRank("SomethingUnexpected"), leadWorklistRank(null));
});
