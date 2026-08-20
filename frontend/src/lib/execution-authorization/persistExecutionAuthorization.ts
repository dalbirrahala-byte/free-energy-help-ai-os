// Factory 041 Phase 7: durable persistence of a completed execution
// authorization decision.
//
// This module does NOT recompute authorization, does NOT alter the
// decision it's given, does NOT contact anybody, and does NOT flip
// execution_performed to true — there is no writer for that anywhere in
// this file. It performs exactly one job: take an already-completed
// Phase 6 ExecutionAuthorizationDecision and durably record it in
// public.execution_authorizations (schema:
// 20260820100000_execution_authorization_foundation.sql), relying on
// that table's own unique index on idempotency_key as the sole,
// concurrency-safe protection against a duplicate record — never a
// check-then-insert race, matching the exact discipline already
// established by public.ingest_external_lead() for
// leads.(provider, external_lead_id).
//
// ALL FOUR PHASE 6 OUTCOMES ARE PERSISTABLE (authorised/blocked/
// needs_review/evaluation_failed) — persisting only successful
// authorisations would make later audit incomplete. The one thing that
// blocks persistence entirely is a missing/invalid actionId or
// idempotencyKey: Phase 6 already represents that case by leaving
// `decision.authorizationClaim` null (see evaluateExecutionAuthorization.ts),
// and this writer refuses to persist when that's true — the destination
// table's action_id/idempotency_key columns are both NOT NULL with a
// length CHECK, so there is nothing safe to insert, and this module
// rejects it BEFORE ever calling Supabase rather than surfacing a raw
// constraint-violation error.
//
// COMMERCIAL SIGNALS HAVE NO EFFECT HERE, STRUCTURALLY: the persistence
// payload is built entirely from `decision.status`,
// `decision.authorizationClaim`, `decision.humanApproval`, and
// `decision.outreachEligibilityDecision.status` — nothing in this file
// ever reads `outreachEligibilityDecision.evidence.opportunityContext`.
// `authorization_status` is always a direct, unaltered copy of
// `decision.status`; nothing here can "upgrade" a blocked/needs_review
// decision into an authorised database row.
//
// DATA MINIMISATION: `evidence` persists only `decision.reasons` and
// `decision.evidence` (both already non-PII structured shapes,
// established by Phases 4-6) — never a raw email/telephone or a
// duplicated contact/customer record.

import type {
  ExecutionAuthorizationClaim,
  ExecutionAuthorizationDecision,
  ExecutionAuthorizationStatus,
  HumanApprovalState,
} from "./evaluateExecutionAuthorization.ts";
import type { OutreachEligibilityStatus } from "../outreach/evaluateOutreachEligibility.ts";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Reference metadata the completed decision itself doesn't carry (Phase 4's evidence deliberately stores only presence booleans, never the raw IDs) — the caller supplies these separately. */
export type PersistExecutionAuthorizationReferences = {
  organisationId?: number | null;
  contactId?: number | null;
  sourceId?: number | null;
  campaignId?: string | null;
  actorId?: string | null;
};

/** Exact shape of the row this module inserts — column names match public.execution_authorizations verbatim. */
export type ExecutionAuthorizationPersistencePayload = {
  action_id: string;
  idempotency_key: string;
  requested_channel: ContactChannel;
  authorization_status: ExecutionAuthorizationStatus;
  human_approval_state: HumanApprovalState;
  policy_version: string;
  authorised_at: string | null;
  expires_at: string | null;
  actor_id: string | null;
  organisation_id: number | null;
  contact_id: number | null;
  source_id: number | null;
  campaign_id: string | null;
  outreach_eligibility_status: OutreachEligibilityStatus;
  execution_performed: false;
  execution_performed_at: null;
  execution_reference: null;
  evidence: Record<string, unknown>;
  notes: string | null;
};

export type PersistExecutionAuthorizationResult =
  | { outcome: "created"; id: number; payload: ExecutionAuthorizationPersistencePayload }
  | { outcome: "duplicate"; existingId: number | null; existingAuthorizationStatus: string | null; idempotencyKey: string }
  | { outcome: "rejected"; reason: string }
  | { outcome: "failed"; error: string };

/**
 * Pure. Returns null when the decision has no valid authorizationClaim
 * (actionId or idempotencyKey was structurally invalid) — nothing safe
 * to persist in that case. Never mutates `decision` or `references`.
 */
export function buildExecutionAuthorizationPersistencePayload(
  decision: ExecutionAuthorizationDecision,
  references: PersistExecutionAuthorizationReferences = {},
): ExecutionAuthorizationPersistencePayload | null {
  const claim: ExecutionAuthorizationClaim | null = decision.authorizationClaim;
  if (!claim) {
    return null;
  }

  return {
    action_id: claim.actionId,
    idempotency_key: claim.idempotencyKey,
    requested_channel: claim.requestedChannel,
    authorization_status: decision.status,
    human_approval_state: decision.humanApproval,
    policy_version: claim.policyVersion,
    authorised_at: decision.status === "authorised" ? decision.evaluatedAt : null,
    expires_at: null,
    actor_id: references.actorId ?? null,
    organisation_id: references.organisationId ?? null,
    contact_id: references.contactId ?? null,
    source_id: references.sourceId ?? null,
    campaign_id: references.campaignId ?? null,
    outreach_eligibility_status: decision.outreachEligibilityDecision.status,
    execution_performed: false,
    execution_performed_at: null,
    execution_reference: null,
    evidence: {
      reasons: decision.reasons,
      evidence: decision.evidence,
    },
    notes: null,
  };
}

/**
 * Postgres unique_violation (23505) is the authoritative signal. The
 * message-based fallback is deliberately narrow — it names only the
 * exact unique index (execution_authorizations_idempotency_key_idx),
 * never the broader substring "idempotency_key" alone. That substring
 * also appears in this table's unrelated CHECK constraint names
 * (execution_authorizations_idempotency_key_length_check,
 * _canonical_check), so matching on it would have wrongly classified an
 * ordinary validation failure (a blank/oversized/non-canonical key,
 * error code 23514) as a duplicate — exactly the "unrelated validation
 * error broadly classified as duplicate" failure mode this check exists
 * to avoid. The fallback exists only for a mock/driver that doesn't
 * surface the `code` field; real Supabase/Postgres errors are always
 * caught by the `code === "23505"` check above.
 */
function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  if (error.code === "23505") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("execution_authorizations_idempotency_key_idx");
}

/**
 * The only function in this module that performs I/O. Relies entirely
 * on the destination table's unique index for duplicate protection — no
 * pre-insert existence check, deliberately, to avoid a check-then-insert
 * race (see module header). A unique-violation error is read back
 * (read-only) to report the existing record's id/status for caller
 * visibility, but the existing row is never overwritten. Any other
 * insert error is reported as an explicit failure, never silently
 * treated as success.
 */
export async function persistExecutionAuthorization(
  supabase: SupabaseServerClient,
  decision: ExecutionAuthorizationDecision,
  references: PersistExecutionAuthorizationReferences = {},
): Promise<PersistExecutionAuthorizationResult> {
  const payload = buildExecutionAuthorizationPersistencePayload(decision, references);

  if (!payload) {
    return {
      outcome: "rejected",
      reason: "Decision has no valid authorizationClaim (missing/invalid action id or idempotency key) — nothing safe to persist.",
    };
  }

  const { data, error } = await supabase
    .from("execution_authorizations")
    .insert(payload)
    .select("id")
    .single();

  if (!error && data) {
    return { outcome: "created", id: (data as { id: number }).id, payload };
  }

  if (error && isUniqueViolation(error)) {
    // A plain equality match is safe here (no btrim() needed at query
    // time): payload.idempotency_key is already guaranteed trimmed by
    // Phase 6's evaluateExecutionAuthorization() before this writer ever
    // sees it, and the destination table's own
    // execution_authorizations_idempotency_key_canonical_check CHECK
    // constraint additionally guarantees every stored row's
    // idempotency_key is already in canonical (trimmed) form — so an
    // exact-match query against an already-canonical value always finds
    // the canonical stored row.
    const { data: existing, error: lookupError } = await supabase
      .from("execution_authorizations")
      .select("id, authorization_status")
      .eq("idempotency_key", payload.idempotency_key)
      .maybeSingle();

    // A read/RLS/network failure while verifying the conflict must never
    // be reported as a confirmed duplicate — that would let an
    // unverifiable state masquerade as a known-safe non-write outcome.
    // Fail closed instead: explicit failure, never silently upgraded to
    // "duplicate" (and never "created" — the insert did not succeed).
    if (lookupError) {
      return {
        outcome: "failed",
        error: `Idempotency conflict detected, but the existing record could not be verified: ${lookupError.message}`,
      };
    }

    const existingRow = existing as { id: number; authorization_status: string } | null;
    return {
      outcome: "duplicate",
      existingId: existingRow?.id ?? null,
      existingAuthorizationStatus: existingRow?.authorization_status ?? null,
      idempotencyKey: payload.idempotency_key,
    };
  }

  return { outcome: "failed", error: error?.message ?? "unknown error persisting execution authorization" };
}
