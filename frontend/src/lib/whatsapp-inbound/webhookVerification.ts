// Factory 045 Phase 1 — verification contract only.
// No Meta secret, token, crypto implementation or route is activated here.

export type WhatsAppWebhookVerificationInput = {
  rawBody: string;
  signature: string | null;
};

export type WhatsAppWebhookVerificationResult =
  | { verified: true }
  | { verified: false; reason: "missing_signature" | "invalid_signature" | "verification_unavailable" };

export interface WhatsAppWebhookVerifier {
  verify(input: WhatsAppWebhookVerificationInput): Promise<WhatsAppWebhookVerificationResult>;
}

export const unavailableWhatsAppWebhookVerifier: WhatsAppWebhookVerifier = {
  async verify(input) {
    if (!input.signature) return { verified: false, reason: "missing_signature" };
    return { verified: false, reason: "verification_unavailable" };
  },
};
