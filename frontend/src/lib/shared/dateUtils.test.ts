import assert from "node:assert/strict";
import { test } from "node:test";

import { addDays, daysUntil, formatDateEnGB, mostRecentDate, toDateKey } from "./dateUtils.ts";

const TODAY = new Date(2027, 0, 1);

test("daysUntil: null for missing date", () => {
  assert.equal(daysUntil(null, TODAY), null);
});

test("daysUntil: null for invalid date", () => {
  assert.equal(daysUntil("not-a-date", TODAY), null);
});

test("daysUntil: positive for a future date", () => {
  assert.equal(daysUntil("2027-01-11", TODAY), 10);
});

test("daysUntil: negative for a past date", () => {
  assert.equal(daysUntil("2026-12-22", TODAY), -10);
});

test("daysUntil: zero for today", () => {
  assert.equal(daysUntil("2027-01-01", TODAY), 0);
});

test("addDays: adds calendar days correctly, including month rollover", () => {
  const result = addDays(new Date(2027, 0, 30), 5);
  assert.equal(toDateKey(result), "2027-02-04");
});

test("toDateKey: formats using local calendar fields", () => {
  assert.equal(toDateKey(new Date(2027, 1, 4)), "2027-02-04");
});

test("formatDateEnGB: formats as DD Mon YYYY", () => {
  assert.equal(formatDateEnGB(new Date(2027, 1, 4)), "04 Feb 2027");
});

test("mostRecentDate: returns the lexicographically greatest key", () => {
  assert.equal(mostRecentDate(["2027-01-01", "2027-03-15", "2026-12-01"]), "2027-03-15");
});

test("mostRecentDate: ignores nulls", () => {
  assert.equal(mostRecentDate([null, "2027-01-01", null]), "2027-01-01");
});

test("mostRecentDate: null when every entry is null or the array is empty", () => {
  assert.equal(mostRecentDate([null, null]), null);
  assert.equal(mostRecentDate([]), null);
});
