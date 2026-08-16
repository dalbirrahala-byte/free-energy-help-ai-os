// Factory 034: deterministic Campaign Set 01 performance aggregation.
//
// Pure — no I/O, no Supabase calls, no AI. Mirrors leadSourceIntelligence.ts's
// existing aggregation discipline exactly (same MIN_SAMPLE_SIZE threshold,
// reused rather than redefined; same "null rate below the sample floor,
// never a fabricated percentage" rule). The caller supplies each lead's
// already-computed Factory 033 attribution and Factory 027 qualification
// (both by reference — this module recomputes neither) plus the set of
// lead IDs that have already converted to a customer (queried from the
// existing public.customers.source_lead_id, same source
// leadSourceIntelligence.ts already uses).
//
// Only leads with a recognised Campaign Set 01 attribution contribute to
// the byPlatform/byMessageFamily breakdowns — an unrecognised or absent
// attribution is honestly excluded from those breakdowns rather than
// bucketed into a fabricated "unknown campaign" row, while still counting
// toward totalLeads/attributedLeads so nothing is silently dropped.

import { MIN_SAMPLE_SIZE } from "../revenue-engine/leadSourceIntelligence.ts";
import type { CampaignAttribution } from "./parseCampaignAttribution.ts";
import type { LeadCampaignAttribution } from "./leadCampaignAttribution.ts";

export type CampaignPerformanceInput = Pick<LeadCampaignAttribution, "leadId" | "attribution" | "qualification">;

export type CampaignClassificationCounts = {
  Hot: number;
  Warm: number;
  Nurture: number;
  Reject: number;
  /** Leads with a recognised campaign attribution that have never been scored (Factory 027 qualification_classification is null). */
  unscored: number;
};

export type CampaignDimensionPerformance = {
  /** The platform slug or message-family slug this row aggregates. */
  key: string;
  leadCount: number;
  classificationCounts: CampaignClassificationCounts;
  convertedCount: number;
  /** null when the sample is too small to report a meaningful rate — same MIN_SAMPLE_SIZE floor as leadSourceIntelligence.ts. */
  conversionRate: number | null;
  sampleSizeSufficient: boolean;
  explanation: string;
};

export type CampaignPerformanceResult = {
  totalLeads: number;
  /** Leads whose UTM fields matched the Campaign Set 01 convention (parseCampaignAttribution returned non-null) — never a guess. */
  attributedLeads: number;
  attributedPercentage: number;
  byPlatform: CampaignDimensionPerformance[];
  byMessageFamily: CampaignDimensionPerformance[];
};

function emptyClassificationCounts(): CampaignClassificationCounts {
  return { Hot: 0, Warm: 0, Nurture: 0, Reject: 0, unscored: 0 };
}

function explainDimension(leadCount: number, convertedCount: number, sufficient: boolean, rate: number | null): string {
  if (!sufficient) {
    return `${leadCount} lead${leadCount === 1 ? "" : "s"} recorded — fewer than ${MIN_SAMPLE_SIZE}, not enough data for a reliable conversion rate.`;
  }
  return `${convertedCount} of ${leadCount} leads converted (${rate}%).`;
}

function aggregateByDimension(
  leads: CampaignPerformanceInput[],
  convertedLeadIds: ReadonlySet<number>,
  extractKey: (attribution: CampaignAttribution) => string,
): CampaignDimensionPerformance[] {
  const byKey = new Map<string, { leadCount: number; convertedCount: number; classificationCounts: CampaignClassificationCounts }>();

  for (const lead of leads) {
    if (!lead.attribution) continue;

    const key = extractKey(lead.attribution);
    const entry = byKey.get(key) ?? { leadCount: 0, convertedCount: 0, classificationCounts: emptyClassificationCounts() };

    entry.leadCount += 1;
    if (convertedLeadIds.has(lead.leadId)) {
      entry.convertedCount += 1;
    }
    if (lead.qualification) {
      entry.classificationCounts[lead.qualification] += 1;
    } else {
      entry.classificationCounts.unscored += 1;
    }

    byKey.set(key, entry);
  }

  return Array.from(byKey.entries())
    .map(([key, { leadCount, convertedCount, classificationCounts }]) => {
      const sampleSizeSufficient = leadCount >= MIN_SAMPLE_SIZE;
      const conversionRate = sampleSizeSufficient ? Math.round((convertedCount / leadCount) * 1000) / 10 : null;
      return {
        key,
        leadCount,
        classificationCounts,
        convertedCount,
        conversionRate,
        sampleSizeSufficient,
        explanation: explainDimension(leadCount, convertedCount, sampleSizeSufficient, conversionRate),
      };
    })
    .sort((a, b) => b.leadCount - a.leadCount);
}

/**
 * `convertedLeadIds` should come from the same real query
 * leadSourceIntelligence.ts already uses (public.customers.source_lead_id)
 * — this function does not decide what "converted" means, only counts it.
 */
export function calculateCampaignPerformance(
  leads: CampaignPerformanceInput[],
  convertedLeadIds: ReadonlySet<number>,
): CampaignPerformanceResult {
  const totalLeads = leads.length;
  const attributedLeads = leads.filter((lead) => lead.attribution !== null).length;

  return {
    totalLeads,
    attributedLeads,
    attributedPercentage: totalLeads === 0 ? 0 : Math.round((attributedLeads / totalLeads) * 1000) / 10,
    byPlatform: aggregateByDimension(leads, convertedLeadIds, (attribution) => attribution.platform),
    byMessageFamily: aggregateByDimension(leads, convertedLeadIds, (attribution) => attribution.messageFamily),
  };
}
