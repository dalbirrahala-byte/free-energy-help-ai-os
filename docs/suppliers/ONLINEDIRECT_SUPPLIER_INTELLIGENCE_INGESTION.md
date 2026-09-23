# OnlineDIRECT → FEH Supplier Intelligence Ingestion Plan

Status: **design / review only**  
Owner: Free Energy Help  
Initial supplier: **British Gas (Supplier #1)**

## Purpose

Turn supplier/process material available to FEH through OnlineDIRECT into a controlled, source-attributed knowledge layer for the existing FEH Supplier Intelligence Hub.

This plan deliberately **reuses** the existing `public.suppliers` and `public.supplier_products` foundation and the `/suppliers` workspace. It does not create a parallel supplier database, does not scrape an authenticated OnlineDIRECT session, and does not authorize any production database write.

The current supplier core already stores supplier identity, category, status, preferred flag, electricity/gas availability, risk level, market segment and notes, plus supplier products with fuel type, rate type and term bounds. The current UI is still explicitly demonstration-mode. OnlineDIRECT ingestion should therefore be the bridge from traceable source evidence to a later reviewed live-data layer.

## Source extraction order

Process one supplier at a time. British Gas is the first controlled reference implementation.

1. Supplier Overview
2. Letter of Authority
3. Energy Contract
4. Credit Checking
5. Termination & Renewals
6. Change of Tenancy
7. Commissions / SME Matrix Products
8. Bespoke Pricing
9. New Connections
10. Supplier Documents / Terms & Conditions

Do not skip ahead when a section changes the interpretation of a later section. Preserve the original source/version before normalising facts.

## Evidence-first record shape

Every extracted fact should carry enough provenance to be independently checked later. A future implementation should model evidence separately from the current supplier/product registry rather than overloading `notes`.

Recommended evidence fields:

| Field | Purpose |
| --- | --- |
| `supplier_id` | Link to existing FEH supplier record |
| `source_system` | `OnlineDIRECT` |
| `source_section` | One of the ten controlled extraction sections |
| `source_title` | Page/document name shown by OnlineDIRECT |
| `source_reference` | Stable URL, document reference, filename or portal identifier when available |
| `source_version` | Supplier/portal version or revision label when available |
| `source_effective_date` | Effective date stated by the supplier/source |
| `source_retrieved_at` | Timestamp FEH retrieved the material |
| `source_hash` | Optional content/document hash for later change detection |
| `raw_evidence` | Small source excerpt or structured evidence needed to justify the normalised fact |
| `fact_category` | e.g. LOA, contract, credit, renewal, COT, commission, pricing, connection, T&C |
| `fact_key` | Stable FEH key such as `loa_validity_days` or `cot_required_documents` |
| `fact_value` | Normalised value; use typed JSON in a future schema if necessary |
| `confidence` | `high`, `medium`, `low` based on source clarity |
| `needs_human_verification` | True where wording is ambiguous, commercial, legal or time-sensitive |
| `last_verified_at` | Most recent human/source verification |
| `supersedes_evidence_id` | Link to earlier evidence when supplier guidance changes |

## Normalisation map by section

### 1. Supplier Overview
Capture supplier trading name, fuel availability, SME/I&C segment appetite, geographic restrictions, product families, contact/escalation routes, quote channels, target customer profile, known exclusions and any stated turnaround expectations.

Map stable identity/product facts into the existing `suppliers` / `supplier_products` registry only after review. Time-sensitive appetite belongs in evidence/history, not as an untraceable overwrite.

### 2. Letter of Authority
Capture accepted LOA wording/template, wet/e-signature rules, named-party requirements, address requirements, validity period, multi-site treatment, agent/sub-agent wording, data access permissions, rejection reasons and renewal/re-sign rules.

Do **not** infer legal authority beyond the actual wording of the source.

### 3. Energy Contract
Capture contract acceptance method, signature rules, contracting entity, required data, supply start constraints, validation requirements, cooling-off/cancellation position if applicable, contract correction process and supplier-specific acceptance/rejection conditions.

### 4. Credit Checking
Capture when credit checks occur, information required, deposit/security requirements if stated, failure/review path, alternate product treatment and any validity window for an approved check.

Never turn supplier credit guidance into a claim that a customer will pass.

### 5. Termination & Renewals
Capture notice windows, termination route/address, deemed/out-of-contract handling, auto-renewal position where relevant, renewal quote timing, objections, termination evidence and supplier-specific renewal workflow.

Store dates/windows as structured values plus the source evidence that supports them.

### 6. Change of Tenancy
Capture incoming/outgoing occupier requirements, accepted proof, meter-read requirements, dates, entity/address details, landlord/tenant evidence, vacancy treatment, retrospective limits and supplier escalation path.

### 7. Commissions / SME Matrix Products
Capture commission method, units/basis, product/term eligibility, maximum/minimum constraints if stated, payment timing, clawback/cancellation treatment, VAT position where stated, version/effective date and matrix/product reference.

Treat this as commercially sensitive. The future implementation should restrict write access and preserve every version rather than silently replacing history.

### 8. Bespoke Pricing
Capture qualifying thresholds, data pack requirements, tender/quote validity, half-hourly/non-half-hourly distinctions, volume tolerances if stated, credit requirements, quote-turnaround guidance and acceptance workflow.

Do not store transient quoted prices as generic supplier facts.

### 9. New Connections
Capture new-connection eligibility, MPAN/MPRN prerequisites, expected documentation, meter/site data, capacity/load requirements, target dates, infrastructure dependencies, responsible supplier/DNO/network steps and escalation routes.

### 10. Supplier Documents / Terms & Conditions
Inventory each document with title, version, effective date, supplier/product scope, source reference and retrieved date. Extract only facts needed operationally and retain a link/reference back to the controlling document.

Terms and conditions are controlling evidence; AI summaries must never be treated as a substitute for the original document.

## Claude-assisted extraction pack

When FEH gives a page/document to Claude (or another model), use a constrained extraction request rather than an open-ended summary.

Required output for each source:

```json
{
  "supplier": "British Gas",
  "source_system": "OnlineDIRECT",
  "source_section": "<controlled section>",
  "source_title": "<exact title>",
  "source_reference": "<reference if supplied>",
  "source_version": null,
  "source_effective_date": null,
  "source_retrieved_at": "<ISO timestamp supplied by FEH>",
  "facts": [
    {
      "fact_key": "<stable FEH key>",
      "fact_value": "<normalised value>",
      "raw_evidence": "<short supporting excerpt>",
      "confidence": "high|medium|low",
      "needs_human_verification": true
    }
  ],
  "unknowns": [],
  "potential_changes_since_source_date": [],
  "contradictions": []
}
```

Extraction rules:

- Do not invent missing values.
- Mark uncertain wording as uncertain rather than resolving it by assumption.
- Quote only the minimum excerpt needed to prove a fact.
- Keep dates, percentages, fees, commission rules, termination windows, validity windows and contract conditions exactly attributable to the source.
- Flag anything likely to change over time.
- Flag contradictions between the current source and previously stored evidence; never silently overwrite.
- Do not make a legal/compliance conclusion from a supplier summary.

## Change-control workflow

1. Retrieve source through the authorised FEH/OnlineDIRECT session.
2. Record retrieval date and source identity before extraction.
3. Extract into the evidence-first format.
4. Independently check high-impact fields: commission, contract acceptance, LOA, termination, credit, T&C and time windows.
5. Compare with the last stored version.
6. Mark changed, unchanged, new or contradictory facts.
7. Only promote reviewed stable facts into operational supplier/product fields.
8. Retain superseded evidence for audit/history.
9. Surface stale/unverified supplier data in the CRM rather than presenting it as current.

## Intent Radar / growth-signal boundary

OnlineDIRECT supplier intelligence and FEH company intent are separate evidence domains and must remain separate in code and CRM presentation.

- A supplier rule, product appetite change, commission matrix, LOA rule, credit policy or T&C update is a **supplier-level fact**. It must never create a company-level Intent Radar opportunity merely because the source is trusted.
- `source_system = OnlineDIRECT` does not by itself make a record an `ONLINE_DIRECT` Intent Radar trigger. A trigger requires separate company-specific first-party evidence tied to a durable company identity and a stable source reference.
- Examples of potentially valid company-specific first-party evidence are an already-held contract end date, an explicit renewal/tender event, a recorded quote/pricing request or another customer/account event whose provenance can be independently checked.
- Contract-expiry evidence should reuse the controlled tender/contract-expiry boundary rather than creating a second renewal calculator or silently deriving new dates from supplier guidance.
- **Verified supplier fact is not the same as verified company intent.** Any interpretation that a supplier-level change creates a company opportunity is an inference and must remain labelled as inference; it must not independently authorize Apollo enrichment.
- Generic supplier intelligence may inform human routing, suitability and pricing review after a company opportunity already exists, but it cannot authorize CRM writes, provider execution or outbound contact.

This separation is required even when both records ultimately originated from an authorised OnlineDIRECT session. Provenance identifies where evidence came from; it does not collapse different evidence meanings into one trigger.

## FEH CRM presentation target

The existing `/suppliers` workspace should eventually show, per supplier:

- verified supplier identity and fuel/product availability;
- source freshness and `last_verified_at`;
- operational playbooks for LOA, credit, contract, renewal, COT and new connections;
- product/matrix version and effective date;
- commission evidence with appropriate access controls;
- conflicts or stale-data warnings;
- direct source/document references;
- a clear distinction between **source fact**, **FEH interpretation**, and **AI suggestion**.

The current `Supplier Intelligence Hub — Demonstration mode` banner should stay in place until reviewed live supplier data actually backs the screen.

## Safety gates

The ingestion design does **not** authorize:

- credential sharing with an AI model;
- automated login to OnlineDIRECT;
- bulk scraping contrary to portal terms;
- automatic production Supabase writes;
- contract placement;
- supplier activation;
- commission changes;
- customer communications;
- deletion or replacement of historical evidence.

Any future production ingestion must preserve RLS, provenance, version history, auditability and human review for commercially or legally significant facts.

## First controlled implementation slice

British Gas should be completed end-to-end across the ten sections before scaling to further suppliers. The acceptance test is not “all fields filled”; it is:

- every stored operational fact is traceable to a source;
- stale/unknown information is obvious;
- changed guidance creates history rather than silent replacement;
- AI output cannot become operational truth without review;
- existing supplier/product registry remains the canonical identity layer;
- the UI does not leave demonstration mode until live-data readiness is independently verified.
