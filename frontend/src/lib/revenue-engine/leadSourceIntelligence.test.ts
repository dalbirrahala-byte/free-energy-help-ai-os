import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateLeadSourceIntelligence,
  lookupSourceConversionRate,
  MIN_SAMPLE_SIZE,
  UNSPECIFIED_SOURCE_LABEL,
  type LeadSourceInput,
} from "./leadSourceIntelligence.ts";

function makeLeads(entries: { id: number; lead_source: string | null; status?: string | null }[]): LeadSourceInput[] {
  return entries.map((entry) => ({ id: entry.id, lead_source: entry.lead_source, status: entry.status ?? "New" }));
}

test("empty leads array produces zeroed, empty result", () => {
  const result = calculateLeadSourceIntelligence([], new Set());

  assert.equal(result.totalLeads, 0);
  assert.equal(result.attributedLeads, 0);
  assert.equal(result.attributedPercentage, 0);
  assert.deepEqual(result.sources, []);
});

test("a source with fewer than MIN_SAMPLE_SIZE leads reports no conversion rate", () => {
  const leads = makeLeads([
    { id: 1, lead_source: "Website" },
    { id: 2, lead_source: "Website" },
    { id: 3, lead_source: "Website" },
  ]);

  const result = calculateLeadSourceIntelligence(leads, new Set([1]));
  const website = result.sources.find((s) => s.source === "Website");

  assert.ok(website);
  assert.equal(website.leadCount, 3);
  assert.equal(website.sampleSizeSufficient, false);
  assert.equal(website.conversionRate, null);
  assert.match(website.explanation, /not enough data/i);
});

test(`a source with exactly MIN_SAMPLE_SIZE (${MIN_SAMPLE_SIZE}) leads reports a real conversion rate (lower boundary)`, () => {
  const leads = makeLeads([
    { id: 1, lead_source: "Referral" },
    { id: 2, lead_source: "Referral" },
    { id: 3, lead_source: "Referral" },
    { id: 4, lead_source: "Referral" },
    { id: 5, lead_source: "Referral" },
  ]);

  const result = calculateLeadSourceIntelligence(leads, new Set([1, 2]));
  const referral = result.sources.find((s) => s.source === "Referral");

  assert.ok(referral);
  assert.equal(referral.sampleSizeSufficient, true);
  assert.equal(referral.conversionRate, 40);
  assert.equal(referral.convertedCount, 2);
});

test("a source with MIN_SAMPLE_SIZE - 1 leads still reports no rate (upper boundary of insufficiency)", () => {
  const leads = makeLeads(
    Array.from({ length: MIN_SAMPLE_SIZE - 1 }, (_, i) => ({ id: i + 1, lead_source: "Outbound" })),
  );

  const result = calculateLeadSourceIntelligence(leads, new Set());
  const outbound = result.sources.find((s) => s.source === "Outbound");

  assert.ok(outbound);
  assert.equal(outbound.sampleSizeSufficient, false);
  assert.equal(outbound.conversionRate, null);
});

test("conversion rate rounds to one decimal place", () => {
  const leads = makeLeads(Array.from({ length: 7 }, (_, i) => ({ id: i + 1, lead_source: "AI Search" })));

  const result = calculateLeadSourceIntelligence(leads, new Set([1, 2]));
  const aiSearch = result.sources.find((s) => s.source === "AI Search");

  // 2/7 = 28.5714...% -> rounds to 28.6
  assert.equal(aiSearch?.conversionRate, 28.6);
});

test("leads with no lead_source are bucketed as 'Not specified', counted but not attributed", () => {
  const leads = makeLeads([
    { id: 1, lead_source: null },
    { id: 2, lead_source: "" },
    { id: 3, lead_source: "   " },
    { id: 4, lead_source: "Website" },
  ]);

  const result = calculateLeadSourceIntelligence(leads, new Set());
  const unspecified = result.sources.find((s) => s.source === UNSPECIFIED_SOURCE_LABEL);

  assert.ok(unspecified);
  assert.equal(unspecified.leadCount, 3);
  assert.equal(result.totalLeads, 4);
  assert.equal(result.attributedLeads, 1);
  assert.equal(result.attributedPercentage, 25);
});

test("multiple sources are aggregated independently and sorted by lead count descending", () => {
  const leads = makeLeads([
    { id: 1, lead_source: "Website" },
    { id: 2, lead_source: "Website" },
    { id: 3, lead_source: "Referral" },
  ]);

  const result = calculateLeadSourceIntelligence(leads, new Set());

  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].source, "Website");
  assert.equal(result.sources[0].leadCount, 2);
  assert.equal(result.sources[1].source, "Referral");
  assert.equal(result.sources[1].leadCount, 1);
});

test("convertedCount only counts IDs present in convertedLeadIds", () => {
  const leads = makeLeads([
    { id: 1, lead_source: "Website" },
    { id: 2, lead_source: "Website" },
    { id: 3, lead_source: "Website" },
    { id: 4, lead_source: "Website" },
    { id: 5, lead_source: "Website" },
  ]);

  // id 99 does not exist among the leads — must not inflate the count.
  const result = calculateLeadSourceIntelligence(leads, new Set([1, 99]));
  const website = result.sources.find((s) => s.source === "Website");

  assert.equal(website?.convertedCount, 1);
});

test("lookupSourceConversionRate returns undefined for an unknown source", () => {
  const result = calculateLeadSourceIntelligence(makeLeads([{ id: 1, lead_source: "Website" }]), new Set());

  assert.equal(lookupSourceConversionRate(result, "Never Seen Source"), undefined);
});

test("lookupSourceConversionRate returns undefined when the sample is insufficient", () => {
  const leads = makeLeads([
    { id: 1, lead_source: "Website" },
    { id: 2, lead_source: "Website" },
  ]);
  const result = calculateLeadSourceIntelligence(leads, new Set([1]));

  assert.equal(lookupSourceConversionRate(result, "Website"), undefined);
});

test("lookupSourceConversionRate returns the real rate when the sample is sufficient", () => {
  const leads = makeLeads(Array.from({ length: MIN_SAMPLE_SIZE }, (_, i) => ({ id: i + 1, lead_source: "Website" })));
  const result = calculateLeadSourceIntelligence(leads, new Set([1, 2, 3]));

  assert.equal(lookupSourceConversionRate(result, "Website"), 60);
});

test("lookupSourceConversionRate normalises null/empty source the same way as aggregation", () => {
  const leads = makeLeads(Array.from({ length: MIN_SAMPLE_SIZE }, (_, i) => ({ id: i + 1, lead_source: null })));
  const result = calculateLeadSourceIntelligence(leads, new Set([1]));

  assert.equal(lookupSourceConversionRate(result, null), 20);
  assert.equal(lookupSourceConversionRate(result, ""), 20);
});
