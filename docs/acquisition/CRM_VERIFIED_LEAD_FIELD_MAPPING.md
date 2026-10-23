# FEH CRM — Verified Lead Field Mapping

Status: **design/review only — no schema migration**

Purpose: one canonical mapping for Meta, Google and FEH website leads.

## Identity / contact

| Canonical field | Meaning |
|---|---|
| business_name | Trading/business name supplied |
| contact_name | Enquiry contact |
| email | Contact email |
| telephone | Normalised UK contact telephone |
| business_postcode | Business/site postcode where supplied |
| is_uk_business | Explicit qualification answer |
| authority_status | YES / NO / UNKNOWN |

## Commercial qualification

| Canonical field | Values / notes |
|---|---|
| energy_supply | electricity / gas / both |
| enquiry_reason | procurement / renewal / COT-new-premises / billing-meter / other |
| renewal_timing | out_of_contract / within_30_days / 31_90_days / 3_6_months / 6_12_months / more_than_12_months / unknown |
| contract_end_date | Exact date only when supplied/evidenced |
| monthly_spend_band | under_250 / 250_1000 / 1000_2000 / 2000_plus / unknown |
| current_supplier | User-entered/provider value; provenance retained |
| latest_bill_status | not_requested / requested / received / reviewed |

## Verification

Identity verification and marketing/contact permission must stay separate.

| Field | Meaning |
|---|---|
| mobile_verification_state | UNVERIFIED / VERIFIED |
| mobile_verified_at | Timestamp from authoritative verification receipt |
| mobile_verification_method | GOOGLE_OTP / FEH_OTP / other approved method |
| verification_request_id | Bound verification request reference |
| verification_provenance | Provider/evidence reference; never caller assertion |
| consent_given | Enquiry contact consent |
| consent_text_version | Exact notice/version shown |
| consent_at | Timestamp |
| suppression_status | Separate authoritative contact restriction |

OTP verification never implies consent, authority, absence of suppression, or permission to execute outreach.

## Acquisition provenance

| Field | Meaning |
|---|---|
| lead_source | Website / Meta / Google / Referral / Other |
| source_detail | Human-readable source |
| external_lead_id | Provider lead ID |
| external_form_id | Provider form ID |
| campaign_id | Campaign |
| ad_set_id | Meta ad set where applicable |
| ad_id | Provider ad |
| utm_source / medium / campaign / term / content | Website attribution |
| received_at | Source receipt timestamp |
| source_authenticated | Whether the provider/source evidence was authenticated |
| source_provenance | user-entered / provider-verified / system-derived etc. |

## Workflow state

Proposed review vocabulary:
- REJECTED_NOT_BUSINESS
- UNVERIFIED
- VERIFIED_REVIEW
- VERIFIED_CALL_NOW

Existing sales pipeline can remain separate:
- New
- Attempted Contact
- Contacted
- Qualified
- Appointment Booked
- Quote Requested
- Won
- Lost

Do not overload the sales stage to represent verification.

## Priority

Deterministic initial rule:

`VERIFIED_CALL_NOW / Hot` only when:
- UK business
- consent present
- mobile verified
- authority = YES
- renewal out of contract / within 90 days
- spend £1,001+ monthly

All execution remains human-controlled.

## Mission Control card

A useful verified lead card should show:
- business
- contact
- **Mobile verified**
- contract timing
- monthly spend band
- current supplier
- source/campaign
- authority
- received time
- next human action

Example status:
`VERIFIED — CALL NOW`

Do not display raw OTP codes or secrets.

## Duplicate handling

Provider webhook/lead ID should provide provider-event idempotency.

Person/business deduplication remains a separate decision:
- never merge people solely on shared office phone or enquiries@ mailbox
- preserve provider source events
- flag possible duplicates for review when identity is ambiguous

## Database gate

This document does not authorize new columns or migrations.

Before schema work:
1. inspect current production/staging schema
2. map each proposed field to an existing column where possible
3. add only missing fields
4. review RLS/grants
5. test staging
6. obtain separate migration approval
