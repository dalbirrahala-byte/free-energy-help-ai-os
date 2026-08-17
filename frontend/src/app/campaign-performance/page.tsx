import { createClient } from "@/lib/supabase/server";
import { buildLeadCampaignAttribution } from "@/lib/campaign-attribution/leadCampaignAttribution";
import { calculateCampaignPerformance } from "@/lib/campaign-attribution/campaignPerformance";
import { buildConvertedLeadIdSet } from "@/lib/revenue-engine/loadLeadIntelligence";
import { CampaignPerformanceView } from "@/components/campaign-performance/CampaignPerformanceView";
import type { LeadQualityClassification } from "@/lib/revenue-engine/leadQualityClassification";
import type { CanonicalLead } from "@/lib/shared/domain";

// Factory 035: read-only. Reuses Factory 033's buildLeadCampaignAttribution
// and Factory 034's calculateCampaignPerformance unchanged, and the same
// buildConvertedLeadIdSet helper loadLeadIntelligence.ts already uses for
// leadSourceIntelligence.ts. No new business logic, no new query
// privilege — same RLS-governed leads/customers reads every other page
// already performs.

const LEAD_COLUMNS =
  "id, lead_source, qualification_classification, utm_source, utm_medium, utm_campaign, utm_content, utm_term";

type CampaignLeadRow = Pick<
  CanonicalLead,
  "id" | "lead_source" | "qualification_classification" | "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term"
>;

export default async function CampaignPerformancePage() {
  const supabase = await createClient();

  const [{ data: leadRows, error }, { data: customerRows }] = await Promise.all([
    supabase.from("leads").select(LEAD_COLUMNS),
    supabase.from("customers").select("source_lead_id"),
  ]);

  const leads = (leadRows ?? []) as CampaignLeadRow[];
  const convertedLeadIds = buildConvertedLeadIdSet(customerRows ?? []);

  const attributions = leads.map((lead) =>
    buildLeadCampaignAttribution({
      id: lead.id,
      lead_source: lead.lead_source,
      qualification_classification: (lead.qualification_classification ?? null) as LeadQualityClassification | null,
      utm_source: lead.utm_source ?? null,
      utm_medium: lead.utm_medium ?? null,
      utm_campaign: lead.utm_campaign ?? null,
      utm_content: lead.utm_content ?? null,
      utm_term: lead.utm_term ?? null,
    }),
  );

  const performance = calculateCampaignPerformance(attributions, convertedLeadIds);

  return <CampaignPerformanceView performance={performance} supabaseError={Boolean(error)} />;
}
