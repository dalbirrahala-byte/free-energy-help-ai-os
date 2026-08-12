import assert from "node:assert/strict";
import { test } from "node:test";

import type { LeadPriorityResult } from "./prioritization.ts";
import { deriveRoutingRecommendation } from "./routingRecommendation.ts";

function makeResult(overrides: Partial<LeadPriorityResult> = {}): LeadPriorityResult {
  return {
    leadId: 1,
    priorityScore: 90,
    priorityLabel: "Critical",
    contributingFactors: [],
    missingData: [],
    confidence: "High",
    explanation: "Priority driven primarily by critical renewal urgency.",
    ...overrides,
  };
}

test("Critical priority recommends immediate human follow-up", () => {
  const result = deriveRoutingRecommendation(makeResult({ priorityLabel: "Critical" }));
  assert.equal(result.recommendation, "Immediate human follow-up");
});

test("High priority recommends priority follow-up this week", () => {
  const result = deriveRoutingRecommendation(makeResult({ priorityLabel: "High" }));
  assert.equal(result.recommendation, "Priority follow-up this week");
});

test("Medium priority recommends standard follow-up", () => {
  const result = deriveRoutingRecommendation(makeResult({ priorityLabel: "Medium" }));
  assert.equal(result.recommendation, "Standard follow-up");
});

test("Low priority with complete data recommends monitoring, not a data-gap warning", () => {
  const result = deriveRoutingRecommendation(
    makeResult({ priorityLabel: "Low", missingData: [], confidence: "High" }),
  );
  assert.equal(result.recommendation, "Monitor — low urgency");
});

test("Low priority driven by missing data recommends confirming details instead of a confident monitor verdict", () => {
  const result = deriveRoutingRecommendation(
    makeResult({ priorityLabel: "Low", missingData: ["Contract end date"], confidence: "Medium" }),
  );
  assert.equal(result.recommendation, "Confirm missing details before follow-up");
  assert.match(result.reason, /Contract end date/);
});

test("reason text reuses the priority result's own explanation for Critical/High/Medium (no new logic invented)", () => {
  const explanation = "Priority driven primarily by overdue renewal urgency (0 days remaining).";
  const result = deriveRoutingRecommendation(makeResult({ priorityLabel: "Critical", explanation }));
  assert.equal(result.reason, explanation);
});

test("recommendation never includes an automated action verb (email/sms/call/voice)", () => {
  const labels: LeadPriorityResult["priorityLabel"][] = ["Critical", "High", "Medium", "Low"];
  const forbidden = /\b(email|sms|call|voice|whatsapp|send)\b/i;

  for (const priorityLabel of labels) {
    const result = deriveRoutingRecommendation(makeResult({ priorityLabel, missingData: [] }));
    assert.doesNotMatch(result.recommendation, forbidden);
  }
});

test("is a pure function: calling it twice with identical input yields identical output", () => {
  const input = makeResult({ priorityLabel: "High" });
  const first = deriveRoutingRecommendation(input);
  const second = deriveRoutingRecommendation(input);
  assert.deepEqual(first, second);
});
