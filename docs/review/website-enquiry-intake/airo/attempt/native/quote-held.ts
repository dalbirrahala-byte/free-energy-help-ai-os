/**
 * POST /api/quote
 *
 * Submission flow:
 *   1. Validate input.
 *   2. Save to DB (INSERT IGNORE — idempotent on submissionId).
 *      - Only the request that inserted the row may send emails. A duplicate
 *        cannot establish whether an earlier email reached its recipient.
 *   3. Send owner notification email (if ownerEmailStatus is not 'sent').
 *   4. Send visitor acknowledgement email (if visitorEmailStatus is not 'sent').
 *   5. Dormant CRM handoff: new rows only, durable hold before any transport.
 *      - Missing configuration leaves pending; no automatic replay.
 *      - Ambiguous outcomes stay held for reconciliation.
 *      - CRM replay remains closed; this candidate does not activate delivery.
 */

import type { Request, Response } from 'express';
import { sendEmail } from '@/server/email.js';
import { TEL1, TEL1_HREF } from '@/lib/phone.js';
import { finishQuoteCrm } from '@/server/lib/quote-crm-step.js';
import {
  saveEnquiry,
  updateDeliveryStatus,
  enquiryRowToCrmPayload,
} from '@/server/lib/enquiry-store.js';

interface QuoteRequestBody {
  businessName: string;
  contactName: string;
  email: string;
  /** Optional — not required by the form. */
  phone?: string;
  meterNumbers?: string;
  currentSupplier?: string;
  message?: string;
  /** 'yes' | 'no' | '' — visitor's answer to the SMS question; '' means skipped */
  smsConsent?: 'yes' | 'no' | '';
  // ── Campaign attribution ────────────────────────────────────────────────────
  utmSource?:   string;
  utmMedium?:   string;
  utmCampaign?: string;
  utmContent?:  string;
  utmTerm?:     string;
  gclid?:       string;
  fbclid?:      string;
  sourcePage?:  string;
  /**
   * Optional client-supplied submissionId (UUID v4).
   * When present, the handler uses it as the idempotency key so a retry after
   * a lost response does not create a duplicate row.
   * When absent, the handler generates one.
   */
  submissionId?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Normalise an optional string field: trim whitespace, return null if empty. */
function opt(v: string | undefined | null): string | null {
  const s = v?.trim();
  return s ? s : null;
}

export default async function handler(req: Request, res: Response) {
  const body = req.body as QuoteRequestBody;

  const {
    businessName,
    contactName,
    email,
    phone,
    meterNumbers,
    currentSupplier,
    message,
    smsConsent,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    gclid,
    fbclid,
    sourcePage,
  } = body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!businessName?.trim() || !contactName?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Missing required fields: businessName, contactName, email.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // ── Submission ID ───────────────────────────────────────────────────────────
  // Accept a client-supplied UUID (retry after lost response) or generate one.
  const submissionId =
    typeof body.submissionId === 'string' && UUID_RE.test(body.submissionId)
      ? body.submissionId
      : crypto.randomUUID();

  const submittedAt = new Date().toISOString();

  const phoneNorm = opt(phone);
  const smsConsentNorm: 'yes' | 'no' | null =
    smsConsent === 'yes' ? 'yes' : smsConsent === 'no' ? 'no' : null;

  // ── Notification recipient ──────────────────────────────────────────────────
  const recipient = process.env.NOTIFICATION_RECIPIENT_EMAIL;
  if (!recipient) {
    console.error('quote.submit.recipient_unset');
    return res.status(500).json({ error: 'Notification recipient not configured.' });
  }

  // ── Step 1: Save to DB ──────────────────────────────────────────────────────
  // INSERT IGNORE — idempotent. A double-submit returns the existing row and
  // holds further delivery for reconciliation.
  const saveResult = await saveEnquiry({
    submissionId,
    submittedAt,
    businessName:    businessName.trim(),
    contactName:     contactName.trim(),
    email:           email.trim(),
    phone:           phoneNorm,
    meterNumbers:    opt(meterNumbers),
    currentSupplier: opt(currentSupplier),
    message:         opt(message),
    smsConsent:      smsConsentNorm,
    utmSource:       opt(utmSource),
    utmMedium:       opt(utmMedium),
    utmCampaign:     opt(utmCampaign),
    utmContent:      opt(utmContent),
    utmTerm:         opt(utmTerm),
    gclid:           opt(gclid),
    fbclid:          opt(fbclid),
    sourcePage:      opt(sourcePage),
  });

  if (!saveResult.ok) {
    console.error('quote.submit.db_save_failed', { submissionId });
    return res.status(500).json({
      error: `We could not confirm whether your enquiry was saved. Please call us and quote ${submissionId}.`,
      submissionId,
    });
  }

  const row = saveResult.row;
  const isNew = saveResult.created;

  console.log('quote.submit.saved', { submissionId, created: isNew });

  if (!isNew) {
    if (row.ownerEmailStatus !== 'sent' || row.visitorEmailStatus !== 'sent') {
      console.warn('quote.submit.duplicate_email_reconciliation_required', { submissionId });
    }
    console.log('quote.submit.crm_handoff', { submissionId, outcome: 'held' });
    return res.status(201).json({ ok: true, submissionId, created: false });
  }

  // ── Build email content for this new enquiry ────────────────
  const submittedAtDisplay = new Date(row.submittedAt).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const ownerHtml = buildOwnerEmailHtml({
    submissionId: row.submissionId,
    submittedAtDisplay,
    businessName:    row.businessName,
    contactName:     row.contactName,
    email:           row.email,
    phone:           row.phone,
    smsConsentNorm:  (row.smsConsent as 'yes' | 'no' | null) ?? null,
    meterNumbers:    row.meterNumbers,
    currentSupplier: row.currentSupplier,
    message:         row.message,
    utmSource:       row.utmSource,
    utmMedium:       row.utmMedium,
    utmCampaign:     row.utmCampaign,
    gclid:           row.gclid,
    fbclid:          row.fbclid,
  });

  const ownerText = buildOwnerEmailText({
    submissionId: row.submissionId,
    submittedAtDisplay,
    businessName:    row.businessName,
    contactName:     row.contactName,
    email:           row.email,
    phone:           row.phone,
    smsConsentNorm:  (row.smsConsent as 'yes' | 'no' | null) ?? null,
    meterNumbers:    row.meterNumbers,
    currentSupplier: row.currentSupplier,
    message:         row.message,
    utmSource:       row.utmSource,
    utmMedium:       row.utmMedium,
    utmCampaign:     row.utmCampaign,
    gclid:           row.gclid,
    fbclid:          row.fbclid,
  });

  // ── Step 2: Owner notification email ────────────────────────────────────────
  if (row.ownerEmailStatus !== 'sent') {
    try {
      await sendEmail({
        fromName: 'Free Energy Help Ltd',
        to: recipient,
        replyTo: row.email,
        subject: `New quote request — ${row.businessName}`,
        html: ownerHtml,
        text: ownerText,
      });
      await updateDeliveryStatus(submissionId, 'ownerEmailStatus', 'sent');
    } catch {
      console.error('quote.submit.owner_email_failed', { submissionId });
      await updateDeliveryStatus(submissionId, 'ownerEmailStatus', 'failed');
      // Owner email failure is fatal — visitor should not get a success response
      // if we cannot notify the business.
      return res.status(500).json({
        error: `We saved your enquiry but could not confirm the notification. Please call us and quote ${submissionId}.`,
        submissionId,
      });
    }
  }

  // ── Step 3: Visitor acknowledgement email ───────────────────────────────────
  if (row.visitorEmailStatus !== 'sent') {
    try {
      await sendEmail({
        fromName: 'Free Energy Help Ltd',
        to: row.email,
        subject: "We've received your energy quote request",
        html: buildVisitorEmailHtml({ contactName: row.contactName, businessName: row.businessName }),
        text: `Hi ${row.contactName},\n\nThanks for your quote request for ${row.businessName}. One of our energy consultants will be in touch shortly.\n\nFree Energy Help Ltd`,
      });
      await updateDeliveryStatus(submissionId, 'visitorEmailStatus', 'sent');
    } catch {
      // Visitor email failure is non-fatal — the business has been notified.
      console.warn('quote.submit.visitor_email_failed', { submissionId });
      await updateDeliveryStatus(submissionId, 'visitorEmailStatus', 'failed');
    }
  }

  // CRM is subordinate to the completed email journey. This helper is closed
  // by default; the review archive does not install a runtime transport.
  const crmOutcome = await finishQuoteCrm(
    submissionId, isNew, row.crmStatus, () => enquiryRowToCrmPayload(row),
  );
  console.log('quote.submit.crm_handoff', { submissionId, outcome: crmOutcome });

  return res.status(201).json({ ok: true, submissionId, created: isNew });
}

// ── Email builders ────────────────────────────────────────────────────────────

interface OwnerEmailData {
  submissionId: string;
  submittedAtDisplay: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  smsConsentNorm: 'yes' | 'no' | null;
  meterNumbers: string | null;
  currentSupplier: string | null;
  message: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  gclid: string | null;
  fbclid: string | null;
}

function buildOwnerEmailHtml(d: OwnerEmailData): string {
  const attrParts = [
    d.utmSource   ? `source: ${d.utmSource}`     : '',
    d.utmMedium   ? `medium: ${d.utmMedium}`     : '',
    d.utmCampaign ? `campaign: ${d.utmCampaign}` : '',
    d.gclid       ? `gclid: ${d.gclid}`          : '',
    d.fbclid      ? `fbclid: ${d.fbclid}`        : '',
  ].filter(Boolean).join(' · ');

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#0A1628;">
      <div style="background:linear-gradient(135deg,#0A1628 0%,#0d1f35 100%);padding:28px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-family:Outfit,Arial,sans-serif;">⚡ New Quote Request</h1>
        <p style="color:#94A3B8;margin:6px 0 0;font-size:14px;">Free Energy Help Ltd — received ${d.submittedAtDisplay}</p>
        <p style="color:#64748B;margin:4px 0 0;font-size:12px;">Ref: ${d.submissionId}</p>
      </div>
      <div style="background:#F8FAFC;padding:28px 32px;border:1px solid #E2E8F0;border-top:none;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:10px 0;color:#64748B;width:160px;vertical-align:top;">Business Name</td><td style="padding:10px 0;font-weight:600;color:#0A1628;">${d.businessName}</td></tr>
          <tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">Contact Name</td><td style="padding:10px 0;font-weight:600;color:#0A1628;">${d.contactName}</td></tr>
          <tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">Email</td><td style="padding:10px 0;"><a href="mailto:${d.email}" style="color:#0066FF;">${d.email}</a></td></tr>
          ${d.phone ? `<tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">Phone</td><td style="padding:10px 0;"><a href="tel:${d.phone}" style="color:#0066FF;">${d.phone}</a></td></tr>` : ''}
          <tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">SMS consent</td><td style="padding:10px 0;color:#0A1628;">${d.smsConsentNorm === 'yes' ? '✅ Yes' : d.smsConsentNorm === 'no' ? '❌ No' : '— not answered'}</td></tr>
          ${d.meterNumbers ? `<tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">MPAN / MPRN</td><td style="padding:10px 0;color:#0A1628;">${d.meterNumbers}</td></tr>` : ''}
          ${d.currentSupplier ? `<tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">Current Supplier</td><td style="padding:10px 0;color:#0A1628;">${d.currentSupplier}</td></tr>` : ''}
          ${d.message ? `<tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">Message</td><td style="padding:10px 0;color:#0A1628;white-space:pre-wrap;">${d.message}</td></tr>` : ''}
          ${attrParts ? `<tr style="border-top:1px solid #E2E8F0;"><td style="padding:10px 0;color:#64748B;vertical-align:top;">Attribution</td><td style="padding:10px 0;color:#0A1628;font-size:12px;">${attrParts}</td></tr>` : ''}
        </table>
      </div>
      <div style="background:#fff;padding:20px 32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
        <a href="mailto:${d.email}?subject=Re: Your energy quote request — ${encodeURIComponent(d.businessName)}"
           style="display:inline-block;background:#0066FF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Reply to ${d.contactName}
        </a>
        <p style="margin:16px 0 0;font-size:12px;color:#94A3B8;">Free Energy Help Ltd · Company No. 16374980 · freeenergyhelp.co.uk</p>
      </div>
    </div>
  `;
}

function buildOwnerEmailText(d: OwnerEmailData): string {
  return [
    'NEW QUOTE REQUEST — Free Energy Help Ltd',
    `Received:         ${d.submittedAtDisplay}`,
    `Ref:              ${d.submissionId}`,
    '',
    `Business Name:    ${d.businessName}`,
    `Contact Name:     ${d.contactName}`,
    `Email:            ${d.email}`,
    d.phone           ? `Phone:            ${d.phone}`                                                                    : '',
    `SMS consent:      ${d.smsConsentNorm === 'yes' ? 'Yes' : d.smsConsentNorm === 'no' ? 'No' : 'Not answered'}`,
    d.meterNumbers    ? `MPAN / MPRN:      ${d.meterNumbers}`    : '',
    d.currentSupplier ? `Current Supplier: ${d.currentSupplier}` : '',
    d.message         ? `Message:\n${d.message}`                 : '',
    (d.utmSource || d.gclid || d.fbclid)
      ? `Attribution:      ${[d.utmSource, d.utmMedium, d.utmCampaign, d.gclid ? `gclid:${d.gclid}` : '', d.fbclid ? `fbclid:${d.fbclid}` : ''].filter(Boolean).join(' / ')}`
      : '',
  ].filter(Boolean).join('\n');
}

function buildVisitorEmailHtml(d: { contactName: string; businessName: string }): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#0A1628;">
      <div style="background:linear-gradient(135deg,#0A1628 0%,#0d1f35 100%);padding:28px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-family:Outfit,Arial,sans-serif;">⚡ Thanks, ${d.contactName}!</h1>
      </div>
      <div style="background:#F8FAFC;padding:28px 32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We've received your quote request for <strong>${d.businessName}</strong> and one of our energy consultants will be in touch shortly.</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">In the meantime, if you have any questions you can call us directly:</p>
        <p style="margin:0;font-size:15px;"><a href="${TEL1_HREF}" style="color:#0066FF;font-weight:600;text-decoration:none;">${TEL1}</a></p>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">Free Energy Help Ltd · Company No. 16374980 · freeenergyhelp.co.uk</p>
      </div>
    </div>
  `;
}
