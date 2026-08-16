// Factory 033: Campaign Set 01 attribution taxonomy — the canonical,
// documented UTM naming convention for Free Energy Help's first paid
// campaign set (LinkedIn, Meta/Facebook/Instagram, Reddit, and
// WhatsApp/social shared-link traffic). This file defines the vocabulary
// only. No network call, no advertising SDK, no external API, no ad
// spend, and no campaign publishing exists anywhere in this module —
// it does not connect to LinkedIn, Meta, Reddit, or WhatsApp in any way.
//
// CONVENTION (must be followed exactly by whoever configures real ad
// campaigns in each platform's ads manager, for parseCampaignAttribution.ts
// to recognise them — this file is the single source of truth for that
// convention):
//
//   utm_source   = platform slug — see CAMPAIGN_PLATFORMS
//   utm_medium   = "paid-social" for a paid ad placement, or
//                  "shared-link" for organic WhatsApp/social sharing of a
//                  campaign landing page — see CAMPAIGN_MEDIUMS
//   utm_campaign = "<CAMPAIGN_SET_ID>--<message family slug>"
//                  e.g. "feh-campaign-set-01--paying-too-much"
//   utm_content  = creative family slug — see CREATIVE_FAMILIES
//   utm_term     = free-form short variant/ad identifier (e.g. "v1", "a").
//                  Deliberately NOT validated against a closed list —
//                  new creative variants are expected to be added
//                  within a campaign without any code change here.
//
// Any UTM combination that does not exactly match this convention is
// "unrecognised" by parseCampaignAttribution.ts — never guessed, never
// forced into a best-effort match. An unrecognised value degrades to
// "we don't know," never to a fabricated attribution. This is what lets
// legacy leads (created before this factory existed) and leads from any
// other, unrelated source coexist safely with Campaign Set 01 leads.

export const CAMPAIGN_SET_ID = "feh-campaign-set-01";

/** Reddit is a recognised platform slug here even though no Reddit adapter or API integration exists anywhere in this codebase — this is UTM-based click-through attribution, not native lead-form ingestion (see lib/lead-gateway/ for that separate, unrelated mechanism). */
export type CampaignPlatform = "linkedin" | "meta" | "reddit";

export const CAMPAIGN_PLATFORMS: readonly CampaignPlatform[] = ["linkedin", "meta", "reddit"];

export function isCampaignPlatform(value: string): value is CampaignPlatform {
  return (CAMPAIGN_PLATFORMS as readonly string[]).includes(value);
}

export type CampaignMedium = "paid-social" | "shared-link";

export const CAMPAIGN_MEDIUMS: readonly CampaignMedium[] = ["paid-social", "shared-link"];

export function isCampaignMedium(value: string): value is CampaignMedium {
  return (CAMPAIGN_MEDIUMS as readonly string[]).includes(value);
}

/** Message Families A/B/C from the approved Campaign Set 01 brief. */
export type MessageFamily = "paying-too-much" | "contract-ending" | "confused-by-bill";

export const MESSAGE_FAMILIES: readonly MessageFamily[] = ["paying-too-much", "contract-ending", "confused-by-bill"];

export function isMessageFamily(value: string): value is MessageFamily {
  return (MESSAGE_FAMILIES as readonly string[]).includes(value);
}

/** The three approved imagery families from the Campaign Set 01 brief. No domestic/home energy monitor imagery family exists here — deliberately, per the approved brand direction. */
export type CreativeFamily = "professionals" | "commercial-kitchen" | "refrigeration";

export const CREATIVE_FAMILIES: readonly CreativeFamily[] = ["professionals", "commercial-kitchen", "refrigeration"];

export function isCreativeFamily(value: string): value is CreativeFamily {
  return (CREATIVE_FAMILIES as readonly string[]).includes(value);
}

export type ParsedCampaignSlug = {
  campaignSetId: string;
  messageFamily: MessageFamily;
};

/**
 * Splits a raw utm_campaign string into its campaign-set and message-
 * family components, per the "<CAMPAIGN_SET_ID>--<message family slug>"
 * convention. Returns null — never a partial or guessed result — for
 * anything that doesn't match exactly, including a correct campaign-set
 * id paired with an unrecognised message-family slug.
 */
export function parseCampaignSlug(utmCampaign: string): ParsedCampaignSlug | null {
  const separatorIndex = utmCampaign.indexOf("--");
  if (separatorIndex === -1) return null;

  const campaignSetId = utmCampaign.slice(0, separatorIndex);
  const messageFamilyRaw = utmCampaign.slice(separatorIndex + 2);

  if (campaignSetId !== CAMPAIGN_SET_ID) return null;
  if (!isMessageFamily(messageFamilyRaw)) return null;

  return { campaignSetId, messageFamily: messageFamilyRaw };
}
