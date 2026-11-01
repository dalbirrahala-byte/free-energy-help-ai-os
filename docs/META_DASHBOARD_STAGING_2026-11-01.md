# Meta dashboard notification staging proof — 1 November 2026

**PASS: Facebook verification, callback verification, signed dashboard notification and replay. Real-form lead retrieval remains unproven; advertising launch is NOT READY.**

Facebook reauthentication for Dalbir Rahala completed. The existing app signing secret was read privately, without resetting it, and saved in the staging Edge secret store. A new private callback verification token was generated and saved there. Neither value is in Git, screenshots or this report. No Page access token was generated or retrieved.

## Verified result

- App: `Free Energy Help CRM Leads`, `1121337167194437`; remains unpublished.
- Page-object callback: `https://vredwhyphrhsudggrsen.supabase.co/functions/v1/feh-staging-lead-intake/meta`. Meta accepted the GET verification; saved callback URL and masked verification token were inspected.
- App's Page `leadgen` webhook field: **Subscribed**, API `v26.0`; other fields were not enabled. This is the app-level field subscription, not proof that the real FEH Page has installed/subscribed the app.
- Meta's own **Send to server v26.0** action reported **Successfully tested** twice after the runtime fix below.
- Dashboard sample uses Page/form/lead ID `444444444444`, not the real FEH Page/form. The receiver authenticates the original bytes using HMAC-SHA256 and accepts only these independently pinned fictional IDs.
- The first successful event created staging record **9** with durable ID `meta_dashboard_1121337167194437_444444444444`. Repeating the identical provider test left **one record, one accepted audit and one duplicate audit**.
- This record is explicitly labelled **Meta dashboard test (notification only)**, uses reserved fictional email `meta-webhook-test@example.invalid`, has no telephone and has unknown consent. It does not claim that Meta returned customer details.
- **Zero SMS reservations** for the fixture. Total SMS attempts remained **one**, from the earlier owner-controlled SMS milestone. Emergency STOP remained **stopped**. No new grants, authority or worker dispatch were created.

## Runtime and permissions

Existing staging project `vredwhyphrhsudggrsen` only. Existing Edge Function `feh-staging-lead-intake`, ID `fe0cf53b-36da-4131-b3a0-1b44c29098d1`, now **version 6 ACTIVE**. Final generated artifact SHA-256: `d1778909124c04efcdb46f505ff57c9601c196d640f4fc94e654883272797b19`; Supabase bundle SHA-256: `c93131656adad8491d34e9a7281981908429c059177ad1fe9bd643561b114435`.

The eight-file artifact retains the existing restricted receiver database identity and exact RPC allowlist. No new database role, membership, schema or grant is added. GET authenticates the private verification token; POST authenticates the raw body before any database access. Unknown paths, unsupported methods, missing/invalid secrets, incorrect scope, expired configuration and production project selection fail closed. No Graph API transport, Page token, SMS adapter, worker route or scheduler is included.

Six Meta settings were saved: signing secret, verification token, dashboard-test flag and three fictional sample IDs. The two saved secret digests were compared privately against the intended values. The generated wrapper reads only an explicit environment allowlist and does not read Supabase's injected administrator secrets. The receiver and database credential remain bounded to **6 November 2026, 23:59:59 UTC**.

The first POST against version 5 failed with `Buffer is not defined` before persistence. The fix imports `Buffer` explicitly from `node:buffer`, as required in the Edge runtime. A regression test removes Node's global Buffer and proves signature verification still works. Version 6 then passed actual Meta-originated delivery and replay. The initial failure was not counted as a successful intake.

## What is still needed before advertising

1. Obtain and verify a least-privilege Page token, actual FEH Page subscription, lead access and retrieval for Page `100693684801233` / form `1788543365401126`.
2. Complete Meta's publication requirements using the approved business privacy and deletion policies. Meta's dashboard states unpublished apps receive dashboard tests only, including when the sender is an app admin/developer/tester. Publication is a separate owner launch decision; it was not performed here.
3. Prove a real-form test enquiry's details reach the CRM through Graph retrieval, then the approved acknowledgement workflow, with no second reservation or SMS on replay. The dashboard fixture is a transport/receipt test, not that full proof.
4. Finish the persistent Google delivery configuration and reviewed production receiver. The earlier Google test passed, but original owner email-only delivery was restored and the temporary webhook removed; this remains unchanged.
5. Resolve the existing Factory 041 accepted-checkpoint drift gate and review live consent/authorisation, provider delivery/STOP callbacks and controlled automatic worker scheduling. No gate was rebaselined or bypassed.

## Completion Evidence Block

- Scope completed: cleared Facebook reauthentication, securely provisioned staging signing/verification settings, verified Meta callback, enabled only app-level Page leadgen subscription, proved official dashboard delivery and replay, preserved the SMS stop.
- Created: `frontend/src/lib/lead-gateway/metaWebhookTest.server.ts`, `frontend/src/lib/lead-gateway/metaWebhookTest.test.mjs`, this report.
- Modified: `frontend/src/lib/lead-gateway/intakeReceiver.server.ts`, `scripts/build-intake-receiver.mjs`, `docs/GOOGLE_META_INTAKE_STAGING_2026-11-01.md`. Deleted: none.
- Tests: focused Meta/Google handler suite **58 passed, 0 failed**; full relevant gateway, authorisation, dispatch, identity, suppression, compliance and outreach regression suite **1,060 passed, 0 failed, 0 skipped**. Includes missing/wrong HMAC, byte tampering, wrong scope, missing/duplicate verification parameters, malformed/oversized body, production isolation, expiry, forbidden methods, retryable database failures and the Edge Buffer regression.
- Typecheck: PASS. Targeted ESLint: PASS. Whitespace/diff check: PASS.
- Build/runtime: eight-file generator PASS; Deno check PASS using the identical installed postgres 4.0.0 source; hosted bundling and actual Meta delivery/replay PASS. Next.js build not rerun because no Next page, route, dependency or bundler configuration changed.
- Git: changes prepared on the existing `work/telnyx-otp-lead-sms-20261030` review branch for normal expected-head publication to draft PR #115. Final commit/tree and clean status are recorded in that PR. No merge, force push or history rewrite.
- Deployment/migration: existing staging function updated to v6; no migration executed; production CRM/database deployment unchanged. Review-branch publication may trigger a separate Vercel Preview; the verified runtime here is the Supabase function.
- External systems: Meta app's staging callback and leadgen field subscription saved and synthetic test notifications sent; Supabase staging secrets/function/fictional receipt changed; GitHub draft review branch only. Google Ads and Telnyx were not changed in this increment.
- Credentials accessed: yes, existing Meta app signing secret and new verification token, privately saved to staging; no Page access token, production database credential or SMS provider credential retrieved. No credential value appears in this report/source.
- Production/customer data touched: no production CRM/database writes or customer details processed. The unpublished Meta app's notification configuration was changed. No advertising activated and no SMS sent.
- Remaining risks: dashboard-only/expiring receiver is deliberately unsuitable for customer intake; actual Page subscription, Graph retrieval, publication requirements and production launch remain unfinished. Existing Supabase advisory findings and Factory 041 drift remain outside this increment.
- Recommended next gate: complete the real FEH Page/form access and a concrete production launch configuration for owner review. Keep advertising paused and SMS STOP engaged.

## Manual checks

In Meta's Page webhooks settings, confirm the exact staging callback and `leadgen` subscribed at v26.0. Within the bounded test window, its Test action should report success. A repeated dashboard sample must preserve the single synthetic receipt and add only duplicate audit evidence. Confirm zero acknowledgement reservations for that receipt and STOP stopped. Do not use this endpoint for real customers or interpret the dummy sample IDs as successful Graph retrieval.
