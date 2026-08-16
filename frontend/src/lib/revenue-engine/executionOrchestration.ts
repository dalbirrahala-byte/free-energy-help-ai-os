// Factory 032: Revenue Execution Orchestration.
//
// Pure — no I/O, no network, no provider adapters, no side effects of any
// kind. Takes an already-computed Factory 031 ActionControlAuditOutcome
// (the eligibility verdict AND the actual recorded audit-event sequence)
// and either produces a "Planned" execution plan or refuses with a
// "Blocked" one. This module never re-derives eligibility, never
// re-classifies a lead, and never bypasses anything Factory 031 already
// decided — it only reads what Factory 031 already computed and refuses
// to proceed unless that record genuinely says "authorized."
//
// This module is not imported by any page, route, or Server Action.
// Nothing calls it yet — that is deliberate. "Preparing a plan" can never
// become "sending a message" by accident if nothing wires the two
// together.

import { buildAuditEvent, type AuditEvent } from "../audit/log.ts";
import type { ActionControlAuditActor, ActionControlAuditOutcome } from "./actionControlAudit.ts";
import { isLeadActionRecommendationLabel } from "./leadActionRecommendation.ts";
import { deriveExecutionChannel, type ExecutionPlan } from "./executionPlan.ts";
import type { PriorityLabel } from "./prioritization.ts";

export type PlanRevenueExecutionOutcome = {
  plan: ExecutionPlan;
  /** Pure — the caller persists this via the existing, unmodified recordAuditEvent(), exactly like Factory 031's own sequence. */
  auditEvent: AuditEvent;
};

/**
 * `action` is accepted as a plain `string`, not the narrow
 * LeadActionRecommendationLabel union, because this function is the
 * control boundary itself — it must not simply trust that a caller's
 * TypeScript types were honoured upstream (e.g. a future adapter
 * reconstructing this call from stored/serialized data). Every guard
 * below is checked in order; the first failure wins and produces a
 * "Blocked" plan. Nothing here ever throws for an expected refusal —
 * only genuinely unexpected input would.
 */
export function planRevenueExecution(
  lead: { id: number },
  action: string,
  priority: PriorityLabel,
  auditOutcome: ActionControlAuditOutcome,
  actor: ActionControlAuditActor,
): PlanRevenueExecutionOutcome {
  const createdAt = new Date().toISOString();
  const correlationId = auditOutcome.events[0]?.correlationId ?? crypto.randomUUID();
  const auditEventIds = auditOutcome.events.map((event) => event.id);

  const blocked = (reason: string): PlanRevenueExecutionOutcome => {
    const plan: ExecutionPlan = {
      id: crypto.randomUUID(),
      leadId: lead.id,
      action,
      channel: "manual-task",
      priority,
      reason,
      eligibilityBasis: auditOutcome.eligibility.basis,
      authorized: false,
      status: "Blocked",
      createdAt,
      correlationId,
      auditEventIds,
    };

    const auditEvent = buildAuditEvent({
      action: "execution_plan_blocked",
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "lead",
      entityId: lead.id,
      result: "denied",
      correlationId,
      metadata: { requestedAction: action, reason, basis: auditOutcome.eligibility.basis },
    });

    return { plan, auditEvent };
  };

  // Guard 1: refuse an unknown/invalid action outright — never guess what
  // an unrecognized string might mean.
  if (!isLeadActionRecommendationLabel(action)) {
    return blocked("Unrecognized action — refusing to plan an unknown action type.");
  }

  // Guard 2: the action being planned must be the exact action Factory 031
  // actually evaluated — refuses a mismatched/substituted action even if
  // some other action was separately found eligible.
  if (action !== auditOutcome.eligibility.action) {
    return blocked("The requested action does not match the action that was checked for eligibility — refusing to plan a mismatched action.");
  }

  // Guard 3: the Factory 031 eligibility gate itself — this is the single
  // check that already covers Reject leads AND missing marketing consent,
  // since both flow through the same eligible:false result. Never
  // reimplemented here.
  if (!auditOutcome.eligibility.eligible) {
    return blocked(auditOutcome.eligibility.reason);
  }

  // Guard 4 (defense in depth): the actual recorded audit sequence — not
  // just the bare eligibility boolean — must confirm authorization. Refuses
  // to plan on a mismatched or tampered eligibility/events pair.
  const lastEvent = auditOutcome.events[auditOutcome.events.length - 1];
  if (!lastEvent || lastEvent.action !== "action_authorized") {
    return blocked("Audit trail does not confirm this action was authorized — refusing to plan it.");
  }

  const channel = deriveExecutionChannel(action);

  const plan: ExecutionPlan = {
    id: crypto.randomUUID(),
    leadId: lead.id,
    action,
    channel,
    priority,
    reason: auditOutcome.eligibility.reason,
    eligibilityBasis: auditOutcome.eligibility.basis,
    authorized: true,
    status: "Planned",
    createdAt,
    correlationId,
    auditEventIds,
  };

  const auditEvent = buildAuditEvent({
    action: "execution_plan_created",
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "lead",
    entityId: lead.id,
    result: "success",
    correlationId,
    metadata: { recommendedAction: action, channel, planId: plan.id },
  });

  return { plan, auditEvent };
}
