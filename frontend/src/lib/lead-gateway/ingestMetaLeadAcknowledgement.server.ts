import type {FormPermissionCapture} from './formPermissionCapture.server.ts';
// Server composition: signature + configured scope -> matching Graph details
// -> atomic CRM receipt/reservation. This never grants permission or sends SMS.
import { reviewMetaWebhook, type MetaLeadReference } from './metaWebhookReview.server.ts';
import { normalizeMetaLead } from './adapters/meta.ts';

export type MetaIngestionRpc = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
export type MetaLeadDetailsReader = (reference: MetaLeadReference) => Promise<unknown>;
export type MetaAcknowledgementIngressResult = Readonly<{
  status: 'persisted' | 'rejected' | 'retry_required';
  accepted: number;
  duplicates: number;
  executionAllowed: false;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractDetails(raw: unknown, ref: MetaLeadReference) {
  if (!record(raw) || raw.id !== ref.leadId || raw.form_id !== ref.formId ||
      typeof raw.created_time !== 'string' ||
      Date.parse(raw.created_time) !== ref.createdTime * 1000 ||
      !Array.isArray(raw.field_data) || raw.field_data.length > 100) return null;
  const selected = new Map<string, string>();
  // Exact identifiers observed on the configured FEH form. Preserve the supplied
  // bands as answers; they are neither an exact renewal date nor consent.
  const contractQuestion = 'when_does_your_current_business_energy_contract_end?';
  const spendQuestion = 'roughly_how_much_does_your_business_spend_on_energy_each_month?';
  const supported = new Set(['email', 'phone_number', 'full_name', 'company_name', contractQuestion, spendQuestion]);
  for (const field of raw.field_data) {
    if (!record(field) || typeof field.name !== 'string') return null;
    if (!supported.has(field.name)) continue;
    if (selected.has(field.name) || !Array.isArray(field.values) || field.values.length !== 1 ||
        typeof field.values[0] !== 'string' || field.values[0].length > 1000) return null;
    const value = field.values[0];
    if ((field.name === contractQuestion || field.name === spendQuestion) &&
        (value.length > 200 || Array.from(value).some(char =>
          char.charCodeAt(0) < 32 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159)))) return null;
    selected.set(field.name, value);
  }
  const normalized = normalizeMetaLead({
    leadId: ref.leadId, formId: ref.formId, createdTime: raw.created_time,
    campaignId: typeof raw.campaign_id==='string' && /^[1-9]\d{0,99}$/.test(raw.campaign_id)?raw.campaign_id:null,
    email: selected.get('email'), phoneNumber: selected.get('phone_number'),
    fullName: selected.get('full_name'), companyName: selected.get('company_name'),
    // Submission is not marketing consent. No arbitrary payload flag is used.
    hasExplicitConsentEvidence: false,
  });
  return normalized.success ? { ...normalized,
    contractEndAnswer: selected.get(contractQuestion)?.trim() || null,
    monthlySpendAnswer: selected.get(spendQuestion)?.trim() || null,
  } : normalized;
}

export async function ingestMetaLeadAcknowledgements(
  rawBody: Uint8Array,
  signature: unknown,
  config: Readonly<{ appSecret: string; pageId: string; formId: string; allowedPhone?: string; allowedLeadId?: string }>,
  readDetails: MetaLeadDetailsReader,
  ingestor: MetaIngestionRpc,
  permissionCapture?: FormPermissionCapture,
): Promise<MetaAcknowledgementIngressResult> {
  let accepted = 0;
  let duplicates = 0;
  const result = (status: MetaAcknowledgementIngressResult['status']): MetaAcknowledgementIngressResult =>
    ({ status, accepted, duplicates, executionAllowed: false });
  const reviewed = reviewMetaWebhook(rawBody, signature, config);
  if (reviewed.status !== 'references_for_review') return result('rejected');
  // Validate the ENTIRE batch before any Graph request. A phone restriction
  // alone would retrieve unrelated customer details before rejecting them.
  if (config.allowedLeadId !== undefined &&
      (!/^[1-9]\d{5,99}$/.test(config.allowedLeadId) ||
       reviewed.references.some(reference => reference.leadId !== config.allowedLeadId))) return result('rejected');
  try {
    for (const reference of reviewed.references) {
      const details=await readDetails(reference);
      const normalized = extractDetails(details, reference);
      if (!normalized?.success) return result('rejected');
      const lead = normalized.lead;
      if (config.allowedPhone !== undefined) {
        const cleaned = lead.telephone?.trim().replace(/[ ()-]/g,'');
        const canonical = cleaned?.startsWith('07') ? '+44'+cleaned.slice(1)
          : cleaned?.startsWith('0044') ? '+'+cleaned.slice(2) : cleaned;
        if (!/^\+447[1-57-9]\d{8}$/.test(config.allowedPhone) || canonical !== config.allowedPhone) return result('rejected');
      }
      const receipt = await ingestor.rpc('ingest_meta_lead_with_acknowledgement', {
        p_page_id: reference.pageId, p_form_id: reference.formId,
        p_external_lead_id: lead.externalLeadId, p_provider_created_at: lead.receivedAt,
        p_company_name: lead.companyName, p_contact_name: lead.contactName,
        p_telephone: lead.telephone, p_email: lead.email, p_campaign_id: lead.campaignId,
        p_contract_end_answer: normalized.contractEndAnswer,
        p_monthly_spend_answer: normalized.monthlySpendAnswer,
      });
      if (receipt.error || !Array.isArray(receipt.data) || receipt.data.length !== 1 ||
          !record(receipt.data[0])) return result('retry_required');
      const row = receipt.data[0];
      if (row.outcome === 'rejected') return result('rejected');
      if (!Number.isSafeInteger(row.lead_id) || (row.lead_id as number) <= 0) return result('retry_required');
      if (row.outcome === 'accepted' && row.acknowledgement_reserved === true) accepted++;
      else if (row.outcome === 'duplicate' && row.acknowledgement_reserved === false) duplicates++;
      else return result('retry_required');
      if(permissionCapture && !await permissionCapture({leadId:row.lead_id as number,submittedAt:lead.receivedAt,
        fields:record(details)?details.field_data:undefined})) return result('retry_required');
    }
    return result('persisted');
  } catch {
    // No provider/DB errors, token fragments, destinations or payloads escape.
    // Intake retry is safe: database uniqueness prevents another reservation.
    return result('retry_required');
  }
}
