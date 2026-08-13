// Factory 025C Slice 1: pure Meta/Facebook Lead Ads payload adapter.
//
// PURE — no I/O of any kind. This function does not call Meta, does not
// fetch lead details from the Graph API, does not verify webhook
// signatures, does not read environment variables, does not access
// Supabase, does not write any database row, does not generate outreach,
// and does not make any HTTP request. Its sole responsibility is
// normalization and validation into the CanonicalExternalLead shape, or
// reporting deterministically why it cannot.
//
// TRUST RULE — read before wiring this into anything: this function
// assumes authentication/signature verification has ALREADY happened, in
// a future route layer, before it is ever called with real data. This
// adapter has no way to know whether its input came from a genuine,
// verified Meta webhook or an attacker's guess — normalizing a payload
// here is not, and must never be treated as, proof that the request was
// authenticated. Do not later mistake "this adapter accepted the shape"
// for "this request was verified."
//
// DATA MINIMISATION: this adapter only ever reads the narrow, named
// fields on MetaLeadInput below — a raw Meta webhook/Graph API payload
// has many more fields than this, and none of them are read, stored, or
// passed through. Extracting exactly these fields from Meta's real
// payload shape, and nothing else, is the responsibility of the future
// route layer that constructs a MetaLeadInput value in the first place.

import type {
  CanonicalExternalLead,
  CanonicalExternalLeadValidationError,
  NormalizeExternalLeadResult,
} from "../canonicalExternalLead";

/** Authoritative Meta/Facebook lead-source value — always this constant, never derived from input, never routed through the Factory 025B browser/referrer classifier (that classifier is website-traffic-origin only and has no meaning for a machine-sourced lead). */
const META_LEAD_SOURCE = "meta_ads";

/** Mirrors the 200-character cap already used for company/contact name elsewhere in this codebase (public.ingest_public_lead). */
const MAX_TEXT_LENGTH = 200;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deliberately narrow — only the fields a future, already-verified Meta
 * Lead Ads webhook (plus its Graph API follow-up call, per the Factory
 * 025C discovery report) would ever supply to this adapter. This is NOT
 * Meta's actual raw webhook/Graph API response shape — translating that
 * into this narrow type is the future route layer's job, and is exactly
 * where "extract only what's needed, discard the rest" must happen.
 */
export type MetaLeadInput = {
  leadId: string | null | undefined;
  createdTime: string | null | undefined;
  companyName?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  formId?: string | null;
  /** True only if the provider payload contained explicit consent evidence. Absent, false, or undefined means no such evidence was found — never inferred, never defaulted to true. */
  hasExplicitConsentEvidence?: boolean;
};

function cleanText(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

/** A telephone value is accepted only if it has at least 10 digits and isn't absurdly long — same digit-count discipline already used by public.ingest_public_lead. */
function cleanTelephone(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return null;
  }
  const digitCount = trimmed.replace(/[^0-9]/g, "").length;
  return digitCount >= 10 && trimmed.length <= 30 ? trimmed : null;
}

function isValidEmailShape(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

/** Treats an unparseable timestamp the same as a missing one — a garbage value must never be silently accepted, since a future ingestion layer relies on this for replay/timestamp validation. */
function isUsableTimestamp(value: string): boolean {
  return value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function normalizeMetaLead(input: MetaLeadInput): NormalizeExternalLeadResult {
  const errors: CanonicalExternalLeadValidationError[] = [];

  const externalLeadId = typeof input.leadId === "string" ? input.leadId.trim() : "";
  if (!externalLeadId) {
    errors.push("missing_external_lead_id");
  }

  const receivedAt = typeof input.createdTime === "string" ? input.createdTime.trim() : "";
  if (!isUsableTimestamp(receivedAt)) {
    errors.push("missing_received_at");
  }

  const rawEmail = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  let email: string | null = null;
  if (rawEmail) {
    if (isValidEmailShape(rawEmail)) {
      email = rawEmail;
    } else {
      errors.push("invalid_email");
    }
  }

  const rawTelephone = typeof input.phoneNumber === "string" ? input.phoneNumber.trim() : "";
  const telephone = cleanTelephone(rawTelephone);
  if (rawTelephone && !telephone) {
    errors.push("invalid_telephone");
  }

  if (!email && !telephone) {
    errors.push("missing_contact_identifier");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const lead: CanonicalExternalLead = {
    provider: "meta",
    externalLeadId,
    receivedAt,
    leadSource: META_LEAD_SOURCE,
    companyName: cleanText(input.companyName),
    contactName: cleanText(input.fullName),
    telephone,
    email,
    campaignId: cleanText(input.campaignId),
    campaignName: cleanText(input.campaignName),
    formId: cleanText(input.formId),
    consentStatus: input.hasExplicitConsentEvidence === true ? "affirmative" : "unknown",
  };

  return { success: true, lead };
}
