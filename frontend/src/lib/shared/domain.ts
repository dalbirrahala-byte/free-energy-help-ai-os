// Canonical domain models for the intelligence layer. Every module-specific
// LeadRecord/CustomerRecord/etc. type across lib/intelligence,
// lib/commercial-energy-intelligence, and lib/feh-enterprise-intelligence
// is now a derived view (Pick/Partial) of exactly one of these, rather than
// an independently hand-declared, potentially-drifting duplicate.
//
// These shapes match the real Supabase columns as already queried in
// frontend/src/app/leads/[id]/page.tsx — they are not new fields, just a
// single named place for the shape that already existed in five different
// forms.
//
// lib/renewal-intelligence (V1) is deliberately NOT rewired to these — it
// remains fully untouched, per the standing "V1 stays exactly as shipped"
// rule from earlier gates.

export type CanonicalLead = {
  id: number;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  supplier: string | null;
  contract_end: string | null;
  status: string | null;
  notes: string | null;
  lead_source: string | null;
  source_detail: string | null;
  source_provenance: string;
  // Factory 025A: optional so every existing caller — including
  // prioritization.test.ts's makeLead() and the leads/[id] page's own
  // locally-declared Lead type — stays assignable without being updated.
  // These mirror the nullable/not-null shape of the real leads columns
  // (added by Factory 024's leads_source_attribution / leads_attribution_
  // and_consent migrations) whenever a caller does supply them.
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  consent_given?: boolean;
};

export type CanonicalCustomer = {
  id: number;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  telephone: string | null;
  email: string | null;
  status: string | null;
  notes: string | null;
  source_lead_id: number | null;
};

export type CanonicalActivity = {
  id: number;
  activity_type: string | null;
  title: string | null;
  details: string | null;
  activity_date: string | null;
  activity_time: string | null;
  created_at: string;
};

export type CanonicalTask = {
  id: number;
  title: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
};
