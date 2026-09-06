import type { CanonicalWhatsAppInboundMessage } from "./types.ts";
import { buildWhatsAppMessageIdempotencyKey } from "./idempotency.ts";

export type WhatsAppLeadMatch =
  | { kind: "none" }
  | { kind: "one"; leadId: number }
  | { kind: "ambiguous"; leadIds: number[] };

export type WhatsAppCrmIntakePlan =
  | {
      disposition: "create_lead_and_activity";
      idempotencyKey: string;
      lead: {
        source: "WhatsApp";
        telephone: string;
        status: "New";
        owner: "Unassigned";
        nextAction: "Review WhatsApp enquiry and assign follow-up";
      };
      activity: { activityType: "WhatsApp"; direction: "inbound"; providerMessageId: string };
      outboundReplyAllowed: false;
    }
  | {
      disposition: "attach_activity";
      idempotencyKey: string;
      leadId: number;
      activity: { activityType: "WhatsApp"; direction: "inbound"; providerMessageId: string };
      outboundReplyAllowed: false;
    }
  | {
      disposition: "manual_identity_review";
      idempotencyKey: string;
      candidateLeadIds: number[];
      outboundReplyAllowed: false;
    };

export function planWhatsAppCrmIntake(
  message: CanonicalWhatsAppInboundMessage,
  match: WhatsAppLeadMatch,
): WhatsAppCrmIntakePlan {
  const idempotencyKey = buildWhatsAppMessageIdempotencyKey(message.providerMessageId);
  if (!idempotencyKey) throw new Error("invalid_provider_message_id");

  if (match.kind === "ambiguous") {
    return {
      disposition: "manual_identity_review",
      idempotencyKey,
      candidateLeadIds: [...match.leadIds],
      outboundReplyAllowed: false,
    };
  }

  const activity = {
    activityType: "WhatsApp" as const,
    direction: "inbound" as const,
    providerMessageId: message.providerMessageId,
  };

  if (match.kind === "one") {
    return {
      disposition: "attach_activity",
      idempotencyKey,
      leadId: match.leadId,
      activity,
      outboundReplyAllowed: false,
    };
  }

  return {
    disposition: "create_lead_and_activity",
    idempotencyKey,
    lead: {
      source: "WhatsApp",
      telephone: message.senderPhone,
      status: "New",
      owner: "Unassigned",
      nextAction: "Review WhatsApp enquiry and assign follow-up",
    },
    activity,
    outboundReplyAllowed: false,
  };
}
