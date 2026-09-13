import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRevenueActions, type RevenueLeadInput } from "./revenueActions.ts";

const base: RevenueLeadInput = {
  id: 1,
  companyName: "Example Ltd",
  status: "Qualified",
  createdAt: "2026-09-01T09:00:00Z",
  leadSource: "Website",
  sourceDetail: "Health Check",
  campaign: null,
  contractEnd: null,
  supplier: null,
  leadOwner: null,
  nextAction: null,
  followUpRequired: false,
  followUpDate: null,
  lastActivityDate: "2026-09-12",
};

const today = "2026-09-13";
const staleSince = "2026-08-30";

test("overdue explicit follow-up is first and preserves commercial context", () => {
  const actions = buildRevenueActions([
    { ...base, id: 2, companyName: "Later Ltd", status: "New" },
    {
      ...base,
      id: 1,
      followUpRequired: true,
      followUpDate: "2026-09-12",
      leadOwner: "Monica",
      nextAction: "Call decision maker",
      campaign: "east-midlands-health-check",
      supplier: "Supplier A",
      contractEnd: "2027-01-31",
    },
  ], today, staleSince);

  assert.equal(actions[0].leadId, 1);
  assert.equal(actions[0].priority, "critical");
  assert.equal(actions[0].owner, "Monica");
  assert.equal(actions[0].nextAction, "Call decision maker");
  assert.equal(actions[0].sourceLabel, "Website · east-midlands-health-check");
  assert.equal(actions[0].renewalLabel, "Supplier A · contract ends 2027-01-31");
  assert.equal(actions[0].href, "/leads/1");
});

test("due today outranks general attention", () => {
  const actions = buildRevenueActions([
    { ...base, id: 1, followUpRequired: true },
    { ...base, id: 2, followUpDate: today },
  ], today, staleSince);
  assert.deepEqual(actions.map((a) => a.priority), ["today", "attention"]);
});

test("stale lead becomes actionable without inventing an owner", () => {
  const [action] = buildRevenueActions([
    { ...base, lastActivityDate: "2026-08-20" },
  ], today, staleSince);
  assert.equal(action.priority, "attention");
  assert.equal(action.owner, "Unassigned");
  assert.equal(action.dueLabel, "Follow-up needed");
});

test("new enquiry receives a safe default next action", () => {
  const [action] = buildRevenueActions([
    { ...base, status: "New", lastActivityDate: "2026-09-13" },
  ], today, staleSince);
  assert.equal(action.priority, "new");
  assert.equal(action.nextAction, "Review enquiry and assign follow-up");
});

test("won and lost leads never enter today's revenue queue", () => {
  const actions = buildRevenueActions([
    { ...base, id: 1, status: "Won", followUpRequired: true },
    { ...base, id: 2, status: "Lost", followUpRequired: true },
  ], today, staleSince);
  assert.deepEqual(actions, []);
});

test("healthy in-progress lead is not manufactured into an action", () => {
  assert.deepEqual(buildRevenueActions([base], today, staleSince), []);
});

test("queue is capped deterministically", () => {
  const leads = Array.from({ length: 20 }, (_, index) => ({
    ...base,
    id: index + 1,
    status: "New",
    lastActivityDate: today,
  }));
  assert.equal(buildRevenueActions(leads, today, staleSince, 12).length, 12);
});
