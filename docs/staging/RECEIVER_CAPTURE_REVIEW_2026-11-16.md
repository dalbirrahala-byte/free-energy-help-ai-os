# Staging receiver candidate — 16 November 2026

## Scope and result
Consolidates existing November Meta and Google receiver patches from PR #115 into one reviewable candidate. Goal: one synthetic enquiry per channel, one CRM lead, identical replay adds no duplicate, all sending disabled. The saved PR #128 Health Check result remains separate and is not rerun.

Base: 1420ca32a109a6ec376dbe3f49a4fd3344ad1118.
Meta form: 1831927117943843, Page 100693684801233; existing published optional question key feh_sms_ack_v1. Published definition evidence: PR #115 comment 6776715440. Actual enquiry-level Yes/No encoding remains unverified. Missing/unrecognised SMS answers cannot establish authority.
Google pinned test form 402325113451, campaign 24096131756. Current native form settings, retained owner email and secure replacement of the previously exposed webhook key remain unverified.

## Changes
Reuses the Meta source reviewed by Dominic at tree 4b47271ebb2507108d2e37c56e07000e5e9df7ac (PR #115 comment 6775608688).
Includes Google startup and expiry fixes, timestamp review-only routing, calendar validation, scalar permission result checking, and matched dormant recorder SQL with its integration fixture.
Adds a reconciliation expiry recheck and regression so a review-only duplicate cannot begin permission recording after the test window closes. Adds null-time scalar-result and Meta rejection regressions.
No new provider transport, scheduler, grant, migration, STOP release, form or advertising change.

## Local verification
181/181 tests PASS, zero failures/skips: googleReceiver.test.mjs, metaFormStaging.test.mjs, metaWebhookTest.test.mjs, formPermissionCapture.test.mjs.
Node 24.22.1, cleared environment, injected in-memory RPCs; test-only postgres import throws if actual driver construction is attempted. No actual database/provider used. OS-level socket denial was not independently enforced in this run.
Both builders PASS; Google test validates emitted module syntax and resolved local imports.
Meta manifest (15 files): f3177dbc3b4f076178bab596cc4888af531f03c55f9fb0257ca72ccb523056c8.
Google manifest (10 files): b5f3ccb85f20d59af62286ae6c882269381a59239494cc21c90150a6f224e159.
Typecheck/lint/full application build: NOT RUN locally; partial source checkout has no application dependencies.
Database integration fixture: NOT RUN in this execution; source is retained from the existing paired candidate. Dormant SQL is not installed by publishing this PR.
No Factory 041 files changed or protections bypassed. CI and independent review remain gates.

## Hosted preflight — read only
Target vredwhyphrhsudggrsen only.
Meta installed v35: 0149447052fa48ce0bc78f7509351d88f86c485bf41e9d312e9ff731e2e6594c.
Google installed v17: decb1af8e7eeb17e0e19c3c8530585d38c8d8e870029e9a9e893662cf684e680.
Both remain old artifacts.
feh_ack_preview_ingestor and feh_intake_preview_receiver are restricted LOGIN roles with password validity ending 2026-11-06 23:59:59 UTC. Their old access cannot support a current positive test.
feh_ack_permission_recorder is NOLOGIN. No usable scoped permission runtime was established.
Bindings/rules/permissions: 0/0/0. Latest control event STOP. Historical dispatch attempts: 2.
No credential values were read or printed.

## Exact remaining staging actions
1. Independently review this exact consolidated commit, particularly new Google deltas and the matched recorder change. The previous Meta review applies only to its recorded source.
2. Prepare and approve the bounded staging configuration delta: renew only restricted intake access for an at-most-15-minute synthetic window; establish a reviewed restricted permission-recording identity and form binding if testing the November Meta permission route. No worker, authorizer or sending authority.
3. Keep STOP, providers/workers/automatic SMS disabled. Do not configure a provider-capable SMS runtime. Preserve Vercel SSO and CRM MFA.
4. Deploy only reviewed receiver bundles to staging, verify installed artifact identity, then verify runtime authentication. Do not apply the dormant SQL merely because it is in this review.
5. Verify exact Meta synthetic lead ID/form/phone and Google form/campaign/key; preserve Google owner email. Do not reuse the exposed Google key.
6. Submit one synthetic enquiry and replay the same provider identity per channel. Read back scoped staging records, source/business answers/manual-follow-up defaults, lead/reservation counts and unchanged dispatch attempts.
7. Save capture-only results independently of the five automatic-SMS acceptance groups. No hosted end-to-end PASS exists yet.

## Completion evidence
Files modified: the receiver/permission source, focused tests, Meta builder, dormant SQL draft; this report added. No files deleted.
Local Git: isolated source reconstruction on review/staging-receivers-20261116; base blobs verified against GitHub before changes. No unrelated work overwritten.
Publication is review-only under the retained narrow review-branch authority in ADVERTISING_COMPLETION_CONTRACT_2026-11-02.md.
Remote deployment/migration: NOT RUN. External mutations limited to review publication.
Credentials accessed: no. Production/customer records touched: no. Real messages sent: none.
