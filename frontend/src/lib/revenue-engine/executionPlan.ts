// Factory 032: Revenue Execution Orchestration — the execution-plan model.
//
// A plan is a plain, in-memory description of "what would happen next,"
// never persisted (no new table, no migration) and never itself capable of
// contacting anyone. Nothing in this file performs I/O, calls a provider,
// or has a side effect of any kind.
//
// Status honesty rule: only "Planned" and "Blocked" are ever produced by
// Factory 032's orchestration logic. "Ready", "Cancelled", and "Completed"
// are reserved for later factories (a real adapter's own pre-flight check,
// a human cancelling a plan, or a dispatcher recording a real outcome) —
// including them here documents the intended future vocabulary without
// fabricating behaviour this factory doesn't actually have.

import type { LeadActionRecommendationLabel } from "./leadActionRecommendation.ts";
import type { ActionEligibilityBasis } from "./actionEligibility.ts";
import type { PriorityLabel } from "./prioritization.ts";

export type ExecutionPlanStatus = "Planned" | "Ready" | "Blocked" | "Cancelled" | "Completed";

/**
 * "manual-task" is the only channel with a real, connected execution path
 * anywhere in this codebase today (the existing /tasks/new form). The
 * others are typed placeholders for future, separately-approved adapter
 * factories — Factory 032's own logic never selects any of them.
 */
export type ExecutionChannel = "manual-task" | "ai-voice" | "whatsapp" | "email" | "sms";

export type ExecutionPlan = {
  id: string;
  leadId: number;
  /** A validated LeadActionRecommendationLabel for a "Planned" plan — but deliberately typed as `string`, not the narrow union, because a "Blocked" plan (unknown/unrecognized action) must still be able to honestly record what was requested. */
  action: string;
  channel: ExecutionChannel;
  priority: PriorityLabel;
  reason: string;
  eligibilityBasis: ActionEligibilityBasis;
  /** True only when the plan is backed by a genuine Factory 031 action_authorized audit event — never inferred, never assumed. */
  authorized: boolean;
  status: ExecutionPlanStatus;
  createdAt: string;
  /** Ties this plan back to the Factory 031 audit sequence (action_requested / action_eligibility_checked / action_authorized-or-blocked) that produced it. */
  correlationId: string;
  /** The ids of the Factory 031 audit events this plan was derived from — audit metadata, not a new audit mechanism. */
  auditEventIds: string[];
};

/**
 * Every currently-recognized recommendation label maps to "manual-task" —
 * the only real execution path that exists. A future adapter factory
 * extends this mapping (e.g. "Call now" -> "ai-voice" once Voice is
 * actually built); Factory 032 deliberately does not pre-guess that
 * mapping today.
 */
export function deriveExecutionChannel(_action: LeadActionRecommendationLabel): ExecutionChannel {
  return "manual-task";
}
