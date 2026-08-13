// Factory 025C Slice 1: canonical external-lead model — the shared,
// provider-agnostic shape every future provider adapter normalizes into.
//
// Pure data shapes only. No I/O, no database reference, no network
// reference, no environment variable, anywhere in this file.
//
// TRUST NOTE: nothing in this module authenticates anything. Producing a
// CanonicalExternalLead says only "this payload was successfully
// normalized," never "this request was verified." Signature/webhook
// verification is a separate, not-yet-built concern (a future route
// layer) that must happen BEFORE any adapter using these types is ever
// called with real provider data — see the trust-rule comment in
// adapters/meta.ts.
//
// This is deliberately NOT the same shape as lib/shared/domain.ts's
// CanonicalLead — that type mirrors real Supabase `leads` columns
// already in production. This one is a pre-database normalization shape;
// nothing in this pipeline writes to a database yet (Slice 2/3, not
// built here).

/** Extend this union only when a future, separately-approved provider (LinkedIn, Reddit, WhatsApp) is designed — not done speculatively here. */
export type ExternalLeadProvider = "meta";

/**
 * Deliberately only two states. "unknown" is the sole safe default when a
 * provider payload carries no explicit consent evidence — it must never
 * be silently upgraded to "affirmative" by any adapter or downstream
 * consumer.
 */
export type ExternalLeadConsentStatus = "affirmative" | "unknown";

export type CanonicalExternalLead = {
  provider: ExternalLeadProvider;
  /** The idempotency key for a future ingestion layer — this provider's own unique ID for this lead. */
  externalLeadId: string;
  /** ISO-8601-shaped string — the provider's own event timestamp, not this process's clock. */
  receivedAt: string;
  /** Authoritative and adapter-set only — never derived from caller input, and never routed through the Factory 025B browser/referrer classifier. */
  leadSource: string;
  companyName: string | null;
  contactName: string | null;
  telephone: string | null;
  email: string | null;
  campaignId: string | null;
  campaignName: string | null;
  formId: string | null;
  consentStatus: ExternalLeadConsentStatus;
};

export type CanonicalExternalLeadValidationError =
  | "missing_external_lead_id"
  | "missing_received_at"
  | "invalid_email"
  | "invalid_telephone"
  /** Neither email nor telephone survived validation — at least one contact identifier is required. */
  | "missing_contact_identifier"
  /** Reserved for a future multi-provider dispatcher (Slice 3+) that routes by a provider string before selecting an adapter — no Slice 1 code produces this, since each adapter here is provider-specific by construction. */
  | "unsupported_provider";

export type NormalizeExternalLeadResult =
  | { success: true; lead: CanonicalExternalLead }
  | { success: false; errors: CanonicalExternalLeadValidationError[] };
