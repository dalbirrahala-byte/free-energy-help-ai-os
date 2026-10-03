# Utility Intent Radar CRM review contract

Status: feature-branch design only. No production CRM write, Apollo enrichment, sequence enrollment, outreach or paid action is authorised by this document.

## Review record

Each public/official signal review must retain:

- identity: signal_id, entity_key, observed company/site identifiers, entity_binding_status
- provenance: adapter, canonical_source, provenance, evidence_basis, source_url, source_reference, exact evidence, published/event/observed timestamps, freshness deadline
- assessment: signal_type, signal_strength, confidence, confidence_basis, procurement_intent_verified
- dedupe: event_key, syndication_cluster_id, canonical event URL, duplicate reference
- compliance: suppression_status, objection_status, contactability_review, contact_basis, block reason
- human review: review_status, reviewer, reviewed_at, reviewer_notes, next_action, promotion_reason
- execution locks: apollo_enrichment_allowed, crm_write_allowed, outreach_allowed, sequence_enrollment_allowed, paid_enrichment_allowed

All execution locks default to false.

## Public-web invariant

For canonical source PUBLIC_WEB_SIGNAL:

1. provenance must be PUBLIC_WEB;
2. public evidence remains research/review context unless a separate trusted binding step establishes a stronger fact;
3. confidence 100 and STRONG strength cannot manufacture verified procurement intent;
4. Apollo enrichment, production CRM mutation, sequence enrollment, outreach and paid enrichment remain false;
5. suppression or objection always blocks progression;
6. missing evidence reference, stale evidence or unresolved duplication prevents promotion.

## Signal interpretation guardrails

- change of tenancy requires a real occupancy/tenancy event tied to a business site; generic vacant-property listings are context only;
- renewal/out-of-contract requires direct renewal evidence or an existing FEH/customer record; public press cannot manufacture a renewal date;
- price-shopping requires an explicit procurement/tender/RFQ event or a first-party enquiry;
- billing/metering requires direct project, tender or first-party evidence of the issue;
- expansion evidence may justify an expansion/load inference but not a switching or procurement-intent claim;
- BICS remains macro/sector context only and never becomes an entity-level trigger.

## Acceptance cases

- syndicated copies of one event resolve to one event cluster;
- a property development without an identified occupier cannot create a company lead;
- a STRONG, confidence-100 public-web expansion signal remains review-only with all execution locks false;
- an official filing may prove a company event but does not itself create contact permission;
- expired evidence becomes ineligible for promotion;
- suppression or objection blocks promotion regardless of commercial value.
