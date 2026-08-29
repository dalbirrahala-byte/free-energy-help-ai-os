import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyRenewalActionUrgency,
  countOverdueTasks,
  renewalActionSuggestedNextAction,
} from "./analytics.ts";

test("classifyRenewalActionUrgency: null days classifies as Data gap", () => {
  assert.equal(classifyRenewalActionUrgency(null), "Data gap");
});

test("classifyRenewalActionUrgency: negative days classifies as Overdue", () => {
  assert.equal(classifyRenewalActionUrgency(-1), "Overdue");
});

test("classifyRenewalActionUrgency: 0 days classifies as Critical", () => {
  assert.equal(classifyRenewalActionUrgency(0), "Critical");
});

test("classifyRenewalActionUrgency: 30 days classifies as Critical (upper boundary)", () => {
  assert.equal(classifyRenewalActionUrgency(30), "Critical");
});

test("classifyRenewalActionUrgency: 31 days classifies as Priority (lower boundary)", () => {
  assert.equal(classifyRenewalActionUrgency(31), "Priority");
});

test("classifyRenewalActionUrgency: 60 days classifies as Priority (upper boundary)", () => {
  assert.equal(classifyRenewalActionUrgency(60), "Priority");
});

test("classifyRenewalActionUrgency: 61 days classifies as Upcoming (lower boundary)", () => {
  assert.equal(classifyRenewalActionUrgency(61), "Upcoming");
});

test("classifyRenewalActionUrgency: 90 days classifies as Upcoming (upper boundary)", () => {
  assert.equal(classifyRenewalActionUrgency(90), "Upcoming");
});

test("classifyRenewalActionUrgency: 91 days classifies as Future (lower boundary)", () => {
  assert.equal(classifyRenewalActionUrgency(91), "Future");
});

test("renewalActionSuggestedNextAction: returns deterministic non-empty guidance for every urgency tier", () => {
  const urgencies = [
    "Overdue",
    "Critical",
    "Priority",
    "Upcoming",
    "Future",
    "Data gap",
  ] as const;

  for (const urgency of urgencies) {
    const action = renewalActionSuggestedNextAction(urgency);
    assert.ok(action.length > 0, `expected non-empty action for ${urgency}`);
  }
});

test("renewalActionSuggestedNextAction: wording never implies authorization or execution", () => {
  const urgencies = [
    "Overdue",
    "Critical",
    "Priority",
    "Upcoming",
    "Future",
    "Data gap",
  ] as const;

  const bannedTerms = ["send", "call now", "dial", "execute", "authorize", "approve contact"];

  for (const urgency of urgencies) {
    const action = renewalActionSuggestedNextAction(urgency).toLowerCase();
    for (const term of bannedTerms) {
      assert.ok(
        !action.includes(term),
        `expected "${term}" to be absent from suggested action for ${urgency}`,
      );
    }
  }
});

test("countOverdueTasks: counts only past-due, non-completed tasks", () => {
  const past = "2000-01-01";
  const future = "2999-01-01";

  const tasks = [
    { status: "Open", due_date: past },
    { status: "Completed", due_date: past },
    { status: "done", due_date: past },
    { status: "Open", due_date: future },
    { status: "Open", due_date: null },
  ];

  assert.equal(countOverdueTasks(tasks), 1);
});

test("countOverdueTasks: returns 0 for an empty task list", () => {
  assert.equal(countOverdueTasks([]), 0);
});
