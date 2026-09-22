import { normalizeWhatsAppInbound } from "./normalizeWhatsAppInbound.ts";
import type {
  CanonicalWhatsAppInboundMessage,
  NormalizeWhatsAppInboundResult,
  WhatsAppInboundInput,
} from "./types.ts";

export type MetaWhatsAppIngressInput = Readonly<{
  wabaId: string;
  phoneNumberId: string;
  signatureVerified: boolean;
  receivedAt: string;
  message: WhatsAppInboundInput;
}>;

export type PreparedMetaWhatsAppIngress = Readonly<{
  disposition: "prepared";
  provider: "meta_whatsapp_business_platform";
  wabaId: string;
  phoneNumberId: string;
  providerMessageId: string;
  idempotencyKey: string;
  provenanceReference: string;
  receivedAt: string;
  message: CanonicalWhatsAppInboundMessage;
  crmWriteAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

export type RejectedMetaWhatsAppIngress = Readonly<{
  disposition: "rejected";
  reason:
    | "unverified_webhook"
    | "missing_provider_identity"
    | "invalid_received_at"
    | "invalid_message"
    | "unsupported_message";
  normalizationErrors?: Extract<
    NormalizeWhatsAppInboundResult,
    { success: false }
  >["errors"];
  crmWriteAllowed: false;
  outboundReplyAllowed: false;
  providerExecutionAllowed: false;
}>;

export type MetaWhatsAppIngressResult =
  | PreparedMetaWhatsAppIngress
  | RejectedMetaWhatsAppIngress;

function normalizeProviderIdentity(value: string): string {
  return value.trim().slice(0, 200);
}

function normalizeReceivedAt(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const CAPABILITY_LOCKS = {
  crmWriteAllowed: false as const,
  outboundReplyAllowed: false as const,
  providerExecutionAllowed: false as const,
};

/**
 * Factory 045 Phase 15A: provider-specific evidence preparation only.
 *
 * A caller may invoke this function only after its webhook verification layer
 * has determined whether the Meta signature is valid. The function itself has
 * no access to credentials or secrets and performs no network/database I/O.
 *
 * It rejects unverified webhooks, missing provider identity, invalid arrival
 * timestamps, invalid normalized messages and unsupported/unknown message
 * types. A prepared result remains non-mutating and cannot authorize a CRM
 * write, an outbound reply or provider execution.
 */
export function prepareMetaWhatsAppIngress(
  input: MetaWhatsAppIngressInput,
): MetaWhatsAppIngressResult {
  if (!input.signatureVerified) {
    return {
      disposition: "rejected",
      reason: "unverified_webhook",
      ...CAPABILITY_LOCKS,
    };
  }

  const wabaId = normalizeProviderIdentity(input.wabaId);
  const phoneNumberId = normalizeProviderIdentity(input.phoneNumberId);
  if (!wabaId || !phoneNumberId) {
    return {
      disposition: "rejected",
      reason: "missing_provider_identity",
      ...CAPABILITY_LOCKS,
    };
  }

  const receivedAt = normalizeReceivedAt(input.receivedAt);
  if (!receivedAt) {
    return {
      disposition: "rejected",
      reason: "invalid_received_at",
      ...CAPABILITY_LOCKS,
    };
  }

  const normalized = normalizeWhatsAppInbound(input.message);
  if (!normalized.success) {
    return {
      disposition: "rejected",
      reason: "invalid_message",
      normalizationErrors: normalized.errors,
      ...CAPABILITY_LOCKS,
    };
  }

  if (normalized.message.messageType === "unknown") {
    return {
      disposition: "rejected",
      reason: "unsupported_message",
      ...CAPABILITY_LOCKS,
    };
  }

  const providerMessageId = normalized.message.providerMessageId;
  const identity = `meta-whatsapp:waba:${wabaId}:phone:${phoneNumberId}:message:${providerMessageId}`;

  return {
    disposition: "prepared",
    provider: "meta_whatsapp_business_platform",
    wabaId,
    phoneNumberId,
    providerMessageId,
    idempotencyKey: identity,
    provenanceReference: `${identity}:received:${receivedAt}`,
    receivedAt,
    message: normalized.message,
    ...CAPABILITY_LOCKS,
  };
}
