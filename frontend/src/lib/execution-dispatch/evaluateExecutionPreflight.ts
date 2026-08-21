// Factory 041 Phase 12: final execution preflight gate + sealed execution
// intent envelope, strictly non-executing.
//
// Answers exactly one question: "immediately before future provider
// execution, do the sealed Phase 9 dispatch contract, the Phase 11
// resolved destination, and the selected Phase 10 adapter all provably
// refer to the same authorised action, contact, channel, and idempotency
// identity?" It does NOT answer "should this prospect be contacted"
// (decided upstream, by Phases 2-9) and it does NOT itself contact
// anybody. This module contains zero telephony/email/WhatsApp/SMS/
// AI-Voice/n8n code, zero provider SDK usage, zero HTTP/network calls,
// and zero environment/secret access.
//
// CROSS-CHECK, NEVER TRUST: this module's entire purpose is to refuse to
// trust the mere INDIVIDUAL validity of three already-produced artifacts
// (contract, destination envelope, adapter) and instead prove they are
// MUTUALLY CONSISTENT -- same authorizationRecordId, same actionId, same
// idempotencyKey, same contactId, same channel across all three. No
// caller-provided replacement value can override any of these; every
// check below compares two already-authoritative upstream values against
// each other, never accepts a fresh one.
//
// APPROVED-ADAPTER PROVENANCE (hardening): verifying `adapter.channel`
// and `adapter.kind` proves only STRUCTURAL compatibility -- it does NOT
// prove the supplied adapter is one of FEH's actual approved Phase 10
// adapters, since any caller could construct an arbitrary object with a
// valid-looking channel and kind string. This module therefore reuses
// Phase 10's own registry lookup, `getNoOpAdapterForChannel()`, to
// resolve the approved adapter for `contract.channel`, and requires the
// SUPPLIED adapter to be exactly reference-equal (`===`) to that approved
// instance -- not merely structurally similar. This is safe and correct
// because `NO_OP_ADAPTER_REGISTRY` (Phase 10) is a static `Map` built
// once at module load, so `getNoOpAdapterForChannel()` always returns the
// exact same frozen object instance for a given channel on every call --
// object identity is a stable, meaningful signal here, not an accident of
// timing. No second adapter registry is introduced; no dynamic loading,
// plugin discovery, or environment read is added. A caller-created
// rogue object -- even one with a perfectly matching channel and a
// convincing `kind` string, and even paired with an otherwise-flawless
// contract/destination/idempotency/contact/action chain -- fails this
// check and can never reach `preflight_ready`. `ExecutionIntentEnvelope
// .adapterKind` is sourced from the VERIFIED approved adapter's own
// `.kind`, never blindly copied from the untrusted caller-supplied
// object (though by the point this matters the two are already proven
// identical by the reference-equality check).
//
// adapter.execute() IS NEVER CALLED: Phase 12 runs strictly BEFORE
// execution. It inspects only `adapter.channel` and `adapter.kind` --
// safe, non-secret metadata -- and never invokes `execute()`, not even
// against the Phase 10 no-op adapter. There is no code path in this file
// that references `.execute` at all.
//
// EXPIRY/FRESHNESS ENFORCEMENT (Phase 13 hardening, closes a previously
// documented gap): Phase 9 was hardened to carry the raw, authoritative
// Phase 7 persisted expiry forward as `contract.authorizationExpiresAt`
// (sourced only from `decision.evidence.expiresAt`, itself sourced only
// from Phase 8's own `record.expires_at` read -- see that module's
// header for the full provenance chain). This module now performs the
// FINAL freshness check, immediately before any `preflight_ready` result
// can be produced: it parses `authorizationExpiresAt` and the
// caller-supplied `evaluatedAt` to concrete instants (via `Date`/
// `getTime()` -- never raw string comparison, so differently-formatted
// but equivalent timezone offsets compare correctly) and requires
// STRICTLY `evaluatedAt < authorizationExpiresAt`. Authority ends AT the
// expiry instant -- an `evaluatedAt` exactly equal to the expiry is
// treated as expired, not fresh (`<`, never `<=`). An authorization that
// was valid when Phase 8/9 ran can therefore still correctly fail here
// if enough real time has passed by the moment Phase 12 is evaluated --
// an old, otherwise-flawless contract/destination/adapter chain does NOT
// remain execution-eligible forever merely because those artifacts still
// exist in memory. `authorizationExpiresAt` itself is re-validated as a
// parseable timestamp here too (defence-in-depth -- Phase 9 already
// guarantees this, but this module never blindly trusts an upstream
// guarantee without its own check, per this chain's standing discipline);
// unparseable -> fail closed, never treated as "no expiry."
//
// TRUSTED CURRENT-TIME SOURCE (Phase 13B hardening -- closes a
// prospective trust-boundary gap identified by architect audit before
// any production caller existed): the instant compared against
// `authorizationExpiresAt` is now obtained INTERNALLY, via `new Date()`,
// immediately before the freshness comparison -- it is NOT a function
// parameter, and NO caller of the exported `evaluateExecutionPreflight`
// can supply, substitute, replay, or backdate it. There is no
// `evaluatedAt`/`currentTime`/`now` field anywhere on
// `ExecutionDispatchRequest`, `ProviderNeutralDispatchContract`,
// `DestinationReference`, `ProviderAdapter`, or any other type in this
// chain, and this module reads the current time from nowhere else --
// not the database, not a provider, not a request payload, not an
// environment variable, not adapter metadata, not persisted contract
// data. The only production entry point is the exported function itself;
// there is no alternate "unsafe"/"withClock"/"-at" variant that accepts
// an arbitrary instant. Deterministic testing is achieved by controlling
// Node's own runtime clock (`node:test`'s built-in `context.mock.timers`
// with `apis: ["Date"]`) around calls to the SAME production function --
// never by reopening a caller-supplied-time code path.
//
// NO REAUTHORISATION: when an authorization has expired, this module
// simply fails closed -- it never creates a new authorization, extends
// the expiry, refreshes it, re-authorises automatically, regenerates a
// contract, or reruns human approval/consent. A future, separately
// authorised, explicit workflow is the only path back to a fresh
// authorization.
//
// EXECUTION INTENT ENVELOPE, NOT PROOF OF EXECUTION: a `preflight_ready`
// result means "FEH has assembled a mutually consistent, preflight-
// approved execution intent" -- never that anything was sent.
// `executionPerformed: false` is a literal type on every result and on
// the envelope itself, and this module independently re-checks
// `contract.executionPerformed !== false` and
// `destinationEnvelope.executionPerformed !== false` at runtime
// (defence-in-depth against an unsafely cast/mutated upstream object).
//
// COMMERCIAL SEPARATION, STRUCTURAL: none of `ProviderNeutralDispatchContract`,
// `ResolvedDestinationEnvelope`, or `ProviderAdapter` carries any
// opportunity-score/estimated-value/commission/renewal-attractiveness/
// lead-priority/FEH-FUSION field -- there is nothing of that kind for
// this module to read, let alone be swayed by. A mismatch cannot be
// "repaired" by how commercially attractive the underlying action is,
// because no commercial signal can ever reach this function's inputs.
//
// DATABASE / NETWORK / SECRET BEHAVIOUR: zero database access (no
// Supabase import, no migration), zero network calls (no HTTP client, no
// provider SDK import), and zero environment/secret access (no
// `process.env` read anywhere in this module). This is a pure,
// synchronous function.

import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ProviderNeutralDispatchContract } from "./createProviderNeutralDispatchContract.ts";
import type { ResolvedDestinationEnvelope } from "./resolveExecutionDestination.ts";
import type { ProviderAdapter } from "./providerAdapter.ts";
import { getNoOpAdapterForChannel } from "./providerAdapter.ts";

const MAX_TOKEN_LENGTH = 200;

const VALID_CHANNELS: ReadonlySet<ContactChannel> = new Set(["PHONE", "EMAIL", "WHATSAPP", "SMS"]);

export type ExecutionPreflightStatus = "preflight_ready" | "blocked" | "evaluation_failed";

/**
 * Contains ONLY what immediately precedes a future, not-yet-built
 * provider adapter call: the same authorizationRecordId/actionId/
 * idempotencyKey/contactId/channel already proven mutually consistent
 * across the contract and destination envelope, the resolved destination
 * itself (now legitimately execution-adjacent), which adapter was
 * selected, and when preflight approval was granted. Deliberately
 * excludes opportunity score, estimated value, commission, revenue
 * score, lead priority, renewal attractiveness, FEH FUSION score, notes,
 * supplier pricing, provider credentials, and API keys/secrets.
 */
export type ExecutionIntentEnvelope = {
  readonly authorizationRecordId: number;
  readonly actionId: string;
  readonly idempotencyKey: string;
  readonly contactId: number;
  readonly channel: ContactChannel;
  readonly destination: string;
  readonly adapterKind: string;
  readonly policyVersion: string;
  /** The Phase 7 canonical, authoritative expiry, sourced from the verified contract.authorizationExpiresAt and preserved exactly -- never calculated, extended, or caller-supplied. Present only when freshness was proven at preflight time. */
  readonly authorizationExpiresAt: string;
  readonly preflightEvaluatedAt: string;
  /** Always the literal `false`. A preflight-ready intent is not evidence anything was sent. */
  readonly executionPerformed: false;
};

export type ExecutionPreflightResult = {
  status: ExecutionPreflightStatus;
  intent: ExecutionIntentEnvelope | null;
  reasons: readonly string[];
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

/** Structural validity only -- non-empty after trim, parses to a concrete instant via Date. Never interprets what that instant means (that happens in the freshness comparison itself). */
function isUsableTimestamp(value: string | null | undefined): boolean {
  if (value == null || value.trim().length === 0) return false;
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Pure aside from one deliberate, narrow exception: internally reading
 * the current instant via `new Date()` for the freshness comparison --
 * see "TRUSTED CURRENT-TIME SOURCE" above. Never performs I/O, never
 * mutates `contract`, `destinationEnvelope`, or `adapter`, and NEVER
 * calls `adapter.execute()` -- this function runs strictly before
 * execution and only inspects `adapter.channel`/`adapter.kind`. Every
 * check is independent and fail-closed: the first failing condition
 * determines the result, and no later or otherwise-positive signal can
 * undo an earlier failure. Any unexpected internal exception (e.g. a
 * caller supplying an object whose property access itself throws) is
 * caught and mapped to `evaluation_failed` rather than propagating.
 */
export function evaluateExecutionPreflight(
  contract: ProviderNeutralDispatchContract | null,
  destinationEnvelope: ResolvedDestinationEnvelope | null,
  adapter: ProviderAdapter | null,
): ExecutionPreflightResult {
  try {
    const reasons: string[] = [];

    function blocked(status: "blocked" | "evaluation_failed", reason: string): ExecutionPreflightResult {
      reasons.push(reason);
      return { status, intent: null, reasons, executionPerformed: false };
    }

    if (!contract) {
      return blocked("blocked", "No Phase 9 provider-neutral dispatch contract was supplied.");
    }
    if (!destinationEnvelope) {
      return blocked("blocked", "No Phase 11 resolved destination envelope was supplied.");
    }
    if (!adapter) {
      return blocked("blocked", "No provider adapter was supplied.");
    }

    if (contract.executionPerformed !== false) {
      return blocked("evaluation_failed", "contract.executionPerformed was not literally false -- refusing to trust an internally inconsistent contract.");
    }
    if (destinationEnvelope.executionPerformed !== false) {
      return blocked("evaluation_failed", "destinationEnvelope.executionPerformed was not literally false -- refusing to trust an internally inconsistent destination envelope.");
    }

    // Structural validity: the contract.
    if (!isPositiveInteger(contract.authorizationRecordId)) {
      return blocked("blocked", "contract.authorizationRecordId is missing or not a positive integer.");
    }
    if (!isUsableToken(contract.actionId)) {
      return blocked("blocked", "contract.actionId is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableToken(contract.idempotencyKey)) {
      return blocked("blocked", "contract.idempotencyKey is missing, blank, or exceeds the usable length bound.");
    }
    if (!isPositiveInteger(contract.contactId)) {
      return blocked("blocked", "contract.contactId is missing or not a positive integer.");
    }
    if (!VALID_CHANNELS.has(contract.channel)) {
      return blocked("blocked", "contract.channel is not a recognised dispatch channel.");
    }
    if (!isUsableToken(contract.policyVersion)) {
      return blocked("blocked", "contract.policyVersion is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableTimestamp(contract.authorizationExpiresAt)) {
      return blocked("blocked", "contract.authorizationExpiresAt is missing, blank, or not a parseable timestamp.");
    }

    // Structural validity: the destination envelope.
    if (!isPositiveInteger(destinationEnvelope.authorizationRecordId)) {
      return blocked("blocked", "destinationEnvelope.authorizationRecordId is missing or not a positive integer.");
    }
    if (!isUsableToken(destinationEnvelope.actionId)) {
      return blocked("blocked", "destinationEnvelope.actionId is missing, blank, or exceeds the usable length bound.");
    }
    if (!isUsableToken(destinationEnvelope.idempotencyKey)) {
      return blocked("blocked", "destinationEnvelope.idempotencyKey is missing, blank, or exceeds the usable length bound.");
    }
    if (!isPositiveInteger(destinationEnvelope.contactId)) {
      return blocked("blocked", "destinationEnvelope.contactId is missing or not a positive integer.");
    }
    if (!VALID_CHANNELS.has(destinationEnvelope.channel)) {
      return blocked("blocked", "destinationEnvelope.channel is not a recognised dispatch channel.");
    }
    if (!isUsableToken(destinationEnvelope.destination)) {
      return blocked("blocked", "destinationEnvelope.destination is missing, blank, or exceeds the usable length bound.");
    }

    // Structural validity: the adapter. Only safe, non-secret metadata is
    // ever inspected -- see module header.
    if (!VALID_CHANNELS.has(adapter.channel)) {
      return blocked("blocked", "adapter.channel is not a recognised dispatch channel.");
    }
    if (!isUsableToken(adapter.kind)) {
      return blocked("blocked", "adapter.kind is missing, blank, or exceeds the usable length bound.");
    }

    // Cross-artifact provenance checks -- contract vs destination envelope.
    if (contract.authorizationRecordId !== destinationEnvelope.authorizationRecordId) {
      return blocked("blocked", "authorizationRecordId mismatch between contract and destination envelope.");
    }
    if (contract.actionId !== destinationEnvelope.actionId) {
      return blocked("blocked", "actionId mismatch between contract and destination envelope.");
    }
    if (contract.idempotencyKey !== destinationEnvelope.idempotencyKey) {
      return blocked("blocked", "idempotencyKey mismatch between contract and destination envelope.");
    }
    if (contract.contactId !== destinationEnvelope.contactId) {
      return blocked("blocked", "contactId mismatch between contract and destination envelope -- refusing to combine an authorization for one contact with a destination resolved for another.");
    }
    if (contract.channel !== destinationEnvelope.channel) {
      return blocked("blocked", "channel mismatch between contract and destination envelope -- no fallback or cross-channel routing is permitted.");
    }

    // Cross-artifact provenance checks -- adapter vs contract / destination.
    // NOTE ON TRANSITIVITY: given the contract/destination channel check
    // above already passed (contract.channel === destinationEnvelope.channel),
    // the two checks below are transitively redundant with each other --
    // whichever one is evaluated first will always be the one that fires
    // if adapter.channel disagrees, and the second can never independently
    // fail once the first has passed. Both are still kept, explicitly
    // required as independent checks by this phase's specification, as
    // defence-in-depth: they protect against a future refactor that
    // reorders or removes the contract/destination check above without
    // this pair being noticed and updated to compensate.
    if (contract.channel !== adapter.channel) {
      return blocked("blocked", "channel mismatch between contract and adapter -- no fallback or cross-channel routing is permitted.");
    }
    if (destinationEnvelope.channel !== adapter.channel) {
      return blocked("blocked", "channel mismatch between destination envelope and adapter -- no fallback or cross-channel routing is permitted.");
    }

    // Approved-adapter provenance (hardened): the supplied adapter must be
    // exactly reference-equal to FEH's own approved Phase 10 registry
    // instance for this channel -- structural similarity (matching
    // channel/kind) is never sufficient. See module header.
    const approvedAdapter = getNoOpAdapterForChannel(contract.channel);
    if (!approvedAdapter) {
      return blocked("blocked", "No approved adapter is registered for this channel.");
    }
    if (adapter !== approvedAdapter) {
      return blocked("blocked", "Supplied adapter is not FEH's approved registered adapter for this channel -- refusing to trust an unverified adapter object.");
    }

    // Final freshness/expiry check (Phase 13 hardening): the current
    // instant is obtained HERE, internally, immediately before the
    // comparison -- see "TRUSTED CURRENT-TIME SOURCE" in the module
    // header. Compares actual parsed instants, never raw timestamp
    // strings, so timezone-equivalent offsets compare correctly.
    // Authority ends AT the expiry instant -- strictly less-than, never
    // less-than-or-equal. No commercial signal, destination data, adapter
    // identity, or idempotency/contact/action match can override this: it
    // is evaluated entirely independently of every check above, and none
    // of those checks passing can substitute for freshness. No PII (the
    // raw destination) is ever included in this reason string.
    const evaluatedAt = new Date();
    const authorizationExpiresAtMs = new Date(contract.authorizationExpiresAt).getTime();
    const evaluatedAtMs = evaluatedAt.getTime();
    if (!(evaluatedAtMs < authorizationExpiresAtMs)) {
      return blocked("blocked", "Authorization expired.");
    }

    const preflightEvaluatedAtIso = evaluatedAt.toISOString();

    const intent: ExecutionIntentEnvelope = Object.freeze({
      authorizationRecordId: contract.authorizationRecordId,
      actionId: contract.actionId,
      idempotencyKey: contract.idempotencyKey,
      contactId: contract.contactId,
      channel: contract.channel,
      destination: destinationEnvelope.destination,
      // Sourced from the VERIFIED approved adapter, not the raw caller
      // input -- see module header. By this point adapter === approvedAdapter
      // has already been proven, so the two values are identical.
      adapterKind: approvedAdapter.kind,
      policyVersion: contract.policyVersion,
      // Sourced from the verified contract.authorizationExpiresAt, preserved
      // exactly -- never recalculated, extended, or caller-supplied. See
      // module header.
      authorizationExpiresAt: contract.authorizationExpiresAt,
      preflightEvaluatedAt: preflightEvaluatedAtIso,
      executionPerformed: false,
    });

    reasons.push("Contract, destination envelope, and adapter are mutually consistent -- preflight approved.");

    return {
      status: "preflight_ready",
      intent,
      reasons,
      executionPerformed: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "evaluation_failed",
      intent: null,
      reasons: [`Unexpected internal error during preflight evaluation: ${message}`],
      executionPerformed: false,
    };
  }
}
