import type {
  NormalizeWhatsAppInboundResult,
  WhatsAppInboundInput,
  WhatsAppInboundMessageType,
} from "./types.ts";

const MESSAGE_TYPES = new Set<WhatsAppInboundMessageType>([
  "text", "image", "document", "audio", "video", "location", "contacts", "interactive", "unknown",
]);

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!/^\+?[1-9]\d{7,14}$/.test(compact)) return null;
  return compact.startsWith("+") ? compact : `+${compact}`;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value.trim()))) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const millis = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeWhatsAppInbound(
  input: WhatsAppInboundInput,
): NormalizeWhatsAppInboundResult {
  const errors: Extract<NormalizeWhatsAppInboundResult, { success: false }>["errors"] = [];
  const providerMessageId = typeof input.messageId === "string" ? input.messageId.trim() : "";
  if (!providerMessageId || providerMessageId.length > 200) errors.push("missing_message_id");

  const senderPhone = normalizePhone(input.from);
  if (!senderPhone) errors.push("invalid_sender_phone");

  const receivedAt = normalizeTimestamp(input.timestamp);
  if (!receivedAt) errors.push("invalid_timestamp");

  const rawType = typeof input.type === "string" ? input.type.trim().toLowerCase() : "unknown";
  const messageType: WhatsAppInboundMessageType =
    MESSAGE_TYPES.has(rawType as WhatsAppInboundMessageType)
      ? (rawType as WhatsAppInboundMessageType)
      : "unknown";

  const text =
    messageType === "text" && typeof input.textBody === "string"
      ? input.textBody.trim().slice(0, 4000) || null
      : null;

  if (messageType === "text" && text === null) errors.push("unsupported_message");
  if (errors.length > 0 || !senderPhone || !receivedAt) return { success: false, errors };

  return {
    success: true,
    message: {
      provider: "whatsapp",
      providerMessageId,
      senderPhone,
      receivedAt,
      messageType,
      text,
    },
  };
}
