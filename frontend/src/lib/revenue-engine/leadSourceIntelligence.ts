// Factory 023 Phase 2A: deterministic lead-source performance aggregation.
//
// Pure — no I/O, no Supabase calls, no AI. The caller supplies the leads
// and the set of lead IDs that have already converted to a customer
// (queried from public.customers.source_lead_id); this module only
// aggregates what it's given. It never estimates a conversion rate from a
// sample too small to be meaningful — below MIN_SAMPLE_SIZE, the rate is
// reported as null with sampleSizeSufficient: false, never a fabricated
// percentage dressed up as intelligence.

import type { CanonicalLead } from "../shared/domain";

/** Below this many leads for a source, a conversion rate is not reported — too small a sample to be meaningful. */
export const MIN_SAMPLE_SIZE = 5;

/** Bucket label used for leads with no lead_source recorded — never silently excluded from totals. */
export const UNSPECIFIED_SOURCE_LABEL = "Not specified";

export type LeadSourceInput = Pick<CanonicalLead, "id" | "lead_source" | "status">;

export type SourcePerformance = {
  source: string;
  leadCount: number;
  convertedCount: number;
  /** null when the sample is too small to report a meaningful rate. */
  conversionRate: number | null;
  sampleSizeSufficient: boolean;
  explanation: string;
};

export type LeadSourceIntelligenceResult = {
  totalLeads: number;
  attributedLeads: number;
  attributedPercentage: number;
  sources: SourcePerformance[];
};

function normaliseSource(leadSource: string | null): string {
  const trimmed = leadSource?.trim();
  return trimmed ? trimmed : UNSPECIFIED_SOURCE_LABEL;
}

function explainSource(leadCount: number, convertedCount: number, sufficient: boolean, rate: number | null): string {
  if (!sufficient) {
    return `${leadCount} lead${leadCount === 1 ? "" : "s"} recorded — fewer than ${MIN_SAMPLE_SIZE}, not enough data for a reliable conversion rate.`;
  }
  return `${convertedCount} of ${leadCount} leads converted (${rate}%).`;
}

/**
 * Aggregates lead volume and conversion rate per source. `convertedLeadIds`
 * should come from a real query (e.g. public.customers.source_lead_id) —
 * this function does not decide what "converted" means, only counts it.
 */
export function calculateLeadSourceIntelligence(
  leads: LeadSourceInput[],
  convertedLeadIds: ReadonlySet<number>,
): LeadSourceIntelligenceResult {
  const bySource = new Map<string, { leadCount: number; convertedCount: number }>();
  let attributedLeads = 0;

  for (const lead of leads) {
    const source = normaliseSource(lead.lead_source);
    if (source !== UNSPECIFIED_SOURCE_LABEL) {
      attributedLeads += 1;
    }

    const entry = bySource.get(source) ?? { leadCount: 0, convertedCount: 0 };
    entry.leadCount += 1;
    if (convertedLeadIds.has(lead.id)) {
      entry.convertedCount += 1;
    }
    bySource.set(source, entry);
  }

  const sources: SourcePerformance[] = Array.from(bySource.entries())
    .map(([source, { leadCount, convertedCount }]) => {
      const sampleSizeSufficient = leadCount >= MIN_SAMPLE_SIZE;
      const conversionRate = sampleSizeSufficient ? Math.round((convertedCount / leadCount) * 1000) / 10 : null;
      return {
        source,
        leadCount,
        convertedCount,
        conversionRate,
        sampleSizeSufficient,
        explanation: explainSource(leadCount, convertedCount, sampleSizeSufficient, conversionRate),
      };
    })
    .sort((a, b) => b.leadCount - a.leadCount);

  const totalLeads = leads.length;

  return {
    totalLeads,
    attributedLeads,
    attributedPercentage: totalLeads === 0 ? 0 : Math.round((attributedLeads / totalLeads) * 1000) / 10,
    sources,
  };
}

/** Convenience lookup for prioritization.ts — returns undefined for a source with no data or an insufficient sample. */
export function lookupSourceConversionRate(
  result: LeadSourceIntelligenceResult,
  leadSource: string | null,
): number | undefined {
  const source = normaliseSource(leadSource);
  const match = result.sources.find((s) => s.source === source);
  if (!match || !match.sampleSizeSufficient || match.conversionRate === null) {
    return undefined;
  }
  return match.conversionRate;
}
