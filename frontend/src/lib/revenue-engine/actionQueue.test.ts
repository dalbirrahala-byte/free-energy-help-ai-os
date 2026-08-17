import assert from "node:assert/strict";
import { test } from "node:test";

import { buildActionQueue, summarizeTasksByLead, type ActionQueueLeadInput } from "./actionQueue.ts";
import type { LeadRevenueView } from "./leadRevenueView.ts";
import type { QualificationCriterion } from "./qualification.ts";
import type { PriorityFactor } from "./prioritization.ts";

const ALL_CRITERIA_MET: QualificationCriterion[] = [
  { criterion: "Contact details present", met: true, detail: "Contact name and at least one contact method on file." },
  { criterion: "Business identified", met: true, detail: "Company name on file." },
  { criterion: "Energy requirement present", met: true, detail: "Current supplier on file: Octopus." },
  { criterion: "Renewal timing known", met: true, detail: "Contract end date on file." },
  { criterion: "Source known", met: true, detail: "Lead source on file: Website." },
  { criterion: "Recent activity recorded", met: true, detail: "Activity logged within the last 14 days." },
];

function makeView(overrides: { priorityFactors?: PriorityFactor[]; priorityScore?: number } = {}): LeadRevenueView {
  const contributingFactors: PriorityFactor[] = overrides.priorityFactors ?? [
    { factor: "Renewal urgency", weight: 0.6, value: 15, contribution: 9, explanation: "Renewal is Future." },
    { factor: "Data completeness", weight: 0.25, value: 100, contribution: 25, explanation: "All key fields present." },
    { factor: "Source quality", weight: 0.15, value: 50, contribution: 8, explanation: "Neutral score applied." },
  ];

  return {
    leadId: 0,
    qualification: {
      leadId: 0,
      readinessLabel: "Fully Ready",
      criteria: ALL_CRITERIA_MET,
      metCount: 6,
      totalCount: 6,
      explanation: "6 of 6 qualification criteria met.",
    },
    priority: {
      leadId: 0,
      priorityScore: overrides.priorityScore ?? 42,
      priorityLabel: "Medium",
      contributingFactors,
      missingData: [],
      confidence: "High",
      explanation: "Priority driven primarily by future renewal urgency, data completeness, and source quality.",
    },
    activityRecency: {
      hasActivity: true,
      lastActivityDate: "2027-01-01",
      daysSinceLastActivity: 3,
      isRecent: true,
      isStale: false,
    },
    nextAction: {
      action: "Follow up",
      reason: "No activity has been logged within the last 14 days.",
    },
  };
}

function makeLead(overrides: Partial<ActionQueueLeadInput> = {}): ActionQueueLeadInput {
  return {
    id: 1,
    company_name: "Test Co",
    contact_name: "Test Contact",
    status: "New",
    qualification_classification: "Warm",
    qualification_score: 50,
    qualification_reasons: [],
    ...overrides,
  };
}

test("a Hot lead with real revenue-view data appears in 'actionable' with a real Recommended Action", () => {
  const lead = makeLead({
    id: 1,
    qualification_classification: "Hot",
    status: "New",
  });
  const view = makeView({
    priorityFactors: [{ factor: "Renewal urgency", weight: 0.6, value: 100, contribution: 60, explanation: "Renewal is Overdue." }],
  });

  const queue = buildActionQueue([lead], { 1: view }, {});

  assert.equal(queue.actionable.length, 1);
  assert.equal(queue.unscored.length, 0);
  assert.equal(queue.rejected.length, 0);
  assert.equal(queue.actionable[0].recommendation?.action, "Call now — priority contact");
});

test("a Reject-classified lead is placed in 'rejected', never in 'actionable', and never carries an actionable recommendation", () => {
  const lead = makeLead({
    id: 2,
    qualification_classification: "Reject",
    qualification_reasons: [{ factor: "Reject reason", detail: "No valid email or telephone on file — lead cannot be contacted." }],
  });

  const queue = buildActionQueue([lead], { 2: makeView() }, {});

  assert.equal(queue.rejected.length, 1);
  assert.equal(queue.actionable.length, 0);
  assert.equal(queue.rejected[0].recommendation?.action, "Rejected — no sales action");
  assert.match(queue.rejected[0].recommendation?.reason ?? "", /cannot be contacted/);
});

test("a lead with no persisted classification is placed in 'unscored' with recommendation null — never a fabricated recommendation", () => {
  const lead = makeLead({ id: 3, qualification_classification: null, qualification_score: null });

  const queue = buildActionQueue([lead], {}, {});

  assert.equal(queue.unscored.length, 1);
  assert.equal(queue.unscored[0].recommendation, null);
  assert.equal(queue.actionable.length, 0);
  assert.equal(queue.rejected.length, 0);
});

test("a lead with a persisted classification but no matching revenue view is treated as unscored, not guessed", () => {
  const lead = makeLead({ id: 4, qualification_classification: "Hot" });

  const queue = buildActionQueue([lead], {}, {});

  assert.equal(queue.unscored.length, 1);
  assert.equal(queue.unscored[0].recommendation, null);
});

test("actionable leads are ordered Hot before Warm before Nurture, matching the Leads list worklist order", () => {
  const leads = [
    makeLead({ id: 10, qualification_classification: "Nurture" }),
    makeLead({ id: 11, qualification_classification: "Hot" }),
    makeLead({ id: 12, qualification_classification: "Warm" }),
  ];
  const revenueViews = { 10: makeView(), 11: makeView(), 12: makeView() };

  const queue = buildActionQueue(leads, revenueViews, {});

  assert.deepEqual(
    queue.actionable.map((item) => item.classification),
    ["Hot", "Warm", "Nurture"],
  );
});

test("within the same classification, higher priority score sorts first; ties break by leadId ascending (deterministic)", () => {
  const leads = [
    makeLead({ id: 21, qualification_classification: "Warm", qualification_score: 40 }),
    makeLead({ id: 20, qualification_classification: "Warm", qualification_score: 40 }),
    makeLead({ id: 22, qualification_classification: "Warm", qualification_score: 90 }),
  ];
  const revenueViews = {
    21: makeView({ priorityScore: 40 }),
    20: makeView({ priorityScore: 40 }),
    22: makeView({ priorityScore: 90 }),
  };

  const queue = buildActionQueue(leads, revenueViews, {});

  assert.deepEqual(
    queue.actionable.map((item) => item.leadId),
    [22, 20, 21],
  );
});

test("calling buildActionQueue twice with identical input produces identical ordering and recommendations (deterministic)", () => {
  const leads = [
    makeLead({ id: 30, qualification_classification: "Hot" }),
    makeLead({ id: 31, qualification_classification: "Warm" }),
  ];
  const revenueViews = { 30: makeView(), 31: makeView() };

  const first = buildActionQueue(leads, revenueViews, {});
  const second = buildActionQueue(leads, revenueViews, {});

  assert.deepEqual(first, second);
});

test("summarizeTasksByLead counts Open and other-non-Completed statuses as open, Completed as completed, and picks the earliest open due date", () => {
  const summary = summarizeTasksByLead([
    { lead_id: 1, status: "Open", due_date: "2027-02-10" },
    { lead_id: 1, status: "Open", due_date: "2027-01-05" },
    { lead_id: 1, status: "Completed", due_date: "2026-12-01" },
    { lead_id: 1, status: "Cancelled", due_date: null },
  ]);

  assert.equal(summary[1].openCount, 2);
  assert.equal(summary[1].completedCount, 1);
  assert.equal(summary[1].nextDueDate, "2027-01-05");
});

test("summarizeTasksByLead ignores rows with a null lead_id rather than crashing or miscounting", () => {
  const summary = summarizeTasksByLead([{ lead_id: null, status: "Open", due_date: "2027-01-01" }]);
  assert.deepEqual(summary, {});
});

test("a lead with zero tasks gets an honest empty task summary, not a fabricated 'contacted' or 'no contact' state", () => {
  const lead = makeLead({ id: 5, qualification_classification: "Warm" });
  const queue = buildActionQueue([lead], { 5: makeView() }, {});

  assert.deepEqual(queue.actionable[0].tasks, { openCount: 0, completedCount: 0, nextDueDate: null });
});

test("the queue output never contains a fabricated communication state (dispatched/delivered/contacted/failed/replied)", () => {
  const leads = [
    makeLead({ id: 40, qualification_classification: "Hot" }),
    makeLead({ id: 41, qualification_classification: "Reject", qualification_reasons: [{ factor: "Reject reason", detail: "No valid email or telephone on file." }] }),
    makeLead({ id: 42, qualification_classification: null }),
  ];
  const revenueViews = { 40: makeView(), 41: makeView() };
  const tasksByLead = summarizeTasksByLead([{ lead_id: 40, status: "Open", due_date: "2027-01-01" }]);

  const queue = buildActionQueue(leads, revenueViews, tasksByLead);
  const serialized = JSON.stringify(queue).toLowerCase();

  for (const forbidden of ["dispatched", "delivered", "\"contacted\"", "failed", "replied"]) {
    assert.equal(serialized.includes(forbidden), false, `queue output unexpectedly contains "${forbidden}"`);
  }
});

test("missing/partial lead data (no company name, no contact name) never throws and still produces a queue item", () => {
  const lead = makeLead({ id: 50, company_name: null, contact_name: null, qualification_classification: "Nurture" });

  assert.doesNotThrow(() => buildActionQueue([lead], { 50: makeView() }, {}));
  const queue = buildActionQueue([lead], { 50: makeView() }, {});
  assert.equal(queue.actionable[0].companyName, null);
  assert.equal(queue.actionable[0].contactName, null);
});

test("qualification_reasons in a shape other than an array of {factor, detail} degrades to null reject reason rather than throwing", () => {
  const lead = makeLead({ id: 60, qualification_classification: "Reject", qualification_reasons: "not-an-array" });

  assert.doesNotThrow(() => buildActionQueue([lead], { 60: makeView() }, {}));
  const queue = buildActionQueue([lead], { 60: makeView() }, {});
  assert.equal(queue.rejected[0].recommendation?.action, "Rejected — no sales action");
});

// --- Factory 037: eligibility (reuses Factory 031's evaluateActionEligibility unchanged) ---

test("eligibility is computed for an actionable item using a direct-response action, independent of consent", () => {
  const lead = makeLead({ id: 70, qualification_classification: "Hot", consent_given: undefined });
  const view = makeView({ priorityFactors: [{ factor: "Renewal urgency", weight: 0.6, value: 100, contribution: 60, explanation: "Overdue." }] });

  const queue = buildActionQueue([lead], { 70: view }, {});

  assert.equal(queue.actionable[0].recommendation?.action, "Call now — priority contact");
  assert.equal(queue.actionable[0].eligibility?.eligible, true);
  assert.equal(queue.actionable[0].eligibility?.basis, "direct-response-allowed");
});

test("eligibility is null for an unscored item — nothing to evaluate yet", () => {
  const lead = makeLead({ id: 71, qualification_classification: null });

  const queue = buildActionQueue([lead], {}, {});

  assert.equal(queue.unscored[0].recommendation, null);
  assert.equal(queue.unscored[0].eligibility, null);
});

test("a marketing-classified recommendation without consent still appears in the actionable queue (never hidden), with eligibility.eligible false", () => {
  const lead = makeLead({ id: 72, qualification_classification: "Warm", consent_given: false });
  const view = makeView(); // default priorityFactors -> renewal urgency 15 (< 40) -> Warm resolves to "Nurture — follow-up later"

  const queue = buildActionQueue([lead], { 72: view }, {});

  assert.equal(queue.actionable[0].recommendation?.action, "Nurture — follow-up later");
  assert.equal(queue.actionable[0].eligibility?.eligible, false);
  assert.equal(queue.actionable[0].eligibility?.basis, "marketing-consent-missing");
});

test("the same marketing-classified recommendation WITH consent on file is eligible", () => {
  const lead = makeLead({ id: 73, qualification_classification: "Warm", consent_given: true });
  const view = makeView();

  const queue = buildActionQueue([lead], { 73: view }, {});

  assert.equal(queue.actionable[0].recommendation?.action, "Nurture — follow-up later");
  assert.equal(queue.actionable[0].eligibility?.eligible, true);
  assert.equal(queue.actionable[0].eligibility?.basis, "marketing-allowed");
});

test("a Reject-classified lead's eligibility is also computed (not left null), and is always ineligible with basis 'rejected' — reused from Factory 031, never re-implemented", () => {
  const lead = makeLead({ id: 74, qualification_classification: "Reject", consent_given: true });

  const queue = buildActionQueue([lead], { 74: makeView() }, {});

  assert.notEqual(queue.rejected[0].eligibility, null);
  assert.equal(queue.rejected[0].eligibility?.eligible, false);
  assert.equal(queue.rejected[0].eligibility?.basis, "rejected");
});

test("a lead with no consent_given field at all (undefined, matching every pre-Factory-037 fixture) never throws", () => {
  const lead = makeLead({ id: 75, qualification_classification: "Warm" });
  assert.doesNotThrow(() => buildActionQueue([lead], { 75: makeView() }, {}));
});
