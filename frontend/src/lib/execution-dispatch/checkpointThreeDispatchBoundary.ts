// Factory 041 Phase 15: checkpoint #3 application-boundary primitives.
//
// The DB-side checkpoint #3 chain (public.execution_provider_adapters,
// public.execution_dispatch_attempts, public.prepare_execution_dispatch(),
// public.complete_execution_dispatch_success/failure/indeterminate()) is
// represented by dormant migration source. Only the non-login execution
// worker role receives the six narrowly scoped function capabilities.
// This module is the TypeScript-side counterpart: it defines the
// provider-neutral vocabulary a future adapter invocation must use, and
// the "3B -- immediate pre-call gate" design from the Phase 16B.2b-6h
// authorisation. It does NOT wire this route into any page, route, or
// Server Action; it does NOT call any real provider; and every function
// here that touches the database calls only the already-deployed,
// already-dormant DB primitives -- calling them today, with today's
// anon/authenticated credentials, fails closed with a permission error,
// which this module treats identically to any other read failure.
//
// WHY A NEW TYPE, NOT A CHANGE TO ProviderNeutralDispatchContract: the
// Phase 9 contract (createProviderNeutralDispatchContract.ts) represents
// "this action is authorised and ready for dispatch" -- a fact that
// exists independently of whether a specific provider dispatch attempt
// has ever been prepared. `dispatchIdempotencyKey` is a different kind of
// fact: it identifies one specific, durable, DB-persisted dispatch
// ATTEMPT (public.execution_dispatch_attempts), which does not exist
// until `prepare_execution_dispatch()` has actually run. Adding it to the
// Phase 9 contract would misrepresent a not-yet-created fact as part of
// an already-sealed authorisation object, and would require rewriting
// the existing, heavily-tested Phase 9 contract shape for no safety
// benefit -- nothing on the DB-side security boundary depends on the
// TypeScript type shape at all. `PreparedExecutionDispatchEnvelope` below
// is therefore a distinct, additive type representing the OUTPUT of a
// (currently unreachable) `prepare_execution_dispatch()` call.
//
// PROVIDER-NEUTRAL RESULT VOCABULARY (Part Q): every future real adapter
// must eventually report one of exactly three outcomes -- success,
// definitive_failure, or indeterminate -- never a provider-specific
// object. `classifyProviderAdapterOutcome()` below maps the CURRENT
// Phase 10 `ProviderAdapterOutcome` vocabulary onto this richer
// vocabulary. Critically, `"accepted_noop"` maps to `"indeterminate"`,
// NEVER `"success"`: a no-op adapter provides no genuine confirmation
// that any real-world action occurred, so treating it as success would
// violate the one invariant this whole checkpoint exists to protect --
// "do not set execution_performed = true before confirmed provider
// success." This mapping structurally guarantees that no call through
// today's no-op registry can ever reach the DB's
// `complete_execution_dispatch_success()` finalisation writer with a
// legitimate "success" classification.
//
// THE UNAVOIDABLE PHYSICAL-WORLD BOUNDARY, STATED HONESTLY: a PostgreSQL
// row lock cannot be held across a network call to a third-party
// provider. `evaluateImmediateExecutionPrecallCheckpointWithLookup()`
// re-reads emergency state as close as possible to the moment
// `adapter.execute()` is about to be called, but a STOP that is admitted
// in the interval between this check returning and the provider call
// actually completing cannot be observed by this check -- no design can
// close that gap without holding a database lock across arbitrary
// network I/O, which would itself be an unacceptable availability and
// correctness hazard (see the DB migration's own "PART G" reasoning for
// why `execution_control_lock` is never held across dispatch preparation
// and the provider call). This is a real, permanent boundary, not a bug
// to be fixed later.
//
// LIVE SUPPRESSION AT THIS EXACT BOUNDARY -- SETTLED (Phase 16B.2b-6i):
// an earlier draft of this module deferred a live-suppression re-check at
// this boundary, reasoning that a second network round trip would itself
// widen the window between "last verified clear" and "provider invoked."
// The Phase 16B.2b-6i activation-readiness authorisation revisits this
// explicitly and resolves the tension differently: rather than choosing
// between "omit suppression" and "pay for a second round trip," a single
// strengthened DB primitive (public.evaluate_execution_precall_readiness(
// bigint, bigint, bigint, text), 20260826100000...sql) now re-checks BOTH
// persisted dispatch/adapter binding, live suppression, and emergency
// state, server-side, inside one function call -- so this boundary gets
// both freshness guarantees for the price of the one round trip it always
// needed anyway. See that migration's own header for the full reasoning.

import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ProviderAdapterOutcome } from "./providerAdapter.ts";
import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MAX_REFERENCE_LENGTH = 200;

/**
 * The output of a worker-only call to the DB's
 * `prepare_execution_dispatch(bigint, bigint)`. Represents one durable
 * provider-attempt identity -- never proof that a provider call has
 * happened. `dispatchIdempotencyKey` is always the deterministic,
 * server-derived value the database itself computed
 * (`'feh-dispatch-v1|' || execution_authorization_id`) -- this module
 * never generates or accepts a caller-supplied one.
 */
export type PreparedExecutionDispatchEnvelope = {
  readonly executionAuthorizationId: number;
  readonly executionDispatchAttemptId: number;
  readonly dispatchIdempotencyKey: string;
  readonly providerAdapterId: number;
  readonly providerAdapterKey: string;
  readonly channel: ContactChannel;
  /** Authoritative trimmed destination loaded and commitment-verified by the preparation RPC. */
  readonly destination: string;
  /** Always the literal `false`. A prepared attempt means "may be dispatched" -- never that the provider was called. */
  readonly executionPerformed: false;
};

export type ExecutionDispatchPreparationStatus = "prepared" | "no_change" | "blocked" | "evaluation_failed";

export type ExecutionDispatchPreparationResult = {
  readonly status: ExecutionDispatchPreparationStatus;
  readonly preparedDispatch: PreparedExecutionDispatchEnvelope | null;
};

export type ProviderDispatchResultStatus = "success" | "definitive_failure" | "indeterminate";

/**
 * Provider-neutral outcome shape (Part Q). No provider-specific object
 * (Twilio response, SendGrid response, etc.) may ever cross this
 * boundary -- an adapter that needs to expose richer provider metadata
 * must normalise it into `providerReference`/`failureCode` first.
 */
export type ProviderDispatchResult = {
  readonly status: ProviderDispatchResultStatus;
  readonly providerReference?: string;
  readonly failureCode?: string;
};

/** Same bound as every other reference/evidence field in this chain. */
function isUsableReference(value: string | null | undefined): value is string {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_REFERENCE_LENGTH;
}

/**
 * Maps the CURRENT Phase 10 no-op-only adapter vocabulary onto the
 * provider-neutral result vocabulary a real future adapter will report
 * directly. `"accepted_noop"` NEVER maps to `"success"` -- see module
 * header. This function performs no I/O and never throws.
 */
export function classifyProviderAdapterOutcome(outcome: ProviderAdapterOutcome): ProviderDispatchResult {
  if (outcome.status === "accepted_noop") {
    // Deliberately indeterminate, never success -- a no-op confirms nothing
    // about the real world. See module header.
    return { status: "indeterminate" };
  }
  if (outcome.status === "rejected") {
    return { status: "definitive_failure" };
  }
  // "evaluation_failed" and any other unrecognised status both fail closed
  // to indeterminate -- an adapter-side anomaly is never trusted as proof
  // of either success or definitive failure.
  return { status: "indeterminate" };
}

export type ImmediateExecutionPrecallCheckpointStatus = "precall_ready" | "blocked" | "evaluation_failed";

export type ImmediateExecutionPrecallCheckpointResult = {
  readonly status: ImmediateExecutionPrecallCheckpointStatus;
  readonly reason: string;
};

/**
 * Pure. The core "3B -- immediate pre-call gate" decision (Part J),
 * SETTLED per the Phase 16B.2b-6i activation-readiness authorisation:
 * live suppression and emergency state are now BOTH re-checked at this
 * boundary, through a single DB round trip (public.evaluate_execution_
 * precall_readiness(bigint)) -- see that function's own header for why
 * one combined call was chosen over either omitting suppression or
 * adding a second, latency-widening round trip. Requires the freshly-read
 * combined readiness state to be EXACTLY `"clear"`, NULL-safe -- `null`,
 * `undefined`, `"evaluation_failed"`, or any other unrecognised value all
 * fail closed to `"evaluation_failed"`, never `"precall_ready"`. Never
 * performs I/O; the caller is responsible for obtaining
 * `precallReadinessState` from the trusted DB primitive immediately
 * beforehand -- see `evaluateImmediateExecutionPrecallCheckpointWithLookup`.
 */
export function evaluateImmediateExecutionPrecallCheckpoint(
  precallReadinessState: string | null | undefined,
): ImmediateExecutionPrecallCheckpointResult {
  if (precallReadinessState === "clear") {
    return { status: "precall_ready", reason: "Suppression and emergency state are both clear as of the immediate pre-call read." };
  }
  if (precallReadinessState === "blocked") {
    return { status: "blocked", reason: "Suppression is active or emergency state is stopped -- provider invocation refused." };
  }
  return {
    status: "evaluation_failed",
    reason: "Precall readiness could not be read or returned an unrecognised value -- refusing to treat an unreadable signal as clear.",
  };
}

/**
 * I/O wrapper. Calls the DB's four-argument strengthened
 * `evaluate_execution_precall_readiness` primitive -- revoked from
 * `anon`/`authenticated`/`service_role`,
 * so this call fails with a permission error under current credentials,
 * which this wrapper treats identically to any other read failure:
 * `evaluation_failed`, never `precall_ready`. This is the intended
 * behaviour for any ordinary application identity. All four binding values
 * come from the same database-returned prepared envelope; none is re-derived.
 */
export async function evaluateImmediateExecutionPrecallCheckpointWithLookup(
  supabase: SupabaseServerClient,
  preparedDispatch: PreparedExecutionDispatchEnvelope,
): Promise<ImmediateExecutionPrecallCheckpointResult> {
  if (!isUsablePreparedExecutionDispatchEnvelope(preparedDispatch)) {
    return { status: "evaluation_failed", reason: "Prepared dispatch envelope is structurally invalid." };
  }

  const { data, error } = await supabase.rpc("evaluate_execution_precall_readiness", {
    p_execution_dispatch_attempt_id: preparedDispatch.executionDispatchAttemptId,
    p_execution_authorization_id: preparedDispatch.executionAuthorizationId,
    p_expected_provider_adapter_id: preparedDispatch.providerAdapterId,
    p_expected_adapter_key: preparedDispatch.providerAdapterKey,
  });

  if (error) {
    return {
      status: "evaluation_failed",
      reason: "Failed to read combined precall readiness (suppression + emergency state) immediately before provider invocation.",
    };
  }

  return evaluateImmediateExecutionPrecallCheckpoint(typeof data === "string" ? data : null);
}

const PREPARATION_STATUSES: ReadonlySet<ExecutionDispatchPreparationStatus> = new Set([
  "prepared",
  "no_change",
  "blocked",
  "evaluation_failed",
]);

function isNullEnvelopeRow(row: Record<string, unknown>): boolean {
  return [
    "execution_authorization_id",
    "execution_dispatch_attempt_id",
    "dispatch_idempotency_key",
    "provider_adapter_id",
    "provider_adapter_key",
    "channel",
    "destination",
    "execution_performed",
  ].every((key) => row[key] == null);
}

/**
 * Parses the one-row SETOF response emitted by prepare_execution_dispatch().
 * Provenance comes from receiving this value directly from that trusted RPC in
 * the same server-only flow. Structural validity alone is never proof of it.
 */
export function parseExecutionDispatchPreparationResult(data: unknown): ExecutionDispatchPreparationResult {
  if (!Array.isArray(data) || data.length !== 1 || typeof data[0] !== "object" || data[0] === null) {
    return { status: "evaluation_failed", preparedDispatch: null };
  }

  const row = data[0] as Record<string, unknown>;
  const status = row.preparation_status;
  if (typeof status !== "string" || !PREPARATION_STATUSES.has(status as ExecutionDispatchPreparationStatus)) {
    return { status: "evaluation_failed", preparedDispatch: null };
  }

  if (status !== "prepared") {
    return isNullEnvelopeRow(row)
      ? { status: status as ExecutionDispatchPreparationStatus, preparedDispatch: null }
      : { status: "evaluation_failed", preparedDispatch: null };
  }

  const preparedDispatch = {
    executionAuthorizationId: row.execution_authorization_id,
    executionDispatchAttemptId: row.execution_dispatch_attempt_id,
    dispatchIdempotencyKey: row.dispatch_idempotency_key,
    providerAdapterId: row.provider_adapter_id,
    providerAdapterKey: row.provider_adapter_key,
    channel: row.channel,
    destination: row.destination,
    executionPerformed: row.execution_performed,
  } as PreparedExecutionDispatchEnvelope;

  return isUsablePreparedExecutionDispatchEnvelope(preparedDispatch)
    ? { status: "prepared", preparedDispatch }
    : { status: "evaluation_failed", preparedDispatch: null };
}

/** Server-only dormant wrapper for the authoritative preparation writer. */
export async function prepareExecutionDispatchWithLookup(
  supabase: SupabaseServerClient,
  executionAuthorizationId: number,
  providerAdapterId: number,
): Promise<ExecutionDispatchPreparationResult> {
  if (!Number.isInteger(executionAuthorizationId) || executionAuthorizationId <= 0 ||
      !Number.isInteger(providerAdapterId) || providerAdapterId <= 0) {
    return { status: "evaluation_failed", preparedDispatch: null };
  }

  const { data, error } = await supabase.rpc("prepare_execution_dispatch", {
    p_execution_authorization_id: executionAuthorizationId,
    p_provider_adapter_id: providerAdapterId,
  });
  return error ? { status: "evaluation_failed", preparedDispatch: null } : parseExecutionDispatchPreparationResult(data);
}

/**
 * Structural validity check only -- never authority. A future application
 * boundary must still confirm the envelope was genuinely produced by
 * `prepare_execution_dispatch()` (never constructed ad hoc) before
 * calling an adapter with it; this function only rejects a structurally
 * unusable envelope early.
 */
export function isUsablePreparedExecutionDispatchEnvelope(
  envelope: PreparedExecutionDispatchEnvelope | null | undefined,
): envelope is PreparedExecutionDispatchEnvelope {
  if (envelope == null) return false;
  return (
    Number.isInteger(envelope.executionAuthorizationId) &&
    envelope.executionAuthorizationId > 0 &&
    Number.isInteger(envelope.executionDispatchAttemptId) &&
    envelope.executionDispatchAttemptId > 0 &&
    Number.isInteger(envelope.providerAdapterId) &&
    envelope.providerAdapterId > 0 &&
    isUsableReference(envelope.dispatchIdempotencyKey) &&
    isUsableReference(envelope.providerAdapterKey) &&
    ["PHONE", "EMAIL", "WHATSAPP", "SMS"].includes(envelope.channel) &&
    isUsableReference(envelope.destination) &&
    envelope.destination === envelope.destination.trim() &&
    (envelope.channel === "EMAIL"
      ? envelope.destination.length <= 254 && /^[^\s@]+@[^\s@]+[.][^\s@]+$/.test(envelope.destination)
      : envelope.destination.length <= 30 && envelope.destination.replace(/[^0-9]/g, "").length >= 10) &&
    envelope.executionPerformed === false
  );
}
