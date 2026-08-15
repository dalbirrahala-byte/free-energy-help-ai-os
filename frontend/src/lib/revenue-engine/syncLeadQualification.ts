// Factory 027: authenticated-only sync of a lead's persisted qualification
// classification.
//
// This is the ONLY place lib/revenue-engine writes to the database — every
// other module in this directory (qualification.ts, prioritization.ts,
// nextAction.ts, duplicateDetection.ts) is pure/read-only by design. This
// file is deliberately narrow: it composes those already-tested modules,
// classifies via leadQualityClassification.ts, and — only if the result
// actually differs from what's already stored — writes four new nullable
// columns on the caller's own row under the existing leads_update_write_
// roles RLS policy (authenticated, non-read_only). No new grant, no new
// RLS policy, no service-role key.
//
// Never called from the anon ingest_public_lead/record_public_lead_
// rejection boundary — those functions, their SECURITY DEFINER bypass,
// their grants, and Factory 026A's dedup/consent controls are completely
// untouched by this file and by Factory 027 generally. Callers here are
// always an authenticated Server Action (see leads/new/page.tsx and the
// lead detail page's recompute action).
//
// Idempotent and safe to call repeatedly: identical input always produces
// an identical classification (leadQualityClassification.ts is pure), and
// a no-op recompute performs no UPDATE and writes no audit event.

import type { Role } from "../auth/roles";
import { buildAuditEvent, recordAuditEvent } from "../audit/log.ts";
import type { createClient } from "../supabase/server";
import { summarizeActivityRecency, type ActivityRecencyInput } from "./activityRecency.ts";
import { calculateLeadQualification } from "./qualification.ts";
import { loadLeadIntelligence } from "./loadLeadIntelligence.ts";
import { loadPotentialDuplicateLeads } from "./duplicateDetection.ts";
import { classifyLeadQuality, type LeadQualityResult } from "./leadQualityClassification.ts";
import type { CanonicalLead } from "../shared/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type SyncLeadQualificationActor = {
  id: string;
  role: Role;
};

export type SyncLeadQualificationOutcome = {
  result: LeadQualityResult;
  /** True only when the computed result differed from what was already stored and the UPDATE succeeded. */
  persisted: boolean;
};

/**
 * `lead` must already carry its own currently-persisted
 * qualification_classification/qualification_score (e.g. from the caller's
 * own `.select(...)` query) so this function can detect "nothing changed"
 * without a second read. `activities` should be whatever the caller already
 * has on hand for this lead (or an empty array for a brand-new lead).
 */
export async function syncLeadQualification(
  supabase: SupabaseServerClient,
  lead: CanonicalLead,
  activities: ActivityRecencyInput[],
  actor: SyncLeadQualificationActor,
  today: Date,
): Promise<SyncLeadQualificationOutcome> {
  const priority = await loadLeadIntelligence(supabase, lead, today);
  const activityRecency = summarizeActivityRecency(activities, today);
  const qualification = calculateLeadQualification(lead, activityRecency);
  const duplicates = await loadPotentialDuplicateLeads(supabase, lead);
  const result = classifyLeadQuality(lead, priority, qualification, duplicates);

  const unchanged =
    (lead.qualification_classification ?? null) === result.classification &&
    (lead.qualification_score ?? null) === result.score;

  if (unchanged) {
    return { result, persisted: false };
  }

  const computedAt = today.toISOString();

  const { error } = await supabase
    .from("leads")
    .update({
      qualification_classification: result.classification,
      qualification_score: result.score,
      qualification_reasons: result.reasons,
      qualification_computed_at: computedAt,
    })
    .eq("id", lead.id);

  if (error) {
    console.warn(`[Qualification] Failed to persist classification for lead ${lead.id}: ${error.message}`);
    return { result, persisted: false };
  }

  await recordAuditEvent(
    supabase,
    buildAuditEvent({
      action: "lead_qualification_scored",
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "lead",
      entityId: lead.id,
      result: "success",
      metadata: {
        classification: result.classification,
        score: result.score,
        rejected: result.rejected,
      },
    }),
  );

  return { result, persisted: true };
}
