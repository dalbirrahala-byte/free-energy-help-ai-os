import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChannelEconomicsDashboard,
  buildChannelEconomicsRow,
} from "./channelEconomics.ts";

const window = {
  windowStart: "2026-10-01T00:00:00Z",
  windowEnd: "2026-10-31T23:59:59Z",
} as const;

const baseRow = {
  ...window,
  channelId: "test-channel",
  channelName: "Test Channel",
  spendMinor: 10000,
  rawLeads: 20,
  qualifiedOpportunities: 4,
  signedContracts: 1,
} as const;

test("dashboard ranks channels by signed-contract economics while retaining raw lead cost as diagnostic only", () => {
  const dashboard = buildChannelEconomicsDashboard([
    {
      ...window,
      channelId: "exclusive-provider",
      channelName: "Exclusive Provider",
      spendMinor: 100000,
      rawLeads: 100,
      qualifiedOpportunities: 10,
      signedContracts: 2,
    },
    {
      ...window,
      channelId: "feh-intent-radar",
      channelName: "FEH Intent Radar",
      spendMinor: 45000,
      rawLeads: 35,
      qualifiedOpportunities: 9,
      signedContracts: 3,
    },
  ]);

  assert.equal(dashboard.status, "READY_FOR_REVIEW");
  assert.equal(dashboard.rows[0]?.channelId, "feh-intent-radar");
  assert.equal(dashboard.rows[0]?.costPerQualifiedOpportunityMinor, 5000);
  assert.equal(dashboard.rows[0]?.costPerSignedContractMinor, 15000);
  assert.equal(dashboard.rows[0]?.rawLeadCostMinor, 1286);
  assert.equal(dashboard.budgetReallocationAllowed, false);
  assert.equal(dashboard.campaignActivationAllowed, false);
});

test("zero signed contracts stay measurable for qualified-opportunity cost but signed-contract cost is absent", () => {
  const row = buildChannelEconomicsRow({
    ...baseRow,
    channelId: "social-organic",
    channelName: "Organic Social",
    signedContracts: 0,
  });

  assert.equal(row.decisionMetricStatus, "NO_SIGNED_CONTRACTS");
  assert.equal(row.costPerQualifiedOpportunityMinor, 2500);
  assert.equal(row.costPerSignedContractMinor, null);
});

test("mismatched windows block cross-channel comparison", () => {
  const dashboard = buildChannelEconomicsDashboard([
    {
      ...baseRow,
      channelId: "google-ads",
      channelName: "Google Ads",
    },
    {
      ...baseRow,
      windowEnd: "2026-11-30T23:59:59Z",
      channelId: "apollo-signal-enriched",
      channelName: "Apollo after verified signal",
    },
  ]);

  assert.equal(dashboard.status, "BLOCKED");
  assert.equal(dashboard.blendedCostPerQualifiedOpportunityMinor, null);
  assert.equal(dashboard.blendedCostPerSignedContractMinor, null);
});

test("observation windows require explicit timezone and real calendar instants", () => {
  assert.throws(
    () => buildChannelEconomicsRow({ ...baseRow, windowStart: "2026-10-01T00:00:00" }),
    /invalid_window_start/,
  );
  assert.throws(
    () => buildChannelEconomicsRow({ ...baseRow, windowEnd: "2026-02-31T23:59:59Z" }),
    /invalid_window_end/,
  );
});

test("unsafe integer spend and counts fail closed before economics are calculated", () => {
  assert.throws(
    () => buildChannelEconomicsRow({ ...baseRow, spendMinor: Number.MAX_SAFE_INTEGER + 1 }),
    /invalid_channel_spend/,
  );
  assert.throws(
    () => buildChannelEconomicsRow({ ...baseRow, rawLeads: Number.MAX_SAFE_INTEGER + 1 }),
    /invalid_raw_leads/,
  );
});

test("invalid funnel counts fail closed", () => {
  assert.throws(() => buildChannelEconomicsRow({
    ...baseRow,
    channelId: "invalid",
    channelName: "Invalid",
    rawLeads: 1,
    qualifiedOpportunities: 2,
    signedContracts: 0,
  }), /qualified_exceeds_raw_leads/);
});
