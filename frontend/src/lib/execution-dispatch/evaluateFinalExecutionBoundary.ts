// Factory 041 Phase 14: final execution-boundary freshness gate, strictly
// non-executing.
//
// Answers exactly one question: "immediately before a future, separately
// authorised provider invocation, is this sealed Phase 12 execution intent
// STILL fresh, using trusted local current time, and is the supplied
// adapter STILL the genuinely approved one?" It does NOT answer "should
// this prospect be contacted" (decided upstream, by Phases 2-12) and it
// does NOT itself contact anybody. This module contains zero telephony/
// email/WhatsApp/SMS/AI-Voice/n8n code, zero provider SDK usage, zero
// HTTP/network calls, and zero environment/secret access.
//
// WHY THIS EXISTS -- CLOSING A TIME-OF-CHECK/TIME-OF-USE GAP: Phase 12
// (`evaluateExecutionPreflight`) already proves authorization freshness
// at the moment it runs and produces an `ExecutionIntentEnvelope`. But an
// old, otherwise-flawless `preflight_ready` result or intent envelope
// must never become indefinite authority to execute merely because it
// still exists in memory -- a delay (queueing, retries, process
// scheduling, serialization) could occur between preflight and any
// future actual provider call, during which the underlying
// authorization could expire. This module is the final, independent
// freshness re-check, evaluated as close as reasonably possible to
// where a future execution call would occur. The existence of a prior
// `preflight_ready` result is NEVER, by itself, sufficient authority --
// this module always re-derives its own trusted current time and always
// re-compares it against the authoritative expiry, from scratch, on
// every call.
//
// TRUSTED CURRENT-TIME SOURCE: exactly the same discipline established
// by Phase 13B's hardening of Phase 12 -- the current instant is
// obtained internally, via `new Date()` with no arguments, immediately
// before the freshness comparison. There is no `evaluatedAt`/
// `currentTime`/`now`/clock parameter anywhere on this module's exported
// function, and no alternate "unsafe"/"withClock" production entry
// point exists. Deterministic testing is achieved entirely by
// controlling Node's own runtime clock (`node:test`'s built-in
// `context.mock.timers` with `apis: ["Date"]`) around calls to the SAME
// production function -- never by reopening a caller-supplied-time code
// path.
//
// EXPIRY PROVENANCE, SINGLE SOURCE: the ONLY expiry value this module
// ever compares against is `intent.authorizationExpiresAt` -- itself
// already the unbroken end of the Phase 7 persisted `expires_at` ->
// Phase 8 `evidence.expiresAt` -> Phase 9 `contract.authorizationExpiresAt`
// -> Phase 12 `ExecutionIntentEnvelope.authorizationExpiresAt` provenance
// chain. This module does not accept, read, or derive any second expiry
// value from a contract, request, adapter, destination, database, or
// environment source -- there is exactly one expiry field on its input
// type, and no code path by which a caller could substitute a different
// one.
//
// RUNTIME INPUT IS NEVER TRUSTED MERELY BECAUSE OF ITS DECLARED TYPE:
// TypeScript's `ExecutionIntentEnvelope` type is a compile-time promise
// only. This module independently re-validates every security-critical
// field on the supplied `intent` at runtime -- authorization identity,
// action identity, idempotency identity, contact identity, channel,
// destination, adapter kind, policy version, authorization expiry, and
// preflight-evaluation provenance -- and fails closed if any of them is
// missing, blank, malformed, or structurally unusable. No malformed
// value is ever normalised, repaired, or coerced into an acceptable one
// -- doing so could silently paper over a genuine provenance mismatch.
// No new provenance field is invented; every field checked here already
// exists on the established `ExecutionIntentEnvelope` shape.
//
// APPROVED-ADAPTER PROVENANCE, REFERENCE IDENTITY ONLY: exactly the same
// hardening already proven in Phase 12 -- `adapterKind` is a caller-
// legible label, never a security boundary. This module reuses Phase
// 10's own registry lookup, `getNoOpAdapterForChannel()`, to resolve the
// approved adapter for `intent.channel`, and requires the SUPPLIED
// adapter to be exactly reference-equal (`===`) to that approved
// instance. A caller-created object with a matching `kind`, matching
// `channel`, and a matching `execute` function shape is still rejected
// if it is not the exact approved registry reference -- kind/channel
// text alone proves nothing.
//
// adapter.execute() IS NEVER CALLED: this module has no code path that
// references `.execute` at all. It evaluates readiness only; it never
// performs the action itself.
//
// NO REPLAY/IDEMPOTENCY ENFORCEMENT, DELIBERATELY: freshness controls
// WHEN a still-valid intent may be acted on -- it does NOT control HOW
// MANY TIMES a still-fresh intent may be acted on. This module never
// writes or mutates `execution_performed`/`execution_performed_at`/
// `execution_reference` (or any other persisted state), and never
// implements a consumed/single-use marker. Preventing duplicate
// execution of a still-fresh intent is a separate, explicitly deferred
// concern for a future, separately authorised execution phase.
//
// NO REAUTHORISATION: when an intent has expired or the supplied adapter
// is not the approved one, this module simply fails closed -- it never
// creates a new authorization, extends the expiry, refreshes it,
// re-authorises automatically, regenerates an intent, or reruns human
// approval/consent.
//
// COMMERCIAL SEPARATION, STRUCTURAL: `ExecutionIntentEnvelope` and
// `ProviderAdapter` carry no opportunity-score/estimated-value/
// commission/renewal-attractiveness/lead-priority/FEH-FUSION field --
// there is nothing of that kind for this module to read, let alone be
// swayed by.
//
// DATABASE / NETWORK / SECRET BEHAVIOUR: zero database access (no
// Supabase import, no migration, no read, no write), zero network calls
// (no HTTP client, no provider SDK import), and zero environment/secret
// access (no `process.env` read anywhere in this module). This is a
// pure, synchronous function aside from its one deliberate internal
// `new Date()` read.

import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ExecutionIntentEnvelope } from "./evaluateExecutionPreflight.ts";
import type { ProviderAdapter } from "./providerAdapter.ts";
import { getNoOpAdapterForChannel } from "./providerAdapter.ts";

const MAX_TOKEN_LENGTH = 200;

const VALID_CHANNELS: ReadonlySet<ContactChannel> = new Set(["PHONE", "EMAIL", "WHATSAPP", "SMS"]);

export type ExecutionBoundaryStatus = "execution_boundary_ready" | "blocked" | "evaluation_failed";

export type ExecutionBoundaryResult = {
  status: ExecutionBoundaryStatus;
  reasons: readonly string[];
  /** Always the literal `false`. This module evaluates readiness only -- it never performs, and never claims to have performed, provider execution. */
  executionPerformed: false;
};

/** Same structural-usability rule as every prior phase in this chain: non-empty after trim, within a sane length bound. */
function isUsableToken(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

function isPositiveInteger(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Structural validity only -- non-empty after trim, parses to a concrete, finite instant via Date. Never interprets what that instant means. */
function isUsableTimestamp(value: string | null | undefined): boolean {
  if (value == null || value.trim().length === 0) return false;
  return Number.isFinite(new Date(value).getTime());
}

/**
 * Pure aside from one deliberate, narrow exception: internally reading
 * the current instant via `new Date()` immediately before the freshness
 * comparison -- see "TRUSTED CURRENT-TIME SOURCE" above. Never performs
 * I/O, never mutates `intent` or `adapter`, and NEVER calls
 * `adapter.execute()`. Every check is independent and fail-closed: the
 * first failing condition determines the result, and no later or
 * otherwise-positive signal can undo an earlier failure. Any unexpected
 * internal exception (e.g. a caller supplying an object whose property
 * access itself throws) is caught and mapped to `evaluation_failed`
 * rather than propagating.
 */
export function evaluateFinalExecutionBoundary(
  intent: ExecutionIntentEnvelope | null,
  adapter: ProviderAdapter | null,
): ExecutionBoundaryResult {
  try {
    const reasons: string[] = [];

    function blocked(status: "blocked" | "evaluation_failed", reason: string): ExecutionBoundaryResult {
      reasons.push(reason);
      return { status, reasons, executionPerformed: false };
    }

    if (!intent) {
      return blocked("blocked", "No Phase 12 execution intent envelope was supplied.");
    }
    if (!adapter) {
      return blocked("blocked", "No provider adapter was supplied.");
    }

    if (intent.executionPerformed !== false) {
      return blocked("evaluation_failed", "intent.executionPerformed was not literally false -- refusing to trust an internally inconsistent intent.");
    }

    // Runtime re-validation of every security-critical intent field --
    // TypeScript's ExecutionIntentEnvelope type is a compile-time promise
    // only. See module header.
    if (!isPositiveInteger(intent.authorizationRecordId)) {
      return blocked("blocked", "intent.authorizationRecordId is missing or not a positive integer.");
    }
    if (!isUsableToken(intent.actionId)) {
      return blocked("blocked", "intent.actionId is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableToken(intent.idempotencyKey)) {
      return blocked("blocked", "intent.idempotencyKey is missing, blank, or exceeds the usable length bound.");
    }
    if (!isPositiveInteger(intent.contactId)) {
      return blocked("blocked", "intent.contactId is missing or not a positive integer.");
    }
    if (!VALID_CHANNELS.has(intent.channel)) {
      return blocked("blocked", "intent.channel is not a recognised dispatch channel.");
    }
    if (!isUsableToken(intent.destination)) {
      return blocked("blocked", "intent.destination is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableToken(intent.adapterKind)) {
      return blocked("blocked", "intent.adapterKind is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableToken(intent.policyVersion)) {
      return blocked("blocked", "intent.policyVersion is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableTimestamp(intent.authorizationExpiresAt)) {
      return blocked("blocked", "intent.authorizationExpiresAt is missing, blank, or not a parseable timestamp.");
    }
    if (!isUsableTimestamp(intent.preflightEvaluatedAt)) {
      return blocked("blocked", "intent.preflightEvaluatedAt is missing, blank, or not a parseable timestamp.");
    }

    // Structural validity: the adapter. Only safe, non-secret metadata is
    // ever inspected -- see module header.
    if (!VALID_CHANNELS.has(adapter.channel)) {
      return blocked("blocked", "adapter.channel is not a recognised dispatch channel.");
    }
    if (!isUsableToken(adapter.kind)) {
      return blocked("blocked", "adapter.kind is missing, blank, or exceeds the usable length bound.");
    }

    // Approved-adapter provenance: the supplied adapter must be exactly
    // reference-equal to FEH's own approved Phase 10 registry instance
    // for this channel -- structural similarity (matching channel/kind)
    // is never sufficient. See module header.
    const approvedAdapter = getNoOpAdapterForChannel(intent.channel);
    if (!approvedAdapter) {
      return blocked("blocked", "No approved adapter is registered for this channel.");
    }
    if (adapter !== approvedAdapter) {
      return blocked("blocked", "Supplied adapter is not FEH's approved registered adapter for this channel -- refusing to trust an unverified adapter object.");
    }

    // Final freshness/expiry check: the current instant is obtained HERE,
    // internally, immediately before the comparison -- see "TRUSTED
    // CURRENT-TIME SOURCE" in the module header. Compares actual parsed
    // instants, never raw timestamp strings, so timezone-equivalent
    // offsets compare correctly. Authority ends AT the expiry instant --
    // strictly less-than, never less-than-or-equal. The mere existence of
    // a prior preflight_ready result is never, by itself, sufficient
    // authority -- this comparison is re-derived from scratch every call.
    // No commercial signal, destination data, or adapter identity can
    // override this. No PII is ever included in this reason string.
    const currentInstant = new Date();
    const authorizationExpiresAtMs = new Date(intent.authorizationExpiresAt).getTime();
    const currentInstantMs = currentInstant.getTime();
    if (!(currentInstantMs < authorizationExpiresAtMs)) {
      return blocked("blocked", "Authorization expired.");
    }

    reasons.push("Execution intent is structurally valid, the adapter is FEH's approved registered instance, and the authorization remains fresh.");

    return {
      status: "execution_boundary_ready",
      reasons,
      executionPerformed: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "evaluation_failed",
      reasons: [`Unexpected internal error during final execution-boundary evaluation: ${message}`],
      executionPerformed: false,
    };
  }
}
