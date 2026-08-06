// The one place every mutating Server Action calls before touching data —
// satisfies Phase 4's "central permission checks, no duplicated role logic
// in pages" requirement. A denial is itself an audited event before the
// typed error propagates, so "permission denied" never happens silently.

import { buildAuditEvent, recordAuditEvent } from "../audit/log";
import { createClient } from "../supabase/server";
import { PermissionDeniedError, requirePermission, type Permission } from "./roles";
import { requireUser, type CurrentUser } from "./session";

export async function requireOperationalPermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();

  try {
    requirePermission(user.role, permission);
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      const supabase = await createClient();
      await recordAuditEvent(
        supabase,
        buildAuditEvent({
          action: "permission_denied",
          actorId: user.id,
          actorRole: user.role,
          result: "denied",
          metadata: { attemptedPermission: permission },
        }),
      );
    }
    throw error;
  }

  return user;
}
