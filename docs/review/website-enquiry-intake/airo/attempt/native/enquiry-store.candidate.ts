/**
 * Enquiry store — durable persistence for quote / health-check submissions.
 *
 * Uses the same lazy getDb() pattern as otp-service.ts so that importing this
 * module does NOT require DATABASE_URL to be configured. The DB connection is
 * opened on the first actual database operation.
 *
 * All public functions return structured results and never throw — errors are
 * caught and returned as { ok: false, code, error }.
 */

import { eq, sql } from 'drizzle-orm';
import { enquiries } from '../db/schema.js';
import type { CrmPayload } from './crm-client.js';

// ── Delivery status type ──────────────────────────────────────────────────────

export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'uncertain';

export type DeliveryColumn = 'ownerEmailStatus' | 'visitorEmailStatus' | 'crmStatus';

// ── Lazy DB accessor ──────────────────────────────────────────────────────────

let _db: typeof import('../db/client.js').db | null = null;

async function getDb(): Promise<typeof import('../db/client.js').db> {
  if (!_db) {
    const mod = await import('../db/client.js');
    _db = mod.db;
  }
  return _db;
}

// ── Row shape returned from DB queries ────────────────────────────────────────

export interface EnquiryRow {
  id: number;
  submissionId: string;
  submittedAt: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  meterNumbers: string | null;
  currentSupplier: string | null;
  message: string | null;
  smsConsent: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  sourcePage: string | null;
  ownerEmailStatus: string;
  visitorEmailStatus: string;
  crmStatus: string;
}

// ── saveEnquiry ───────────────────────────────────────────────────────────────

export interface SaveEnquiryInput {
  submissionId: string;
  submittedAt: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  meterNumbers: string | null;
  currentSupplier: string | null;
  message: string | null;
  smsConsent: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  sourcePage: string | null;
}

export type SaveEnquiryResult =
  | { ok: true; created: true; row: EnquiryRow }
  | { ok: true; created: false; row: EnquiryRow }
  | { ok: false; code: 'db_error'; error: string };

/**
 * Persist a new enquiry. Uses INSERT IGNORE so a double-submit (same
 * submissionId) silently returns the existing row without inserting a duplicate.
 *
 * Returns { created: true } on first insert, { created: false } on duplicate.
 */
export async function saveEnquiry(input: SaveEnquiryInput): Promise<SaveEnquiryResult> {
  try {
    const db = await getDb();

    // INSERT IGNORE — no error on duplicate submissionId
    const insertResult = await db.execute(sql`
      INSERT IGNORE INTO enquiries (
        submission_id, submitted_at,
        business_name, contact_name, email, phone,
        meter_numbers, current_supplier, message, sms_consent,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        gclid, fbclid, source_page,
        owner_email_status, visitor_email_status, crm_status
      ) VALUES (
        ${input.submissionId}, ${input.submittedAt},
        ${input.businessName}, ${input.contactName}, ${input.email}, ${input.phone},
        ${input.meterNumbers}, ${input.currentSupplier}, ${input.message}, ${input.smsConsent},
        ${input.utmSource}, ${input.utmMedium}, ${input.utmCampaign}, ${input.utmContent}, ${input.utmTerm},
        ${input.gclid}, ${input.fbclid}, ${input.sourcePage},
        'pending', 'pending', 'pending'
      )
    `);

    // mysql2 returns ResultSetHeader; affectedRows=1 means inserted, 0 means ignored
    const header = (insertResult as unknown as [{ affectedRows: number }])[0];
    const created = header.affectedRows === 1;

    // Fetch the row (whether just inserted or pre-existing)
    const rows = await db.select().from(enquiries).where(eq(enquiries.submissionId, input.submissionId));
    if (rows.length === 0) {
      return { ok: false, code: 'db_error', error: 'Row not found after INSERT IGNORE' };
    }

    return { ok: true, created, row: rows[0] as EnquiryRow };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[enquiry-store] saveEnquiry failed', { submissionId: input.submissionId });
    return { ok: false, code: 'db_error', error: msg };
  }
}

// ── updateDeliveryStatus ──────────────────────────────────────────────────────

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; code: 'db_error'; error: string };

/**
 * Update a single delivery-status column for an enquiry row.
 * Uses the submissionId as the lookup key.
 */
export async function updateDeliveryStatus(
  submissionId: string,
  column: DeliveryColumn,
  status: DeliveryStatus,
): Promise<UpdateStatusResult> {
  try {
    const db = await getDb();
    await db.update(enquiries)
      .set({ [column]: status })
      .where(eq(enquiries.submissionId, submissionId));
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[enquiry-store] updateDeliveryStatus failed', { submissionId, column, status });
    return { ok: false, code: 'db_error', error: msg };
  }
}

// ── getPendingOnlyCrmEnquiries ───────────────────────────────────────────────

export type GetPendingResult =
  | { ok: true; rows: EnquiryRow[] }
  | { ok: false; code: 'db_error'; error: string };

/**
 * Return enquiries where crmStatus is exactly 'pending'.
 *
 * 'pending' means CRM_ENDPOINT was absent at submission time — these are safe
 * to retry as soon as the endpoint is configured.
 *
 * 'uncertain' rows (5xx / timeout) are intentionally excluded: their outcome
 * is unknown and they must be reconciled manually before retrying to avoid
 * duplicate CRM entries.
 */
export async function getPendingOnlyCrmEnquiries(): Promise<GetPendingResult> {
  try {
    const db = await getDb();
    const rows = await db.select().from(enquiries)
      .where(eq(enquiries.crmStatus, 'pending'));
    return { ok: true, rows: rows as EnquiryRow[] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[enquiry-store] getPendingOnlyCrmEnquiries failed');
    return { ok: false, code: 'db_error', error: msg };
  }
}

// ── enquiryRowToCrmPayload ────────────────────────────────────────────────────

/**
 * Reconstruct a CrmPayload from a stored EnquiryRow.
 * Used by the retry endpoint to re-attempt CRM delivery without re-reading
 * the original request body.
 */
export function enquiryRowToCrmPayload(row: EnquiryRow): CrmPayload {
  return {
    submissionId:    row.submissionId,
    submittedAt:     row.submittedAt,
    businessName:    row.businessName,
    contactName:     row.contactName,
    email:           row.email,
    phone:           row.phone,
    meterNumbers:    row.meterNumbers,
    currentSupplier: row.currentSupplier,
    message:         row.message,
    smsConsent:      (row.smsConsent as 'yes' | 'no' | null) ?? null,
    attribution: {
      utmSource:   row.utmSource,
      utmMedium:   row.utmMedium,
      utmCampaign: row.utmCampaign,
      utmContent:  row.utmContent,
      utmTerm:     row.utmTerm,
      gclid:       row.gclid,
      fbclid:      row.fbclid,
    },
    sourcePage: row.sourcePage,
  };
}
