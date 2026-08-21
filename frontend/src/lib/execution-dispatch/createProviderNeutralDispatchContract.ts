// Factory 041 Phase 9: provider-neutral dispatch contract, non-executing
// adapter boundary.
//
// Answers exactly one question: "what is the exact safe, provider-neutral
// contract that a future execution adapter would receive only after Phase
// 8 has returned ready_for_dispatch?" It does NOT answer "should this
// prospect be contacted" (decided upstream, by Phases 2-8) and it does NOT
// itself contact anybody. This module contains zero telephony/email/
// WhatsApp/SMS/AI-Voice/n8n code, zero provider SDK usage, zero HTTP
// calls, and zero capability to reach any external system.
//
// PHASE 8 REMAINS AUTHORITATIVE: this module never re-derives identity
// resolution, suppression, compliance/contact permission, outreach
// eligibility, Phase 6 authorization, Phase 7 persistence/idempotency, or
// Phase 8's own dispatch-release evaluation. It accepts an
// already-computed Phase 8 `ExecutionDispatchDecision` as its sole source
// of truth and performs a pure, structural transformation into a
// provider-neutral contract. A contract is non-null ONLY when
// `decision.status === "ready_for_dispatch"` AND `decision.readyForDispatch
// === true` AND every required evidence field is structurally valid --
// anything ambiguous fails closed (no contract).
//
// PERSISTED IDEMPOTENCY PROVENANCE (hardened): the contract's
// `idempotencyKey` is copied from `decision.evidence.idempotencyKey` --
// Phase 8's own exposed `record.idempotency_key` -- NEVER from
// `request.idempotencyKey`. `request.idempotencyKey` is used ONLY as a
// cross-check: it must exist, be structurally usable under the same
// token rule used everywhere else in this chain, and exactly equal
// `decision.evidence.idempotencyKey`. This closes a trust-boundary gap
// where a `ready_for_dispatch` decision (produced from one persisted
// idempotency key) could theoretically have been paired, by a caller
// bug, with a different, structurally-valid but unrelated request
// idempotency key -- the contract would previously have silently taken
// the request's value on faith. The provenance chain is now: persisted
// Phase 7 record -> Phase 8 verified evidence -> Phase 9 contract, with
// the request supplying only a corroborating cross-check, never the
// value itself. No trimming, rewriting, normalising, regenerating,
// replacing, or case-folding is performed anywhere in this check or in
// the contract construction -- both sides are compared and copied
// exactly as persisted.
//
// CONTACT-ID PROVENANCE (hardening, Phase 11): the contract's
// `contactId` is copied from `decision.evidence.contactId` -- Phase 8's
// own exposed `record.contact_id` -- and NEVER accepted from any caller
// input (there is no contactId field on `ExecutionDispatchRequest` at
// all, so there is nothing to cross-check or be confused with). This
// closes the analogous trust-boundary gap for contact identity that the
// idempotency-key hardening above closed for idempotency: a downstream
// consumer (Phase 11) can trust `contract.contactId` as the sole
// authoritative source for which contact a destination may ever be
// resolved for, with no path by which a different contact's identifier
// could ever reach the sealed contract.
//
// WHY THIS MODULE ALSO RECEIVES THE ORIGINAL REQUEST: beyond the
// idempotency cross-check above, this module also cross-checks the
// request's channel (and, when supplied, actionId) against the values
// already recorded on the decision, as a defence against being called
// with a mismatched decision/request pair (a caller bug, not a Phase 8
// defect) -- the same "never blindly trust a caller-supplied pairing"
// discipline every prior phase in this chain applies at its own
// boundary.
//
// DESTINATION DATA IS OUT OF SCOPE: no telephone number, email address,
// WhatsApp destination, or SMS number is read, stored, or referenced
// anywhere in this module. No safe non-PII destination-resolver
// abstraction exists yet in this codebase; inventing one is explicitly
// out of scope for Phase 9. A future adapter phase must define how a
// provider resolves a destination for an authorised action -- that is a
// deliberate, documented gap, not an oversight.
//
// authorisedAt IS STILL DELIBERATELY OMITTED, expiresAt IS NOT (Phase 13
// hardening): `authorised_at` remains excluded for the original reason --
// no downstream consumer in this chain currently needs it, and adding it
// would serve no proven purpose. `expires_at`, however, is no longer
// omitted: Phase 8 was hardened (Phase 13) to additionally expose the raw
// persisted `record.expires_at` via `ExecutionDispatchEvidence.expiresAt`
// -- using the SAME database read Phase 8 already performs, no new query
// -- specifically so Phase 9 (this module) and Phase 12 can establish an
// authoritative expiry provenance chain. This module now REQUIRES
// `evidence.expiresAt` to be present and parseable as a valid instant; a
// contract can never be sealed for an authorization whose expiry
// evidence is missing, blank, or malformed -- fail closed, no exception.
//
// EXPIRY PROVENANCE (Phase 13 hardening): `contract.authorizationExpiresAt`
// is copied from `decision.evidence.expiresAt` -- Phase 8's own exposed
// `record.expires_at` -- and NEVER accepted from any caller input (there
// is no expiry field on `ExecutionDispatchRequest` at all, so there is
// nothing to cross-check or be confused with, exactly like `contactId`'s
// hardening above). The value is preserved EXACTLY as persisted: no
// trimming, extending, regenerating, rounding, or re-deriving from
// `contractCreatedAt` or any other timestamp. This module does NOT itself
// compare the expiry against the current time or `createdAt` -- Phase 8
// already established `expiryState` for its own release decision, and
// the FINAL, immediately-pre-execution freshness comparison belongs to
// Phase 12, which is closer in time to any future actual execution.
// Sealing an already-expired authorization's expiry value into a
// contract here is not itself a safety gap: Phase 12 independently
// re-checks freshness against this exact value before ever producing a
// `preflight_ready` result, so no window exists where an expired
// authorization could be treated as current.
//
// COMMERCIAL SEPARATION, STRUCTURAL: `ExecutionDispatchDecision` has no
// opportunity-score/estimated-value/commission/renewal-attractiveness/
// lead-priority field at all -- there is nothing of that kind for this
// module to read, let alone be swayed by. A "highly valuable prospect"
// cannot receive a contract if Phase 8 did not return
// `ready_for_dispatch`, because there is no code path by which any
// commercial signal could reach this function's inputs in the first
// place.
//
// EXECUTION FLAG: every result and every contract this module returns
// carries `executionPerformed: false` as a literal type -- creating a
// contract is not evidence that anything was sent. This module also
// independently checks `decision.executionPerformed !== false` at
// runtime (defence-in-depth against a caller passing a decision object
// that has been unsafely cast or mutated) and fails closed if that
// literal guarantee does not hold.
//
// PROVIDER INDEPENDENCE: this module has no notion of "PHONE means FEH AI
// Voice" or "EMAIL means [any specific provider]" -- it only preserves
// whichever `ContactChannel` Phase 8 already validated, unchanged, for a
// future, not-yet-built, provider-specific adapter to interpret.
//
// DATABASE BEHAVIOUR: zero database access. This module performs no
// Supabase import, no read, and no write -- it is a pure, synchronous
// transformation from an already-computed Phase 8 decision (plus the
// request that produced it) into a contract.

import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";
import type { ExecutionDispatchDecision, ExecutionDispatchRequest } from "./evaluateExecutionDispatch.ts";

const MAX_TOKEN_LENGTH = 200;

const VALID_CHANNELS: ReadonlySet<ContactChannel> = new Set(["PHONE", "EMAIL", "WHATSAPP", "SMS"]);

export type ProviderNeutralDispatchContractStatus = "contract_ready" | "blocked" | "evaluation_failed";

export type ProviderNeutralDispatchContractReason = { factor: string; detail: string };

/**
 * The minimum non-secret information a future, not-yet-built provider
 * adapter would need to identify and execute an already-approved action.
 * Deliberately excludes: any raw destination (telephone/email/WhatsApp/
 * SMS), provider credentials/tokens/secrets, and every commercial field
 * (opportunity score, estimated value, commission, renewal attractiveness,
 * lead priority). See module header for why `authorisedAt`/`expiresAt` are
 * also excluded.
 */
export type ProviderNeutralDispatchContract = {
  readonly authorizationRecordId: number;
  readonly actionId: string;
  /** The Phase 7 canonical idempotency key, sourced from decision.evidence.idempotencyKey and passed through unchanged -- see module header. */
  readonly idempotencyKey: string;
  /** The Phase 7 canonical contact_id, sourced from decision.evidence.contactId -- NEVER a caller-supplied value. Added for Phase 11 contact-id provenance hardening; an internal identifier, not destination PII. */
  readonly contactId: number;
  readonly channel: ContactChannel;
  readonly policyVersion: string;
  readonly humanApprovalState: string;
  readonly outreachEligibilityStatus: string;
  readonly contractCreatedAt: string;
  /** The Phase 7 canonical, authoritative expires_at, sourced from decision.evidence.expiresAt and preserved exactly -- never trimmed, extended, regenerated, or re-derived. Added for Phase 13 expiry/freshness provenance hardening: the sole authoritative value Phase 12's final freshness check may ever compare against. */
  readonly authorizationExpiresAt: string;
  /** Always the literal `false`. A contract means "may be released to a future adapter" -- never that anything was sent. */
  readonly executionPerformed: false;
};

export type ProviderNeutralDispatchContractResult = {
  status: ProviderNeutralDispatchContractStatus;
  contract: ProviderNeutralDispatchContract | null;
  reasons: ProviderNeutralDispatchContractReason[];
  executionPerformed: false;
  evaluatedAt: string;
};

/** Same structural-usability rule as every prior phase in this chain: non-empty after trim, within a sane length bound. */
function isUsableToken(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

/** Same structural-validity rule used for contact identifiers elsewhere in this chain: a positive integer, nothing else. */
function isPositiveInteger(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Structural validity only -- non-empty after trim, parses to a concrete instant. Never interprets what that instant means (that is Phase 12's job). */
function isUsableTimestamp(value: string | null | undefined): boolean {
  if (value == null || value.trim().length === 0) return false;
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Pure. Never performs I/O, never mutates `decision` or `request`, never
 * itself throws. Accepts an already-computed Phase 8
 * `ExecutionDispatchDecision` plus the exact `ExecutionDispatchRequest`
 * that produced it, and returns a structured result whose `contract` is
 * non-null ONLY when every required condition holds. Every check below is
 * independent and fail-closed: the first failing condition determines the
 * result, and no later or otherwise-positive signal can undo an earlier
 * failure.
 */
export function createProviderNeutralDispatchContract(
  decision: ExecutionDispatchDecision,
  request: ExecutionDispatchRequest,
  createdAt: Date,
): ProviderNeutralDispatchContractResult {
  const createdAtIso = createdAt.toISOString();
  const reasons: ProviderNeutralDispatchContractReason[] = [];

  function blocked(status: "blocked" | "evaluation_failed", factor: string, detail: string): ProviderNeutralDispatchContractResult {
    reasons.push({ factor, detail });
    return {
      status,
      contract: null,
      reasons,
      executionPerformed: false,
      evaluatedAt: createdAtIso,
    };
  }

  if (decision.executionPerformed !== false) {
    return blocked("evaluation_failed", "Execution flag", "decision.executionPerformed was not literally false -- refusing to trust an internally inconsistent decision.");
  }

  if (decision.status === "evaluation_failed") {
    return blocked("evaluation_failed", "Upstream evaluation", "Phase 8 decision status is 'evaluation_failed' -- cannot create a dispatch contract from a failed evaluation.");
  }

  if (decision.status !== "ready_for_dispatch") {
    return blocked("blocked", "Upstream status", `Phase 8 decision status is '${decision.status}', not 'ready_for_dispatch' -- no contract may be created.`);
  }

  if (decision.readyForDispatch !== true) {
    return blocked(
      "blocked",
      "Decision consistency",
      "Phase 8 decision status is 'ready_for_dispatch' but readyForDispatch is not literally true -- refusing to trust an internally inconsistent decision.",
    );
  }

  const { evidence } = decision;

  if (evidence.authorizationRecordId == null) {
    return blocked("blocked", "Authorization record", "decision.evidence.authorizationRecordId is missing -- cannot build a contract without a persisted record identity.");
  }

  if (!isUsableToken(evidence.actionId)) {
    return blocked("blocked", "Action identity", "decision.evidence.actionId is missing, blank, or exceeds the usable length bound.");
  }

  if (!isUsableToken(evidence.policyVersion)) {
    return blocked("blocked", "Policy version", "decision.evidence.policyVersion is missing, blank, or exceeds the usable length bound.");
  }

  if (!VALID_CHANNELS.has(decision.requestedChannel)) {
    return blocked("blocked", "Channel", `decision.requestedChannel '${String(decision.requestedChannel)}' is not a recognised dispatch channel.`);
  }

  if (decision.requestedChannel !== request.requestedChannel) {
    return blocked(
      "blocked",
      "Channel consistency",
      `request.requestedChannel '${request.requestedChannel}' does not match decision.requestedChannel '${decision.requestedChannel}' -- refusing to trust a mismatched decision/request pair. No channel rewriting or fallback is permitted.`,
    );
  }

  if (request.actionId != null && request.actionId !== evidence.actionId) {
    return blocked(
      "blocked",
      "Action identity",
      "request.actionId does not match decision.evidence.actionId -- refusing to trust a mismatched decision/request pair.",
    );
  }

  // Persisted idempotency provenance (hardened) -- the contract's key
  // comes ONLY from decision.evidence.idempotencyKey (Phase 8's own
  // exposed record.idempotency_key). request.idempotencyKey is used
  // strictly as a cross-check, never as the source of truth: it must
  // exist, be structurally usable, and exactly equal the persisted
  // evidence value. See module header.
  if (!isUsableToken(evidence.idempotencyKey)) {
    return blocked("blocked", "Idempotency", "decision.evidence.idempotencyKey is missing, blank, or exceeds the usable length bound -- no persisted canonical key to build a contract from.");
  }
  if (!isUsableToken(request.idempotencyKey)) {
    return blocked("blocked", "Idempotency", "request.idempotencyKey is missing, blank, or exceeds the usable length bound.");
  }
  if (request.idempotencyKey !== evidence.idempotencyKey) {
    return blocked(
      "blocked",
      "Idempotency provenance",
      "request.idempotencyKey does not exactly match decision.evidence.idempotencyKey (the persisted canonical key) -- refusing to trust a mismatched decision/request pair.",
    );
  }

  if (!isUsableToken(evidence.humanApprovalState)) {
    return blocked("blocked", "Human approval", "decision.evidence.humanApprovalState is missing or blank.");
  }

  if (!isUsableToken(evidence.outreachEligibilityStatus)) {
    return blocked("blocked", "Outreach eligibility", "decision.evidence.outreachEligibilityStatus is missing or blank.");
  }

  // Contact-id provenance (hardened, Phase 11) -- the contract's
  // contactId comes ONLY from decision.evidence.contactId (Phase 8's own
  // exposed record.contact_id). There is no caller-suppliable
  // contactId on ExecutionDispatchRequest to cross-check against or be
  // confused with -- this value has exactly one possible source.
  if (!isPositiveInteger(evidence.contactId)) {
    return blocked("blocked", "Contact identity", "decision.evidence.contactId is missing or not a positive integer -- no persisted canonical contact reference to build a contract from.");
  }

  // Expiry provenance (hardened, Phase 13) -- the contract's expiry
  // comes ONLY from decision.evidence.expiresAt (Phase 8's own exposed
  // record.expires_at). There is no caller-suppliable expiry on
  // ExecutionDispatchRequest to cross-check against or be confused
  // with. An authorization with no expiry configured at all (a null
  // persisted value) can no longer produce a sealed contract -- every
  // execution-eligible contract must carry a concrete, parseable expiry
  // instant for Phase 12 to enforce.
  if (!isUsableTimestamp(evidence.expiresAt)) {
    return blocked("blocked", "Expiry", "decision.evidence.expiresAt is missing, blank, or not a parseable timestamp -- no authoritative expiry to build a contract from.");
  }

  const contract: ProviderNeutralDispatchContract = Object.freeze({
    authorizationRecordId: evidence.authorizationRecordId,
    actionId: evidence.actionId as string,
    // Sourced from decision.evidence.idempotencyKey (the persisted canonical
    // key), NOT request.idempotencyKey -- passed through EXACTLY, no
    // trim/rewrite/normalise/regenerate/case-fold. See module header.
    idempotencyKey: evidence.idempotencyKey as string,
    // Sourced from decision.evidence.contactId (the persisted canonical
    // contact reference), never from any caller input. See module header.
    contactId: evidence.contactId as number,
    channel: decision.requestedChannel,
    policyVersion: evidence.policyVersion as string,
    humanApprovalState: evidence.humanApprovalState as string,
    outreachEligibilityStatus: evidence.outreachEligibilityStatus as string,
    contractCreatedAt: createdAtIso,
    // Sourced from decision.evidence.expiresAt (the persisted canonical
    // expiry), never calculated, extended, or accepted from any caller
    // input. Preserved exactly as persisted. See module header.
    authorizationExpiresAt: evidence.expiresAt as string,
    executionPerformed: false,
  });

  reasons.push({
    factor: "Overall",
    detail: "Phase 8 decision is ready_for_dispatch, internally consistent, and every required evidence field is structurally valid.",
  });

  return {
    status: "contract_ready",
    contract,
    reasons,
    executionPerformed: false,
    evaluatedAt: createdAtIso,
  };
}
