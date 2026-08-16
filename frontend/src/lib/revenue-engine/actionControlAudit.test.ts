import assert from "node:assert/strict";
import { test } from "node:test";

import { buildActionControlAuditSequence, enforceActionEligibility, type ActionControlAuditActor } from "./actionControlAudit.ts";
import { evaluateActionEligibility } from "./actionEligibility.ts";

const ACTOR: ActionControlAuditActor = { id: "user-1", role: "manager" };

test("an eligible, direct-response action produces exactly 3 events ending in action_authorized", () => {
  const { eligibility, events } = buildActionControlAuditSequence(
    { id: 1, consent_given: false },
    "Hot",
    "Call now — priority contact",
    ACTOR,
  );

  assert.equal(eligibility.eligible, true);
  assert.equal(events.length, 3);
  assert.deepEqual(
    events.map((e) => e.action),
    ["action_requested", "action_eligibility_checked", "action_authorized"],
  );
  assert.equal(events[2].result, "success");
});

test("all 3 events in a sequence share the same correlationId, tying the request/check/outcome together", () => {
  const { events } = buildActionControlAuditSequence({ id: 2, consent_given: true }, "Warm", "Renewal follow-up", ACTOR);

  const correlationIds = new Set(events.map((e) => e.correlationId));
  assert.equal(correlationIds.size, 1);
});

test("a Reject-classified lead can NEVER produce action_authorized — the sequence always ends in action_eligibility_blocked", () => {
  const { eligibility, events } = buildActionControlAuditSequence(
    { id: 3, consent_given: true },
    "Reject",
    "Call now — priority contact",
    ACTOR,
  );

  assert.equal(eligibility.eligible, false);
  assert.deepEqual(
    events.map((e) => e.action),
    ["action_requested", "action_eligibility_checked", "action_eligibility_blocked"],
  );
  assert.ok(events.every((e) => e.action !== "action_authorized"));
  assert.equal(events[2].result, "denied");
});

test("a marketing action blocked for missing consent also never produces action_authorized", () => {
  const { eligibility, events } = buildActionControlAuditSequence(
    { id: 4, consent_given: false },
    "Warm",
    "Nurture — follow-up later",
    ACTOR,
  );

  assert.equal(eligibility.eligible, false);
  assert.ok(events.every((e) => e.action !== "action_authorized"));
  assert.equal(events[events.length - 1].action, "action_eligibility_blocked");
});

test("every event is attributed to the calling actor and references the lead as the entity", () => {
  const { events } = buildActionControlAuditSequence({ id: 42, consent_given: true }, "Hot", "Request LOA", ACTOR);

  for (const event of events) {
    assert.equal(event.actorId, ACTOR.id);
    assert.equal(event.actorRole, ACTOR.role);
    assert.equal(event.entityType, "lead");
    assert.equal(event.entityId, "42");
  }
});

test("event metadata carries the requested action and, on the outcome event, the eligibility reason and basis", () => {
  const { events, eligibility } = buildActionControlAuditSequence(
    { id: 5, consent_given: true },
    "Hot",
    "Manual review",
    ACTOR,
  );

  assert.equal(events[0].metadata?.recommendedAction, "Manual review");
  assert.equal(events[1].metadata?.eligible, true);
  assert.equal(events[2].metadata?.reason, eligibility.reason);
  assert.equal(events[2].metadata?.basis, eligibility.basis);
});

test("this module performs no I/O — building a sequence never throws and never requires a database connection", () => {
  assert.doesNotThrow(() => buildActionControlAuditSequence({ id: 6, consent_given: true }, "Nurture", "Nurture — follow-up later", ACTOR));
});

test("identical input produces a structurally identical sequence (deterministic apart from generated ids/timestamps)", () => {
  const first = buildActionControlAuditSequence({ id: 7, consent_given: true }, "Warm", "Renewal follow-up", ACTOR);
  const second = buildActionControlAuditSequence({ id: 7, consent_given: true }, "Warm", "Renewal follow-up", ACTOR);

  assert.deepEqual(
    first.events.map((e) => ({ action: e.action, result: e.result, entityId: e.entityId, metadata: e.metadata })),
    second.events.map((e) => ({ action: e.action, result: e.result, entityId: e.entityId, metadata: e.metadata })),
  );
  assert.deepEqual(first.eligibility, second.eligibility);
});

// --- enforceActionEligibility: the enforcement correction ---

test("enforceActionEligibility does NOT throw for an eligible, direct-response recommendation — the existing manual submit may proceed", () => {
  const eligibility = evaluateActionEligibility({ id: 10, consent_given: false }, "Hot", "Call now — priority contact");
  assert.doesNotThrow(() => enforceActionEligibility(eligibility));
});

test("enforceActionEligibility DOES throw for an ineligible recognized recommendation, blocking task creation before it happens", () => {
  const eligibility = evaluateActionEligibility({ id: 11, consent_given: false }, "Warm", "Nurture — follow-up later");
  assert.throws(() => enforceActionEligibility(eligibility), /cannot be created/);
});

test("enforceActionEligibility throws for a Reject-classified lead's recommendation — Reject protection is never weakened by the enforcement step", () => {
  const eligibility = evaluateActionEligibility({ id: 12, consent_given: true }, "Reject", "Call now — priority contact");
  assert.throws(() => enforceActionEligibility(eligibility));
});

test("enforceActionEligibility's thrown message embeds the real eligibility reason, not a generic message", () => {
  const eligibility = evaluateActionEligibility({ id: 13, consent_given: false }, "Warm", "Nurture — follow-up later");
  assert.throws(() => enforceActionEligibility(eligibility), new RegExp(eligibility.reason.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("a blocked sequence's own outcome event is action_eligibility_blocked, and enforceActionEligibility applied to that same eligibility result also throws — the audit record and the enforcement decision agree", () => {
  const { eligibility, events } = buildActionControlAuditSequence({ id: 14, consent_given: true }, "Reject", "Request LOA", ACTOR);

  assert.equal(events[events.length - 1].action, "action_eligibility_blocked");
  assert.ok(events.every((e) => e.action !== "action_authorized"));
  assert.throws(() => enforceActionEligibility(eligibility));
});

test("an eligible sequence's own outcome event is action_authorized, and enforceActionEligibility applied to that same eligibility result does not throw", () => {
  const { eligibility, events } = buildActionControlAuditSequence({ id: 15, consent_given: true }, "Hot", "Request energy bill", ACTOR);

  assert.equal(events[events.length - 1].action, "action_authorized");
  assert.doesNotThrow(() => enforceActionEligibility(eligibility));
});
