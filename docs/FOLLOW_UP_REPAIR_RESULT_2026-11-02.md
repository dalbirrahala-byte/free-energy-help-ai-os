# Provider follow-up repair — 2 November 2026

**PASS: the five staging test enquiries now require review and contain a next action. The prevention fix is installed in staging. Advertising readiness is not implied.**

Dalbir's current request (`14aaea14-6e62-42d6-a65e-271cf87f5578`) explicitly asked to fix the unfinished integrations and five staging tests. This authorizes the bounded staging repair described here; retained approvals cover implementation, tests, narrow commits and normal review-branch publication. Production, advertising activation, new SMS and broad authority changes remain excluded.

## Implementation and live result

The existing `ingest_external_lead` inserts had omitted the existing follow-up fields. The new migration changes only those insert values: `lead_owner=null`, `next_action='Review enquiry, verify contact permission and assign follow-up'`, `follow_up_required=true`, `follow_up_date=null`. It reuses existing lead fields, rather than creating a second task system. Consent, provider identity, duplicate handling, audit atomicity, function ownership and privileges remain unchanged. Duplicate deliveries never overwrite staff review decisions.

The migration checks the previous function-body digest before replacement, preventing accidental overwrite of concurrent changes. Prior body MD5 `f4254655f0f7b66969ad3ac8936c35c2`; installed body MD5 `51b11ff1f936fdca0287ee3e68b8e443`. The original function ACL was identical after replacement. The full proposed function was compared to its preceding migration: only the four insert columns/default values changed.

The separate repair script targets only the five observed test provider identities, locks their rows, checks that sending is closed, and refuses missing or altered records. It fills only both-null follow-up fields and appends one audit per repaired lead with the actual owner-request reference. It does not impersonate a logged-in owner: audit actor fields remain null. It compares all unrelated lead fields before/after inside the same transaction. Repeat execution is a no-op, and audit failure rolls back the repair. It is not a broad historical migration.

Fresh staging readback on `vredwhyphrhsudggrsen`:

| Check | Before | After |
| --- | ---: | ---: |
| Provider test leads | 5 | 5 |
| Exact next action + follow-up required, unassigned and undated | 0 | 5 |
| Repair audit rows | 0 | 5 |
| Acknowledgement reservations | 2 | 2 |
| Dispatch attempts | 2 | 2 |
| Tasks | 0 | 0 |
| Active execution grants | 0 | 0 |
| Approved sending adapters | 0 | 0 |
| Latest control event | STOP | STOP |

No callback date, staff assignment or contact consent was invented. A review flag is not authority to contact the person. The existing Inbox still needs authenticated UI acceptance on its own review branch; this repair does not claim that browser test or close all of issue 118.

## Verification

- Focused PostgreSQL tests: **50/50** passed. Six new provider cases verify review defaults, staff-state preservation on replay and rejected-input behavior. Ten new repair cases prove exact five-record scope, unrelated-row preservation, repeat/no-op, concurrent-state refusal, closed-control checks and full rollback on audit failure.
- Full acknowledgement suite: **667/667**, zero failures/skips. Typecheck, targeted ESLint and whitespace checks passed.
- Post-install staging transaction tested one synthetic Meta and one synthetic Google acceptance plus replay, asserted the exact defaults and unknown consent, and rolled back. Subsequent readback found zero probe records. Sequence values may advance during rolled-back PostgreSQL probes; no test records or audits remain from them.
- Migration was applied only to staging through `apply_migration`; historical repair used the reviewed transactional script. No grants, roles, routes or sending controls changed.
- Security advisors returned the same pre-existing findings before/after: 10 INFO no-policy RLS tables, 2 mutable-search-path warnings, 3 anonymous definer-function warnings, 5 authenticated definer-function warnings, and disabled leaked-password protection. None were created by this change. Relevant remediation references: [function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [definer access](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No unrelated security setting was changed.

## Completion Evidence Block

- Completed: staging follow-up defaults for newly accepted provider enquiries, exact five-test repair with attributable audits, offline and rolled-back live verification.
- Created: `supabase/migrations/20261102115757_external_lead_review_defaults.sql`; `scripts/repair-staging-test-followups.sql`; `frontend/src/lib/lead-gateway/stagingFollowupRepair.database.test.mjs`; this report. Modified: `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs`. Deleted: none.
- Tests: focused 50/50, full 667/667; typecheck PASS; targeted lint PASS; diff check PASS. Build not repeated: SQL and database-test change, no app UI, routes, dependency or bundle change.
- Initial Git: clean local `007725327915a999de06b02dd6709be653bfbe7c`, remote `bcee38318f170de9594b75c92b4fb435f1460abe`, matching tree `d05acf816d2838b5987144abc634260bb044ad20`. Narrow expected-head publication to draft PR115; final hashes/clean state recorded with PR publication. No merge, reset or force push.
- Deployment: staging migration and five-record DML repair verified. No Supabase function/secret change, production deployment, ad activation or SMS. Receiver switches were not changed.
- External access: GitHub, Supabase staging and Google Ads read-only editor. Current Google form still has owner email retained and blank webhook URL/key; no form change saved. Supabase docs/changelog inspected; CLI 2.122.0 generated the migration name. Logs were read only as aggregate counts, without raw credential-bearing URLs.
- Credentials accessed: none. Production/customer records touched: none; only the five authorized synthetic/owner-test lead review fields. No private contact values were retrieved or published.
- Remaining gates: authenticated Inbox/access acceptance; permanent Google delivery preserving owner email; automatic attributable authorization/invocation; delivery/STOP callback persistence; protected-path acceptance and explicit production release. The accepted Factory041 baseline remains unchanged; this migration adds one protected path for review.
- Next gate: finish the Google receiving configuration and controlled callback/worker integration; do not reset consumed authorizations or repeat the delivered Meta SMS.
