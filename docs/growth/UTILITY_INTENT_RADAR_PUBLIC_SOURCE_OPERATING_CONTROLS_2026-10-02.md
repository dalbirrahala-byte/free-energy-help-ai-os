# Utility Intent Radar — Public-source operational controls

Date: 2 October 2026  
Status: research-only / fail-closed / no Apollo / no CRM mutation / no outreach

## Purpose

This note records the current operating boundary for public-web and official public-data signals while the three-adapter source remap remains blocked at the existing-file write gate.

## Source classes

### Official/public structured sources
- Companies House API: retain company/filing identifiers, publication/filing date, source URL/reference and observation timestamp. Default API rate limit is 600 requests per five minutes; attempts to bypass limits are prohibited.
- Contracts Finder / Find a Tender: retain notice/OCDS identifiers, stage, published/updated dates and canonical source URL.
- Planning Data: treat the current planning-application dataset as aggregate/developing evidence unless a separate authoritative local-authority source confirms the underlying event.
- BICS: macro/sector context only. Never promote BICS directly into a company-level contact or procurement-intent trigger.

### Public-web sources
- COMPANY_NEWSROOM
- COMMERCIAL_PROPERTY
- TRADE_LOCAL_PRESS

These must be represented as PUBLIC_WEB_SIGNAL / PUBLIC_WEB once the blocked source patch is applied. They are evidence for human review, not a trusted identity/intent binding.

## Required fields for every research record

- source adapter and canonical source
- exact source URL and stable source reference
- published/event date and observed date
- exact evidence excerpt or immutable digest
- company identity asserted by the source
- interpretation kind and whether the interpretation is inference
- freshness/expiry
- dedupe and syndication keys
- access/terms/robots/rate-limit review reference
- suppression/objection/contactability claims
- reviewer decision and next action

## Confidence rule

Confidence is a ranking aid only. It must never override:
- provenance;
- evidence basis;
- source verification;
- suppression/objection;
- dedupe;
- freshness;
- the Apollo/CRM/outreach execution locks.

A 100-confidence STRONG PUBLIC_WEB_SIGNAL remains REVIEW_ONLY / research-only unless a separately trusted binding step establishes the stronger fact required by the downstream boundary.

## Dedupe rules

1. Exact syndicated quotations should collapse to one event.
2. Stable source-record identity takes precedence over excerpt wording.
3. A property development without an identified occupier must not create a company lead.
4. Re-attribution of the same source event must not manufacture a new lead.
5. Planning/listing URLs reused for multiple transactions need a transaction/reference key.

## Apollo boundary

PUBLIC_WEB_SIGNAL is not an Apollo trigger source.

No public-web record may independently enable:
- enrichment;
- credit spend;
- sequence enrolment;
- CRM mutation;
- outreach.

Current Apollo state is deliberately held AMBER because a weekly Waterfall report shows historical enrichment activity whose request-level initiator cannot be proven from the available read interface.

## Current official-source evidence

- Companies House Developer Guidelines: https://developer.company-information.service.gov.uk/developer-guidelines/
- ONS BICS Wave 164 / 24 September 2026, next release 8 October 2026: https://www.ons.gov.uk/economy/economicoutputandproductivity/output/datasets/businessinsightsandimpactontheukeconomy
- IBM Quantum Compute client release notes are unrelated to lead permission and are retained only for the Quantum Lab reproducibility pack.

## Blocked implementation delta

The current utility adapter table still maps COMPANY_NEWSROOM, COMMERCIAL_PROPERTY and TRADE_LOCAL_PRESS to ONLINE_DIRECT. The prepared code correction remains:
- remap all three to PUBLIC_WEB_SIGNAL;
- require PUBLIC_WEB provenance for PUBLIC_WEB_SIGNAL;
- add a regression proving that a 100-confidence STRONG public-web signal cannot unlock Apollo, CRM write or outreach.

This document does not authorize network acquisition, production writes, Apollo enrichment, outreach, deployment or publication.
