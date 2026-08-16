// Factory 033: composes a lead's parsed campaign attribution with its
// already-persisted raw UTM fields and its Factory 027 qualification
// classification — carried through by reference only, never recomputed
// or reimplemented here (see docs on classifyLeadQuality/persisted
// qualification_classification for the real source of truth).
//
// Reserved downstream commercial fields (opportunity/quote/contract/
// revenue) are always null. Quotes, Contracts, and Commissions remain
// demo-data-only in this codebase today (see docs/MASTER_ARCHITECTURE.md
// §2.2) — this module must never fabricate a state those systems don't
// genuinely provide. When they become real, a separately approved future
// factory populates these fields; Factory 033 only reserves the shape.

import { parseCampaignAttribution, type CampaignAttribution, type CampaignAttributionUtmInput } from "./parseCampaignAttribution.ts";
import type { LeadQualityClassification } from "../revenue-engine/leadQualityClassification.ts";

export type LeadCampaignAttribution = {
  leadId: number;
  attribution: CampaignAttribution | null;
  rawUtm: CampaignAttributionUtmInput;
  leadSource: string | null;
  /** The lead's already-persisted Factory 027 classification, carried through by reference. Null when the lead has never been scored — never guessed. */
  qualification: LeadQualityClassification | null;
  /** Reserved for a future, genuinely real system — always null today. See file header. */
  opportunity: null;
  /** Reserved for a future, genuinely real system — always null today. See file header. */
  quote: null;
  /** Reserved for a future, genuinely real system — always null today. See file header. */
  contract: null;
  /** Reserved for a future, genuinely real system — always null today. See file header. */
  revenue: null;
};

export type BuildLeadCampaignAttributionInput = CampaignAttributionUtmInput & {
  id: number;
  lead_source: string | null;
  qualification_classification: LeadQualityClassification | null;
};

/**
 * Pure — no I/O. `lead` should be whatever the caller already fetched
 * (or could already fetch) from the existing `leads` table under the
 * existing RLS policies; this function performs no query of its own.
 */
export function buildLeadCampaignAttribution(lead: BuildLeadCampaignAttributionInput): LeadCampaignAttribution {
  const rawUtm: CampaignAttributionUtmInput = {
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
  };

  return {
    leadId: lead.id,
    attribution: parseCampaignAttribution(rawUtm),
    rawUtm,
    leadSource: lead.lead_source,
    qualification: lead.qualification_classification,
    opportunity: null,
    quote: null,
    contract: null,
    revenue: null,
  };
}
