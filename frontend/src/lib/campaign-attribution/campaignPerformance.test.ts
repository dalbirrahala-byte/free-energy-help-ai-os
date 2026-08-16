import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateCampaignPerformance, type CampaignPerformanceInput } from "./campaignPerformance.ts";
import { MIN_SAMPLE_SIZE } from "../revenue-engine/leadSourceIntelligence.ts";
import type { CampaignAttribution } from "./parseCampaignAttribution.ts";

function makeAttribution(overrides: Partial<CampaignAttribution> = {}): CampaignAttribution {
  return {
    campaignSetId: "feh-campaign-set-01",
    platform: "linkedin",
    medium: "paid-social",
    messageFamily: "paying-too-much",
    creativeFamily: "professionals",
    variant: "v1",
    ...overrides,
  };
}

function makeLead(overrides: Partial<CampaignPerformanceInput> = {}): CampaignPerformanceInput {
  return {
    leadId: 1,
    attribution: makeAttribution(),
    qualification: "Hot",
    ...overrides,
  };
}

test("zero leads produces an honest all-zero result, not an error", () => {
  const result = calculateCampaignPerformance([], new Set());

  assert.deepEqual(result, {
    totalLeads: 0,
    attributedLeads: 0,
    attributedPercentage: 0,
    byPlatform: [],
    byMessageFamily: [],
  });
});

test("leads with no recognised attribution count toward totalLeads but are excluded from the platform/message-family breakdowns, never bucketed into a fabricated 'unknown' row", () => {
  const leads: CampaignPerformanceInput[] = [
    makeLead({ leadId: 1, attribution: null }),
    makeLead({ leadId: 2, attribution: null }),
  ];

  const result = calculateCampaignPerformance(leads, new Set());

  assert.equal(result.totalLeads, 2);
  assert.equal(result.attributedLeads, 0);
  assert.equal(result.attributedPercentage, 0);
  assert.deepEqual(result.byPlatform, []);
  assert.deepEqual(result.byMessageFamily, []);
});

test("attributedPercentage correctly reflects a mix of recognised and unrecognised leads", () => {
  const leads: CampaignPerformanceInput[] = [
    makeLead({ leadId: 1 }),
    makeLead({ leadId: 2 }),
    makeLead({ leadId: 3, attribution: null }),
    makeLead({ leadId: 4, attribution: null }),
  ];

  const result = calculateCampaignPerformance(leads, new Set());

  assert.equal(result.totalLeads, 4);
  assert.equal(result.attributedLeads, 2);
  assert.equal(result.attributedPercentage, 50);
});

test("leads are correctly aggregated by platform, each contributing exactly once", () => {
  const leads: CampaignPerformanceInput[] = [
    makeLead({ leadId: 1, attribution: makeAttribution({ platform: "linkedin" }) }),
    makeLead({ leadId: 2, attribution: makeAttribution({ platform: "linkedin" }) }),
    makeLead({ leadId: 3, attribution: makeAttribution({ platform: "meta" }) }),
  ];

  const result = calculateCampaignPerformance(leads, new Set());
  const byKey = Object.fromEntries(result.byPlatform.map((row) => [row.key, row.leadCount]));

  assert.deepEqual(byKey, { linkedin: 2, meta: 1 });
});

test("leads are correctly aggregated by message family, independently of the platform breakdown", () => {
  const leads: CampaignPerformanceInput[] = [
    makeLead({ leadId: 1, attribution: makeAttribution({ messageFamily: "contract-ending" }) }),
    makeLead({ leadId: 2, attribution: makeAttribution({ messageFamily: "contract-ending" }) }),
    makeLead({ leadId: 3, attribution: makeAttribution({ messageFamily: "confused-by-bill" }) }),
  ];

  const result = calculateCampaignPerformance(leads, new Set());
  const byKey = Object.fromEntries(result.byMessageFamily.map((row) => [row.key, row.leadCount]));

  assert.deepEqual(byKey, { "contract-ending": 2, "confused-by-bill": 1 });
});

test("classification counts are correctly bucketed per dimension, including unscored leads with a recognised attribution", () => {
  const leads: CampaignPerformanceInput[] = [
    makeLead({ leadId: 1, qualification: "Hot" }),
    makeLead({ leadId: 2, qualification: "Warm" }),
    makeLead({ leadId: 3, qualification: "Nurture" }),
    makeLead({ leadId: 4, qualification: "Reject" }),
    makeLead({ leadId: 5, qualification: null }),
  ];

  const result = calculateCampaignPerformance(leads, new Set());
  const linkedin = result.byPlatform.find((row) => row.key === "linkedin");

  assert.deepEqual(linkedin?.classificationCounts, { Hot: 1, Warm: 1, Nurture: 1, Reject: 1, unscored: 1 });
});

test("conversionRate is null and sampleSizeSufficient is false below MIN_SAMPLE_SIZE, never a fabricated percentage", () => {
  const leads: CampaignPerformanceInput[] = Array.from({ length: MIN_SAMPLE_SIZE - 1 }, (_, i) => makeLead({ leadId: i + 1 }));

  const result = calculateCampaignPerformance(leads, new Set([1]));
  const linkedin = result.byPlatform.find((row) => row.key === "linkedin");

  assert.equal(linkedin?.sampleSizeSufficient, false);
  assert.equal(linkedin?.conversionRate, null);
  assert.match(linkedin?.explanation ?? "", new RegExp(`fewer than ${MIN_SAMPLE_SIZE}`));
});

test("conversionRate is reported once the sample reaches MIN_SAMPLE_SIZE", () => {
  const leads: CampaignPerformanceInput[] = Array.from({ length: MIN_SAMPLE_SIZE }, (_, i) => makeLead({ leadId: i + 1 }));
  const convertedLeadIds = new Set([1, 2]);

  const result = calculateCampaignPerformance(leads, convertedLeadIds);
  const linkedin = result.byPlatform.find((row) => row.key === "linkedin");

  assert.equal(linkedin?.sampleSizeSufficient, true);
  assert.equal(linkedin?.convertedCount, 2);
  assert.equal(linkedin?.conversionRate, Math.round((2 / MIN_SAMPLE_SIZE) * 1000) / 10);
});

test("dimension rows are sorted by lead count descending", () => {
  const leads: CampaignPerformanceInput[] = [
    makeLead({ leadId: 1, attribution: makeAttribution({ platform: "reddit" }) }),
    makeLead({ leadId: 2, attribution: makeAttribution({ platform: "linkedin" }) }),
    makeLead({ leadId: 3, attribution: makeAttribution({ platform: "linkedin" }) }),
    makeLead({ leadId: 4, attribution: makeAttribution({ platform: "linkedin" }) }),
  ];

  const result = calculateCampaignPerformance(leads, new Set());

  assert.deepEqual(
    result.byPlatform.map((row) => row.key),
    ["linkedin", "reddit"],
  );
});

test("identical input always produces identical output (deterministic)", () => {
  const leads: CampaignPerformanceInput[] = [makeLead({ leadId: 1 }), makeLead({ leadId: 2, attribution: null })];
  const convertedLeadIds = new Set([1]);

  assert.deepEqual(calculateCampaignPerformance(leads, convertedLeadIds), calculateCampaignPerformance(leads, convertedLeadIds));
});

test("this module performs no I/O — calling it never requires a network or database connection", () => {
  assert.doesNotThrow(() => calculateCampaignPerformance([makeLead()], new Set()));
});
