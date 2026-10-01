# Utility Intent Radar — public-web acceptance test matrix

**DESIGN / TEST SPEC — NO PRODUCTION CRM WRITES — 1 October 2026**

Purpose: make the public-web signal boundary deterministic before any production connection.

## Canonical source rule

The following evidence families must map to `PUBLIC_WEB_SIGNAL`, not `ONLINE_DIRECT`:
- COMPANY_NEWSROOM
- COMMERCIAL_PROPERTY
- TRADE_LOCAL_PRESS

`PUBLIC_WEB_SIGNAL` must remain outside `APOLLO_TRIGGER_SOURCES`.

## Required signal record

Every candidate signal must preserve:
- source family and source URL
- source title/publisher
- first observed timestamp
- source publication/event date when available
- extracted evidence text or structured fact
- intent category: CHANGE_OF_TENANCY | OUT_OF_CONTRACT_RENEWAL | PRICE_SHOPPING | BILLING_METERING | EXPANSION
- confidence score and confidence rationale
- company identity and identity-match method
- dedupe fingerprint
- compliance/contactability state
- CRM review state
- reviewer outcome and reason when reviewed
- provenance chain to any downstream enrichment decision

## Fail-closed acceptance cases

| Case | Input | Expected |
|---|---|---|
| Strong public-web signal | PUBLIC_WEB_SIGNAL, confidence 99, fresh evidence | REVIEW_REQUIRED; Apollo not permitted |
| Weak public-web signal | PUBLIC_WEB_SIGNAL, confidence 45 | REVIEW_REQUIRED or reject; Apollo not permitted |
| Duplicate article | same normalized company + source URL/evidence fingerprint | duplicate suppressed; no second CRM candidate |
| Syndicated article | materially same evidence across publishers | dedupe/cluster; preserve all provenance but one review candidate |
| Stale renewal evidence | event outside configured freshness window | stale/reject; no enrichment |
| Ambiguous company identity | low-confidence entity match | fail closed; reviewer must resolve |
| Missing source URL | extracted claim without retrievable provenance | reject |
| Access-controlled content | source requires login/paywall/bypass | do not scrape or bypass; mark unavailable |
| Contactability unknown | valid signal but no lawful/approved contact route | review may proceed; outreach prohibited |
| Reviewer rejects | human review = rejected | no Apollo, no CRM promotion, no outreach |
| Reviewer approves evidence only | human review = approved_signal | may become CRM-reviewed signal; still no enrichment unless a separately approved trigger policy authorises it |
| OnlineDIRECT source | verified source = ONLINE_DIRECT and trigger policy allows | eligible for separate enrichment-policy evaluation; not auto-send |

## Category examples

### Change of tenancy
Public evidence: business announces relocation/opening/closure, landlord/property release, planning occupation evidence.
Guardrail: relocation mention alone does not prove energy-account authority or permission to contact.

### Out-of-contract / renewal
Public evidence: rarely direct. Treat inferred contract timing as low confidence unless based on first-party/customer-supplied data.
Guardrail: never manufacture renewal dates from incorporation dates, leases or generic sector assumptions.

### Price-shopping
Public evidence: first-party request for quotes/tender or explicit procurement activity.
Guardrail: general cost-pressure commentary is macro context, not a buyer-intent trigger.

### Billing / metering
Public evidence: first-party statement about meter/billing/connection issue.
Guardrail: do not infer confidential account details.

### Expansion
Public evidence: planning approval, new site, premises acquisition, hiring/production expansion.
Guardrail: expansion is an account-research signal; it is not by itself an Apollo trigger.

## Regression assertions

1. `PUBLIC_WEB_SIGNAL` is absent from every Apollo trigger allow-list.
2. A confidence score of 100 cannot override source-policy restrictions.
3. Dedupe runs before CRM review queue creation.
4. Provenance is immutable after ingestion except for additive reviewer annotations.
5. Missing provenance fails closed.
6. No test fixture performs a production CRM write, paid enrichment, sequence enrollment or send.
7. All public-web adapters respect robots/access controls and use only normally accessible public content.
