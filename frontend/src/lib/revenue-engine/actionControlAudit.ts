// Factory 031: builds the request / eligibility-checked / authorized-or-
// blocked audit event sequence for one recommendation-linked task
// submission. Pure — no I/O. The caller (the existing addTask Server
// Action in tasks/new/page.tsx) persists each returned event via the
// existing, unmodified recordAuditEvent(), then calls
// enforceActionEligibility() below so an ineligible recognized
// recommendation genuinely blocks that task from being created — narrowly
// scoped to recommendation-linked submissions only; every other task
// creation path is completely unaffected.

import { buildAuditEvent, type AuditEvent } from "../audit/log.ts";
import type { Role } from "../auth/roles";
import { evaluateActionEligibility, type ActionEligibilityResult } from "./actionEligibility.ts";
import type { LeadActionRecommendationLabel } from "./leadActionRecommendation.ts";
import type { LeadQualityClassification } from "./leadQualityClassification.ts";
import type { CanonicalLead } from "../shared/domain";

export type ActionControlAuditActor = {
  id: string;
  role: Role;
};

export type ActionControlAuditOutcome = {
  eligibility: ActionEligibilityResult;
  /** Always exactly 3 events, sharing one correlationId: action_requested, action_eligibility_checked, then either action_authorized or action_eligibility_blocked. */
  events: AuditEvent[];
};

export function buildActionControlAuditSequence(
  lead: Pick<CanonicalLead, "id" | "consent_given">,
  classification: LeadQualityClassification,
  action: LeadActionRecommendationLabel,
  actor: ActionControlAuditActor,
): ActionControlAuditOutcome {
  const eligibility = evaluateActionEligibility(lead, classification, action);

  const requested = buildAuditEvent({
    action: "action_requested",
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "lead",
    entityId: lead.id,
    result: "success",
    metadata: { recommendedAction: action },
  });

  const checked = buildAuditEvent({
    action: "action_eligibility_checked",
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "lead",
    entityId: lead.id,
    result: "success",
    correlationId: requested.correlationId,
    metadata: { recommendedAction: action, eligible: eligibility.eligible, basis: eligibility.basis },
  });

  const outcome = buildAuditEvent({
    action: eligibility.eligible ? "action_authorized" : "action_eligibility_blocked",
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "lead",
    entityId: lead.id,
    result: eligibility.eligible ? "success" : "denied",
    correlationId: requested.correlationId,
    metadata: { recommendedAction: action, reason: eligibility.reason, basis: eligibility.basis },
  });

  return { eligibility, events: [requested, checked, outcome] };
}

/**
 * Throws — using this codebase's own established validation pattern
 * (`if (!title) throw new Error(...)` etc., already used throughout
 * tasks/new/page.tsx and leads/new/page.tsx) — when an eligibility result
 * is not eligible, so the caller's existing task-insert code is never
 * reached. Never throws for an eligible result. Does not itself perform
 * any I/O, contact anything, or affect any task-creation path that never
 * calls it (ordinary manual tasks, or a submission with no recognized
 * recommendation, never reach this function at all).
 */
export function enforceActionEligibility(eligibility: ActionEligibilityResult): void {
  if (!eligibility.eligible) {
    throw new Error(`This action cannot be created: ${eligibility.reason}`);
  }
}
