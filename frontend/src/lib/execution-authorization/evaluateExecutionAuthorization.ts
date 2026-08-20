// Factory 041 Phase 6: non-executing execution authorization boundary.
//
// Answers exactly one question: "has this proposed outreach action
// satisfied every condition required to become execution-authorised?"
// This is the final control boundary before any future, separately
// authorised, provider-specific executor — a boundary that does not
// exist yet anywhere in this codebase and is NOT built here. This module
// never places a call, sends an email/WhatsApp/SMS, invokes AI Voice or
// any telephony/email/messaging provider, enqueues a job, creates a
// task/campaign, triggers a workflow, or writes to any table. It is an
// authorization decision only.
//
// `authorised` means only: "this action has satisfied the FEH
// authorization contract and may be presented to a future execution
// adapter." `executionPerformed` is always the literal type `false` on
// every decision this module returns, for the same reason Phase 5
// established it — no caller can misread it as evidence that anything
// was actually sent.
//
// ARCHITECTURAL SEPARATION: this module does not duplicate Phases 2-5.
// It reads exactly one thing from the completed Phase 5
// OutreachEligibilityDecision — its top-level `status` (and the channel
// it already evaluated) — and never re-inspects identity confidence,
// suppression matches, consent/legal-basis evidence, or opportunity
// context buried inside it. Every one of Phase 6's own gates (action
// identity, channel consistency, idempotency-key structure, human
// approval) is new to this phase and orthogonal to what Phases 2-5
// already decided.
//
// COMMERCIAL SIGNALS HAVE NO AUTHORITY HERE, STRUCTURALLY: this module's
// own input type has no opportunity-score, identity-confidence, or
// legal-basis field at all — there is nothing of that kind for the
// decision logic to even read, let alone be swayed by. Whatever
// commercial context Phase 5 attached is inside
// `outreachEligibilityDecision.evidence.opportunityContext`, and this
// module only ever reads `outreachEligibilityDecision.status`.
//
// IDEMPOTENCY, DELIBERATELY NARROW (per Phase 6 scope): this module
// validates only that a supplied idempotency key is STRUCTURALLY usable
// (non-empty after trimming, within a sane length bound) — it does NOT
// check for duplicate keys across requests, because doing so would
// require a persistence layer (a new table) that this phase is
// explicitly not authorised to create. No global-uniqueness guarantee is
// claimed anywhere in this file. Persistent idempotency and persistent
// human-approval-state storage are both explicitly deferred to a future,
// separately authorised phase — see the completion report.
//
// POLICY VERSION, DELIBERATELY NARROW: a caller-suppliable string,
// defaulting to this module's own DEFAULT_POLICY_VERSION constant when
// omitted or blank. This is a local, in-code value only — no database
// table is created to track policy versions in this phase; a future
// audit that needs to know which rules applied reads this string off the
// decision/claim, not a persisted registry.
//
// EXECUTION CLAIM, NOT A TOKEN: `ExecutionAuthorizationClaim` is a plain,
// non-secret, structured record of what was authorised — not a bearer
// token, not a JWT, not cryptographically signed, and not itself capable
// of granting access to any provider. It is deliberately never called a
// "token."

import type { OutreachEligibilityDecision, OutreachEligibilityStatus } from "../outreach/evaluateOutreachEligibility.ts";
import type { ContactChannel } from "../compliance/evaluateContactPermission.ts";

/** This module's own default when the caller supplies no policy version — see module header. */
export const DEFAULT_POLICY_VERSION = "feh-execution-authorization-policy@0.1.0-factory041";

const MAX_TOKEN_LENGTH = 200;

export type HumanApprovalState = "not_required" | "approved" | "required" | "rejected" | "unknown";

export type ExecutionAuthorizationInput = {
  outreachEligibilityDecision: OutreachEligibilityDecision;
  actionId?: string | null;
  requestedChannel?: ContactChannel | null;
  actorId?: string | null;
  humanApproval?: HumanApprovalState | null;
  idempotencyKey?: string | null;
  requestedExecutionTime?: string | null;
  policyVersion?: string | null;
};

export type ExecutionAuthorizationStatus = "authorised" | "blocked" | "needs_review" | "evaluation_failed";

export type ExecutionAuthorizationReason = { factor: string; detail: string };

export type ExecutionAuthorizationEvidence = {
  outreachEligibilityStatus: OutreachEligibilityStatus;
  humanApprovalState: HumanApprovalState;
  requestedChannel: ContactChannel | null;
  phase5Channel: ContactChannel | null;
  channelConsistent: boolean;
  hasActionId: boolean;
  idempotencyKeyValid: boolean;
  policyVersion: string;
};

/**
 * Non-secret structured metadata only — see module header. Present only
 * when actionId and idempotencyKey are both structurally valid, since
 * neither field could be meaningfully populated otherwise; a blocked/
 * needs_review decision caused by something else (Phase 5 status,
 * channel mismatch, human approval) still carries a claim, since those
 * failures don't affect whether actionId/idempotencyKey themselves are
 * well-formed.
 */
export type ExecutionAuthorizationClaim = {
  actionId: string;
  requestedChannel: ContactChannel;
  policyVersion: string;
  evaluatedAt: string;
  idempotencyKey: string;
  authorizationStatus: ExecutionAuthorizationStatus;
};

export type ExecutionAuthorizationDecision = {
  status: ExecutionAuthorizationStatus;
  authorisationAllowed: boolean;
  requestedChannel: ContactChannel | null;
  outreachEligibilityDecision: OutreachEligibilityDecision;
  humanApproval: HumanApprovalState;
  idempotency: { keyProvided: boolean; valid: boolean };
  policyVersion: string;
  reasons: ExecutionAuthorizationReason[];
  evidence: ExecutionAuthorizationEvidence;
  authorizationClaim: ExecutionAuthorizationClaim | null;
  /** Always the literal `false` — see module header. Never evidence that a call/message/task was actually created. */
  executionPerformed: false;
  evaluatedAt: string;
};

/**
 * Structural usability only — non-empty after trimming, within a sane
 * length bound. Never a duplicate/uniqueness check (see module header).
 */
function isUsableToken(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TOKEN_LENGTH;
}

function resolvePolicyVersion(supplied: string | null | undefined): string {
  const trimmed = supplied?.trim();
  return trimmed ? trimmed : DEFAULT_POLICY_VERSION;
}

/**
 * Pure. Accepts an already-completed Phase 5 OutreachEligibilityDecision
 * (never recomputed here) plus this phase's own new, orthogonal
 * evidence (action identity, requested channel, human approval,
 * idempotency key, policy version), and returns a deterministic
 * authorization decision. Never mutates its arguments, never performs
 * I/O, never itself fails — a Phase 5 evaluation failure is represented
 * by `outreachEligibilityDecision.status === "evaluation_failed"`,
 * handled as an ordinary input value like every other status.
 *
 * Priority order (most restrictive first — no later check can undo an
 * earlier one):
 *   1. Phase 5 not eligible_for_handoff → that status is preserved
 *      exactly (blocked/needs_review/evaluation_failed pass straight
 *      through; nothing here can upgrade it).
 *   2. Missing/blank/oversized action id → blocked. A structural
 *      caller/integration defect, not something a human review step can
 *      resolve by judgment — it needs to be fixed at the source.
 *   3. Requested channel missing or inconsistent with the channel Phase
 *      5 already evaluated → blocked, for the same "structural defect,
 *      not a judgment call" reasoning. The channel is never silently
 *      rewritten to match.
 *   4. Missing/blank/oversized idempotency key → blocked, same
 *      reasoning again.
 *   5. Human approval "rejected" → blocked (an explicit human decision,
 *      final).
 *   6. Human approval "required", "unknown", or not supplied at all →
 *      needs_review (never assumed approved).
 *   7. Human approval "approved" or "not_required" → authorised.
 */
export function evaluateExecutionAuthorization(input: ExecutionAuthorizationInput, evaluatedAt: Date): ExecutionAuthorizationDecision {
  const evaluatedAtIso = evaluatedAt.toISOString();
  const { outreachEligibilityDecision } = input;
  const humanApproval: HumanApprovalState = input.humanApproval ?? "unknown";
  const policyVersion = resolvePolicyVersion(input.policyVersion);

  const hasActionId = isUsableToken(input.actionId);
  const idempotencyKeyValid = isUsableToken(input.idempotencyKey);
  const requestedChannel = input.requestedChannel ?? null;
  const phase5Channel = outreachEligibilityDecision.requestedChannel;
  const channelConsistent = requestedChannel !== null && requestedChannel === phase5Channel;

  const evidence: ExecutionAuthorizationEvidence = {
    outreachEligibilityStatus: outreachEligibilityDecision.status,
    humanApprovalState: humanApproval,
    requestedChannel,
    phase5Channel,
    channelConsistent,
    hasActionId,
    idempotencyKeyValid,
    policyVersion,
  };

  const reasons: ExecutionAuthorizationReason[] = [];
  let status: ExecutionAuthorizationStatus;

  if (outreachEligibilityDecision.status !== "eligible_for_handoff") {
    status = outreachEligibilityDecision.status;
    reasons.push({ factor: "Outreach eligibility", detail: `Phase 5 returned '${outreachEligibilityDecision.status}' — no later authorization signal can override it.` });
  } else if (!hasActionId) {
    status = "blocked";
    reasons.push({ factor: "Action identity", detail: "actionId is missing, blank, or exceeds the usable length bound." });
  } else if (!channelConsistent) {
    status = "blocked";
    reasons.push({ factor: "Channel consistency", detail: `Requested channel '${requestedChannel ?? "(none)"}' does not match the channel Phase 5 evaluated ('${phase5Channel ?? "(none)"}').` });
  } else if (!idempotencyKeyValid) {
    status = "blocked";
    reasons.push({ factor: "Idempotency", detail: "idempotencyKey is missing, blank, or exceeds the usable length bound." });
  } else if (humanApproval === "rejected") {
    status = "blocked";
    reasons.push({ factor: "Human approval", detail: "Human approval was explicitly rejected." });
  } else if (humanApproval === "required" || humanApproval === "unknown") {
    status = "needs_review";
    reasons.push({ factor: "Human approval", detail: `Human approval state is '${humanApproval}' — cannot be assumed, requires explicit human review.` });
  } else {
    status = "authorised";
    reasons.push({ factor: "Overall", detail: "Phase 5 eligible, action identity and channel valid, idempotency key structurally usable, human approval satisfied." });
  }

  const authorizationClaim: ExecutionAuthorizationClaim | null =
    hasActionId && idempotencyKeyValid && requestedChannel !== null
      ? {
          actionId: (input.actionId as string).trim(),
          requestedChannel,
          policyVersion,
          evaluatedAt: evaluatedAtIso,
          idempotencyKey: (input.idempotencyKey as string).trim(),
          authorizationStatus: status,
        }
      : null;

  return {
    status,
    authorisationAllowed: status === "authorised",
    requestedChannel,
    outreachEligibilityDecision,
    humanApproval,
    idempotency: { keyProvided: input.idempotencyKey != null, valid: idempotencyKeyValid },
    policyVersion,
    reasons,
    evidence,
    authorizationClaim,
    executionPerformed: false,
    evaluatedAt: evaluatedAtIso,
  };
}
