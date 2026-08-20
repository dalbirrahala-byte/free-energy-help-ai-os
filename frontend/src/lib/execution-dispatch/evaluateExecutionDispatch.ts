// Factory 041 Phase 8: non-executing execution dispatch boundary.
//
// Answers exactly one question: "may this already-persisted execution
// authorization be released to a future, not-yet-built provider-specific
// execution adapter now?" It does NOT answer "should this prospect be
// contacted" (decided upstream, by Phases 2-6) and it does NOT itself
// contact anybody. This module contains zero telephony/email/WhatsApp/
// SMS/AI-Voice/n8n code, zero provider SDK usage, and zero capability to
// reach any external system — there is nothing here that COULD dispatch
// outreach even if misused.
//
// A dispatch decision is NEVER produced from an in-memory Phase 6 object
// alone — it always requires an existing PERSISTED
// public.execution_authorizations row (Phase 7). No persisted record ->
// blocked, fail closed. This module performs exactly one read
// (SELECT ... .eq("idempotency_key", ...).maybeSingle()) and writes
// NOTHING — no INSERT, UPDATE, DELETE, or UPSERT anywhere in this file,
// against execution_authorizations or any other table. No new migration
// was needed: every field this module evaluates already exists on the
// Phase 7 table exactly as designed.
//
// REQUIRED REUSE, SATISFIED BY CONSTRUCTION: this module does not
// recompute suppression, identity confidence, contactability, consent/
// legal-basis, outreach eligibility, or Phase 6 authorization reasoning
// -- it only reads the already-persisted OUTCOME of each of those
// (`authorization_status`, `human_approval_state`,
// `outreach_eligibility_status`) off the Phase 7 row and re-validates
// structural/consistency facts (channel match, execution state,
// expiry) that are specific to the dispatch-release decision itself.
//
// COMMERCIAL SEPARATION, STRUCTURAL: public.execution_authorizations
// (Phase 7) was itself designed with no opportunity-score/estimated-
// value/commission/renewal-attractiveness/lead-priority column at all --
// this module's SELECT cannot fetch what was never persisted, so there
// is no code path by which a commercial signal could ever reach, let
// alone influence, this decision.
//
// PHASE 8's "needs_review" STATUS IS RESERVED, CURRENTLY UNREACHABLE:
// the status union includes `needs_review` (matching the suggested
// vocabulary and Phase 7's own schema philosophy of reserving values for
// future, not-yet-defined states), but no condition in this module's
// logic currently produces it. Every ambiguous/incomplete upstream
// signal (human approval "required"/"unknown", outreach eligibility not
// "eligible_for_handoff") maps to `blocked`, not `needs_review` -- unlike
// Phase 6, which is allowed to say "not sure yet, a human should look,"
// Phase 8 is the LATE, final release gate: by this point that ambiguity
// must already have been resolved upstream, and there is no human-review
// workflow at the dispatch-release boundary to route into. Reserving
// `needs_review` in the type without inventing a condition to reach it
// avoids fabricating behaviour, matching this project's standing
// discipline against inventing untested logic.
//
// IDEMPOTENCY: the persisted `idempotency_key` is the sole, authoritative
// lookup key -- this module never creates, replaces, regenerates, or
// bypasses it, and never implements a second idempotency store.
// `ExecutionDispatchEvidence.idempotencyKey` exposes this same persisted,
// canonical value (`record.idempotency_key`, never `request.idempotencyKey`)
// so that a downstream consumer (Phase 9) can establish its own
// provenance chain back to the Phase 7 record, rather than trusting
// whatever idempotency key its own caller happened to supply.
//
// CONTACT-ID PROVENANCE (Phase 11 hardening): `ExecutionDispatchEvidence
// .contactId` exposes the same persisted `record.contact_id` -- again
// NEVER a caller-supplied value -- so that Phase 9/11 can establish an
// unbroken provenance chain from the Phase 7 record to whichever contact
// a destination may ever be resolved for.

import type { createClient } from "../supabase/server";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_TOKEN_LENGTH = 200;

export type ExecutionDispatchRequest = {
  /** The canonical, authoritative lookup key -- matches Phase 7's persisted idempotency_key exactly. */
  idempotencyKey: string;
  /** Optional cross-check against the persisted action_id; skipped if not supplied. */
  actionId?: string | null;
  requestedChannel: ContactChannel;
};

/** Only the columns dispatch evaluation needs, plus `contact_id` (added for Phase 11 contact-id provenance hardening) -- still deliberately excludes organisation_id/source_id/campaign_id/evidence/notes (data minimisation; none of those are needed for this decision). */
export type PersistedExecutionAuthorizationRecord = {
  id: number;
  action_id: string;
  idempotency_key: string;
  requested_channel: string;
  authorization_status: string;
  human_approval_state: string;
  policy_version: string;
  expires_at: string | null;
  outreach_eligibility_status: string;
  execution_performed: boolean;
  execution_performed_at: string | null;
  execution_reference: string | null;
  contact_id: number | null;
};

export type ExecutionDispatchStatus = "ready_for_dispatch" | "blocked" | "needs_review" | "evaluation_failed";

export type ExecutionDispatchReason = { factor: string; detail: string };

export type ExecutionDispatchEvidence = {
  authorizationRecordId: number | null;
  actionId: string | null;
  /** The persisted Phase 7 canonical idempotency_key, taken from `record.idempotency_key` -- NEVER from the request. Null when there is no persisted record (or the read failed). An internal execution identifier, not destination PII. */
  idempotencyKey: string | null;
  /** The persisted Phase 7 `record.contact_id` -- NEVER a caller-supplied value. Null when there is no persisted record (or the read failed). Added for Phase 11 contact-id provenance hardening: this is the sole authoritative source for which contact a resolved destination may ever belong to. */
  contactId: number | null;
  requestedChannel: ContactChannel;
  persistedChannel: string | null;
  authorizationStatus: string | null;
  humanApprovalState: string | null;
  outreachEligibilityStatus: string | null;
  policyVersion: string | null;
  expiryState: "none" | "future" | "expired" | "invalid";
  executionState: "not_performed" | "already_performed" | "inconsistent";
};

export type ExecutionDispatchDecision = {
  status: ExecutionDispatchStatus;
  readyForDispatch: boolean;
  requestedChannel: ContactChannel;
  reasons: ExecutionDispatchReason[];
  evidence: ExecutionDispatchEvidence;
  /** Always the literal `false`. ready_for_dispatch means only "a future provider adapter may receive this action" -- never that anything was sent. */
  executionPerformed: false;
  evaluatedAt: string;
};

/** Same structural-usability rule as every prior phase in this chain: non-empty after trim, within a sane length bound. Independently re-checked here rather than trusted from the DB read, per this module's fail-closed discipline. */
function isUsableToken(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

function classifyExpiry(expiresAt: string | null, evaluatedAt: Date): "none" | "future" | "expired" | "invalid" {
  if (expiresAt === null) return "none";
  const parsed = new Date(expiresAt).getTime();
  if (Number.isNaN(parsed)) return "invalid";
  return parsed > evaluatedAt.getTime() ? "future" : "expired";
}

function classifyExecutionState(record: PersistedExecutionAuthorizationRecord): "not_performed" | "already_performed" | "inconsistent" {
  if (record.execution_performed === true) return "already_performed";
  // execution_performed is false: any populated execution_performed_at
  // or execution_reference is a contradiction this module will not
  // silently trust or repair.
  if (record.execution_performed_at !== null || record.execution_reference !== null) return "inconsistent";
  return "not_performed";
}

function buildEvidence(
  record: PersistedExecutionAuthorizationRecord | null,
  request: ExecutionDispatchRequest,
  evaluatedAt: Date,
): ExecutionDispatchEvidence {
  return {
    authorizationRecordId: record?.id ?? null,
    actionId: record?.action_id ?? null,
    idempotencyKey: record?.idempotency_key ?? null,
    contactId: record?.contact_id ?? null,
    requestedChannel: request.requestedChannel,
    persistedChannel: record?.requested_channel ?? null,
    authorizationStatus: record?.authorization_status ?? null,
    humanApprovalState: record?.human_approval_state ?? null,
    outreachEligibilityStatus: record?.outreach_eligibility_status ?? null,
    policyVersion: record?.policy_version ?? null,
    expiryState: record ? classifyExpiry(record.expires_at, evaluatedAt) : "none",
    executionState: record ? classifyExecutionState(record) : "not_performed",
  };
}

/**
 * Pure. Never performs I/O, never mutates its arguments, never itself
 * fails -- a database read failure is represented by the caller
 * (evaluateExecutionDispatchWithLookup) returning `evaluation_failed`
 * directly, without ever calling this function. `record: null` means
 * "no persisted authorization found for this idempotency key," a
 * definite fact, not an uncertain failure -- it maps to `blocked`, per
 * the explicit "no record -> blocked / failed closed" requirement.
 *
 * Every check below is independent and fail-closed: the first failing
 * condition determines the result, and no later or otherwise-positive
 * signal can undo an earlier failure.
 */
export function evaluateExecutionDispatch(
  record: PersistedExecutionAuthorizationRecord | null,
  request: ExecutionDispatchRequest,
  evaluatedAt: Date,
): ExecutionDispatchDecision {
  const evaluatedAtIso = evaluatedAt.toISOString();
  const evidence = buildEvidence(record, request, evaluatedAt);
  const reasons: ExecutionDispatchReason[] = [];

  function blocked(factor: string, detail: string): ExecutionDispatchDecision {
    reasons.push({ factor, detail });
    return {
      status: "blocked",
      readyForDispatch: false,
      requestedChannel: request.requestedChannel,
      reasons,
      evidence,
      executionPerformed: false,
      evaluatedAt: evaluatedAtIso,
    };
  }

  if (!record) {
    return blocked("Authorization record", "No persisted execution_authorizations record was found for this idempotency key.");
  }

  // Idempotency identity cross-check (hardening): the database lookup
  // (evaluateExecutionDispatchWithLookup) already filters by
  // request.idempotencyKey, but this pure function must never simply
  // trust that filter blindly -- it independently re-verifies the
  // request's own key is structurally usable (reusing the exact same
  // isUsableToken() rule already used below for action_id/
  // idempotency_key, not a new format/regex), and that it exactly
  // equals the key actually stored on the record it was given. This
  // protects the pure evaluator against being called directly with a
  // mismatched record/request pair (a caller bug, a stale cached
  // record, or a test double) -- the lookup's own correctness is never
  // assumed here. No trimming, rewriting, normalisation, regeneration,
  // or case-folding is performed anywhere in this check -- the
  // persisted canonical key (Phase 7's own trimmed/canonical-storage
  // guarantee) remains the sole authority; this is a strict equality
  // comparison only.
  if (!isUsableToken(request.idempotencyKey)) {
    return blocked("Idempotency", "Request idempotencyKey is not structurally usable.");
  }
  if (request.idempotencyKey !== record.idempotency_key) {
    return blocked(
      "Idempotency",
      "Request idempotencyKey does not exactly match the persisted authorization record's idempotency_key — idempotency identity mismatch.",
    );
  }

  if (record.authorization_status === "revoked") {
    return blocked("Authorization status", "Persisted authorization has been revoked — never dispatchable.");
  }
  if (record.authorization_status === "expired") {
    return blocked("Authorization status", "Persisted authorization status is 'expired' — never dispatchable.");
  }
  if (record.authorization_status !== "authorised") {
    return blocked("Authorization status", `Persisted authorization status is '${record.authorization_status}', not 'authorised'.`);
  }

  if (request.actionId != null && request.actionId !== record.action_id) {
    return blocked("Action identity", "Dispatch request actionId does not match the persisted record's action_id.");
  }
  if (!isUsableToken(record.action_id)) {
    return blocked("Action identity", "Persisted action_id is not structurally usable.");
  }
  if (!isUsableToken(record.idempotency_key)) {
    return blocked("Idempotency", "Persisted idempotency_key is not structurally usable.");
  }
  if (!record.policy_version || record.policy_version.trim().length === 0) {
    return blocked("Policy version", "Persisted policy_version is missing or blank.");
  }

  if (record.requested_channel !== request.requestedChannel) {
    return blocked(
      "Channel consistency",
      `Requested dispatch channel '${request.requestedChannel}' does not match the persisted authorization channel '${record.requested_channel}'. No channel rewriting or fallback is permitted.`,
    );
  }

  if (evidence.executionState === "already_performed") {
    return blocked("Execution state", "execution_performed is already true — this action cannot be dispatched again.");
  }
  if (evidence.executionState === "inconsistent") {
    return blocked(
      "Execution state",
      "Persisted execution state is internally inconsistent (execution_performed is false but execution_performed_at and/or execution_reference is populated) — failing closed rather than trusting or repairing it.",
    );
  }

  if (evidence.expiryState === "expired") {
    return blocked("Expiry", "Persisted expires_at is in the past — authorization has expired.");
  }
  if (evidence.expiryState === "invalid") {
    return blocked("Expiry", "Persisted expires_at could not be parsed as a valid timestamp — failing closed.");
  }

  if (record.outreach_eligibility_status !== "eligible_for_handoff") {
    return blocked(
      "Outreach eligibility",
      `Persisted outreach_eligibility_status is '${record.outreach_eligibility_status}', not 'eligible_for_handoff'.`,
    );
  }

  if (record.human_approval_state === "rejected") {
    return blocked("Human approval", "Persisted human_approval_state is 'rejected'.");
  }
  if (record.human_approval_state === "required") {
    return blocked("Human approval", "Persisted human_approval_state is 'required' — ambiguity must be resolved upstream, not at dispatch release.");
  }
  if (record.human_approval_state === "unknown") {
    return blocked("Human approval", "Persisted human_approval_state is 'unknown' — never assumed approved.");
  }
  if (record.human_approval_state !== "approved" && record.human_approval_state !== "not_required") {
    return blocked("Human approval", `Persisted human_approval_state '${record.human_approval_state}' is not a recognised passing state.`);
  }

  reasons.push({
    factor: "Overall",
    detail: "Persisted authorization is authorised, channel-consistent, unexecuted, unexpired, eligibility-confirmed, and approval-clear.",
  });

  return {
    status: "ready_for_dispatch",
    readyForDispatch: true,
    requestedChannel: request.requestedChannel,
    reasons,
    evidence,
    executionPerformed: false,
    evaluatedAt: evaluatedAtIso,
  };
}

/**
 * The only function in this module that performs I/O: one read-only
 * SELECT against public.execution_authorizations, filtered by the
 * caller-supplied idempotency key. No INSERT/UPDATE/DELETE/UPSERT
 * anywhere. A read error resolves to `evaluation_failed` directly --
 * this function never calls evaluateExecutionDispatch() with a guessed
 * record when the read itself failed, since a read failure is not
 * evidence the record doesn't exist (unlike a clean zero-row result,
 * which is).
 */
export async function evaluateExecutionDispatchWithLookup(
  supabase: SupabaseServerClient,
  request: ExecutionDispatchRequest,
  evaluatedAt: Date,
): Promise<ExecutionDispatchDecision> {
  const { data, error } = await supabase
    .from("execution_authorizations")
    .select(
      "id, action_id, idempotency_key, requested_channel, authorization_status, human_approval_state, policy_version, expires_at, outreach_eligibility_status, execution_performed, execution_performed_at, execution_reference, contact_id",
    )
    .eq("idempotency_key", request.idempotencyKey)
    .maybeSingle();

  if (error) {
    return {
      status: "evaluation_failed",
      readyForDispatch: false,
      requestedChannel: request.requestedChannel,
      reasons: [{ factor: "Database read", detail: `Failed to load the persisted authorization record: ${error.message}` }],
      evidence: buildEvidence(null, request, evaluatedAt),
      executionPerformed: false,
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }

  return evaluateExecutionDispatch(data as PersistedExecutionAuthorizationRecord | null, request, evaluatedAt);
}
