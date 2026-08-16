import assert from "node:assert/strict";
import { test } from "node:test";

import { planRevenueExecution } from "./executionOrchestration.ts";
import { buildActionControlAuditSequence, type ActionControlAuditActor, type ActionControlAuditOutcome } from "./actionControlAudit.ts";

const ACTOR: ActionControlAuditActor = { id: "user-1", role: "manager" };

test("an eligible, authorized action produces a valid 'Planned' execution plan", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 1, consent_given: false }, "Hot", "Call now — priority contact", ACTOR);
  const { plan, auditEvent } = planRevenueExecution({ id: 1 }, "Call now — priority contact", "Critical", auditOutcome, ACTOR);

  assert.equal(plan.status, "Planned");
  assert.equal(plan.authorized, true);
  assert.equal(plan.leadId, 1);
  assert.equal(plan.action, "Call now — priority contact");
  assert.equal(plan.channel, "manual-task");
  assert.equal(plan.priority, "Critical");
  assert.equal(plan.correlationId, auditOutcome.events[0].correlationId);
  assert.deepEqual(
    plan.auditEventIds,
    auditOutcome.events.map((e) => e.id),
  );
  assert.equal(auditEvent.action, "execution_plan_created");
  assert.equal(auditEvent.result, "success");
});

test("an ineligible action (marketing action without consent) is blocked, never Planned", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 2, consent_given: false }, "Warm", "Nurture — follow-up later", ACTOR);
  const { plan, auditEvent } = planRevenueExecution({ id: 2 }, "Nurture — follow-up later", "Medium", auditOutcome, ACTOR);

  assert.equal(plan.status, "Blocked");
  assert.notEqual(plan.status, "Planned");
  assert.equal(plan.authorized, false);
  assert.equal(plan.reason, auditOutcome.eligibility.reason);
  assert.equal(auditEvent.action, "execution_plan_blocked");
  assert.equal(auditEvent.result, "denied");
});

test("a Reject-classified lead is always blocked, never producing a 'Planned' plan", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 3, consent_given: true }, "Reject", "Call now — priority contact", ACTOR);
  const { plan } = planRevenueExecution({ id: 3 }, "Call now — priority contact", "Critical", auditOutcome, ACTOR);

  assert.equal(plan.status, "Blocked");
  assert.notEqual(plan.status, "Planned");
  assert.equal(plan.authorized, false);
});

test("an action whose recorded audit sequence does not end in action_authorized is blocked, even when the bare eligibility flag says true (defense in depth)", () => {
  const genuine = buildActionControlAuditSequence({ id: 4, consent_given: true }, "Hot", "Request LOA", ACTOR);
  const tampered: ActionControlAuditOutcome = {
    eligibility: genuine.eligibility,
    events: [genuine.events[0], genuine.events[1], { ...genuine.events[2], action: "action_eligibility_blocked" }],
  };

  assert.equal(genuine.eligibility.eligible, true);

  const { plan } = planRevenueExecution({ id: 4 }, "Request LOA", "High", tampered, ACTOR);

  assert.equal(plan.status, "Blocked");
  assert.match(plan.reason, /Audit trail does not confirm/);
});

test("an unknown/invalid action string is blocked safely and never throws", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 5, consent_given: true }, "Hot", "Call now — priority contact", ACTOR);

  assert.doesNotThrow(() => planRevenueExecution({ id: 5 }, "Do something undefined", "Low", auditOutcome, ACTOR));

  const { plan } = planRevenueExecution({ id: 5 }, "Do something undefined", "Low", auditOutcome, ACTOR);
  assert.equal(plan.status, "Blocked");
  assert.match(plan.reason, /Unrecognized action/);
});

test("a requested action that does not match the action the audit outcome was actually authorized for is blocked (mismatch protection)", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 6, consent_given: true }, "Hot", "Call now — priority contact", ACTOR);
  const { plan } = planRevenueExecution({ id: 6 }, "Request LOA", "High", auditOutcome, ACTOR);

  assert.equal(plan.status, "Blocked");
  assert.match(plan.reason, /does not match/);
});

test("identical input produces a structurally identical plan (deterministic, apart from the generated id and timestamp)", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 7, consent_given: true }, "Hot", "Request energy bill", ACTOR);

  const first = planRevenueExecution({ id: 7 }, "Request energy bill", "Critical", auditOutcome, ACTOR);
  const second = planRevenueExecution({ id: 7 }, "Request energy bill", "Critical", auditOutcome, ACTOR);

  const strip = (plan: typeof first.plan) => ({ ...plan, id: undefined, createdAt: undefined });
  assert.deepEqual(strip(first.plan), strip(second.plan));
});

test("this module performs no I/O and invokes no external side-effect adapter — calling it never requires a network or database connection", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 8, consent_given: true }, "Nurture", "Nurture — follow-up later", ACTOR);
  assert.doesNotThrow(() => planRevenueExecution({ id: 8 }, "Nurture — follow-up later", "Low", auditOutcome, ACTOR));
});

test("a successful plan's reason and eligibilityBasis are carried through verbatim from the Factory 031 eligibility result, never re-derived", () => {
  const auditOutcome = buildActionControlAuditSequence({ id: 9, consent_given: true }, "Warm", "Renewal follow-up", ACTOR);
  const { plan } = planRevenueExecution({ id: 9 }, "Renewal follow-up", "Medium", auditOutcome, ACTOR);

  assert.equal(plan.reason, auditOutcome.eligibility.reason);
  assert.equal(plan.eligibilityBasis, auditOutcome.eligibility.basis);
});

test("every event returned is attributed to the calling actor and references the lead as the entity, for both Planned and Blocked outcomes", () => {
  const eligibleOutcome = buildActionControlAuditSequence({ id: 10, consent_given: true }, "Hot", "Manual review", ACTOR);
  const { auditEvent: plannedEvent } = planRevenueExecution({ id: 10 }, "Manual review", "High", eligibleOutcome, ACTOR);

  const ineligibleOutcome = buildActionControlAuditSequence({ id: 11, consent_given: false }, "Warm", "Nurture — follow-up later", ACTOR);
  const { auditEvent: blockedEvent } = planRevenueExecution({ id: 11 }, "Nurture — follow-up later", "Low", ineligibleOutcome, ACTOR);

  for (const [event, entityId] of [
    [plannedEvent, "10"],
    [blockedEvent, "11"],
  ] as const) {
    assert.equal(event.actorId, ACTOR.id);
    assert.equal(event.actorRole, ACTOR.role);
    assert.equal(event.entityType, "lead");
    assert.equal(event.entityId, entityId);
  }
});
