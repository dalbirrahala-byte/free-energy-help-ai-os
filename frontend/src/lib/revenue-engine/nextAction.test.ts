import assert from "node:assert/strict";
import { test } from "node:test";

import { determineNextAction, type NextActionInput } from "./nextAction.ts";
import type { LeadQualificationResult } from "./qualification.ts";
import type { LeadPriorityResult } from "./prioritization.ts";
import type { ActivityRecencySummary } from "./activityRecency.ts";

function makeQualification(overrides: Partial<LeadQualificationResult> = {}): LeadQualificationResult {
  return {
    leadId: 1,
    qualificationLabel: "Qualified",
    criteria: [],
    metCount: 6,
    totalCount: 6,
    explanation: "6 of 6 qualification criteria met.",
    ...overrides,
  };
}

function makePriority(overrides: Partial<LeadPriorityResult> = {}): LeadPriorityResult {
  return {
    leadId: 1,
    priorityScore: 50,
    priorityLabel: "Medium",
    contributingFactors: [],
    missingData: [],
    confidence: "High",
    explanation: "",
    ...overrides,
  };
}

function makeActivityRecency(overrides: Partial<ActivityRecencySummary> = {}): ActivityRecencySummary {
  return {
    hasActivity: true,
    lastActivityDate: "2027-01-01",
    daysSinceLastActivity: 1,
    isRecent: true,
    isStale: false,
    ...overrides,
  };
}

function makeInput(overrides: Partial<NextActionInput> = {}): NextActionInput {
  return {
    qualification: makeQualification(),
    priority: makePriority(),
    activityRecency: makeActivityRecency(),
    status: "New",
    ...overrides,
  };
}

test("Won status always yields No immediate action, regardless of other signals", () => {
  const result = determineNextAction(
    makeInput({ status: "Won", priority: makePriority({ priorityLabel: "Critical" }), activityRecency: makeActivityRecency({ isStale: true, hasActivity: false }) }),
  );
  assert.equal(result.action, "No immediate action");
});

test("Lost status always yields No immediate action", () => {
  const result = determineNextAction(makeInput({ status: "Lost" }));
  assert.equal(result.action, "No immediate action");
});

test("Unqualified lead always yields Request missing information, even if high priority", () => {
  const result = determineNextAction(
    makeInput({
      qualification: makeQualification({ qualificationLabel: "Unqualified", metCount: 1 }),
      priority: makePriority({ priorityLabel: "Critical" }),
    }),
  );
  assert.equal(result.action, "Request missing information");
});

test("qualified lead never contacted yields Call lead", () => {
  const result = determineNextAction(
    makeInput({ activityRecency: makeActivityRecency({ hasActivity: false, lastActivityDate: null, daysSinceLastActivity: null, isRecent: false, isStale: true }) }),
  );
  assert.equal(result.action, "Call lead");
});

test("high priority, stale activity yields Follow up", () => {
  const result = determineNextAction(
    makeInput({
      priority: makePriority({ priorityLabel: "High" }),
      activityRecency: makeActivityRecency({ isStale: true, isRecent: false }),
    }),
  );
  assert.equal(result.action, "Follow up");
});

test("critical priority, recent activity yields Review opportunity", () => {
  const result = determineNextAction(
    makeInput({
      priority: makePriority({ priorityLabel: "Critical" }),
      activityRecency: makeActivityRecency({ isStale: false, isRecent: true }),
    }),
  );
  assert.equal(result.action, "Review opportunity");
});

test("medium priority, stale activity yields Follow up", () => {
  const result = determineNextAction(
    makeInput({
      priority: makePriority({ priorityLabel: "Medium" }),
      activityRecency: makeActivityRecency({ isStale: true, isRecent: false }),
    }),
  );
  assert.equal(result.action, "Follow up");
});

test("qualified, recently actioned, low/medium priority yields No immediate action", () => {
  const result = determineNextAction(
    makeInput({
      priority: makePriority({ priorityLabel: "Low" }),
      activityRecency: makeActivityRecency({ isStale: false, isRecent: true }),
    }),
  );
  assert.equal(result.action, "No immediate action");
});

test("reason text always references the actual evidence, not a generic placeholder", () => {
  const result = determineNextAction(
    makeInput({
      qualification: makeQualification({ qualificationLabel: "Unqualified", metCount: 2, totalCount: 6 }),
    }),
  );
  assert.match(result.reason, /2 of 6/);
});
