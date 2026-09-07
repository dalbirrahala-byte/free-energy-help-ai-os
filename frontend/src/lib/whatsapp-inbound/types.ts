// Factory 045 Phase 1 — dormant WhatsApp inbound contracts.
// Pure types only: no provider SDK, credentials, network or database I/O.

export type WhatsAppInboundMessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "location"
  | "contacts"
  | "interactive"
  | "unknown";

export type WhatsAppInboundInput = {
  messageId?: string | null;
  from?: string | null;
  timestamp?: string | number | null;
  type?: string | null;
  textBody?: string | null;
};

export type CanonicalWhatsAppInboundMessage = {
  provider: "whatsapp";
  providerMessageId: string;
  senderPhone: string;
  receivedAt: string;
  messageType: WhatsAppInboundMessageType;
  text: string | null;
};

export type NormalizeWhatsAppInboundResult =
  | { success: true; message: CanonicalWhatsAppInboundMessage }
  | {
      success: false;
      errors: Array<
        | "missing_message_id"
        | "invalid_sender_phone"
        | "invalid_timestamp"
        | "unsupported_message"
      >;
    };
