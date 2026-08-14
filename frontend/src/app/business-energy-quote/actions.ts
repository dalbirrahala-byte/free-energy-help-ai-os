"use server";

// Factory 024 Phase 2C: the one place the public quote form is allowed to
// reach the database. Calls only the already-approved, security-audited
// public.ingest_public_lead(...) RPC (Factory 024 Phase 2B) via the same
// publishable-key server client used everywhere else in this app — no
// service-role key, no direct table insert, no new privileged path.
//
// lead_source and source_detail are hardcoded constants below, never read
// from the client payload — this is the one discipline the approved
// Phase 2A/2B security design requires the caller to uphold correctly.
//
// Factory 025A: the SUCCESS case's authoritative audit_log row is now
// written inside public.ingest_public_lead() itself (see
// supabase/migrations/20260812120000_ingest_public_lead_audit_log.sql) —
// that SECURITY DEFINER function already bypasses RLS to write
// public.leads on this anonymous caller's behalf, so it can do the same
// for audit_log without granting `anon` any access to that table. An
// application-layer success audit call here would be redundant with that
// authoritative DB-side event, so it was removed.
//
// The FAILURE/rejection case is still recorded from here, not from
// ingest_public_lead itself, because a rejection (consent_required,
// invalid_email, etc.) raises a Postgres exception that aborts the whole
// transaction — an audit insert placed before the raise would be rolled
// back with it. As of Factory 026A this call goes through the separate
// public.record_public_lead_rejection(...) RPC (its own, independent
// transaction) instead of a direct client-side audit_log insert, so it
// persists even though ingest_public_lead's own attempt did not — see the
// Factory 026A note below for the full reasoning.
//
// Metadata deliberately excludes company/contact/email/phone — only the
// lead_source constant, whether UTM parameters were present, and the same
// generic, already-scrubbed message mapIngestError produces for the user.
//
// Factory 025B: when no explicit utm_source query parameter was present,
// the fallback value is now the analytics-only acquisition-origin
// classification computed server-side in business-energy-quote/page.tsx
// (classifyAcquisitionOrigin.ts) from the inbound page-load request's
// Referer/Host headers, instead of the previous hardcoded "direct"
// literal. Precedence is unchanged: an explicit utm_source always wins;
// the classifier only ever fills the gap when one is absent. The value
// arrives here as an ordinary form field and is validated against the
// fixed AcquisitionOrigin vocabulary before use — never trusted blindly,
// same discipline as every other field on this form.
//
// Factory 026A: the failure/rejection audit event below is now written
// via the approved public.record_public_lead_rejection(...) RPC (see
// supabase/migrations/20260814100000_public_lead_rejection_audit_
// function.sql) instead of a direct client-side audit_log insert.
// audit_log has no anon INSERT policy — and per the Factory 026A
// decision, must not gain one — so this reaches it the same way
// ingest_public_lead itself already reaches public.leads: through a
// narrow SECURITY DEFINER function, not a new RLS grant.

import { isAcquisitionOrigin } from "@/lib/website-leads/classifyAcquisitionOrigin";
import { createClient } from "@/lib/supabase/server";
import { renewalTimingLabel } from "@/lib/website-leads/labels";
import type { WebsiteLeadFormErrors, WebsiteLeadFormInput } from "@/lib/website-leads/types";
import { hasFormErrors, isValidRenewalTiming, validateWebsiteLeadForm } from "@/lib/website-leads/validation";

const LEAD_SOURCE = "Website";
const SOURCE_DETAIL = "Business energy quote form";

/** Ultimate fallback if even the acquisition-origin classification is missing or invalid. */
const DEFAULT_UTM_SOURCE = "direct";

const GENERIC_ERROR = "We could not save your enquiry. Please try again.";

export type SubmitQuoteEnquiryResult =
  | { success: true; leadId: number }
  | { success: false; errors: WebsiteLeadFormErrors };

function cleanUtmValue(value: FormDataEntryValue | null): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, 150) : null;
}

/** Maps the ingestion function's short exception identifiers to safe, field-level user messages — never the raw Postgres error text. */
function mapIngestError(message: string | undefined): string {
  if (!message) {
    return GENERIC_ERROR;
  }
  if (message.includes("consent_required")) {
    return "Please confirm you agree to be contacted about this enquiry.";
  }
  if (message.includes("invalid_email")) {
    return "Enter a valid email address.";
  }
  if (message.includes("invalid_telephone")) {
    return "Enter a valid UK telephone number.";
  }
  if (message.includes("invalid_company_name") || message.includes("invalid_contact_name")) {
    return "Please check your business and contact name.";
  }
  return GENERIC_ERROR;
}

export async function submitQuoteEnquiry(formData: FormData): Promise<SubmitQuoteEnquiryResult> {
  const input: WebsiteLeadFormInput = {
    businessName: String(formData.get("businessName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    telephone: String(formData.get("telephone") ?? ""),
    email: String(formData.get("email") ?? ""),
    postcode: String(formData.get("postcode") ?? ""),
    renewalTiming: String(formData.get("renewalTiming") ?? "") as WebsiteLeadFormInput["renewalTiming"],
    consent: formData.get("consent") === "true",
  };

  // Server-side re-validation — never trust the client-side pass alone.
  const validation = validateWebsiteLeadForm(input);
  if (hasFormErrors(validation)) {
    return { success: false, errors: validation };
  }

  const postcode = input.postcode.trim();
  const timingLabel = isValidRenewalTiming(input.renewalTiming) ? renewalTimingLabel(input.renewalTiming) : null;

  const contextParts: string[] = [];
  if (postcode) {
    contextParts.push(`Postcode: ${postcode}.`);
  }
  if (timingLabel) {
    contextParts.push(`Renewal timing: ${timingLabel}.`);
  }
  const additionalContext = contextParts.length > 0 ? contextParts.join(" ") : null;

  const explicitUtmSource = cleanUtmValue(formData.get("utm_source"));
  const utmMedium = cleanUtmValue(formData.get("utm_medium"));
  const utmCampaign = cleanUtmValue(formData.get("utm_campaign"));
  const utmTerm = cleanUtmValue(formData.get("utm_term"));
  const utmContent = cleanUtmValue(formData.get("utm_content"));

  const acquisitionOriginRaw = formData.get("acquisition_origin");
  const acquisitionOriginFallback =
    typeof acquisitionOriginRaw === "string" && isAcquisitionOrigin(acquisitionOriginRaw)
      ? acquisitionOriginRaw
      : DEFAULT_UTM_SOURCE;

  const utmSource = explicitUtmSource ?? acquisitionOriginFallback;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("ingest_public_lead", {
    p_company_name: input.businessName.trim(),
    p_contact_name: input.contactName.trim(),
    p_telephone: input.telephone.trim(),
    p_email: input.email.trim(),
    p_lead_source: LEAD_SOURCE,
    p_consent_given: input.consent === true,
    p_source_detail: SOURCE_DETAIL,
    p_utm_source: utmSource,
    p_utm_medium: utmMedium,
    p_utm_campaign: utmCampaign,
    p_utm_term: utmTerm,
    p_utm_content: utmContent,
    p_additional_context: additionalContext,
  });

  // Reflects genuine explicit campaign attribution only — deliberately
  // independent of whether the acquisition-origin fallback filled in
  // utmSource, so audit metadata isn't misleadingly marked "has UTM" for
  // organic/direct/referral traffic that just happened to get classified.
  const hasUtm = Boolean(explicitUtmSource || utmMedium || utmCampaign || utmTerm || utmContent);

  if (error || typeof data !== "number") {
    const rawReason = error?.message ?? "unknown";
    const safeReason = mapIngestError(error?.message);

    // Never surfaced to the caller and never blocks the (already scrubbed)
    // error message returned below — an audit-write failure must not
    // become a worse user-facing error than the original rejection.
    const { error: auditError } = await supabase.rpc("record_public_lead_rejection", {
      p_reason: rawReason,
      p_lead_source: LEAD_SOURCE,
      p_has_utm: hasUtm,
    });
    if (auditError) {
      console.warn(`[Audit] Failed to persist public lead rejection: ${auditError.message}`);
    }

    return { success: false, errors: { form: safeReason } };
  }

  return { success: true, leadId: data };
}
