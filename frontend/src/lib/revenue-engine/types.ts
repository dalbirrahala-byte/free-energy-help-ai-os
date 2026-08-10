// Factory 023 Phase 1: foundation types only. No provider implementation,
// no external API calls, no voice/telephony/lead-gen vendor code — this
// file exists so later factories have a shared, vendor-agnostic contract
// to build against instead of hard-wiring a specific provider into the
// core CRM.

import type { ServiceStatus } from "@/lib/ai-control-centre/types";

/**
 * How a piece of lead data came to exist. Lets the app eventually
 * distinguish something a human typed in from something an AI system
 * inferred or independently verified, per the standing "never present
 * inferred information as verified fact" rule.
 */
export type LeadSourceProvenance = "user-entered" | "ai-inferred" | "verified";

/** Mirrors the `lead_source`/`source_detail`/`source_provenance` columns added in 20260811100000. */
export type LeadAttribution = {
  leadSource: string | null;
  sourceDetail: string | null;
  sourceProvenance: LeadSourceProvenance;
};

/**
 * Reuses the AI Control Centre's proven four-state vocabulary
 * (Connected / Not configured / Unavailable / Checking) rather than
 * inventing a new one — this is the same status shape
 * docs/VOICE_ARCHITECTURE.md names as the template for provider-adapter
 * health reporting.
 */
export type ExternalCapabilityStatus = ServiceStatus;

/**
 * Identifiers for future pluggable Revenue Engine capabilities. Adding a
 * new value here does not require touching the core CRM — later
 * factories implement the provider, not this contract.
 */
export type ExternalCapabilityId =
  | "lead-generation"
  | "ai-search-attribution"
  | "voice-reception"
  | "outbound-qualification"
  | "sms"
  | "email";

/** Same shape as ai-control-centre's ServiceStatusInfo, scoped to Revenue Engine capabilities. */
export type ExternalCapabilityDescriptor = {
  id: ExternalCapabilityId;
  name: string;
  status: ExternalCapabilityStatus;
  detail: string;
};
