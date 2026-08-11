// Factory 023 Phase 2B: read-only composition of Phase 2A's deterministic
// lead-source intelligence and prioritisation against real CRM lead data.
//
// Reuses the caller's already-authenticated Supabase server client — never
// creates a second client, never uses a service-role key. Every query here
// reads only what the leads/[id] page already reads (or could already
// read) under the same RLS policies that already govern the rest of the
// app; nothing new is exposed. Business logic is never duplicated here:
// this file only fetches data and hands it to the already-reviewed,
// already-tested Phase 2A modules (leadSourceIntelligence.ts,
// prioritization.ts) unchanged.

import type { createClient } from "../supabase/server";
import {
  calculateLeadSourceIntelligence,
  type LeadSourceInput,
} from "./leadSourceIntelligence.ts";
import { calculateLeadPriority, type LeadPriorityResult } from "./prioritization.ts";
import type { CanonicalLead } from "../shared/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Pure — filters and dedupes raw customer rows into the converted-lead-ID
 * set calculateLeadSourceIntelligence expects. Split out from the fetch
 * below purely so this small piece of real logic is independently testable
 * without a live database.
 */
export function buildConvertedLeadIdSet(customerRows: { source_lead_id: number | null }[]): Set<number> {
  const ids = new Set<number>();
  for (const row of customerRows) {
    if (row.source_lead_id !== null) {
      ids.add(row.source_lead_id);
    }
  }
  return ids;
}

/**
 * Computes one lead's deterministic priority. Takes the lead the caller has
 * already fetched (via its own existing authenticated query — this
 * function never re-fetches it, avoiding a duplicate read) plus that same
 * Supabase client, and performs exactly two additional read-only queries —
 * both already within the leads/customers RLS boundary the rest of the app
 * relies on — to build the source-performance context every lead's score
 * is compared against.
 *
 * Degrades gracefully, never throws: if either query fails, the source
 * context is simply empty, which Phase 2A's own modules already handle by
 * falling back to a neutral score and flagging it as missing data — the
 * same honest-degradation pattern used throughout this codebase.
 */
export async function loadLeadIntelligence(
  supabase: SupabaseServerClient,
  lead: CanonicalLead,
  today: Date,
): Promise<LeadPriorityResult> {
  const [{ data: leadRows }, { data: customerRows }] = await Promise.all([
    supabase.from("leads").select("id, lead_source, status"),
    supabase.from("customers").select("source_lead_id"),
  ]);

  const sourceInputs: LeadSourceInput[] = leadRows ?? [];
  const convertedLeadIds = buildConvertedLeadIdSet(customerRows ?? []);
  const sourcePerformance = calculateLeadSourceIntelligence(sourceInputs, convertedLeadIds);

  return calculateLeadPriority(lead, sourcePerformance, today);
}
