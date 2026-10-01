# FEH Utility Intent Radar — source policy and CRM review contract

Status: research/preview only. No production CRM writes, Apollo enrichment, outreach, paid enrichment, sequence enrolment, customer messaging or deployment authority is granted by this document.

## Purpose

Separate public evidence from provider/internal evidence so that provenance remains inspectable and no public-web observation can silently inherit stronger execution authority.

## Canonical source classes

| Source class | Provenance | Typical inputs | Maximum automatic status |
|---|---|---|---|
| COMPANIES_HOUSE | PUBLIC_OFFICIAL | filing history and company records | human enrichment review candidate only |
| PLANNING | PUBLIC_OFFICIAL | Planning Data or reviewed local-authority planning material | human enrichment review candidate only |
| TENDER_CONTRACT | PUBLIC_OFFICIAL | Contracts Finder / Find a Tender OCDS records | human enrichment review candidate only |
| BICS_MANUFACTURING | PUBLIC_OFFICIAL | ONS aggregate BICS context | context only; never company trigger |
| PUBLIC_WEB_SIGNAL | PUBLIC_WEB | company newsroom, commercial property, trade/local press | REVIEW_ONLY; never independent Apollo trigger |
| ONLINE_DIRECT | FIRST_PARTY | authenticated OnlineDIRECT facts already authorised for FEH use | preserve as separate provider/internal evidence |
| INTRODUCER | INTRODUCER | documented introducer/referral facts | review according to existing contract |
| WEBSITE_IDENTIFICATION | PROVIDER_ENRICHMENT | company-level visitor identification | REVIEW_ONLY unless corroborated by an approved trigger |
| APOLLO_ENRICHMENT | PROVIDER_ENRICHMENT | enrichment output after explicit review | never initial intent evidence |

## Public-source access rules

Every collected public item must record:
- source URL and source reference;
- observation time and, where available, publication/event time;
- source class and provenance;
- exact evidence excerpt;
- access review reference;
- whether the source was publicly available without login or CAPTCHA;
- whether terms/robots/rate limits were respected;
- whether access circumvention was absent.

Reject or exclude evidence when access requires authentication not already authorised, CAPTCHA solving, robots bypass, hidden/private endpoints, tracking/credential URLs, or other access-control circumvention.

## Current source-specific constraints

### Companies House
- API access requires authentication credentials.
- Default published rate limit is 600 requests per five minutes.
- Use stable filing/company identifiers for dedupe.
- A filing is a company fact, not consent to contact.
- Do not create credentials or accounts automatically.

### Planning Data
- Public API and bulk datasets are available.
- Planning-application data is explicitly still developing and coverage varies.
- Absence of a planning application must never be treated as evidence of no activity.
- Prefer stable entity/reference IDs; preserve source geography and dataset version.

### Contracts Finder / Find a Tender
- Use official OCDS JSON endpoints where possible.
- Preserve OCID / notice ID, buyer/supplier identifiers, publication date and procurement stage.
- Treat tender data as public procurement evidence, not permission to cold-contact an individual.
- A company named in an award is not necessarily a current energy-procurement prospect.

### ONS BICS
- Aggregate/contextual only.
- Never create a named-company signal from BICS.
- Store wave/release date and sector scope.
- Never use BICS alone to unlock Apollo.

### Public web
Includes company newsrooms, commercial-property material and legitimate trade/local press.
- Provenance must be PUBLIC_WEB.
- Public-web content must be downgraded to inference at the executable boundary even when the page itself is genuine.
- A STRONG / high-confidence public-web signal remains REVIEW_ONLY.
- PUBLIC_WEB_SIGNAL must remain outside APOLLO_TRIGGER_SOURCES.

## Confidence policy

Confidence measures confidence that the supplied evidence supports the recorded interpretation, not probability that the company will buy energy.

Suggested research bands:
- 90–100: explicit evidence strongly supports the interpretation;
- 70–89: strong but incomplete/context-dependent evidence;
- 50–69: plausible inference requiring corroboration;
- below 50: weak; retain only if useful for research and clearly marked.

Confidence never overrides provenance, contactability, suppression, identity binding or capability locks.

## Dedupe policy

At minimum preserve:
1. stable source-record identity;
2. normalized source URL identity where appropriate;
3. exact/normalized evidence key;
4. radar idempotency key.

For Companies House filing-history listing pages, dedupe primarily on stable filing/source reference, not the shared listing URL or template description.

A changed excerpt or re-attribution must not make the same source record appear new.

## Compliance / contactability

Fail closed.
- suppression or objection => RED;
- sole trader or partnership cold-email risk => RED until a lawful basis/route is specifically reviewed;
- unbound company/source/claim/contact identity => AMBER;
- no automated GREEN path exists in this phase.

Public corporate facts do not establish permission to contact a named person.

## CRM review fields

Required before any human promotion decision:
- signal_id / idempotency_key;
- company_name, company_number, company_domain;
- source_class, provenance, source_reference, source_url;
- observed_at, published_at, event_at, expires_at;
- exact_evidence;
- signal_family / signal_type;
- interpretation_kind and interpretation_basis;
- confidence and strength;
- source_verified flag plus evidence-binding status;
- fit_category and fit_review_reference;
- contactability classification and reason;
- suppression / objection flags;
- duplicate keys / duplicate status;
- research priority score;
- reviewer decision: REJECT / HOLD / APPROVE_FOR_ENRICHMENT_REVIEW;
- reviewer, reviewed_at, review_reference, reviewer_notes.

## Apollo boundary

Only an existing approved trigger source may become eligible for *human enrichment review*. Eligibility is not execution.

The following remain false until a later explicit gate:
- crmWriteAllowed;
- outreachAllowed;
- emailSendAllowed;
- phoneCallAllowed;
- sequenceEnrollmentAllowed;
- creditsSpendAllowed;
- promotionAllowed;
- networkExecutionAllowed.

PUBLIC_WEB_SIGNAL, WEBSITE_IDENTIFICATION and BICS_MANUFACTURING can never independently enable Apollo enrichment.

## Acceptance tests

1. Company newsroom, property and trade/local press adapters map to PUBLIC_WEB_SIGNAL / PUBLIC_WEB.
2. A 100-confidence STRONG public-web item returns REVIEW_ONLY and Apollo=false.
3. Forged verified/sourceVerified/capability flags do not survive boundary reconstruction.
4. Duplicate source record with changed excerpt receives duplication penalty.
5. Source URL containing credentials, personal-recipient, tracking or encoded sensitive components is rejected.
6. Any access restriction failure returns EXCLUDED with all capabilities false.
7. BICS remains context-only.
8. Existing official-source rules are unchanged except where explicitly reviewed.
