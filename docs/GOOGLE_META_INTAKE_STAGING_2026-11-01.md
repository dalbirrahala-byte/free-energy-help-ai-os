# Google and Meta intake staging evidence — 1 November 2026

Google dashboard-to-staging intake: **PASS**. Subsequent Meta dashboard notification/replay: **PASS**; real-form retrieval remains unproven. Advertising launch: **NOT READY**. See [the later Meta staging proof](META_DASHBOARD_STAGING_2026-11-01.md) for the cleared authentication blocker, saved callback/subscription and version 6 runtime. The Google checkpoint evidence below remains valid.

Google's own **Send test data** action returned “Test data sent.” Its supplied provider identity created exactly one staging lead (ID 6), one acceptance audit and two duplicate audits after repeated Google verification clicks. No acknowledgement reservation was created for that lead. Total SMS attempts remained one from the previously completed owner test. STOP remained `stopped`, with zero active execution grants.

Google account 553-034-0666, form 402325113451, campaign 24096131756 was temporarily connected to the test webhook. The saved asset's accessible delivery metadata confirmed the exact staging URL/key, and Google approved the edited asset. The campaign stayed paused throughout.

Google's editor initially dropped existing owner email delivery. Reopening the editor also blanked the webhook fields after an initial render. An attempt to save both methods did not complete; a fresh saved-asset read still showed webhook only. After the successful intake/replay tests, the original owner email-only delivery was restored and the temporary Google webhook removed. Saved metadata confirmed the original `leadDeliveryUserIds: 374091799`, no webhook, and review state `UNDER_REVIEW` after restoration. The live Google connection is therefore **not left enabled**; stable combined delivery configuration remains a launch gate. No provider configuration should be described as production-ready.

The deployed test receiver remains `https://vredwhyphrhsudggrsen.supabase.co/functions/v1/feh-staging-lead-intake/google`. It is a **temporary synthetic-test receiver**, not the live customer intake route. It accepts only Google's fixed fictional contact, `is_test=true`, the pinned form and the real campaign or Google's documented dashboard placeholder. Missing provider time is preserved as NULL and consent remains unknown. It rejects real enquiries. Use a reviewed production receiver before enabling advertising. The test window and database credential expire **6 November 2026 at 23:59:59 UTC**.

A separate manual synthetic receiver check also passed: lead ID 4, one row after replay, one accepted and one duplicate audit. This is distinct from the Google-originated test above.

## Architecture and permissions

- Hosted on the existing staging project `vredwhyphrhsudggrsen`; production `kupuswwutonsagftivkv` was excluded.
- New Edge Function `feh-staging-lead-intake`, version 1, ID `fe0cf53b-36da-4131-b3a0-1b44c29098d1`, ACTIVE. Platform JWT checking is off because this provider webhook authenticates its own private key. Missing-key/wrong-key traffic is rejected before database access.
- Curated seven-file artifact; SHA-256 `8a7f014f9f122455914857b31894f6044ce4a320d43d89a848b75fc2202ffa7c`. Supabase bundle SHA-256 `7e80e448d8bff88748e6027ec13c10676c3ddcf373313d9f435dce42634f639c`.
- New expiring role `feh_intake_preview_receiver`: two connections maximum, NOINHERIT, no superuser/bypass-RLS/create-role privileges, zero memberships, schema usage and only the existing `ingest_external_lead` RPC grant. Explicit postflight: intake=true, acknowledgement queue RPC=false, raw queue access=false.
- Private SCRAM credential provisioned separately; password/key values are absent from source, reports and migration. Credentials saved in staging Edge secrets. Supabase injects default administrator secrets into the runtime, but this artifact reads only its explicit allowlist and never reads those administrator secrets.
- TLS certificate/hostname verification retained; pooled transaction identity checked. Existing Vercel worker/ingestor runtime gates remain unchanged. No worker route, SMS transport, scheduler or execution grant added.
- Vercel creation of a separate receiver project was denied by the connected API (403). No Vercel project was created or CRM protection weakened. Existing Supabase staging provided the supported alternative.

## Meta state at the Google checkpoint (superseded by the linked follow-up)

App `Free Energy Help CRM Leads` / `1121337167194437` is unpublished. `pages_manage_metadata` is present and ready for testing. Page webhook callback/verify token remain unset and `leadgen` remains unsubscribed. No Meta credentials were retrieved or changed, no Page subscription was enabled, and no Meta test reached the receiver.

Meta states that an unpublished app can receive dashboard test webhooks only; real lead delivery, including from app admins/developers/testers, requires publication. The app also has no saved privacy-policy or data-deletion URL in Basic settings. Those launch requirements must be completed using the approved business policy, without inventing a legal policy.

Accessing the app signing secret prompted Facebook reauthentication for Dalbir Rahala. The submitted password was rejected as **Incorrect password**. The next step is successful Facebook account verification, then complete signed webhook handling, callback validation, Page/form permissions and lead retrieval, and test one provider event plus replay. Publication and customer processing need the separate launch decision. Do not treat callback verification alone as proof of lead retrieval.

## Completion Evidence Block

- Scope completed: Google official test intake and replay proven against staging; original Google email delivery restored after test; secure restricted receiver deployed; Meta setup and exact account-verification blocker inspected.
- Created: `frontend/src/lib/lead-gateway/googleWebhookTest.server.ts`, `frontend/src/lib/lead-gateway/googleWebhookTest.test.mjs`, `frontend/src/lib/lead-gateway/intakeReceiver.server.ts`, `frontend/src/lib/lead-gateway/intakeReceiver.database.test.mjs`, `scripts/build-intake-receiver.mjs`, `supabase/migrations/20261101182034_restricted_staging_intake_receiver.sql`, this report.
- Modified: `frontend/src/lib/lead-gateway/previewDatabase.server.ts`. Deleted: none.
- Focused tests: 71 passed, 0 failed. Relevant broad regression suite: 1,030 passed, 0 failed, 0 skipped.
- Typecheck: PASS. Targeted ESLint: PASS. `git diff --check`: PASS.
- Build/runtime: seven-file generator PASS; Deno check PASS using the identical locally installed postgres 4.0.0 source because the Deno registry fetch was refused. Supabase deployment/bundling PASS; actual remote execution returned 200 and persisted the Google fixture. Next.js build not rerun: no Next routes/pages/bundling changed.
- Live negative checks: wrong key 403; non-test marker 400; worker route 404; GET method 405. Each expected response passed.
- Git: prepared on `work/telnyx-otp-lead-sms-20261030` for normal publication to draft PR #115. No merge, force push, branch deletion, or shared-history rewrite. Exact resulting commit/ref recorded in the completion message/PR.
- Migration/deployment: restricted identity migration applied to staging as remote version `20261101182034`; the local filename was aligned to that recorded version without changing SQL; private credential enabled with the bounded expiry; staging Edge Function v1 deployed. Production migrations/deployments: none.
- External systems: Google Ads paused form webhook temporarily connected/tested, then original owner email delivery restored; Supabase staging role/secrets/function/synthetic leads changed; Meta read plus unsuccessful reauthentication; Vercel denied project creation; Windsor connector capabilities inspected; GitHub draft review branch publication only.
- Credentials accessed: yes, newly generated staging receiver database credential and Google webhook key; secure user sign-in forms used. No production/provider administrator secret retrieved. No credential values included here.
- Production/customer data touched: no production CRM/database writes or customer records processed. The existing paused Google advertising asset's delivery settings were changed; advertising was not enabled. Existing owner SMS evidence read only.
- Security observations: Supabase advisors report pre-existing mutable search-path functions, public/authenticated security-definer functions and disabled leaked-password protection; the new migration adds no tables or functions and preserves existing RLS. Remediation references: [search-path checks](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [public function grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [signed-in function grants](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Remaining risks/gaps: Meta incomplete; Google route intentionally test-only and expiring; stable Google webhook/email configuration remains uncompleted after restoring original email delivery; production intake, live consent/authorisation policy and regular SMS worker activation remain separate launch gates. Existing Factory 041 accepted-checkpoint drift gate is not rebaselined or bypassed.
- Recommended next gate: complete Meta reauthentication and staging test, then review a concrete production launch configuration. Keep campaigns paused and SMS STOP engaged.

## Manual verification

1. Confirm the paused Google asset retains its original owner email delivery. A further synthetic test requires deliberately configuring the temporary staging URL/key again; do not confuse that with the production launch route.
2. Use Send test data only within the approved test window. Read staging's corresponding provider lead/audit records; one provider ID must have one row and replays must add duplicate audit evidence only.
3. Confirm that fixture has zero acknowledgement reservations and that `evaluate_execution_emergency_stop()` remains `stopped`.
4. After Facebook reauthentication, complete Meta's separately signed notification and lead-retrieval flow. Do not publish the app or enable campaigns from this staging checklist.
5. Before launch, replace the temporary Google destination and complete production review; the synthetic-only receiver cannot process customer leads.
