import type { WhatsAppCrmIntakePlan } from "./planWhatsAppCrmIntake.ts";
import type { WhatsAppInboundProcessingResult } from "./prepareWhatsAppInboundProcessing.ts";

export type WhatsAppCrmWriteIntent =
  | {
      disposition: "prepared_create";
      provenanceReference: string;
      idempotencyKey: string;
      lead: Extract<WhatsAppCrmIntakePlan, { disposition: "create_lead_and_activity" }>["lead"];
      activity: Extract<WhatsAppCrmIntakePlan, { disposition: "create_lead_and_activity" }>["activity"];
      persistenceAllowed: false;
      outboundReplyAllowed: false;
    }
  | {
      disposition: "prepared_attach";
      provenanceReference: string;
      idempotencyKey: string;
      leadId: number;
      activity: Extract<WhatsAppCrmIntakePlan, { disposition: "attach_activity" }>["activity"];
      persistenceAllowed: false;
      outboundReplyAllowed: false;
    }
  | {
      disposition: "human_review_required";
      provenanceReference: string | null;
      idempotencyKey: string | null;
      candidateLeadIds: number[];
      persistenceAllowed: false;
      outboundReplyAllowed: false;
    }
  | {
      disposition: "rejected";
      reason: "upstream_rejected" | "invalid_prepared_plan";
      provenanceReference: string | null;
      idempotencyKey: string | null;
      persistenceAllowed: false;
      outboundReplyAllowed: false;
    };

/**
 * Factory 045 Phase 3 translates a Phase 2 result into a persistence intent.
 * It deliberately does not persist anything. A later reviewed boundary must
 * authorize and execute any CRM/database mutation.
 */
export function prepareWhatsAppCrmWriteIntent(
  result: WhatsAppInboundProcessingResult,
): WhatsAppCrmWriteIntent {
  if (result.disposition !== "prepared") {
    return {
      disposition: "rejected",
      reason: "upstream_rejected",
      provenanceReference: null,
      idempotencyKey: null,
      persistenceAllowed: false,
      outboundReplyAllowed: false,
    };
  }

  const { plan, provenanceReference } = result;
  if (!plan.idempotencyKey || !provenanceReference) {
    return {
      disposition: "rejected",
      reason: "invalid_prepared_plan",
      provenanceReference: provenanceReference || null,
      idempotencyKey: plan.idempotencyKey || null,
      persistenceAllowed: false,
      outboundReplyAllowed: false,
    };
  }

  if (plan.disposition === "manual_identity_review") {
    return {
      disposition: "human_review_required",
      provenanceReference,
      idempotencyKey: plan.idempotencyKey,
      candidateLeadIds: [...plan.candidateLeadIds],
      persistenceAllowed: false,
      outboundReplyAllowed: false,
    };
  }

  if (plan.disposition === "attach_activity") {
    return {
      disposition: "prepared_attach",
      provenanceReference,
      idempotencyKey: plan.idempotencyKey,
      leadId: plan.leadId,
      activity: { ...plan.activity },
      persistenceAllowed: false,
      outboundReplyAllowed: false,
    };
  }

  return {
    disposition: "prepared_create",
    provenanceReference,
    idempotencyKey: plan.idempotencyKey,
    lead: { ...plan.lead },
    activity: { ...plan.activity },
    persistenceAllowed: false,
    outboundReplyAllowed: false,
  };
}
