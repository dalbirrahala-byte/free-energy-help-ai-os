// The one canonical authorisation service for Version 1.0. Every permission
// decision in the app — page-level, Server Action, or future RLS policy —
// is expressed here, once, as a typed lookup. No page or action re-derives
// its own notion of "who's allowed to do this."
//
// Version 1.0 access model (approved, RC1): organisation-wide authenticated
// access. There is no per-user record ownership and no multi-tenancy — see
// docs/DECISIONS.md ADR-008. All five roles see the same records; they
// differ only in which *operations* they may perform, never in which rows
// they can see.
//
// Operations and Consultant are organisationally distinct job functions but
// are technically identical in Version 1.0 — no schema field exists to
// scope "my leads" vs "their leads," so there is nothing to enforce a
// difference on. If that's needed later, it requires a deliberate,
// separately-approved schema change (an assignment column), not a silent
// reinterpretation here.

export const ROLES = ["admin", "manager", "operations", "consultant", "read_only"] as const;
export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "read_only";

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type Permission =
  | "records:view" // leads, customers, tasks, activities — read
  | "records:write" // leads, customers, tasks, activities — create/update
  | "dashboards:view" // management dashboards beyond Mission Control's org-wide view
  | "security:administer" // grant/revoke roles, manage users
  | "audit:view"; // read the audit log

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["records:view", "records:write", "dashboards:view", "security:administer", "audit:view"],
  manager: ["records:view", "records:write", "dashboards:view"],
  operations: ["records:view", "records:write"],
  consultant: ["records:view", "records:write"],
  read_only: ["records:view"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export class PermissionDeniedError extends Error {
  role: Role;
  permission: Permission;

  constructor(role: Role, permission: Permission) {
    super(`Role "${role}" does not have permission "${permission}".`);
    this.name = "PermissionDeniedError";
    this.role = role;
    this.permission = permission;
  }
}

/**
 * The single enforcement point every Server Action should call before
 * performing a write or admin operation. Throws a typed, safe error — never
 * leaks internals, never silently no-ops. UI visibility (hiding a button)
 * is never treated as security on its own; this is the real check.
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionDeniedError(role, permission);
  }
}
