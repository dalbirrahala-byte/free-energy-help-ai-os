// Factory 041 Phase 5: read-only outreach eligibility orchestration.
//
// Answers exactly one question: "given a proposed outreach action and the
// existing FEH decision evidence, is this action eligible to be handed
// forward to a future, separately authorised execution system?" This
// module NEVER places a call, sends an email/WhatsApp/SMS, invokes AI
// Voice or any telephony provider, creates a task/call-list/campaign,
// enqueues background execution, or writes to any table — no I/O of its
// own beyond reusing Phase 4's existing read-only lookup. It is
// orchestration/decision logic only.
//
// `eligible_for_handoff` is NOT "contact sent." It means only that this
// action may be passed to a future execution layer that does not exist
// yet anywhere in this codebase. `executionPerformed` is always the
// literal type `false` on every decision this module ever returns —
// TypeScript itself statically guarantees it can never be anything else,
// so no caller can accidentally read it as evidence that outreach
// happened.
//
// CORE ARCHITECTURAL RULE: identity confidence, contactability,
// suppression, legal/compliance permission, commercial opportunity, and
// execution remain separate, independently-visible concerns. This module
// adds exactly one more: it never recomputes any of Phase 3/4's
// decisions, it only relays Phase 4's already-computed
// ContactPermissionDecision through a 1:1 status mapping, with an
// entirely separate, purely informational `opportunityContext` that is
// NEVER consulted when determining `status` — commercial attractiveness
// cannot upgrade a blocked/needs_review/evaluation_failed outcome, and
// its absence cannot downgrade an otherwise-eligible one.
//
// REQUIRED REUSE, SATISFIED: this module performs zero suppression
// matching, zero contact-permission reasoning, and zero identity scoring
// of its own — every one of those decisions is Phase 3/4's, reused
// verbatim. The only new logic here is the outreach-status mapping and
// the deliberate isolation of commercial context from it.

import type {
  ContactChannel,
  ContactPermissionDecision,
  ContactPermissionEvaluationInput,
  ContactPermissionStatus,
} from "../compliance/evaluateContactPermission.ts";
import { evaluateContactPermissionWithLookup } from "../compliance/evaluateContactPermission.ts";
import type { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Informational only, per the CORE ARCHITECTURAL RULE — every field here
 * is attached to the decision for downstream visibility and is never
 * read by evaluateOutreachEligibility() when determining `status`.
 */
export type OutreachOpportunityContext = {
  opportunityId?: number | string | null;
  opportunityScore?: number | null;
  opportunityReason?: string | null;
  renewalWindow?: string | null;
  estimatedValue?: number | null;
};

/**
 * Extends Phase 4's own input type rather than duplicating its fields —
 * everything Phase 4 needs (channel, identifiers, contact data, source/
 * campaign, identity/consent/contactability evidence) is reused exactly,
 * plus the one addition this phase introduces: optional commercial
 * context, which is carried through to the decision but never consulted.
 */
export type OutreachEligibilityInput = ContactPermissionEvaluationInput & {
  opportunityContext?: OutreachOpportunityContext | null;
};

export type OutreachEligibilityStatus = "eligible_for_handoff" | "blocked" | "needs_review" | "evaluation_failed";

export type OutreachEligibilityReason = { factor: string; detail: string };

export type OutreachEligibilityEvidence = {
  contactPermissionStatus: ContactPermissionStatus;
  opportunityContext: OutreachOpportunityContext | null;
};

export type OutreachEligibilityDecision = {
  status: OutreachEligibilityStatus;
  requestedChannel: ContactChannel | null;
  contactPermissionDecision: ContactPermissionDecision;
  handoffAllowed: boolean;
  reviewRequired: boolean;
  /** Always the literal `false` — see module header. Never evidence that a call/message/task was actually created. */
  executionPerformed: false;
  reasons: OutreachEligibilityReason[];
  evidence: OutreachEligibilityEvidence;
  evaluatedAt: string;
};

const STATUS_MAP: Record<ContactPermissionStatus, OutreachEligibilityStatus> = {
  eligible: "eligible_for_handoff",
  blocked: "blocked",
  needs_review: "needs_review",
  evaluation_failed: "evaluation_failed",
};

function statusReason(contactPermissionDecision: ContactPermissionDecision): OutreachEligibilityReason {
  switch (contactPermissionDecision.status) {
    case "eligible":
      return { factor: "Contact permission", detail: "Phase 4 contact-permission gate returned eligible — action may be handed to a future execution layer." };
    case "blocked":
      return { factor: "Contact permission", detail: "Phase 4 contact-permission gate returned blocked — no commercial or other signal can override this." };
    case "needs_review":
      return { factor: "Contact permission", detail: "Phase 4 contact-permission gate returned needs_review — human review required before this can be handed off." };
    case "evaluation_failed":
      return { factor: "Contact permission", detail: "Phase 4 contact-permission gate could not be evaluated — treated as not eligible for handoff, not silently retried." };
  }
}

/**
 * Pure. Accepts an already-completed Phase 4 ContactPermissionDecision
 * (never recomputed here) and optional commercial context, and returns a
 * deterministic outreach-handoff decision. Never mutates its arguments,
 * never performs I/O, never itself fails. The status mapping is a direct
 * 1:1 relay of contactPermissionDecision.status — commercial context is
 * attached to `evidence` for visibility only and plays no role in the
 * mapping, satisfying the requirement that opportunity/revenue signals
 * can never override compliance.
 */
export function evaluateOutreachEligibility(
  contactPermissionDecision: ContactPermissionDecision,
  opportunityContext: OutreachOpportunityContext | null,
  evaluatedAt: Date,
): OutreachEligibilityDecision {
  const status = STATUS_MAP[contactPermissionDecision.status];
  const reasons: OutreachEligibilityReason[] = [statusReason(contactPermissionDecision)];

  if (opportunityContext) {
    reasons.push({
      factor: "Commercial context",
      detail: "Opportunity context was supplied for downstream visibility only and did not affect this decision's status.",
    });
  }

  return {
    status,
    requestedChannel: contactPermissionDecision.requestedChannel,
    contactPermissionDecision,
    handoffAllowed: status === "eligible_for_handoff",
    reviewRequired: status === "needs_review",
    executionPerformed: false,
    reasons,
    evidence: {
      contactPermissionStatus: contactPermissionDecision.status,
      opportunityContext: opportunityContext ?? null,
    },
    evaluatedAt: evaluatedAt.toISOString(),
  };
}

/**
 * Thin orchestration wrapper: reuses Phase 4's
 * evaluateContactPermissionWithLookup() unchanged (which itself reuses
 * Phase 3's evaluateSuppressionWithLookup() unchanged) — no new database
 * read, no service-role access, no RLS bypass. This is the only function
 * in this module that performs I/O.
 */
export async function evaluateOutreachEligibilityWithLookup(
  supabase: SupabaseServerClient,
  input: OutreachEligibilityInput,
  evaluatedAt: Date,
): Promise<OutreachEligibilityDecision> {
  const contactPermissionDecision = await evaluateContactPermissionWithLookup(supabase, input, evaluatedAt);
  return evaluateOutreachEligibility(contactPermissionDecision, input.opportunityContext ?? null, evaluatedAt);
}
