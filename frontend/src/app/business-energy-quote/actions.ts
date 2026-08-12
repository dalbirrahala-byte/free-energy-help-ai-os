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
// The FAILURE/rejection case is still recorded from here, not from the
// database function, because a rejection (consent_required, invalid_email,
// etc.) raises a Postgres exception that aborts the whole transaction —
// making a failure audit row survive that would require either an
// autonomous-transaction mechanism or changing this function's exception-
// based error contract, both out of scope for the approved fix. This
// failure-path call carries the same known limitation as before: audit_
// log's current RLS policy (audit_log_insert_self) grants INSERT to
// `authenticated` only, so as `anon` this insert is rejected by RLS today
// and recordAuditEvent swallows that into a server-side console.warn —
// wired in now, ready to persist once a separately-approved future change
// (most likely extending the DB function's error contract) closes that
// specific gap too.
//
// Metadata deliberately excludes company/contact/email/phone — only the
// lead_source constant, whether UTM parameters were present, and the same
// generic, already-scrubbed message mapIngestError produces for the user.

import { buildAuditEvent, recordAuditEvent } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";
import { renewalTimingLabel } from "@/lib/website-leads/labels";
import type { WebsiteLeadFormErrors, WebsiteLeadFormInput } from "@/lib/website-leads/types";
import { hasFormErrors, isValidRenewalTiming, validateWebsiteLeadForm } from "@/lib/website-leads/validation";

const LEAD_SOURCE = "Website";
const SOURCE_DETAIL = "Business energy quote form";

/** Applied only when no utm_source query parameter was present on the landing URL. */
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

  const utmSource = cleanUtmValue(formData.get("utm_source")) ?? DEFAULT_UTM_SOURCE;
  const utmMedium = cleanUtmValue(formData.get("utm_medium"));
  const utmCampaign = cleanUtmValue(formData.get("utm_campaign"));
  const utmTerm = cleanUtmValue(formData.get("utm_term"));
  const utmContent = cleanUtmValue(formData.get("utm_content"));

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

  const hasUtm = Boolean(utmMedium || utmCampaign || utmTerm || utmContent || utmSource !== DEFAULT_UTM_SOURCE);

  if (error || typeof data !== "number") {
    const safeReason = mapIngestError(error?.message);

    await recordAuditEvent(
      supabase,
      buildAuditEvent({
        action: "public_lead_ingested",
        actorId: null,
        actorRole: null,
        entityType: "lead",
        entityId: null,
        result: "failure",
        metadata: { leadSource: LEAD_SOURCE, hasUtm, reason: safeReason },
      }),
    );

    return { success: false, errors: { form: safeReason } };
  }

  return { success: true, leadId: data };
}
