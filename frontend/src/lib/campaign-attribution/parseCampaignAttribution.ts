// Factory 033: pure parser translating a lead's already-existing utm_*
// fields (leads.utm_source/utm_medium/utm_campaign/utm_content/utm_term —
// live in production since Factory 024, no new column needed) into a
// structured Campaign Set 01 attribution, following the documented
// convention in campaignTaxonomy.ts. No database query, no network call,
// no advertising API of any kind exists in this file.

import {
  CAMPAIGN_SET_ID,
  isCampaignPlatform,
  isCampaignMedium,
  isCreativeFamily,
  parseCampaignSlug,
  type CampaignPlatform,
  type CampaignMedium,
  type CreativeFamily,
  type MessageFamily,
} from "./campaignTaxonomy.ts";

/** Mirrors the shape of CanonicalLead's existing utm_* fields exactly — no new field, no schema gap. */
export type CampaignAttributionUtmInput = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

export type CampaignAttribution = {
  campaignSetId: string;
  platform: CampaignPlatform;
  medium: CampaignMedium;
  messageFamily: MessageFamily;
  creativeFamily: CreativeFamily;
  /** Free-form — not validated against a closed list. Null when utm_term was absent or blank. */
  variant: string | null;
};

/**
 * Returns null — "unrecognised," never a guessed or partial structure —
 * unless utm_source, utm_medium, utm_content, and utm_campaign all match
 * the Campaign Set 01 convention exactly. utm_term (variant) is the only
 * field allowed to be freely-shaped or absent. Deterministic: identical
 * input always produces identical output.
 */
export function parseCampaignAttribution(utm: CampaignAttributionUtmInput): CampaignAttribution | null {
  if (!utm.utm_source || !isCampaignPlatform(utm.utm_source)) return null;
  if (!utm.utm_medium || !isCampaignMedium(utm.utm_medium)) return null;
  if (!utm.utm_content || !isCreativeFamily(utm.utm_content)) return null;
  if (!utm.utm_campaign) return null;

  const slug = parseCampaignSlug(utm.utm_campaign);
  if (!slug || slug.campaignSetId !== CAMPAIGN_SET_ID) return null;

  const variant = utm.utm_term && utm.utm_term.trim() ? utm.utm_term.trim() : null;

  return {
    campaignSetId: slug.campaignSetId,
    platform: utm.utm_source,
    medium: utm.utm_medium,
    messageFamily: slug.messageFamily,
    creativeFamily: utm.utm_content,
    variant,
  };
}
