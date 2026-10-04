# Public-Web Event-Cluster Dedupe Design — 2026-10-04

Status: design-only hardening note; no production CRM write, Apollo enrichment or outreach.

## Gap observed

Current Utility Intent Radar deduplicates stable record references, source URLs, exact normalized evidence and signal idempotency identities. That correctly catches repeated records and same-URL variants.

It does not yet provide a general cross-publisher event-cluster identity for the same underlying event reported on different publisher URLs with different excerpts.

## Fail-closed design

Add an optional research-only `eventCluster` input only after a deterministic, human-reviewed normalizer exists. Until then, cross-publisher suspected duplicates remain separate RESEARCH_ONLY records but must be visibly marked for human duplicate review.

A future event-cluster key should be derived only from normalized, non-sensitive fields already permitted inside research:
- durable company identity when present: Companies House number preferred, otherwise validated domain, otherwise normalized company name;
- utility intent kind;
- event date at day precision when evidenced;
- event location/site identifier only when explicitly public and reviewed;
- a bounded normalized event descriptor built from verified public evidence.

Do not use:
- contact names, email addresses, telephone numbers or other person data;
- arbitrary publisher wording;
- tracking parameters;
- embeddings or opaque similarity scores as the sole dedupe authority;
- caller-supplied "verified" flags.

## Promotion rule

Cross-publisher agreement must never increase evidence basis, source verification, signal strength, Apollo eligibility, CRM-write permission or outreach permission.

At most it may:
- reduce duplicate research workload;
- preserve multiple provenance records under one human-review cluster;
- add a visible "corroborated by N public sources" research note.

## Suggested deterministic key

`utility-event-cluster-v1:<company-identity>:<intent-kind>:<event-day>:<site-or-none>:<descriptor-hash>`

The descriptor hash must be generated from a documented canonical text function and covered by regression tests.

## Required tests before implementation is relied upon

1. Same event, different publisher URL/excerpt -> one event-cluster identity.
2. Same company, same day, genuinely different event -> different cluster.
3. Different company at same site -> different cluster.
4. Missing event date -> no automatic cluster; human review only.
5. Suspected duplicate never increases intent score or execution capability.
6. Suppression/objection and all current execution locks continue to dominate.
7. Caller-supplied cluster key cannot override the derived key.

No code change is authorized by this note alone.
