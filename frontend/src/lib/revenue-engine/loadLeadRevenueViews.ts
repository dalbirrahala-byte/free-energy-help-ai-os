// Factory 024 Phase 1: bulk Lead Revenue View loader for the Leads list.
//
// Reuses the caller's already-authenticated Supabase server client — never
// creates a second client, never uses a service-role key. The caller has
// typically already fetched `leads` for the page it's rendering; that same
// array is reused directly as the lead-source-performance input (it already
// has id/lead_source/status), so this loader only issues two additional
// read-only queries total — regardless of how many leads are passed in —
// rather than repeating loadLeadIntelligence.ts's per-lead queries N times.

import type { createClient } from "../supabase/server";
import { calculateLeadSourceIntelligence } from "./leadSourceIntelligence.ts";
import { buildConvertedLeadIdSet } from "./loadLeadIntelligence.ts";
import { buildLeadRevenueView, type LeadRevenueView } from "./leadRevenueView.ts";
import type { ActivityRecencyInput } from "./activityRecency.ts";
import type { CanonicalLead } from "../shared/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ActivityRow = ActivityRecencyInput & { lead_id: number };

/**
 * Degrades gracefully, never throws: if either extra query fails, source
 * performance/activity recency simply fall back to their own already-
 * documented neutral/no-activity defaults, the same honest-degradation
 * pattern used throughout this codebase.
 */
export async function loadLeadRevenueViews(
  supabase: SupabaseServerClient,
  leads: CanonicalLead[],
  today: Date,
): Promise<Record<number, LeadRevenueView>> {
  const leadIds = leads.map((lead) => lead.id);

  const [{ data: customerRows }, { data: activityRows }] = await Promise.all([
    supabase.from("customers").select("source_lead_id"),
    leadIds.length > 0
      ? supabase.from("activities").select("lead_id, activity_date").in("lead_id", leadIds)
      : Promise.resolve({ data: [] as ActivityRow[] }),
  ]);

  const sourcePerformance = calculateLeadSourceIntelligence(leads, buildConvertedLeadIdSet(customerRows ?? []));

  const activitiesByLead = new Map<number, ActivityRecencyInput[]>();
  for (const row of (activityRows ?? []) as ActivityRow[]) {
    const existing = activitiesByLead.get(row.lead_id) ?? [];
    existing.push({ activity_date: row.activity_date });
    activitiesByLead.set(row.lead_id, existing);
  }

  const views: Record<number, LeadRevenueView> = {};
  for (const lead of leads) {
    const activities = activitiesByLead.get(lead.id) ?? [];
    views[lead.id] = buildLeadRevenueView(lead, activities, sourcePerformance, today);
  }

  return views;
}
