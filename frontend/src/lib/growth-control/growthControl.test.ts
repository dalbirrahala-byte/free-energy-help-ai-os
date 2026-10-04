import assert from "node:assert/strict";
import test from "node:test";

import { buildGrowthControlModel } from "./growthControl.ts";

test("growth control uses live CRM facts and keeps external growth feeds not connected", () => {
  const model = buildGrowthControlModel({
    hourLocal: 8,
    kpis: {
      totalLeads: "12",
      totalCustomers: "4",
      tasksDueToday: "3",
      renewalsDue: "2",
    },
    pipeline: [
      { status: "New", count: 5, widthPercent: 100 },
      { status: "Won", count: 2, widthPercent: 40 },
      { status: "Lost", count: 1, widthPercent: 20 },
    ],
    priorityActions: [
      { id: "overdue", label: "3 overdue tasks", count: 3, href: "/tasks", severity: "critical" },
    ],
    sourceState: {
      crmLive: true,
      tasksLive: true,
      followUpLive: true,
      renewalsLive: true,
    },
  });

  assert.equal(model.briefing.greeting, "Good morning, Free Energy Help");
  assert.equal(model.briefing.evidenceState, "LIVE_FACTS");
  assert.equal(model.pipeline.total, 8);
  assert.equal(model.pipeline.won, 2);
  assert.equal(model.pipeline.lost, 1);
  assert.equal(model.pipeline.open, 5);
  assert.equal(model.dataSources.find((source) => source.id === "crm")?.state, "LIVE");
  assert.equal(model.dataSources.find((source) => source.id === "paid_ads")?.state, "NOT_CONNECTED");
  assert.equal(model.dataSources.find((source) => source.id === "apollo")?.state, "NOT_CONNECTED");
});

test("growth control never fabricates a live evidence state when CRM sources are unavailable", () => {
  const model = buildGrowthControlModel({
    hourLocal: 20,
    kpis: {
      totalLeads: "Not configured",
      totalCustomers: "Not configured",
      tasksDueToday: "Not configured",
      renewalsDue: "Not configured",
    },
    pipeline: [],
    priorityActions: [],
    sourceState: {
      crmLive: false,
      tasksLive: false,
      followUpLive: false,
      renewalsLive: false,
    },
  });

  assert.equal(model.briefing.greeting, "Good evening, Free Energy Help");
  assert.equal(model.briefing.evidenceState, "NO_FACTS");
  assert.equal(model.pipeline.total, 0);
  assert.equal(model.dataSources.find((source) => source.id === "crm")?.state, "PARTIAL");
});
