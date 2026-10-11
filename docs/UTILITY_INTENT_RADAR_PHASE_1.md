# Utility Intent Radar — offline Phase 1

Version: `utility-intent-radar-v2`. This Node-only library assesses supplied public-source research in memory. It performs no collection, network calls, authentication, persistence, enrichment, outreach or quantum execution. Existing FEH modules, routes, database schema and security policy are unchanged.

## Trust boundary after security review

**GREEN and VERIFIED_FACT are unavailable in this phase.** Caller-provided company numbers, verification booleans, review references, official hostnames and even complete-looking binding objects are not authority. All admitted records have `evidenceBindingStatus: UNVERIFIED`, `signal.evidenceBasis: INFERENCE`, `signal.sourceVerified: false` and `interpretation.basis: INFERENCE`.

There is deliberately no trusted issuer, verifier callback, binding acceptance path or caller-controlled override. An eventual separately reviewed verifier must establish attributable evidence binding between the company identity, source record/URL and dates, exact claim/excerpt, and review decision. Contact classification also needs authoritative subscriber/route and suppression evidence. Only that future mechanism could make verified labels eligible; references or matching hashes alone would not establish trust. No live verification has been added.

Submitted signal enums, booleans and fact/source-verification consistency are still validated through `buildIntentRadarSignal` before downgrading. Exact quoted source text is kept; a quotation is not automatically proof of the allegation or of the utility interpretation. Fit remains an explicitly unverified analyst research assessment.

## Existing FEH primitives

- Reuses `buildIntentRadarSignal`, its vocabulary, validation and idempotency key. Inputs are explicitly projected so extra caller capability fields cannot survive the existing builder's spread.
- Companies House: accepts compatible `mapCompaniesHouseFilingToIntentSignal` output. A filing or registered-office change never proves tenancy, occupation or an energy contract.
- Planning: accepts compatible `mapPlanningApplicationToIntentSignal` output. Host-derived source tier distinguishes aggregate data from unverified government-host candidates. Planning permission does not prove completed work or occupation.
- Tenders: accepts compatible public `mapPublicTenderToIntentSignal` output. Private CRM expiry records lack required public provenance/URL and are not admitted.
- BICS remains industry context, not a company fact or score lift. Apollo review gates and Backlink Engine remain unchanged and disconnected from this module.

## Runtime snapshot integrity

Before any semantic check, the input, review instant and duplicate history are copied into one owned, deeply frozen plain-data snapshot. Classification, source validation, scoring and retained metadata use only that copy.

Node's `util.types.isProxy` rejects proxies, including revoked proxies, before reflection can invoke traps. Descriptor inspection rejects getters/setters without invoking them, hidden properties, symbol keys and reserved prototype keys. Custom prototypes/inherited records, functions, nonfinite numbers, non-data objects, sparse/decorated arrays and cycles are rejected. Null-prototype records are accepted and copied using their own data fields. Snapshot limits: depth 24, 50,000 visited values, 1,000,000 string characters and 10,000 entries per array. Rejection throws an evaluation error; callers must never convert it into permission or log the raw rejected input.

## Offline adapters and source policy

The adapter specifications cover Companies House, Planning Data, local-authority planning candidates, Contracts Finder, Find a Tender, company websites/newsrooms, commercial-property announcements and reputable trade/local press. They do not fetch sources.

Known official hosts select a source class independently of the supplied adapter. A known host cannot be relabelled through another adapter, including public-web adapters. Both `planning.data.gov.uk` and `www.planning.data.gov.uk` are `PLANNING_AGGREGATE`; submitting either through `LOCAL_AUTHORITY_PLANNING` is rejected. Other `.gov.uk` hosts are `GOVERNMENT_HOST_UNVERIFIED`, not automatically verified councils. Other allowlisted official hosts are `PUBLIC_OFFICIAL_HOST`; other accepted hosts are `PUBLIC_WEB`. None of these source tiers grants verified evidence status.

Admission requires explicit access declarations: `publiclyAvailable`, `termsPermitted`, `robotsPermitted`, `rateLimitsRespected`, `publisherReviewed` must be true; `requiresLogin`, `requiresCaptcha`, `accessCircumvention` must be false, with a nonempty `reviewReference`. Missing/contrary boolean values return `EXCLUDED` / RED with no evidence or scores retained. These declarations are unverified research metadata, never authority to fetch a source. The existing Companies House crawl plan's API-key requirement does not authorise reading a key or running it.

HTTPS public-looking URLs only: no userinfo, custom ports, IP literals, local hostnames, whitespace/control characters or backslashes. **All query strings and fragments, including empty delimiters, are rejected**, not stripped. This intentionally rejects some legitimate public links until a source-specific policy is reviewed. Obvious credential/private/person/tracking path components and email/JWT forms are rejected, including encoded and multiply encoded forms. Invalid/remaining encodings fail closed. The accepted original URL is retained unchanged; canonicalisation is used only for a separate duplicate key. This syntax policy does not verify public DNS, publisher reputation, permissions or arbitrary opaque path contents. No DNS resolution or HTTP request occurs.

## Input and evidence contract

`assessUtilityIntentResearch(input: unknown, reviewInstant: string, priorResearchKeys: readonly string[] = [])` consumes:

- `adapter`: a key of `UTILITY_SOURCE_ADAPTERS`.
- `signal`: existing `IntentRadarSignalInput`, with source/provenance matching the adapter and a public-safe source URL. Company-number syntax validation is not registration or legal-form verification.
- `access`: the declarations and source-review reference described above.
- `exactEvidence`: a nonempty verbatim excerpt up to 10,000 characters, preserved without trimming/truncation. Use minimised synthetic/public business evidence; unnecessary personal details must not be supplied.
- `publishedAt`, `eventAt`: nullable UTC ISO instants; at least one required. Publication cannot follow observation and observation cannot follow the review instant. Future event dates are retained but do not manufacture freshness. Dates are normalised, not invented; date-only sources should preserve their precision in the source review.
- `interpretation`: a supported `kind`, submitted `basis` enum and `reviewReference`. Output basis is always INFERENCE regardless of an asserted fact label.
- `fit`: `UK_COMMERCIAL_ENERGY`, `UK_COMMERCIAL` or `UNKNOWN`, plus `reviewReference`. Output also identifies this as `UNVERIFIED_RESEARCH_ASSESSMENT`.
- `contactReview`: supplied company/subscriber/route, suppression/objection and review metadata. Selected fields are retained as **`contactReviewClaims`**, never as verified decisions. Classification and these claims derive from the same owned snapshot.

Output preserves the source URL/reference, exact excerpt, source tier/provenance, publication/event/observation/expiry dates, assessment time, interpretation kind, fit and review references. Unsafe source results omit the evidence payload. References are not dereferenced. Output and all retained nested objects/arrays are frozen.

## Contactability and hard locks

- RED: supplied suppression `SUPPRESSED`, objection `true`, legal form `SOLE_TRADER` or `PARTNERSHIP`; also excluded source-access cases.
- AMBER: every other admitted case, including apparently complete UK limited-company/LLP reviews. Unknown or unsupported company/subscriber type never reaches GREEN.
- GREEN: unreachable until trusted evidence binding is separately implemented and reviewed. Even future GREEN cannot imply permission to contact.

Every returned result has `researchOnly: true` and these literal false locks: `outreachAllowed`, `emailSendAllowed`, `phoneCallAllowed`, `apolloEnrichmentAllowed`, `creditsSpendAllowed`, `sequenceEnrollmentAllowed`, `crmWriteAllowed`, `promotionAllowed`, `networkExecutionAllowed`, `deploymentAllowed`, `secretsChangesAllowed`. Scores, forged GREEN labels and binding assertions cannot override them. No new execution capability exists.

## Scoring and QUBO preparation

The category weight constants remain: premises/tenancy 32; renewal/expiry 36; out-of-contract/deemed 40; seeking prices/comparisons 40; billing/metering 28; supplier/broker complaints 24; expansion/equipment/load 30; tenders/procurement 36. They are research weights, not validated conversion predictions.

The eight requested fields remain under `scores`. Active v2 rules reflect the closed verification gate:

| Field | Active rule/range |
| --- | --- |
| `intent_score` | Expired 0; otherwise min(12, category weight), currently 12 for all categories. No full fact weight is available. |
| `freshness_score` | Publication date, otherwise past event date. Floor elapsed days: ≤7 gives 20; ≤30 15; ≤90 8; ≤180 3; older/unknown/expired 0. Observation time never refreshes evidence. |
| `evidence_score` | 3, because all accepted evidence is unverified inference. |
| `fit_score` | Unverified analyst assessment: UK commercial energy 15; UK commercial 8; unknown 0. |
| `contactability_score` | 0; GREEN unavailable. |
| `compliance_penalty` | AMBER 50; RED 100. |
| `duplication_penalty` | Duplicate 100; otherwise 0. |
| `estimated_effort` | AMBER 3; RED 5 relative research-review units, not hours. |

`totalScore` sums the first five fields; the active maximum is **50** (the eventual five-component envelope remains 100). `researchPriorityScore = max(0, totalScore - compliance_penalty - duplication_penalty)`; it is currently always zero because the trust gate remains closed. Raw total can inform manual research ordering but is never contact permission. These reductions are intentional, not a reason to weaken penalties or fabricate verification. No IBM API or optimiser is connected. Future optimisers must use hard exclusions for restricted/suppressed candidates, not trade away finite penalties.

## Duplicate history

Each admitted result returns `deduplicationKeys`; callers must accumulate **all** of them for the current research batch and pass them as `priorResearchKeys`:

1. `evidenceKey`: company identity plus whitespace/case-normalised excerpt (existing behaviour; exact original text remains separate).
2. `sourceRecordKey`: namespace, canonical hostname, source family and normalised source reference; independent of company claims and excerpt.
3. Source-URL key: namespace and canonical accepted URL, catching the same page with changed references/excerpts.
4. The existing Intent Radar `signal.idempotencyKey`.

Any matching key produces penalty 100. Changed excerpts or company attribution cannot evade stable-record detection; identical syndicated excerpts still match across URLs. Old callers passing only excerpt keys must adopt the full key list. No durable history or fuzzy semantic deduplication exists. Page-level matches can conservatively flag genuinely different events on an updated page, requiring manual review. Alias URLs/references plus changed quotations still need manual review; no automatic record deletion occurs.

## Validation and next gate

Run from `frontend`: `node --test src/lib/lead-discovery/utilityIntentRadar.test.ts`, `npm run test:factory-044`, `npm run typecheck`, and targeted ESLint for the two utility TypeScript files. Regression tests cover cross-adapter laundering, accessor/proxy/inheritance attacks, immutable snapshots, fabricated binding/identity claims, repeated records with changed excerpts and sensitive/encoded URLs, as well as original category/scoring/lock cases. All fixtures are synthetic.

No build/browser is required for this isolated Node library with no route/UI/dependency change. Next gate is owner review and explicit approval to stage/commit the three files. Push, trusted evidence integration, real data collection, provider activation, persistence, migrations and deployment remain separate approvals.
