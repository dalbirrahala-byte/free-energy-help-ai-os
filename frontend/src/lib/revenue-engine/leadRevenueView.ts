// Factory 024 Phase 1: composed Lead Revenue View.
//
// Pure — composes the already-computed qualification, priority,
// activity-recency, and next-action results into one object the Leads list
// and lead detail page can both render. Every future lead source (website,
// AI voice, WhatsApp, live-transfer providers, ...) only needs to land in
// `public.leads` as a CanonicalLead with its activities to get the same
// operational view — no per-source logic lives here.

import { calculateLeadPriority, type LeadPriorityResult } from "./prioritization.ts";
import { calculateLeadQualification, type LeadQualificationResult } from "./qualification.ts";
import { summarizeActivityRecency, type ActivityRecencyInput, type ActivityRecencySummary } from "./activityRecency.ts";
import { determineNextAction, type NextActionResult } from "./nextAction.ts";
import type { LeadSourceIntelligenceResult } from "./leadSourceIntelligence.ts";
import type { CanonicalLead } from "../shared/domain";

export type LeadRevenueView = {
  leadId: number;
  qualification: LeadQualificationResult;
  priority: LeadPriorityResult;
  activityRecency: ActivityRecencySummary;
  nextAction: NextActionResult;
};

/**
 * `sourcePerformance` is optional for the same reason it is in
 * prioritization.ts: omitting it degrades the source-quality factor to
 * neutral rather than failing.
 */
export function buildLeadRevenueView(
  lead: CanonicalLead,
  activities: ActivityRecencyInput[],
  sourcePerformance: LeadSourceIntelligenceResult | undefined,
  today: Date,
): LeadRevenueView {
  const priority = calculateLeadPriority(lead, sourcePerformance, today);
  const activityRecency = summarizeActivityRecency(activities, today);
  const qualification = calculateLeadQualification(lead, activityRecency);
  const nextAction = determineNextAction({ qualification, priority, activityRecency, status: lead.status });

  return { leadId: lead.id, qualification, priority, activityRecency, nextAction };
}
