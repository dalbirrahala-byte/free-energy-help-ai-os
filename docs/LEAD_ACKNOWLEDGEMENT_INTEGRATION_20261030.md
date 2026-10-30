# Lead acknowledgement staging integration — 30 October 2026

**Local implementation: PASS. Real enquiry-to-handset proof: NOT COMPLETE.**

The owner approved configuring the restricted staging connection, finishing Meta/Google intake, and proving one acknowledgement without duplicates. This report describes the current increment. Earlier states and OTP evidence remain in PR #115 and Git history. No production change, merge, advertising activation or acknowledgement SMS has occurred.

## Implemented behaviour

Meta and native Google Ads lead forms enter one durable acknowledgement queue. Raw Meta HMAC and the configured Page/form are checked before Graph retrieval. The bounded Graph response must match the lead reference. Google checks its private webhook key, exact form/campaign, test marker and one allowed test phone; int64 IDs retain their exact digits. Unknown Google fields are ignored, ambiguous duplicate contact fields rejected. Both handlers accept only the configured test phone in staging, keep marketing consent unknown, and never authorize or send SMS.

The database atomically saves the lead, reservation and audit. Unique provider/lead identity prevents a replay adding another reservation or backfilling old leads. The worker claims once and reuses the existing Factory 041 consume/prepare/immediate-check/finalize sequence. It requires persisted contact linkage, current compliance and authorization, exact-template approval/evidence, an approved adapter, suppression clearance and emergency clearance. Timeout, crash and ambiguous provider results never trigger a blind resend. Provider acceptance does not establish handset delivery.

The existing Telnyx transport fixes the sender, recipient and exact message, permits one POST with a bounded response/timeout, and is disabled unless the exact staging Preview and separate sending flag agree. It remains unconnected to any sending route or scheduler.

> Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from 01332 605506 during business hours.

The owner confirmed 01332 605506 as the number customers see. The Telnyx sender ends 1020; the owner test recipient ends 7373. That confirmation is not evidence of customer marketing consent.

## Restricted runtime connection

Staging is `vredwhyphrhsudggrsen`. Production is excluded. PostgreSQL 17.11 grants the administrative `postgres` role membership with SET FALSE, explaining the earlier 42501 test failure. Those memberships are unchanged.

Two new dedicated logins have NOINHERIT, no superuser/create-role/create-database/replication/BYPASSRLS, and a connection limit of two. Each may SET only its respective capability role, with ADMIN FALSE and INHERIT FALSE:

| Login | Capability |
| --- | --- |
| feh_ack_preview_ingestor | external_lead_ingestor |
| feh_ack_preview_worker | execution_dispatch_worker |

Neither login nor capability has raw acknowledgement-table access. Runtime code accepts only the exact verified staging Supavisor host/port or staging direct host, the matching login and database, verified TLS, no prepared statements and one pooled connection. Every RPC starts a transaction, binds the capability locally, verifies database/session/role identity and rejects elevated or raw-table access. RPC names, types and argument keys are a closed allowlist; values are parameters. Generic errors discard credentials and SQL details. The read-only readiness probe exposes only two booleans.

Random credentials were generated privately, installed as SCRAM verifiers and saved as Vercel sensitive variables only for Preview branch `work/telnyx-otp-lead-sms-20261030`. They expire at 2026-11-06 23:59:59 UTC. No password or verifier is in this repository or migration source. Database support is enabled on that branch; Meta intake, Google intake and SMS sending flags are explicitly false. Secret values were not displayed. Deployed connection verification is recorded separately in PR #115 after publication.

## Applied staging migrations

| Version | Name | Recorded source MD5 |
| --- | --- | --- |
| 20260826100000 | authoritative_prepared_envelope_checkpoint | c06e82d2869308ec7d914b4473d99790 |
| 20260828120000 | prepared_dispatch_destination_binding | 4c4fc76a2176f249906717647fcb8820 |
| 20261030130256 | meta_lead_acknowledgement_queue | f174e23d7d062ff3278397ae3fca5d36 |
| 20261030191817 | lead_ack_preview_runtime_identities | f7c564be8badbf869e39d43a30c69ae9 |
| 20261030192825 | google_lead_acknowledgement_intake | d6cebdd8c1bd424cdbfebbe11dbc696f |

The last two were applied this increment and independently read back. Local filenames use Supabase's actual recorded versions. Google extends the existing provider constraint and ingestion mapping, adds a restricted atomic intake RPC, and extends the existing claim's source/action binding without removing any approval check. Before replacement the prior function definitions/ACLs were captured. The Google RPC is executable only by postgres and the ingestor; anon, authenticated, service_role and worker are denied. Queue RLS remains enabled. Queue rows and attempts were zero at verification.

Advisory categories and counts were unchanged after DDL. The queue intentionally has no public RLS policies or table grants. Existing function search-path, public legacy RPC and Auth password-protection warnings remain outside this change. See [RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## External account state and remaining work

Meta app `1121337167194437` exists, unpublished, under portfolio `1384515823534756`. Page `100693684801233` and form `1788543365401126` were verified. The form promises contact about the enquiry within one working day; no SMS-specific opt-in was shown. Existing Zapier/Metricool connections are unchanged. Page metadata access, Page token/app-secret configuration, leadgen subscription and callback verification remain outstanding. No token was generated or retrieved this increment.

Google native-form support is implemented, but the actual intended Google form/campaign has not been identified. Website Google traffic uses a separate existing website intake; it is not silently relabelled or connected by this native-form implementation.

Vercel Preview authentication is retained. Real provider callbacks require a reviewed reachable webhook endpoint; no deployment protection exception or long-lived bypass was introduced. The connection readiness endpoint bypasses CRM session login only in exact staging and returns no records/secrets; Vercel protection remains in force.

A persisted approval/contact-linkage writer, worker invocation, authenticated delivery/STOP reconciliation and an owner-controlled real enquiry/replay test remain. The tested fixture supplies synthetic authority solely inside isolated PostgreSQL; it must never be presented as real customer authorization. No live acknowledgement has been sent.

Factory 041 CI intentionally rejects migration/security changes outside its accepted checkpoint. The earlier remote build passed tests/typecheck/lint and failed this drift check. It is unchanged and needs reviewed acceptance before merge; local passing tests do not authorize weakening it.

## Completion Evidence Block

- **Scope:** restricted Preview PostgreSQL adapter and identities; signed Meta/Graph intake; Google test lead-form intake; shared durable queue; read-only readiness probe; staging configuration.
- **Created:** `frontend/src/lib/lead-gateway/{boundedBody.server.ts,googleIngress.server.ts,metaGraph.server.ts,metaIngress.server.ts,previewDatabase.server.ts,previewDatabase.test.mjs,previewIntakePath.ts,providerIngress.test.mjs}`; `frontend/src/app/api/lead-intake/{meta,google,readiness}/route.ts`; the two new migrations listed above.
- **Modified:** `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/lib/execution-dispatch/{checkpointThreeDispatchBoundary.ts,executeLeadAcknowledgement.ts,leadAcknowledgement.database.test.mjs}`, `frontend/src/lib/lead-gateway/ingestMetaLeadAcknowledgement.server.ts`, `frontend/src/middleware.ts`, this report. **Deleted:** none.
- **Dependency:** exact runtime `postgres@4.0.0`; lockfile preserves unrelated platform metadata.
- **Tests:** final combined lead-gateway, execution-dispatch, identity, suppression, compliance, outreach and execution-authorization run: **936 passed, 0 failed, 0 skipped**. Includes 20 isolated PostgreSQL integration tests and 77 adapter/provider-handler tests; these counts overlap the total.
- **Typecheck:** PASS, exit 0. **Targeted ESLint:** PASS, exit 0. **Production build:** PASS, exit 0; three new dynamic API routes included, 38 static pages generated. Existing middleware/module-type/npm configuration notices remain.
- **Limitations:** PGlite tests persisted SQL with one connection, not independent network sessions. Mock transports establish no Telnyx delivery. Real restricted connection and handset proof require deployed verification.
- **Git/publication:** review branch and draft PR #115; exact commit, expected-head publication, final status and Preview verification are recorded in the PR after publication. No merge or force push.
- **Database/deployment:** two new staging migrations applied and checksums/ACLs verified; private staging-only connection settings provisioned; provider/sending flags false. No production deployment/configuration change.
- **External systems:** Supabase schema/role/configuration and advisor reads; Vercel branch variables; GitHub review-branch publication. No new Meta/Google subscription or Telnyx send.
- **Credentials accessed:** new runtime credentials generated and transferred privately; existing provider/admin passwords not retrieved. No credentials in output, source or migration history.
- **Production/customer data touched:** no. Test data are synthetic. No advertising activated.
- **Recovery:** disable branch runtime flags and mark the new logins NOLOGIN before revoking memberships; preserve durable queue/attempt history. For Google, revoke its RPC access first and restore captured functions/ACLs only after preserving any Google records. Never reset a claim to permit a resend.
- **Next gate:** verify deployed restricted connections, complete provider-specific access and callback configuration, establish attributable test authority through existing controls, run one owner-controlled enquiry and replay, reconcile one provider message with handset receipt, then review the checkpoint before any merge/live launch.
