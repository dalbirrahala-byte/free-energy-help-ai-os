// Factory 028: bulk backfill for leads that predate Factory 027 scoring (or
// were never scored because they arrived through a path that doesn't call
// syncLeadQualification, e.g. the anon website/external ingest functions).
//
// This is orchestration only — no new scoring logic, no new write path, no
// new RLS/grant. Every lead is scored via syncLeadQualification.ts,
// unchanged, exactly once. One lead's failure never aborts the batch,
// matching the "best-effort, never block" degradation already used at
// lead-creation time (leads/new/page.tsx) and inside
// syncLeadQualification.ts itself.

import { syncLeadQualification, type SyncLeadQualificationActor } from "./syncLeadQualification.ts";
import type { createClient } from "../supabase/server";
import type { ActivityRecencyInput } from "./activityRecency.ts";
import type { CanonicalLead } from "../shared/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SyncAllLeadQualificationsResult = {
  /** Leads whose classification/score was written because it was new or had changed. */
  scored: number;
  /** Leads whose freshly computed result already matched what was stored — no write, no audit event. */
  unchanged: number;
  /** Leads whose sync threw or whose UPDATE failed — logged, never thrown, batch continues. */
  failed: number;
};

/**
 * `leads` is whatever set the caller wants scored (typically every lead with
 * `qualification_classification IS NULL`, fetched by the caller's own
 * server action). `activitiesByLead` should be pre-built by the caller from
 * one bulk `activities` query, the same pattern loadLeadRevenueViews.ts
 * already uses, rather than querying per lead inside this loop.
 */
export async function syncAllLeadQualifications(
  supabase: SupabaseServerClient,
  leads: CanonicalLead[],
  activitiesByLead: Map<number, ActivityRecencyInput[]>,
  actor: SyncLeadQualificationActor,
  today: Date,
): Promise<SyncAllLeadQualificationsResult> {
  let scored = 0;
  let unchanged = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const activities = activitiesByLead.get(lead.id) ?? [];
      const outcome = await syncLeadQualification(supabase, lead, activities, actor, today);
      if (outcome.persisted) {
        scored += 1;
      } else {
        unchanged += 1;
      }
    } catch (syncError) {
      failed += 1;
      console.warn(
        `[Qualification] Bulk recompute failed for lead ${lead.id}: ${
          syncError instanceof Error ? syncError.message : String(syncError)
        }`,
      );
    }
  }

  return { scored, unchanged, failed };
}
