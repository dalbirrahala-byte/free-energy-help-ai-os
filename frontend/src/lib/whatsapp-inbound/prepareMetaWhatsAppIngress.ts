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

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function normalizeProviderIdentity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(normalized)) return null;
  return normalized;
}

function normalizeReceivedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
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
  const runtimeInput = asRecord(input as unknown);
  if (!runtimeInput || runtimeInput.signatureVerified !== true) {
    return {
      disposition: "rejected",
      reason: "unverified_webhook",
      ...CAPABILITY_LOCKS,
    };
  }

  const wabaId = normalizeProviderIdentity(runtimeInput.wabaId);
  const phoneNumberId = normalizeProviderIdentity(runtimeInput.phoneNumberId);
  if (!wabaId || !phoneNumberId) {
    return {
      disposition: "rejected",
      reason: "missing_provider_identity",
      ...CAPABILITY_LOCKS,
    };
  }

  const receivedAt = normalizeReceivedAt(runtimeInput.receivedAt);
  if (!receivedAt) {
    return {
      disposition: "rejected",
      reason: "invalid_received_at",
      ...CAPABILITY_LOCKS,
    };
  }

  const runtimeMessage = asRecord(runtimeInput.message);
  if (!runtimeMessage) {
    return {
      disposition: "rejected",
      reason: "invalid_message",
      ...CAPABILITY_LOCKS,
    };
  }

  const normalized = normalizeWhatsAppInbound(runtimeMessage as WhatsAppInboundInput);
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
