# FEH Utility Intent Radar — Official/Public Source Adapter Specification

Date: 2026-10-02  
Status: research/design only; no production CRM writes, Apollo spend, outreach, deployment or source-access circumvention.

## Purpose

Define fail-closed acquisition and normalization rules for public-source signals that can support FEH review of change-of-tenancy, renewal/out-of-contract, price-shopping, billing/metering, expansion and procurement intent without converting public evidence into automatic contact permission.

## Global source controls

Every adapter must retain:
- exact source URL and source reference;
- observed timestamp plus publication/update/event timestamp when available;
- exact evidence excerpt separately from FEH interpretation;
- source provenance and source-verification state;
- entity identity used for matching;
- deterministic dedupe keys;
- confidence and strength;
- access review: publicly available, terms permitted, robots permitted, rate limits respected, no login requirement, no CAPTCHA requirement, no circumvention, publisher/source reviewed;
- contactability/compliance state and human review references.

Any missing provenance, invalid date, inaccessible source, disallowed access method, ambiguous identity, expired evidence or failed compliance check must fail closed.

## 1. Companies House

**Adapter:** `COMPANIES_HOUSE`  
**Provenance:** `PUBLIC_OFFICIAL`  
**Allowed acquisition:** official Companies House API or public filing-history pages only.  
**Rate control:** default API limit is 600 requests in any five-minute period. Treat HTTP 429 as a hard back-off signal. Never rotate credentials, identities or clients to evade limits.

### Candidate evidence
- filing transaction/reference;
- filing date;
- filing description/type;
- company number;
- registered company name;
- registered-office or status changes only where relevant to entity matching.

### Intent interpretation
A filing is a fact about a company record, not proof of energy-buying intent. Only a defined filing/event mapping may create an FEH intent hypothesis, and the interpretation remains separate from the filing fact.

### Dedupe
Primary: company number + stable filing transaction/reference.  
Do not dedupe Companies House filings using a shared listing URL or generic filing description alone.

## 2. Planning Data / local-authority planning

**Adapters:** `PLANNING_DATA`, `LOCAL_AUTHORITY_PLANNING`  
**Provenance:** `PUBLIC_OFFICIAL` for reviewed official sources.

Planning Data's current planning-application dataset states that it is created by MHCLG and will be replaced by authoritative-source data when available. Treat this as an aggregate/developing dataset, not complete authoritative coverage of all applications.

### Candidate evidence
- planning application reference;
- application/site address;
- proposal/description;
- application/status dates;
- source local authority where represented;
- dataset/entity identifier.

### Intent interpretation
Expansion, new premises, plant/equipment or material change may support an expansion/new-premises hypothesis. It does not prove a live energy procurement need or permission to contact.

### Dedupe
Prefer authoritative application/entity reference + source authority.  
Do not merge different applications solely because site text is similar.

## 3. Contracts Finder

**Adapter:** `CONTRACTS_FINDER` -> source `TENDER_CONTRACT`  
**Provenance:** `PUBLIC_OFFICIAL`

Use published retrieval endpoints/OCDS outputs. Do not use authenticated publishing/draft endpoints.

Useful public retrieval identity:
- procurement process `ocid`;
- OCDS release/notice identifier;
- publication/update timestamp;
- buyer/party identifier where present;
- stage.

Contracts Finder exposes published-notice OCDS search and record/release retrieval. Preserve raw notice/release identity so an amended notice does not become a false new opportunity.

### Dedupe
Primary: `ocid` + release/notice identifier.  
Cluster later releases of the same `ocid` as one procurement process while retaining version history.

## 4. Find a Tender

**Adapter:** `FIND_A_TENDER` -> source `TENDER_CONTRACT`  
**Provenance:** `PUBLIC_OFFICIAL`

Use the official OCDS API. Current documentation maps notice data to OCDS 1.1.5 with extensions. The release-package API supports filtering by publication/update time, stage, notice ID or `ocid`; page size is capped at 100 and pagination uses a cursor.

### Acquisition rules
- use `updatedFrom` / `updatedTo` bounded windows;
- follow cursor pagination;
- persist the last successfully processed update boundary only after a complete page/window;
- never assume default first-page results are complete.

### Dedupe
Primary: `ocid` + OCDS release ID.  
Keep amendments under the same procurement process.

## 5. BICS / ONS

**Source:** `BICS_MANUFACTURING`  
**Provenance:** `PUBLIC_OFFICIAL`  
**Use:** macro/sector context only.

As of 2026-10-02, the latest published BICS edition is Wave 164, released 2026-09-24; the next release is scheduled for 2026-10-08. BICS is voluntary and is official statistics in development.

### Boundary
BICS must never generate a named-company lead, company identity, contactability decision or Apollo trigger. It may only influence sector/context scoring, messaging research or prioritisation hypotheses that remain detached from a specific company until independent company-level evidence exists.

### Dedupe
Wave number + table/question/measure + publication date.

## 6. Public company newsrooms, commercial property and trade/local press

**Adapters:** `COMPANY_NEWSROOM`, `COMMERCIAL_PROPERTY`, `TRADE_LOCAL_PRESS`  
**Target source:** `PUBLIC_WEB_SIGNAL`  
**Provenance:** `PUBLIC_WEB`

These sources can contain useful expansion, relocation, tenancy, procurement or operational-change evidence, but publisher text is not an FEH-verified company instruction and must not impersonate first-party consent.

### Hard boundary
`PUBLIC_WEB_SIGNAL` must remain outside the Apollo trigger-source set. Even a STRONG signal with confidence 100 remains review-only and cannot independently enable Apollo enrichment, CRM write, sequence enrolment or outreach.

### Syndication/dedupe
Cluster by:
1. canonical source URL/record reference;
2. normalized evidence fingerprint;
3. company identity + event/date;
4. syndication indicators such as near-identical title/body/date.

Retain the original/publisher source where identifiable and mark copies as syndicated rather than treating each copy as an independent corroborating signal.

## CRM human-review projection

A review record should expose, at minimum:
- company name;
- company number/domain if independently available;
- signal family/type;
- source/provenance/source tier;
- source URL/reference;
- exact evidence;
- FEH interpretation;
- published/updated/event/observed dates;
- confidence/strength;
- freshness;
- entity-match basis;
- duplicate/cluster key and duplicate status;
- contactability classification/reason;
- suppression/objection state if known;
- compliance review reference;
- reviewer decision;
- next action;
- Apollo-enrichment eligibility as a separate computed field;
- CRM write and outreach locks.

## Promotion rules

1. Source acquisition success does not equal identity verification.
2. Identity verification does not equal intent verification.
3. Intent verification does not equal contact permission.
4. Apollo enrichment eligibility does not grant CRM write, sequence enrolment or outreach.
5. Public-web evidence cannot independently unlock Apollo enrichment.
6. BICS cannot unlock company-level enrichment at all.
7. Duplicate/syndicated evidence must not inflate confidence.
8. Future event dates do not refresh stale publication evidence.
9. Any suppression, objection or individual-subscriber risk remains RED/fail-closed.
10. All external execution remains human-gated.

## Official evidence checked 2026-10-02

- Companies House developer guidelines: default 600 requests / five minutes; repeated excess or bypass attempts can be banned.
- Planning Data planning-application dataset: developing aggregate dataset; current page says MHCLG-created data will be replaced by authoritative-source data when available.
- GOV.UK Open Contracting / Contracts Finder: public OCDS search/record outputs.
- Find a Tender developer documentation: OCDS 1.1.5 release packages with date/stage/ID filters and cursor pagination.
- ONS BICS: Wave 164 released 2026-09-24; next release 2026-10-08.
