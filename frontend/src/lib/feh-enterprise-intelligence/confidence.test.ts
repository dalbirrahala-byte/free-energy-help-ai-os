import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateConfidence } from "./confidence.ts";
import type { EvidenceItem } from "./types";

function evidenceItem(available: boolean): EvidenceItem {
  return { field: "x", label: "X", available, value: available ? "y" : null, source: "test" };
}

test("calculateConfidence: no evidence is Insufficient", () => {
  const result = calculateConfidence([]);
  assert.equal(result.level, "Insufficient");
  assert.equal(result.evidenceTotal, 0);
});

test("calculateConfidence: 100% available is High", () => {
  const result = calculateConfidence([evidenceItem(true), evidenceItem(true)]);
  assert.equal(result.level, "High");
  assert.equal(result.evidenceAvailable, 2);
  assert.equal(result.evidenceTotal, 2);
});

test("calculateConfidence: 80% available is High (boundary)", () => {
  const result = calculateConfidence([evidenceItem(true), evidenceItem(true), evidenceItem(true), evidenceItem(true), evidenceItem(false)]);
  assert.equal(result.level, "High");
});

test("calculateConfidence: 50% available is Medium (boundary)", () => {
  const result = calculateConfidence([evidenceItem(true), evidenceItem(false)]);
  assert.equal(result.level, "Medium");
});

test("calculateConfidence: below 50% is Low", () => {
  const result = calculateConfidence([evidenceItem(true), evidenceItem(false), evidenceItem(false)]);
  assert.equal(result.level, "Low");
});

test("calculateConfidence: 0% available is Low, not Insufficient (evidence was evaluated, just all missing)", () => {
  const result = calculateConfidence([evidenceItem(false), evidenceItem(false)]);
  assert.equal(result.level, "Low");
  assert.equal(result.evidenceAvailable, 0);
});

test("calculateConfidence: explanation is a plain sentence, never a bare percentage", () => {
  const result = calculateConfidence([evidenceItem(true)]);
  assert.match(result.explanation, /of 1 evidence items available/);
});
