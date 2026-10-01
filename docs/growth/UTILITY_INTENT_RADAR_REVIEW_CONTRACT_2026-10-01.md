# Utility Intent Radar — review contract

Status: research/preview only. No production CRM writes, Apollo enrichment, sequence enrollment, credit spend, outreach, deployment or secret changes are authorised by this contract.

## Public-web source separation

Generic company newsroom, commercial-property and trade/local-press evidence must map to `PUBLIC_WEB_SIGNAL`, never `ONLINE_DIRECT`.

`PUBLIC_WEB_SIGNAL` is public-web context only. It must not appear in `APOLLO_TRIGGER_SOURCES`, and even a strong, high-confidence, apparently verified public-web record remains `REVIEW_ONLY` at the Apollo boundary.

## Required provenance fields

Every admitted review item must retain:
- company name plus durable company number and/or domain when available;
- source enum, adapter, source URL and source reference;
- exact evidence excerpt;
- observed, published and event dates where known;
- signal family and signal type;
- provenance, evidence basis, source-verification claim and numeric confidence;
- stable dedupe keys;
- access-policy review reference;
- evidence-binding status;
- contactability classification and reason.

No field supplied by an external page or caller can directly grant a trusted/verified label.

## CRM review projection

A future CRM review row may project the research result only after an authenticated server-side review step. Minimum review fields:

```text
review_status = HUMAN_REVIEW_REQUIRED
company_name
company_number
company_domain
signal_family
signal_type
source
provenance
source_url
source_reference
exact_evidence
observed_at
published_at
event_at
confidence
source_tier
evidence_binding_status
contactability
contactability_reason
research_priority_score
deduplication_keys
reviewed_by
reviewed_at
review_decision
review_note
```

Default `review_decision` is `PENDING`. No default may imply contact permission.

## Apollo boundary

Apollo enrichment review requires all of the following:
1. durable company identity is present;
2. source is explicitly in the narrow trigger allow-list;
3. signal is non-expired;
4. evidence basis is `VERIFIED_FACT`;
5. source verification is true;
6. strength is `STRONG`;
7. confidence is at least 80;
8. human review has separately confirmed purpose/compliance for enrichment.

Passing those checks permits an enrichment review request only. It does not permit sequence enrollment, email, phone, CRM promotion or credit spend.

Public-web sources remain ineligible to independently trigger Apollo.

## Fail-closed acceptance checks

- Public-web adapter cannot declare `ONLINE_DIRECT`.
- Public-web provenance must be `PUBLIC_WEB`.
- Public-web signal never yields `apolloEnrichmentAllowed=true`.
- Suppression or objection survives normalization and stays RED.
- Duplicate evidence/source records receive the duplicate penalty.
- Missing permission declarations exclude the source before evidence admission.
- Login/CAPTCHA/access-circumvention requirements exclude the source.
- All execution/capability locks remain false in every result shape.
- CRM write and outreach flags remain false even when a caller supplies forged positive fields.

## Exact next implementation step

Update the three generic public-web adapters in `frontend/src/lib/lead-discovery/utilityIntentRadar.ts` to `PUBLIC_WEB_SIGNAL`, update the provenance branch so that only official-source adapters require `PUBLIC_OFFICIAL`, then add a regression test proving a strong 95-confidence `PUBLIC_WEB_SIGNAL` is still `REVIEW_ONLY` and cannot allow Apollo enrichment.
