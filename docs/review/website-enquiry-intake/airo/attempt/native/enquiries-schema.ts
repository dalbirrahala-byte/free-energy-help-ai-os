import {mysqlTable, int, varchar, timestamp, index, uniqueIndex} from 'drizzle-orm/mysql-core';

export const enquiries = mysqlTable('enquiries', {
  id:             int('id').primaryKey().autoincrement(),

  // Stable UUID generated once per submission. The CRM uses it as an
  // idempotency key. INSERT IGNORE on this column prevents double-inserts.
  submissionId:   varchar('submission_id', { length: 36 }).notNull().unique(),

  // ISO 8601 UTC timestamp of the original form submission.
  submittedAt:    varchar('submitted_at', { length: 30 }).notNull(),

  // ── Contact ──────────────────────────────────────────────────────────────
  businessName:   varchar('business_name', { length: 255 }).notNull(),
  contactName:    varchar('contact_name', { length: 255 }).notNull(),
  email:          varchar('email', { length: 255 }).notNull(),
  phone:          varchar('phone', { length: 40 }),

  // ── Enquiry detail ────────────────────────────────────────────────────────
  meterNumbers:    varchar('meter_numbers', { length: 255 }),
  currentSupplier: varchar('current_supplier', { length: 255 }),
  message:         varchar('message', { length: 2000 }),

  // ── Consent ───────────────────────────────────────────────────────────────
  // 'yes' | 'no' | NULL — null means the visitor skipped the question.
  smsConsent:     varchar('sms_consent', { length: 3 }),

  // ── Campaign attribution ──────────────────────────────────────────────────
  utmSource:      varchar('utm_source', { length: 255 }),
  utmMedium:      varchar('utm_medium', { length: 255 }),
  utmCampaign:    varchar('utm_campaign', { length: 255 }),
  utmContent:     varchar('utm_content', { length: 255 }),
  utmTerm:        varchar('utm_term', { length: 255 }),
  gclid:          varchar('gclid', { length: 255 }),
  fbclid:         varchar('fbclid', { length: 255 }),
  sourcePage:     varchar('source_page', { length: 255 }),

  // ── Delivery status ───────────────────────────────────────────────────────
  ownerEmailStatus:   varchar('owner_email_status', { length: 10 }).notNull().default('pending'),
  visitorEmailStatus: varchar('visitor_email_status', { length: 10 }).notNull().default('pending'),
  crmStatus:          varchar('crm_status', { length: 10 }).notNull().default('pending'),

  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  submissionIdIdx: uniqueIndex('idx_enq_submission_id').on(t.submissionId),
  crmStatusIdx:    index('idx_enq_crm_status').on(t.crmStatus),
  createdAtIdx:    index('idx_enq_created_at').on(t.createdAt),
}));
