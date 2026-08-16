import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLeadCampaignAttribution, type BuildLeadCampaignAttributionInput } from "./leadCampaignAttribution.ts";

function makeLead(overrides: Partial<BuildLeadCampaignAttributionInput> = {}): BuildLeadCampaignAttributionInput {
  return {
    id: 1,
    lead_source: "Meta",
    qualification_classification: "Hot",
    utm_source: "meta",
    utm_medium: "paid-social",
    utm_campaign: "feh-campaign-set-01--contract-ending",
    utm_content: "commercial-kitchen",
    utm_term: "v2",
    ...overrides,
  };
}

test("a lead with well-formed Campaign Set 01 UTM fields produces a non-null attribution carrying the correct leadId", () => {
  const result = buildLeadCampaignAttribution(makeLead({ id: 42 }));

  assert.equal(result.leadId, 42);
  assert.notEqual(result.attribution, null);
  assert.equal(result.attribution?.platform, "meta");
  assert.equal(result.attribution?.messageFamily, "contract-ending");
  assert.equal(result.attribution?.creativeFamily, "commercial-kitchen");
});

test("opportunity, quote, contract, and revenue are always null — for a recognised campaign lead and an unrecognised one alike", () => {
  const recognised = buildLeadCampaignAttribution(makeLead());
  const unrecognised = buildLeadCampaignAttribution(makeLead({ utm_source: "google", utm_campaign: "brand-search" }));

  for (const result of [recognised, unrecognised]) {
    assert.equal(result.opportunity, null);
    assert.equal(result.quote, null);
    assert.equal(result.contract, null);
    assert.equal(result.revenue, null);
  }
});

test("qualification is carried through by reference from the already-persisted Factory 027 classification, never recomputed", () => {
  const hot = buildLeadCampaignAttribution(makeLead({ qualification_classification: "Hot" }));
  const unscored = buildLeadCampaignAttribution(makeLead({ qualification_classification: null }));

  assert.equal(hot.qualification, "Hot");
  assert.equal(unscored.qualification, null);
});

test("rawUtm mirrors the input's utm_* fields exactly, regardless of whether the parsed attribution is recognised", () => {
  const lead = makeLead({ utm_source: "unknown-platform" });
  const result = buildLeadCampaignAttribution(lead);

  assert.deepEqual(result.rawUtm, {
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
  });
  assert.equal(result.attribution, null);
});

test("leadSource is carried through unmodified from the existing lead_source field", () => {
  const result = buildLeadCampaignAttribution(makeLead({ lead_source: "Referral" }));
  assert.equal(result.leadSource, "Referral");
});

test("a lead with no UTM data at all (null across the board) never throws and produces a null attribution", () => {
  const lead = makeLead({ utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null });

  assert.doesNotThrow(() => buildLeadCampaignAttribution(lead));
  const result = buildLeadCampaignAttribution(lead);
  assert.equal(result.attribution, null);
});

test("identical input always produces identical output (deterministic)", () => {
  const lead = makeLead();
  assert.deepEqual(buildLeadCampaignAttribution(lead), buildLeadCampaignAttribution(lead));
});

test("this module performs no I/O — building an attribution never requires a network or database connection", () => {
  assert.doesNotThrow(() => buildLeadCampaignAttribution(makeLead()));
});
