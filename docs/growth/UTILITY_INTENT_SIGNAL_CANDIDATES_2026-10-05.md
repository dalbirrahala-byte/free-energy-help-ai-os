# Utility Intent Radar — reviewed public expansion signal candidates — 5 October 2026

**INTERNAL RESEARCH ONLY — NO CRM WRITE, APOLLO ENRICHMENT, OUTREACH OR EXECUTION**

Purpose: exercise the public-web evidence boundary with current East Midlands commercial expansion signals using only publicly available sources. These records identify **research attention**, not energy-contract intent or contact permission.

## Candidate 1 — Hortons / Sinfin Commercial Park, Derby

- organisation_name: Hortons / Sinfin Commercial Park
- adapter: COMPANY_NEWSROOM
- provenance: PUBLIC_WEB
- source_tier: PUBLIC_WEB
- source_url: https://hortons.co.uk/news/hortons-starts-work-on-271500-sq-ft-industrial-development-at-sinfin-commercial-park/
- published_at: 2026-09-18
- signal_family: EXPANSION_EQUIPMENT_LOAD
- intent_kind: EXPANSION_EQUIPMENT_LOAD
- exact_evidence: "Hortons has begun construction of the first phase of a new 271,500 sq ft light industrial and logistics scheme at Sinfin Commercial Park in Derby."
- source_confidence_claim: 95
- identity_status: UNVERIFIED
- evidence_binding_status: UNVERIFIED
- contactability: AMBER
- compliance_status: REVIEW_REQUIRED
- next_action: Human research only. Verify the developer/site entity and later occupier identity before considering any energy relevance.
- execution: all false

Interpretation: credible first-party evidence of new commercial space and future load, but not evidence that Hortons or any unnamed occupier is shopping for an energy contract.

## Candidate 2 — Rolls-Royce / Derby facilities investment

- organisation_name: Rolls-Royce Holdings plc
- adapter: COMPANY_NEWSROOM
- provenance: PUBLIC_WEB
- source_tier: PUBLIC_WEB
- source_url: https://www.rolls-royce.com/media/press-releases/2026/28-09-2026-rr-invests-pound-300-million-in-uk-manufacturing-and-engineering-facilities-to-drive-aerospace-and-defence-growth.aspx
- published_at: 2026-09-28
- signal_family: EXPANSION_EQUIPMENT_LOAD
- intent_kind: EXPANSION_EQUIPMENT_LOAD
- exact_evidence: "In Derby, the home of Rolls-Royce’s Civil Aerospace operations, the company is investing more than £140 million on new engineering and manufacturing services facilities"
- source_confidence_claim: 98
- identity_status: UNVERIFIED
- evidence_binding_status: UNVERIFIED
- contactability: AMBER
- compliance_status: REVIEW_REQUIRED
- next_action: Human research only. Treat as expansion context; do not infer supplier-switching, renewal timing or procurement authority.
- execution: all false

Interpretation: strong first-party expansion evidence with a clear Derby site, but no public evidence in this source of an energy renewal or price-shopping event.

## Candidate 3 — SEGRO Logistics Park Northampton

- organisation_name: SEGRO plc / SEGRO Logistics Park Northampton
- adapter: COMPANY_NEWSROOM
- provenance: PUBLIC_WEB
- source_tier: PUBLIC_WEB
- source_url: https://www.segro.com/media
- published_at: 2026-09-17
- signal_family: EXPANSION_EQUIPMENT_LOAD
- intent_kind: EXPANSION_EQUIPMENT_LOAD
- exact_evidence: "SEGRO has commenced development of a 722,000 sq ft logistics facility at SEGRO Logistics Park Northampton."
- source_confidence_claim: 96
- identity_status: UNVERIFIED
- evidence_binding_status: UNVERIFIED
- contactability: AMBER
- compliance_status: REVIEW_REQUIRED
- next_action: Human research only. Separate developer/site evidence from future occupier identity and any later energy requirement.
- execution: all false

Interpretation: first-party development evidence suggests substantial future commercial load; it does not establish who will procure energy for the speculative unit.

## Candidate 4 — INFINITY advanced technology park, Derby

- organisation_name: Infinity Technology Group Ltd / INFINITY
- adapter: COMPANY_NEWSROOM
- provenance: PUBLIC_WEB
- source_tier: PUBLIC_WEB
- source_url: https://infinity-tech.uk/directors-appointed-to-deliver-infinity-tech-park-in-derby/
- published_at: 2026-09-10
- signal_family: EXPANSION_EQUIPMENT_LOAD
- intent_kind: EXPANSION_EQUIPMENT_LOAD
- exact_evidence: "INFINITY will create highly specialised capability for the research, development and manufacture of essential parts at a 200-acre site at Infinity Park Derby."
- source_confidence_claim: 93
- identity_status: UNVERIFIED
- evidence_binding_status: UNVERIFIED
- contactability: AMBER
- compliance_status: REVIEW_REQUIRED
- next_action: Human research only. Verify project delivery entity, site phase and any future occupier or procurement route before energy relevance is considered.
- execution: all false

Interpretation: credible project-level expansion evidence; not evidence of an immediate contract renewal, quote request or named buyer.

## Common fail-closed controls

For every candidate above:

- `crmWriteAllowed = false`
- `apolloEnrichmentAllowed = false`
- `creditsSpendAllowed = false`
- `sequenceEnrollmentAllowed = false`
- `outreachAllowed = false`
- `executionPerformed = false`

No candidate becomes stronger merely because a public source uses words such as investment, growth, development or future demand. A later human reviewer must bind the source to the correct legal entity/site, check freshness and dedupe, and separately establish a lawful, relevant contact route before any Apollo or CRM gate can even be considered.
