import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyRenewalWorkflowLane,
  compareRenewalWorkflowPriority,
  parseRenewalWorkflowLaneFilter,
  renewalWorkflowLaneMatchesFilter,
  renewalWorkflowNextStep,
  renewalWorkflowReason,
} from "./renewal-workflow.ts";

test("next-step guidance uses a deterministic fail-safe precedence", () => {
  const cases = [
    {
      input: { urgency: "Critical" as const, daysUntilEnd: 10, openTaskCount: 2, overdueTaskCount: 1, dataGapCount: 2 },
      lane: "Action now" as const,
      action: "Review overdue tasks",
    },
    {
      input: { urgency: "Data gap" as const, daysUntilEnd: null, openTaskCount: 0, overdueTaskCount: 0, dataGapCount: 1 },
      lane: "Complete data" as const,
      action: "Complete missing CRM data",
    },
    {
      input: { urgency: "Upcoming" as const, daysUntilEnd: 75, openTaskCount: 2, overdueTaskCount: 0, dataGapCount: 0 },
      lane: "Prepare" as const,
      action: "Review open tasks",
    },
    {
      input: { urgency: "Priority" as const, daysUntilEnd: 45, openTaskCount: 0, overdueTaskCount: 0, dataGapCount: 0 },
      lane: "Prepare" as const,
      action: "Prepare renewal review",
    },
    {
      input: { urgency: "Future" as const, daysUntilEnd: 180, openTaskCount: 0, overdueTaskCount: 0, dataGapCount: 0 },
      lane: "Monitor" as const,
      action: "Monitor renewal timing",
    },
  ];

  for (const { input, lane, action } of cases) {
    const guidance = renewalWorkflowNextStep(input, lane);
    assert.equal(guidance.action, action);
    assert.ok(guidance.reason.length > 0);
  }
});

test("next-step guidance never presents workflow state as contact authority", () => {
  const guidance = renewalWorkflowNextStep(
    { urgency: "Critical", daysUntilEnd: 5, openTaskCount: 0, overdueTaskCount: 0, dataGapCount: 0 },
    "Action now",
  );
  const text = `${guidance.action} ${guidance.reason}`.toLowerCase();

  for (const term of ["contact customer", "send", "call", "authorize", "permission"]) {
    assert.ok(!text.includes(term), `expected "${term}" to be absent`);
  }
});

test("lane filters accept only known single values and fail safely to all", () => {
  assert.equal(parseRenewalWorkflowLaneFilter("action-now"), "action-now");
  assert.equal(parseRenewalWorkflowLaneFilter(["prepare", "monitor"]), "prepare");
  assert.equal(parseRenewalWorkflowLaneFilter("unknown"), "all");
  assert.equal(parseRenewalWorkflowLaneFilter(undefined), "all");
});

test("lane filters focus the display without changing workflow classification", () => {
  assert.equal(renewalWorkflowLaneMatchesFilter("Action now", "action-now"), true);
  assert.equal(renewalWorkflowLaneMatchesFilter("Complete data", "complete-data"), true);
  assert.equal(renewalWorkflowLaneMatchesFilter("Prepare", "monitor"), false);
  assert.equal(renewalWorkflowLaneMatchesFilter("Monitor", "all"), true);
});

test("critical and overdue renewals are Action now", () => {
  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Critical",
      daysUntilEnd: 10,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    }),
    "Action now",
  );

  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Overdue",
      daysUntilEnd: -5,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    }),
    "Action now",
  );
});

test("an overdue CRM task escalates any renewal to Action now", () => {
  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Future",
      daysUntilEnd: 180,
      openTaskCount: 1,
      overdueTaskCount: 1,
      dataGapCount: 0,
    }),
    "Action now",
  );
});

test("priority and upcoming renewals are Prepare when the record is sufficiently complete", () => {
  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Priority",
      daysUntilEnd: 45,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 1,
    }),
    "Prepare",
  );

  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Upcoming",
      daysUntilEnd: 75,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    }),
    "Prepare",
  );
});

test("missing contract timing or multiple gaps classify as Complete data", () => {
  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Data gap",
      daysUntilEnd: null,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 1,
    }),
    "Complete data",
  );

  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Future",
      daysUntilEnd: 150,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 2,
    }),
    "Complete data",
  );
});

test("complete future renewals classify as Monitor", () => {
  assert.equal(
    classifyRenewalWorkflowLane({
      urgency: "Future",
      daysUntilEnd: 150,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    }),
    "Monitor",
  );
});

test("workflow reasons are deterministic human guidance and never imply execution", () => {
  const inputs = [
    {
      urgency: "Critical" as const,
      daysUntilEnd: 20,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
    {
      urgency: "Priority" as const,
      daysUntilEnd: 50,
      openTaskCount: 1,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
    {
      urgency: "Data gap" as const,
      daysUntilEnd: null,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 2,
    },
    {
      urgency: "Future" as const,
      daysUntilEnd: 200,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
  ];

  const bannedTerms = [
    "send",
    "call now",
    "dial",
    "execute",
    "authorize",
    "approve contact",
    "initiate",
  ];

  for (const input of inputs) {
    const lane = classifyRenewalWorkflowLane(input);
    const reason = renewalWorkflowReason(input, lane).toLowerCase();

    assert.ok(reason.length > 0);

    for (const term of bannedTerms) {
      assert.ok(
        !reason.includes(term),
        `expected "${term}" to be absent from ${lane} guidance`,
      );
    }
  }
});

test("priority comparator orders Action now before Prepare, Complete data, and Monitor", () => {
  const rows = [
    {
      customerId: 4,
      lane: "Monitor" as const,
      urgency: "Future" as const,
      daysUntilEnd: 180,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
    {
      customerId: 3,
      lane: "Complete data" as const,
      urgency: "Data gap" as const,
      daysUntilEnd: null,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 1,
    },
    {
      customerId: 2,
      lane: "Prepare" as const,
      urgency: "Priority" as const,
      daysUntilEnd: 45,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
    {
      customerId: 1,
      lane: "Action now" as const,
      urgency: "Critical" as const,
      daysUntilEnd: 10,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
  ];

  rows.sort(compareRenewalWorkflowPriority);

  assert.deepEqual(
    rows.map((row) => row.lane),
    ["Action now", "Prepare", "Complete data", "Monitor"],
  );
});

test("priority comparator uses overdue task count then contract timing within a lane", () => {
  const rows = [
    {
      customerId: 1,
      lane: "Action now" as const,
      urgency: "Critical" as const,
      daysUntilEnd: 5,
      openTaskCount: 0,
      overdueTaskCount: 0,
      dataGapCount: 0,
    },
    {
      customerId: 2,
      lane: "Action now" as const,
      urgency: "Future" as const,
      daysUntilEnd: 200,
      openTaskCount: 2,
      overdueTaskCount: 2,
      dataGapCount: 0,
    },
    {
      customerId: 3,
      lane: "Action now" as const,
      urgency: "Critical" as const,
      daysUntilEnd: 2,
      openTaskCount: 1,
      overdueTaskCount: 1,
      dataGapCount: 0,
    },
  ];

  rows.sort(compareRenewalWorkflowPriority);

  assert.deepEqual(
    rows.map((row) => row.customerId),
    [2, 3, 1],
  );
});
