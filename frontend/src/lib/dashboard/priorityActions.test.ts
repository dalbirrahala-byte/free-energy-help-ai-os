import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEngineReadiness, buildPriorityActions } from "./priorityActions.ts";

test("buildEngineReadiness: both engines off reports Not Yet Configured for each", () => {
  const readiness = buildEngineReadiness(
    { engineEnabled: false, shadowMode: true },
    { orchestratorEnabled: false, shadowMode: true },
  );
  assert.equal(readiness.length, 2);
  assert.ok(readiness.every((r) => !r.enabled && r.detail.includes("Not Yet Configured")));
});

test("buildEngineReadiness: engine enabled + shadow mode reports shadow detail, not full enablement", () => {
  const [engine] = buildEngineReadiness(
    { engineEnabled: true, shadowMode: true },
    { orchestratorEnabled: false, shadowMode: true },
  );
  assert.equal(engine.enabled, true);
  assert.equal(engine.shadowMode, true);
  assert.match(engine.detail, /shadow mode/);
});

test("buildEngineReadiness: engine enabled + shadow mode off reports live", () => {
  const [engine] = buildEngineReadiness(
    { engineEnabled: true, shadowMode: false },
    { orchestratorEnabled: false, shadowMode: true },
  );
  assert.match(engine.detail, /live/);
});

const BASE_COUNTS = {
  overdueTasksCount: 0,
  overdueTasksAvailable: true,
  followUpLeadsCount: 0,
  followUpLeadsAvailable: true,
  followUpDays: 14,
  renewalsDueCount: 0,
  renewalsDueAvailable: true,
  renewalWarningDays: 90,
};

test("buildPriorityActions: all zero counts produces an empty list", () => {
  assert.deepEqual(buildPriorityActions(BASE_COUNTS), []);
});

test("buildPriorityActions: overdue tasks produce a critical action with correct singular/plural wording", () => {
  const [action] = buildPriorityActions({ ...BASE_COUNTS, overdueTasksCount: 1 });
  assert.equal(action.severity, "critical");
  assert.equal(action.label, "1 overdue task need attention");
  assert.equal(action.href, "/tasks");

  const [pluralAction] = buildPriorityActions({ ...BASE_COUNTS, overdueTasksCount: 3 });
  assert.equal(pluralAction.label, "3 overdue tasks need attention");
});

test("buildPriorityActions: follow-up leads produce a warning action referencing the real threshold", () => {
  const [action] = buildPriorityActions({ ...BASE_COUNTS, followUpLeadsCount: 5, followUpDays: 14 });
  assert.equal(action.severity, "warning");
  assert.equal(action.label, "5 leads have had no activity in 14+ days");
  assert.equal(action.href, "/leads");
});

test("buildPriorityActions: renewals due produce an info action referencing the real window", () => {
  const [action] = buildPriorityActions({ ...BASE_COUNTS, renewalsDueCount: 2, renewalWarningDays: 90 });
  assert.equal(action.severity, "info");
  assert.equal(action.label, "2 renewals due within 90 days");
  assert.equal(action.href, "/customers");
});

test("buildPriorityActions: an unavailable table suppresses its action even if a count is somehow set", () => {
  const actions = buildPriorityActions({ ...BASE_COUNTS, overdueTasksCount: 4, overdueTasksAvailable: false });
  assert.equal(actions.some((a) => a.id === "overdue-tasks"), false);
});

test("buildPriorityActions: renewalsDueCount of null (table unavailable) never appears, never shown as zero", () => {
  const actions = buildPriorityActions({ ...BASE_COUNTS, renewalsDueCount: null, renewalsDueAvailable: false });
  assert.equal(actions.some((a) => a.id === "renewals-due"), false);
});

test("buildPriorityActions: multiple real signals all appear together, most severe first", () => {
  const actions = buildPriorityActions({
    ...BASE_COUNTS,
    overdueTasksCount: 2,
    followUpLeadsCount: 3,
    renewalsDueCount: 1,
  });
  assert.deepEqual(
    actions.map((a) => a.id),
    ["overdue-tasks", "follow-up-leads", "renewals-due"],
  );
});
