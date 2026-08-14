import assert from "node:assert/strict";
import { test } from "node:test";

import { summarizeActivityRecency } from "./activityRecency.ts";

const TODAY = new Date(2027, 0, 1);

function offsetDateKey(base: Date, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("no activities at all is reported as stale with no last activity date", () => {
  const result = summarizeActivityRecency([], TODAY);
  assert.equal(result.hasActivity, false);
  assert.equal(result.lastActivityDate, null);
  assert.equal(result.daysSinceLastActivity, null);
  assert.equal(result.isRecent, false);
  assert.equal(result.isStale, true);
});

test("an activity logged today is recent, not stale", () => {
  const result = summarizeActivityRecency([{ activity_date: offsetDateKey(TODAY, 0) }], TODAY);
  assert.equal(result.hasActivity, true);
  assert.equal(result.daysSinceLastActivity, 0);
  assert.equal(result.isRecent, true);
  assert.equal(result.isStale, false);
});

test("an activity exactly 14 days ago is still recent (inclusive boundary)", () => {
  const result = summarizeActivityRecency([{ activity_date: offsetDateKey(TODAY, -14) }], TODAY);
  assert.equal(result.daysSinceLastActivity, 14);
  assert.equal(result.isRecent, true);
  assert.equal(result.isStale, false);
});

test("an activity 15 days ago is stale", () => {
  const result = summarizeActivityRecency([{ activity_date: offsetDateKey(TODAY, -15) }], TODAY);
  assert.equal(result.daysSinceLastActivity, 15);
  assert.equal(result.isRecent, false);
  assert.equal(result.isStale, true);
});

test("uses the most recent of several activities, ignoring nulls", () => {
  const result = summarizeActivityRecency(
    [
      { activity_date: offsetDateKey(TODAY, -30) },
      { activity_date: null },
      { activity_date: offsetDateKey(TODAY, -2) },
    ],
    TODAY,
  );
  assert.equal(result.lastActivityDate, offsetDateKey(TODAY, -2));
  assert.equal(result.daysSinceLastActivity, 2);
  assert.equal(result.isRecent, true);
});

test("activities with only null dates are treated the same as no activity", () => {
  const result = summarizeActivityRecency([{ activity_date: null }, { activity_date: null }], TODAY);
  assert.equal(result.hasActivity, true);
  assert.equal(result.lastActivityDate, null);
  assert.equal(result.isStale, true);
});
