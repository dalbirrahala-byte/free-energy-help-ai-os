import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_ROLE, PermissionDeniedError, ROLES, hasPermission, isRole, requirePermission } from "./roles.ts";

test("ROLES contains exactly the five approved Version 1.0 roles", () => {
  assert.deepEqual([...ROLES], ["admin", "manager", "operations", "consultant", "read_only"]);
});

test("DEFAULT_ROLE is read_only — safest default, no auto-elevated privilege", () => {
  assert.equal(DEFAULT_ROLE, "read_only");
});

test("isRole: accepts every real role", () => {
  for (const role of ROLES) {
    assert.equal(isRole(role), true);
  }
});

test("isRole: rejects unknown strings", () => {
  assert.equal(isRole("superadmin"), false);
  assert.equal(isRole(""), false);
});

test("admin has every permission", () => {
  for (const permission of ["records:view", "records:write", "dashboards:view", "security:administer", "audit:view"] as const) {
    assert.equal(hasPermission("admin", permission), true);
  }
});

test("manager can view dashboards but not administer security or view audit", () => {
  assert.equal(hasPermission("manager", "dashboards:view"), true);
  assert.equal(hasPermission("manager", "records:write"), true);
  assert.equal(hasPermission("manager", "security:administer"), false);
  assert.equal(hasPermission("manager", "audit:view"), false);
});

test("operations and consultant are technically identical in Version 1.0 (no ownership field to differentiate on)", () => {
  for (const permission of ["records:view", "records:write", "dashboards:view", "security:administer", "audit:view"] as const) {
    assert.equal(hasPermission("operations", permission), hasPermission("consultant", permission));
  }
  assert.equal(hasPermission("operations", "records:write"), true);
  assert.equal(hasPermission("operations", "dashboards:view"), false);
});

test("read_only can view records but cannot write or administer anything", () => {
  assert.equal(hasPermission("read_only", "records:view"), true);
  assert.equal(hasPermission("read_only", "records:write"), false);
  assert.equal(hasPermission("read_only", "dashboards:view"), false);
  assert.equal(hasPermission("read_only", "security:administer"), false);
});

test("requirePermission: does not throw when the role has the permission", () => {
  assert.doesNotThrow(() => requirePermission("admin", "security:administer"));
});

test("requirePermission: throws a typed PermissionDeniedError when denied, never a generic error", () => {
  assert.throws(() => requirePermission("read_only", "records:write"), PermissionDeniedError);
});

test("PermissionDeniedError carries the role and permission for safe, specific audit logging", () => {
  try {
    requirePermission("consultant", "security:administer");
    assert.fail("expected requirePermission to throw");
  } catch (error) {
    assert.ok(error instanceof PermissionDeniedError);
    assert.equal(error.role, "consultant");
    assert.equal(error.permission, "security:administer");
  }
});
