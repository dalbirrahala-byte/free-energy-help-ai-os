import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAuditEvent, recordAuditEvent } from "./log.ts";

test("buildAuditEvent: generates a unique id and correlation id when none is supplied", () => {
  const event = buildAuditEvent({ action: "login_success", actorId: "user-1", actorRole: "admin", result: "success" });
  assert.ok(event.id.length > 0);
  assert.ok(event.correlationId.length > 0);
});

test("buildAuditEvent: accepts a caller-supplied correlation id so related events can be linked", () => {
  const correlationId = "11111111-1111-1111-1111-111111111111";
  const event = buildAuditEvent({
    action: "lead_created",
    actorId: "user-1",
    actorRole: "consultant",
    correlationId,
    result: "success",
  });
  assert.equal(event.correlationId, correlationId);
});

test("buildAuditEvent: entityId is stringified so numeric primary keys and UUIDs are stored consistently", () => {
  const event = buildAuditEvent({
    action: "lead_created",
    actorId: "user-1",
    actorRole: "consultant",
    entityType: "lead",
    entityId: 42,
    result: "success",
  });
  assert.equal(event.entityId, "42");
  assert.equal(typeof event.entityId, "string");
});

test("buildAuditEvent: entityId omitted or null becomes null, never the string 'null' or 'undefined'", () => {
  const omitted = buildAuditEvent({ action: "login_success", actorId: "user-1", actorRole: "admin", result: "success" });
  assert.equal(omitted.entityId, null);

  const explicitNull = buildAuditEvent({
    action: "login_success",
    actorId: "user-1",
    actorRole: "admin",
    entityId: null,
    result: "success",
  });
  assert.equal(explicitNull.entityId, null);
});

test("buildAuditEvent: a failed login has no actor id or role, and result is failure", () => {
  const event = buildAuditEvent({ action: "login_failure", actorId: null, actorRole: null, result: "failure" });
  assert.equal(event.actorId, null);
  assert.equal(event.actorRole, null);
  assert.equal(event.result, "failure");
});

test("buildAuditEvent: a permission-denied event captures the role and action that was refused", () => {
  const event = buildAuditEvent({
    action: "permission_denied",
    actorId: "user-2",
    actorRole: "read_only",
    result: "denied",
    metadata: { attemptedPermission: "records:write" },
  });
  assert.equal(event.result, "denied");
  assert.equal(event.metadata?.attemptedPermission, "records:write");
});

test("buildAuditEvent: occurredAt is a valid ISO timestamp", () => {
  const event = buildAuditEvent({ action: "logout", actorId: "user-1", actorRole: "manager", result: "success" });
  assert.equal(Number.isNaN(Date.parse(event.occurredAt)), false);
});

test("recordAuditEvent: never throws, even when the insert fails (table not migrated yet)", async () => {
  const event = buildAuditEvent({ action: "lead_created", actorId: "user-1", actorRole: "consultant", result: "success" });
  const failingClient = {
    from: () => ({
      insert: async () => ({ error: { message: "relation \"audit_log\" does not exist" } }),
    }),
  };

  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };
  try {
    await assert.doesNotReject(() => recordAuditEvent(failingClient, event));
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warned, true);
});

test("recordAuditEvent: never throws even when the client itself throws", async () => {
  const event = buildAuditEvent({ action: "lead_created", actorId: "user-1", actorRole: "consultant", result: "success" });
  const throwingClient = {
    from: () => ({
      insert: async () => {
        throw new Error("network error");
      },
    }),
  };

  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await assert.doesNotReject(() => recordAuditEvent(throwingClient, event));
  } finally {
    console.warn = originalWarn;
  }
});
