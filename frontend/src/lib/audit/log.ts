// Production audit trail (Phase 6). buildAuditEvent is pure and fully unit
// tested. recordAuditEvent needs a live Supabase client and degrades to a
// server-side console.warn if public.audit_log doesn't exist yet or the
// insert fails for any reason — the same graceful-fallback pattern used by
// lib/auth/session.ts's role lookup, so audit calls are safe to add to
// application code before the audit_log migration has been applied.
//
// Never logs passwords, tokens, API keys, or full secret values — every
// call site in this codebase passes only IDs, role names, action labels,
// and small typed metadata, never a raw request body or credential.

import type { Role } from "../auth/roles";

export type AuditAction =
  | "login_success"
  | "login_failure"
  | "logout"
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "public_lead_ingested"
  | "task_created"
  | "task_completed"
  | "activity_recorded"
  | "contract_status_changed"
  | "renewal_status_changed"
  | "permission_denied"
  | "admin_change"
  | "lead_qualification_scored"
  // Factory 031: Action Eligibility / Authorization Audit boundary. These
  // describe only the existing, human-controlled task-creation workflow
  // passing (or being blocked by) the eligibility gate — never a customer
  // being contacted, a message being sent, or any external system being
  // invoked. "action_authorized" means "the manual workflow may proceed,"
  // nothing more. Dispatch-related states (dispatched, delivered,
  // call_completed, etc.) belong to a separately approved future factory
  // and must not be added here.
  | "action_requested"
  | "action_eligibility_checked"
  | "action_authorized"
  | "action_eligibility_blocked"
  // Factory 032: Revenue Execution Orchestration. Describes only that an
  // in-memory execution PLAN was prepared (or refused) from an already-
  // authorized Factory 031 action — never that anything was actually sent,
  // called, or dispatched. This module has no adapter and no route; these
  // events exist purely for orchestration-decision traceability.
  | "execution_plan_created"
  | "execution_plan_blocked";

export type AuditResult = "success" | "failure" | "denied";

export type AuditMetadataValue = string | number | boolean | null;

export type AuditEvent = {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorRole: Role | null;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  correlationId: string;
  result: AuditResult;
  metadata: Record<string, AuditMetadataValue> | null;
};

export type BuildAuditEventInput = {
  action: AuditAction;
  actorId: string | null;
  actorRole: Role | null;
  entityType?: string | null;
  entityId?: string | number | null;
  correlationId?: string;
  result: AuditResult;
  metadata?: Record<string, AuditMetadataValue> | null;
};

/** Pure — no I/O, no clock/UUID injection needed by callers, fully unit tested. */
export function buildAuditEvent(input: BuildAuditEventInput): AuditEvent {
  return {
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
    correlationId: input.correlationId ?? crypto.randomUUID(),
    result: input.result,
    metadata: input.metadata ?? null,
  };
}

type AuditSupabaseClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>;
  };
};

/**
 * Persists one audit event. Never throws — a failed insert (table not
 * migrated yet, transient DB error) is logged server-side and swallowed,
 * because an audit-logging failure must never block the underlying
 * business action (creating a lead must still succeed even if the audit
 * row can't be written).
 */
export async function recordAuditEvent(supabase: AuditSupabaseClient, event: AuditEvent): Promise<void> {
  try {
    const { error } = await supabase.from("audit_log").insert({
      id: event.id,
      occurred_at: event.occurredAt,
      actor_id: event.actorId,
      actor_role: event.actorRole,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      correlation_id: event.correlationId,
      result: event.result,
      metadata: event.metadata,
    });

    if (error) {
      console.warn(`[Audit] Failed to persist audit event "${event.action}" (${event.id}): ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `[Audit] Threw while persisting audit event "${event.action}" (${event.id}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
