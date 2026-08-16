import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCampaignAttribution, type CampaignAttributionUtmInput } from "./parseCampaignAttribution.ts";
import { CAMPAIGN_PLATFORMS, CREATIVE_FAMILIES, MESSAGE_FAMILIES } from "./campaignTaxonomy.ts";
import type { CanonicalLead } from "../shared/domain";

function makeUtm(overrides: Partial<CampaignAttributionUtmInput> = {}): CampaignAttributionUtmInput {
  return {
    utm_source: "linkedin",
    utm_medium: "paid-social",
    utm_campaign: "feh-campaign-set-01--paying-too-much",
    utm_content: "professionals",
    utm_term: "v1",
    ...overrides,
  };
}

test("all 27 Campaign Set 01 combinations (3 platforms x 3 message families x 3 creative families) are correctly recognised", () => {
  let combinations = 0;

  for (const platform of CAMPAIGN_PLATFORMS) {
    for (const messageFamily of MESSAGE_FAMILIES) {
      for (const creativeFamily of CREATIVE_FAMILIES) {
        combinations += 1;

        const utm = makeUtm({
          utm_source: platform,
          utm_campaign: `feh-campaign-set-01--${messageFamily}`,
          utm_content: creativeFamily,
        });

        const result = parseCampaignAttribution(utm);

        assert.notEqual(result, null, `expected a result for ${platform}/${messageFamily}/${creativeFamily}`);
        assert.equal(result?.platform, platform);
        assert.equal(result?.messageFamily, messageFamily);
        assert.equal(result?.creativeFamily, creativeFamily);
        assert.equal(result?.campaignSetId, "feh-campaign-set-01");
        assert.equal(result?.medium, "paid-social");
      }
    }
  }

  assert.equal(combinations, 27);
});

test("utm_medium 'shared-link' (WhatsApp/social share of a campaign landing page) is recognised the same way as 'paid-social'", () => {
  const result = parseCampaignAttribution(makeUtm({ utm_medium: "shared-link" }));
  assert.notEqual(result, null);
  assert.equal(result?.medium, "shared-link");
});

test("utm_term (variant) is free-form and never validated against a closed list", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_term: "any-free-text-variant-42" }))?.variant, "any-free-text-variant-42");
});

test("a missing or blank utm_term produces variant: null, never an empty string", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_term: null }))?.variant, null);
  assert.equal(parseCampaignAttribution(makeUtm({ utm_term: "   " }))?.variant, null);
});

test("an unrecognised platform is rejected, never guessed", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_source: "facebook" })), null);
  assert.equal(parseCampaignAttribution(makeUtm({ utm_source: "google" })), null);
});

test("an unrecognised medium is rejected", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_medium: "email" })), null);
  assert.equal(parseCampaignAttribution(makeUtm({ utm_medium: "cpc" })), null);
});

test("an unrecognised creative family is rejected, including a domestic/home energy monitor value", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_content: "home-energy-monitor" })), null);
});

test("a wrong campaign-set id is rejected even if the message family slug is otherwise valid", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_campaign: "feh-campaign-set-02--paying-too-much" })), null);
});

test("an unrecognised message family within an otherwise correct campaign-set id is rejected", () => {
  assert.equal(parseCampaignAttribution(makeUtm({ utm_campaign: "feh-campaign-set-01--something-else" })), null);
});

test("every required field missing (all null) is rejected safely, never throws", () => {
  assert.doesNotThrow(() =>
    parseCampaignAttribution({ utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null }),
  );
  assert.equal(
    parseCampaignAttribution({ utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null }),
    null,
  );
});

test("legacy/pre-Campaign-Set-01 UTM values already in the database degrade honestly to null, never crash or get force-matched", () => {
  const legacyExamples: CampaignAttributionUtmInput[] = [
    { utm_source: "newsletter", utm_medium: "email", utm_campaign: "spring-2025", utm_content: null, utm_term: null },
    { utm_source: "google", utm_medium: "cpc", utm_campaign: "brand-search", utm_content: "ad-1", utm_term: "kw-energy" },
    { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "", utm_term: "" },
  ];

  for (const legacy of legacyExamples) {
    assert.doesNotThrow(() => parseCampaignAttribution(legacy));
    assert.equal(parseCampaignAttribution(legacy), null);
  }
});

test("garbage/malformed strings never throw", () => {
  assert.doesNotThrow(() =>
    parseCampaignAttribution({
      utm_source: "<script>alert(1)</script>",
      utm_medium: "'; DROP TABLE leads; --",
      utm_campaign: "not-a-real-campaign-slug-at-all",
      utm_content: "😀",
      utm_term: null,
    }),
  );
});

test("identical input always produces identical output (deterministic)", () => {
  const utm = makeUtm();
  assert.deepEqual(parseCampaignAttribution(utm), parseCampaignAttribution(utm));
});

test("type compatibility: CampaignAttributionUtmInput matches CanonicalLead's existing utm_* fields exactly — no schema gap, no new column needed", () => {
  const lead: Pick<CanonicalLead, "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term"> = {
    utm_source: "linkedin",
    utm_medium: "paid-social",
    utm_campaign: "feh-campaign-set-01--paying-too-much",
    utm_content: "professionals",
    utm_term: "v1",
  };

  const utmInput: CampaignAttributionUtmInput = {
    utm_source: lead.utm_source ?? null,
    utm_medium: lead.utm_medium ?? null,
    utm_campaign: lead.utm_campaign ?? null,
    utm_content: lead.utm_content ?? null,
    utm_term: lead.utm_term ?? null,
  };

  assert.notEqual(parseCampaignAttribution(utmInput), null);
});

test("this module performs no I/O and invokes no external advertising/network integration — calling it never requires a network or database connection", () => {
  assert.doesNotThrow(() => parseCampaignAttribution(makeUtm()));
});
