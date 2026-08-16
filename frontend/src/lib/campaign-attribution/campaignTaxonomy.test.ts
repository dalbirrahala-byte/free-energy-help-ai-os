import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMPAIGN_SET_ID,
  isCampaignPlatform,
  isCampaignMedium,
  isMessageFamily,
  isCreativeFamily,
  parseCampaignSlug,
} from "./campaignTaxonomy.ts";

test("isCampaignPlatform recognises exactly linkedin, meta, and reddit", () => {
  assert.equal(isCampaignPlatform("linkedin"), true);
  assert.equal(isCampaignPlatform("meta"), true);
  assert.equal(isCampaignPlatform("reddit"), true);
  assert.equal(isCampaignPlatform("facebook"), false);
  assert.equal(isCampaignPlatform("google"), false);
  assert.equal(isCampaignPlatform(""), false);
});

test("isCampaignMedium recognises exactly paid-social and shared-link", () => {
  assert.equal(isCampaignMedium("paid-social"), true);
  assert.equal(isCampaignMedium("shared-link"), true);
  assert.equal(isCampaignMedium("email"), false);
  assert.equal(isCampaignMedium("cpc"), false);
});

test("isMessageFamily recognises exactly the three approved Campaign Set 01 message families", () => {
  assert.equal(isMessageFamily("paying-too-much"), true);
  assert.equal(isMessageFamily("contract-ending"), true);
  assert.equal(isMessageFamily("confused-by-bill"), true);
  assert.equal(isMessageFamily("something-else"), false);
});

test("isCreativeFamily recognises exactly the three approved imagery families and never a domestic/home energy monitor family", () => {
  assert.equal(isCreativeFamily("professionals"), true);
  assert.equal(isCreativeFamily("commercial-kitchen"), true);
  assert.equal(isCreativeFamily("refrigeration"), true);
  assert.equal(isCreativeFamily("home-energy-monitor"), false);
  assert.equal(isCreativeFamily("domestic"), false);
});

test("parseCampaignSlug correctly splits a well-formed Campaign Set 01 slug for every message family", () => {
  assert.deepEqual(parseCampaignSlug("feh-campaign-set-01--paying-too-much"), {
    campaignSetId: CAMPAIGN_SET_ID,
    messageFamily: "paying-too-much",
  });
  assert.deepEqual(parseCampaignSlug("feh-campaign-set-01--contract-ending"), {
    campaignSetId: CAMPAIGN_SET_ID,
    messageFamily: "contract-ending",
  });
  assert.deepEqual(parseCampaignSlug("feh-campaign-set-01--confused-by-bill"), {
    campaignSetId: CAMPAIGN_SET_ID,
    messageFamily: "confused-by-bill",
  });
});

test("parseCampaignSlug returns null (never a guessed result) for every malformed shape", () => {
  assert.equal(parseCampaignSlug("no-separator-here"), null);
  assert.equal(parseCampaignSlug("feh-campaign-set-02--paying-too-much"), null, "wrong campaign set id");
  assert.equal(parseCampaignSlug("feh-campaign-set-01--unknown-message"), null, "unrecognised message family");
  assert.equal(parseCampaignSlug(""), null);
  assert.equal(parseCampaignSlug("--paying-too-much"), null, "empty campaign set id");
});

test("this module performs no I/O and contains no advertising/network integration — every function is a pure string check", () => {
  assert.doesNotThrow(() => {
    isCampaignPlatform("linkedin");
    isCampaignMedium("paid-social");
    isMessageFamily("paying-too-much");
    isCreativeFamily("professionals");
    parseCampaignSlug("feh-campaign-set-01--paying-too-much");
  });
});
