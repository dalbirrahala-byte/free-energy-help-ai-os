# FEH launch readiness — 25 October 2026

## Verdict: BLOCKED for launch; safe preparation completed

No advertising changed, no spend authorised, no message sent, no production migration,
secret alteration or deployment performed by this audit. Read-only production metadata
and aggregate lead counts were queried. No customer identities were retrieved.

## Evidence and system verdicts

| System | Verdict | Checked evidence and limitation |
|---|---|---|
| Connected accounts | PASS | Windsor exposes Meta account 2616496408779250 (Free Energy Help UK), Google account 553-034-0666 (Free Energy Help). GitHub, Vercel and Supabase reads succeeded. |
| GitHub current main | PASS | HEAD df6fca6ea7c6868d10bdb9aa41bf7f615684fc08. PRs 109, 110 and 111 are merged. Dominic APPROVED reviews are recorded. Open-PR search returned no open PRs before this preparation. |
| Existing CI | PASS, bounded | PR 110 final branch c0d570d9f096580fedb47ab31335ee6a252f79a5 has completed successful Factory 041 and FEH Loop workflow runs (40196510801, 40196510818). Main combined status returned Vercel success; do not infer every main workflow from that. |
| Vercel production build | PASS, bounded | Deployment dpl_6EtMkVQExHKf2Lg8AKD2evKF5DAA READY at audited main SHA. Prior PR 111 production build also READY. Build readiness does not prove operational lead delivery. |
| Production CRM authentication | PASS, bounded | Opening https://crm.freeenergyhelp.com/leads redirected to /login?redirectTo=%2Fleads. Login rendered; no authenticated dashboard/callback operation was tested. |
| Preview isolation | BLOCKED pending fingerprint | Environment metadata now has separate Production-only and Preview-only Supabase URL/key entries. Preview comments identify staging. Actual values are hidden even in individual-variable reads, so effective URL/key pairing and deployed client target were NOT independently verified. Old shared-variable warning is no longer current metadata. Telnyx API key and sender variable names exist Preview-only; no provider credentials read. |
| Production database | PASS structure / security review outstanding | kupuswwutonsagftivkv ACTIVE_HEALTHY, 61 migration records, 26 public tables, zero public tables without RLS. Latest migration 20260901124827. |
| Staging database | BLOCKED | vredwhyphrhsudggrsen ACTIVE_HEALTHY, zero public tables, no migration-history relation. Empty security-advisor output does not prove an installed CRM schema. |
| CRM receipt reconciliation | FAIL operational acceptance | Aggregate query returned 3 leads: one Website and two with null source. All provider/external ID, owner and follow-up fields unset. No Meta-tagged rows demonstrated in this database. This does not prove the five recovered records are lost or were never stored elsewhere. Reconcile authenticated Meta records and actual deployment target before importing anything. |
| Meta campaign draft | BLOCKED | Cloud browser is signed out. Draft £200 campaign not visible in Windsor reporting. Its £2.20 cap, dates, creative, placements, form, geography and verification cannot be independently passed from historical campaign data. |
| Instagram / advertiser verification | BLOCKED | No authenticated Meta settings inspected. Logo warning and shortened name “Free Energy He” not independently confirmed. Do not change correct legal details or claim further verification is unnecessary without reading the current verification status, beneficiary/payer and account restrictions. |
| Zapier / TT integration | BLOCKED | No Zapier configuration/task history authenticated. No evidence of working automatic receipt in the audited database. Leave existing connection in place pending reconciliation; do not delete or replace blindly. |
| Telnyx account / number | BLOCKED | Portal is at /#/login/sign-in. Current numbers, SMS capability, messaging profile, registration and delivery URLs not inspected. Previously reported +447427851020 approval is historical information, not current verification. Do not assume 01332 605506 is the Telnyx SMS sender. |
| Website | PASS availability / privacy completion outstanding | Home and /about/privacy accessible; both show 01332 605506 and a second mobile number. Dialling, caller ID and every website page not tested. Privacy page describes enquiries but needs review of lawful bases, retention, processors, transfers and full rights/complaints information before this new flow. |
| Google Ads | PASS paused / FAIL restart readiness | Campaign #1 status PAUSED. See performance below. No settings changed. |

## Advertising findings and recommendations

Windsor date range: 1 September–25 October 2026 inclusive. Currency amounts below
are displayed as GBP based on the FEH UK campaign context; account currency was
not separately queried. These are connector-reported attributed metrics, not invoices.

Google: spend 97.2128, 478 impressions, 7 clicks, 0 tracked conversions. Average
reported cost per click is 13.89. Search-term report exposes only five clicks:

| Search term | Spend | Clicks |
|---|---:|---:|
| british gas business contact number | 35.79 | 1 |
| smartest energy | 27.55 | 1 |
| greenshift energy | 18.25 | 1 |
| grants for green businesses | 9.00 | 1 |
| energy audit fees | 2.9381 | 1 |

Those terms total 93.5281; 3.6847 and two clicks are not exposed in this report.
Supplier contact/navigation and grants traffic is poorly aligned with a renewal
enquiry. Before restart: audit match types and actual keyword settings, propose
exact/phrase renewal/comparison terms, review negatives for customer-service,
grants, jobs and domestic searches, review supplier-brand exclusions case by case,
verify East Midlands presence targeting, phone assets and 01332 605506, then test
consented accepted-lead conversion tracking and reconcile calls to CRM. Do not
claim zero real enquiries solely from zero tracked conversions.

Meta: the reported PAUSED “FEH | Meet Dalbir Video | East Midlands | 7 Day Test |
Oct 2026” campaign spent 93.90 for 32,124 impressions, 137 clicks, zero reported
leads. Its old ad set uses LOWEST_COST_WITHOUT_CAP, 25–65, many broad interests,
small-business/page-admin behaviours, and 25-mile circles around Northampton,
Leicester, Derby, Nottingham and Lincoln, with home/recent location types. These
are **historical settings, not evidence about the new draft**. The four genuine
TT enquiries and dummy record are not reconciled to this reporting account.

For the new draft recommend Highest volume without a bid cap to establish a
qualified-lead baseline inside the separately approved £200 lifetime test. A bid
cap limits auction bids; it is not a guaranteed £2.20 cost per lead. Do not select
an arbitrary replacement cap. Confirm currency, lifetime rather than daily
budget, finite future dates in Europe/London (now GMT), Instant Forms conversion
location, correct FEH identity, form ID 1788543365401126, effective East Midlands
limits, whether Advantage+ expands audience suggestions, and visual crops for
each selected placement. The “UK” campaign name does not authorise UK-wide
delivery. No edits made while these details are unverified.

## Direct Meta-to-CRM delivery design

1. Securely authenticate Meta; inspect the FEH Page, form, lead access, app and
   subscription. Record exact current Graph version and permissions from Meta's
   own app dashboard/docs. Do not reuse Windsor credentials or invent access.
2. In isolated staging, add a server-only endpoint with GET challenge handling,
   body-size limits and POST raw-byte HMAC verification before JSON parsing.
   Existing browser-auth middleware must not redirect this future provider
   endpoint to login; any narrow exemption needs separate review and tests.
3. Restrict page and form to independently configured FEH identities. TT form
   1618322856411605 remains outside the FEH-owned flow. Persist minimal authenticated
   inbox receipt before acknowledging delivery; durable unique identity, retry
   state and reconciliation must survive process crashes and concurrency.
4. Retrieve details through a narrow server-only Graph client. Bind returned
   lead/form/page to the authenticated event, validate timestamps and identifiers,
   minimise fields and never log tokens or raw customer payloads. HMAC alone does
   not prevent replay; delayed/stale events need a review queue, not automatic SMS.
5. Reuse existing public.ingest_external_lead structured accepted/duplicate/rejected
   contract and unique (provider, external_lead_id) partial index. It is executable
   by external_lead_ingestor/service_role, not anon/authenticated. Do not broaden
   grants. Existing function only persists narrow contact data and utm_campaign;
   it does not persist all required qualification/notice/task fields.
6. Review an atomic extension that stores campaign/form/ad references, submission
   versus receipt time, exact renewal answer, monthly spend band, notice version,
   callback request and SMS permission receipt. An answer “within 3 months” is a
   band, not an exact contract_end date. Current leads table has campaign_id,
   contract_end, lead_owner, next_action and follow_up_date but no monthly spend
   band or form/ad/notice receipt columns. Avoid hiding operational fields in notes.
7. Atomically create an accepted lead, audit event, named Dalbir callback task and
   durable notification outbox reservation. Duplicate leads never create a second
   callback or SMS; missing task/outbox transaction must be reconciled. Expose owner,
   follow-up and qualification fields visibly: their presence in DB is not proof
   they appear in the current lead list/detail UI. Status, tasks and activities
   already have UI/source support.
8. Keep customer acknowledgement and internal alert separate. Current review
   gates always return executionAllowed=false / not_sent. A candidate is not
   authority. Final dispatch must reuse Factory 041 persisted permission,
   suppression, STOP, destination, expiry and durable-attempt controls.
9. After separate activation approval, verify Telnyx sender capability/profile,
   account permissions, registration requirements and signed delivery events.
   Record attempted/accepted/delivered/failed/indeterminate separately. Unknown
   outcomes must be reconciled using provider reference, never blindly retried.
10. Reconcile Meta submissions against CRM external IDs daily and after faults.
    Manual fallback: authenticated Instant Forms/Leads Centre export, preserve
    original Meta lead IDs and timestamps, identify dummy record, and import via
    the same deduplicating reviewed path with messaging disabled. Do not use a
    generic CSV insert that bypasses audit/consent checks. Keep Zapier until direct
    delivery is demonstrated; then review disabling the redundant route separately.

## Customer response and privacy

Existing acknowledgement candidate remains:
“Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from
01332 605506 during business hours.” It must not claim verified outgoing caller
ID until a separately approved test establishes that fact. No sales claim or
promotional upsell should be added to an administrative acknowledgement.

ICO guidance distinguishes factual service messages from direct marketing.
This is a proposed application of that guidance, not legal clearance of the
unseen Meta form. Record an appropriate UK GDPR lawful basis, purpose, retention,
privacy notice and processor/transfer arrangements. Preserve separate channel-
specific marketing permission; a business-owner interest or form submission is
not universal marketing consent. Sole traders and some partnerships receive
individual-subscriber PECR protections. Unknown subscriber type must not be
treated as corporate exemption. Honour suppression and objections.

Internal alert should contain no customer PII and direct Dalbir to sign into CRM.
Proposed callback service target: promptly in business hours, ideally within five
minutes; next working opening for out-of-hours enquiries. This is a recommendation,
not an implemented timer or promise. Initial calls remain Dalbir's responsibility.

Telnyx's UK guidance allows alphanumeric sender IDs subject to protected-name/LOA
requirements; phone-number approval alone does not establish SMS readiness.
Numeric SMS-capable numbers require an assigned Messaging Profile. Verify any
opt-out/reply mechanism for the chosen sender type; alpha senders may not accept
replies. No sender registration or account configuration changed here.

## Security findings requiring review

- Production advisors flag mutable search_path on set_updated_at and user_can_write,
  three anon-callable SECURITY DEFINER website/rejection RPCs, authenticated
  is_admin, and disabled leaked-password protection. Public website RPC exposure
  may be intentional: inspect validation/rate limits before changing grants.
- Eight execution/control tables have RLS and no policy. That can be deliberate
  deny-by-default; do not “fix” by adding permissive policies.
- authenticated SELECT USING(true) on leads/other CRM tables follows ADR-008's
  organisation-wide model. It is not per-owner isolation. Verify staff-only admission,
  Auth signup settings, unprovisioned-user denial and MFA at the actual data boundary.
  Browser middleware is not a replacement for database access control.
- Write-role DELETE policies exist. Review deletion/cascade/audit/suppression
  implications before automated ingestion or dispatch, without weakening gates.
- No staging schema, live Meta provenance, actual Graph transport, durable inbox,
  task/outbox transaction or Telnyx delivery route was demonstrated.

## Work prepared and validation

New dormant primitive: frontend/src/lib/lead-gateway/metaWebhookReview.server.ts.
It uses Node crypto to compare HMAC-SHA256 over a snapshot of exact raw bytes,
strict UTF-8/JSON decoding, bounded body/batches, one configured page/form, minimal
immutable lead references and within-batch duplicate/conflict checks. No env,
route, credential lookup, DB, Graph HTTP, SMS or authority activation. A valid
result is still executionAllowed=false. It intentionally does not implement GET
challenge, timestamp freshness policy, replay storage, cross-process dedupe,
Graph retrieval or CRM receipt. Future callers must use a reviewed server boundary.

Synthetic tests cover altered bytes, malformed/wrong signatures, wrong secret,
oversize/empty/invalid UTF-8/JSON, wrong pages/forms, malformed batches, bad IDs/
times, duplicates/conflicts, non-lead events, PII exclusion and non-execution.

Validation performed on Node 24.22.1:
- Lead gateway tests (new plus existing): 106 passed / 0 failed.
- Full repository TypeScript check: passed, exit 0.
- Targeted ESLint for both new TypeScript files: passed, exit 0.
- Factory 041: 177 passed / 0 failed. Execution-dispatch: 475 passed / 0 failed.
  Authentication: 33 passed / 0 failed. Together with gateway: 791 passing tests.
  A summary-print command used incompatible tail syntax and exited 1 after the
  suites; reading their saved logs confirmed all three suites completed with zero
  failures. That reporting-command error is not a test failure.
- Offline pinned staging copier: passed against separate clean checkout at
  92e1044a9d2426d7910c0e50cc39865a7b2a6097; generated exactly 61 files plus SHA256
  manifest. No SQL replay/application performed; psql/Docker unavailable locally.
- Build not run for this unused library-only change; existing Vercel build is
  separately recorded above. Live Meta→CRM→Telnyx E2E remains BLOCKED.
- Dependency installation used committed lockfile and --ignore-scripts. Existing
  Node module-format and npm http-proxy warnings were observed.

## Revenue-first next gates and approvals

1. Authenticate Meta and Telnyx securely so draft/lead delivery/current number
   can be checked directly. Authenticate CRM only if needed for signed-in UI QA.
2. Reconcile all five recovered records and callback status before any duplicate
   import/contact. No new customer contact is authorised by this audit.
3. Approve reviewed staging-only schema installation after target, migration and
   grant review; root AGENTS.md and the staging runbook require explicit remote
   migration approval. The offline 61-file bundle is ready; no production data copy.
4. Complete effective Preview fingerprint and synthetic role/RLS tests. Build
   durable Meta receipt/retrieval + CRM task persistence, then test signed events,
   duplicates, concurrency, rejection, outage/recovery and manual reconciliation.
5. Review exact form notice/privacy changes, SMS wording, lawful basis and sender.
   Separately authorise any Meta app access grants/credentials, messaging setup,
   internal test recipient and cost-limited live SMS/caller-ID test.
6. Review code/CI and approve merge/production deployment, production migrations,
   production secret provisioning and live lead processing as specific steps.
7. Once receipt + callback fallback pass, approve the exact unpublished Meta
   campaign, £200 total lifetime test, dates, audience, placements and bid strategy.
   SMS may remain disabled for a callback-first launch if explicitly accepted.
8. Approve customer SMS activation separately after controlled delivery proof.
   Keep Google paused pending its corrective review and separate restart approval.

## Completion evidence block

Scope: connected-system audit, offline migration preparation, dormant HMAC parser,
synthetic validation and review plan. New files: this report and the two TypeScript
files. Existing tracked files modified/deleted: none. Commit/push/PR details are
recorded in the final user report. Production/external-system mutations: none
apart from authorised development branch/PR creation. Provider credentials read:
no. Production/customer data touched: production metadata and aggregate counts
read-only; no identities, imports, writes or messages. Deployment/migrations: no
agent-initiated deployment, no remote schema change. Remaining risks and next gate:
authenticate accounts, prepare isolated staging and prove end-to-end receipt.

## Sources checked

- https://developers.facebook.com/docs/graph-api/webhooks/getting-started/
- https://www.facebook.com/business/help/1619591734742116
- https://www.facebook.com/business/help/721453268045071
- https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/
- https://cy.ico.org.uk/for-organisations/advice-for-small-organisations/direct-marketing-and-data-protection/marketing-and-data-protection-in-detail/
- https://support.telnyx.com/en/articles/6531704-united-kingdom-sms-guidelines
- https://support.telnyx.com/en/articles/3562059-setting-up-a-messaging-profile
- https://freeenergyhelp.co.uk/about/privacy

Some Meta documentation opens redirected to login; search snippets and read-only
account data support only the bounded claims above. No unsupported verification
or legal-compliance PASS has been inferred.
