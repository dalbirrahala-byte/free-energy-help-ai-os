# Utility Intent Radar Phase 2

Research-only, explicit public-source acquisition. No application route, scheduled job, CRM persistence or execution capability is enabled.

## Sources and boundaries

- Planning Data: `acquirePlanningDataResearch()` performs two fixed HTTPS GETs: `/robots.txt`, then `/entity.json?dataset=planning-application&limit=10&offset=0` on `www.planning.data.gov.uk`. One page only, no pagination or provider links followed. Public query parameters are constructed internally; evidence URLs remain query-free entity URLs. The existing planning crawl-plan primitive supplies the endpoint.
- Public-source review (2026-09-28): the [official API documentation](https://www.planning.data.gov.uk/docs) describes public entity access and polite rate limits. The [planning-application dataset](https://www.planning.data.gov.uk/dataset/planning-application) states Open Government Licence v3 and MHCLG-created aggregate data, with authoritative replacement planned. The reviewed robots policy is `User-agent: *` and `Disallow: /fact/`. A different/unknown policy blocks acquisition pending review.
- Companies House: `assessCompaniesHouseFixture()` reuses the existing filing-history normalizer, crawl plan and trigger mapper. No approved local credential transport was found. Live Companies House acquisition remains blocked; no credentials are read, requested or changed. Only AD01, NEWINC, SH01, SH02 and MR01 currently create tentative research triggers. Material status-change acquisition is deferred until a dated, company-bound approved source interface exists; arbitrary status claims are not converted into events. Incorporation is not evidence of trading.
- Local authorities: live acquisition remains disabled. No individually reviewed local-authority host/access-policy registry was found. The existing Phase 1 offline adapter remains available; arbitrary `.gov.uk` hosts are not added to the live allowlist. Aggregate records cannot claim local-authority provenance.

## Output and interpretation

Each admitted record contains the complete Phase 1 research assessment (adapter, source record identity, URL, dates, exact excerpt, inference, scoring, dedupe and QUBO fields), organisation/location where present, and acquisition metadata identifying mode, endpoint, time, source field, event-date field and publisher identifier. Company number is null until trusted identity binding exists; a CH fixture number is separately labelled `claimedCompanyNumber`. Applicant-name matching never binds a company. A planning authority/publisher identifier is never an applicant identity.

Planning `description` is retained exactly. `decision-date`, falling back to `start-date`, is the source event date. `entry-date` is preserved only as dataset ingestion metadata, never publication/freshness evidence. Source event time occupies the existing radar `observedAt` field, while acquisition time is separate. Missing event dates skip records; malformed/future dates reject a batch. Expiry uses existing 45-day planning and CH mapper TTL conventions, so stale signals have zero intent and freshness scores.

Keyword candidates cover commercial premises, factories/manufacturing, warehouses/logistics, refrigeration/cold storage, hotels/care facilities, glasshouses, EV charging, HVAC/boilers/CHP, solar/storage and operational extensions. They require development language, reject explicit domestic/residential wording and known negative/end states, and remain **possible load change**, never proven energy demand. Negative language, proposed/approved/completed status and true corporate occupier still need human research. The keyword filter is intentionally incomplete and may yield false positives or miss mixed-use projects.

Registered-office changes and incorporation create possible premises research, never confirmed tenancy or utility-contract changes. Financing filings create possible operational research, never confirmed expansion. All company/source/claim binding remains unverified. GREEN and VERIFIED_FACT are unreachable. Known negative suppression/objection/subscriber claims restrict to RED; positive caller claims cannot clear suppression. Authoritative live suppression is not queried.

Phase 1 scoring and QUBO fields are unchanged: intent capped at 12 while unverified, freshness 0/3/8/15/20 (zero on expiry), evidence 3, fit 0/8/15, contactability 0, compliance penalty 50/100, duplicate penalty 0/100, effort 3/5. Planning uses unverified commercial fit 8; CH fit remains unknown (0). Typical fresh planning total is 43 and CH total 35. These scores never grant contact permission.

Repeated planning entity IDs remain duplicates despite changed excerpts or attribution. CH filing list URLs and template descriptions are not record identities: CH dedupe uses transaction source-record and existing idempotency keys. Distinct transactions therefore do not collide on one company-wide listing. Semantic paraphrase dedupe is not implemented. Prior keys can be supplied to fixture assessments; no persistent cross-run dedupe store is introduced.

## Acquisition controls

The live reader accepts no URL, transport, credentials, capability flags or pagination parameters. It is Node-only, uses fixed HTTPS GETs and default TLS validation, sends no authentication/cookies, and disables connection pooling. It rejects redirects, non-200 responses (including 429), unexpected content types/encoding, aborted reads and errors. Limits: 10 records, 256 KiB JSON, 4 KiB robots, 10-second absolute request timeout, one active acquisition and 10-second cooldown after success or failure. There are no retries. Rate limiting is process-local: no multi-process/scheduled deployment is approved. Future bulk collection requires a separate rate/access-policy design.

All incoming fixture/provider data goes through the Phase 1 owned immutable snapshot: proxies, getters, inherited/hidden/symbol properties, cycles, non-plain objects, sparse arrays and oversized data fail closed. Caller capability fields are not authority. Evidence URLs are validated, never silently stripped or rewritten.

Every Phase 1 execution lock remains false: outreach, email, phone, Apollo enrichment, credits, sequences, CRM writes, promotion, general network execution, deployment and secrets changes. `readOnlyAcquisitionPerformed` records only the narrow official-source GET exception; it is not a reusable execution grant. Fixture consumers cannot label their records live.

## Synthetic examples

| Example | Preserved source evidence | Interpretation | Identity / contactability | Scores |
| --- | --- | --- | --- | --- |
| Synthetic Logistics Ltd | Construction of a new warehouse with refrigeration and solar PV. | Possible operational load change; INFERENCE | Company number null; AMBER | 12 + 20 + 3 + 8 + 0 = 43; compliance 50; duplicate 0; effort 3 |
| Synthetic Works Ltd, AD01 | Registered office address changed | Possible premises research; INFERENCE, not tenancy | Claimed number separate; company number null; AMBER | 12 + 20 + 3 + 0 + 0 = 35; compliance 50; duplicate 0; effort 3 |

Safest next step is to review the original record, decision/implementation status and corporate occupier; CH needs a separately approved source binding. Neither example permits contact.

## Validation and live-read evidence

An official robots-policy read and one-record schema inspection were performed without credentials. The implemented reader then successfully checked robots and fetched one ten-record page at `2026-09-28T16:01:59.260Z`: **zero records admitted**, no records persisted, no credentials accessed. This proves bounded acquisition, not commercial-signal yield or data freshness. No raw live customer/contact data was saved as fixtures. External accesses were limited to Git origin synchronization, official public documentation and Planning Data public GETs.

Focused tests cover malformed providers, spoofing, aggregate relabelling, company mismatch/name ambiguity, future/stale dates, altered-excerpt duplicates, unsafe URLs, getter/proxy/inherited fields, immutable snapshots, uncertain tenancy/load conclusions, forged flags, robots fail-closed behaviour, transport redirects/429/content type/size/aborts/encoding, concurrency/rate limits, distinct CH transactions and negative contactability.

Independent adversarial review identified the CH listing-URL dedupe collision and missing HTTP-boundary tests. Both were corrected; a subsequent review correction preserves PARTNERSHIP verbatim rather than labelling it SOLE_TRADER. Final validation results are recorded in the task completion report. No production build is required for these isolated Node research modules; no route, UI, dependency or deployment configuration changed.

## Remaining gates

Stop before staging/commit/push/PR. Commit approval is a separate gate. Live CH credentials/interface, local-authority allowlists, persistent collection, broader pagination, trusted evidence binding, contactability promotion and any production operation each require later review/approval. No production CRM, migration, Apollo, outreach, secrets or deployment action is part of this phase.

Final verification (2026-09-28): focused Phase 2 tests 27/27 passed; full Factory 044 discovery suite 281/281 passed; `npm run typecheck` exit 0. Independent reviewer verdict READY TO COMMIT after the fixes, with an independent focused rerun of 27/27. Targeted ESLint final rerun exited 0 with no diagnostics for all three changed TypeScript files. Existing Node module-type and Git global-ignore/line-ending warnings are tooling warnings, not test failures.


## Final adversarial-review corrections

The subsequent review found two additional defects: filing-level negative contact claims were lost during CH normalization, and permissive UTF-8 decoding could replace invalid bytes in exact evidence. Both are now corrected.

CH assessment retains the corresponding original item from the owned immutable snapshot alongside the normalized filing. Direct and nested `suppression: "SUPPRESSED"` or `objection: true` feed the canonical negative contact review and remain RED, with outreach false. Parent clearance cannot override them. Regression tests cover skipped preceding filings, post-assessment mutation, getters and inherited reviews.

Both official response bodies use fatal UTF-8 decoding of the complete bounded byte stream. Invalid leading/continuation bytes, overlong encodings, truncated sequences, encoded surrogates and out-of-range Unicode reject with `official_source_invalid_utf8`; malformed robots bytes prevent the data request. Valid Unicode spanning response chunks remains exact, including a literal replacement-character code point when it was validly encoded by the source.

Latest validation after these corrections: focused Phase 2 **40/40 passed** (31 top-level tests plus 9 transport subtests); full Factory 044 discovery suite **294/294 passed**; `npm run typecheck` **exit 0**; targeted ESLint on all three changed TypeScript files **exit 0**, no diagnostics. This supersedes the earlier validation counts above.

A read-only re-review checked both corrections plus the prior source-tier, immutable-snapshot, unverified identity/fact, duplicate, URL and forged-capability boundaries. No remaining blocker was identified within this research-only scope. GREEN remains unreachable and all Phase 1 execution locks remain false. Validation used synthetic fixtures and mocked HTTPS only; no additional live public-source reads, credentials, production writes, outreach, Apollo, migrations or deployment occurred. The documented acquisition/binding limitations still apply. Staging, commit and push remain unperformed.
