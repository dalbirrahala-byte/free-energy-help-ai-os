# SMS callback implementation — 5 November 2026

## Result and exact scope

**PASS for the local callback implementation and regression checks. Overall advertising acceptance remains pending.** This increment connects authenticated customer STOP and delivery events to the existing Factory041 controls. It does not complete automatic enquiry authorisation or approve advertising.

Baseline: PR115 head `b095f62d6d7def99b68a4178d2c05e1816bbb79d`, tree `7278e9f4a1273de196fc4a96baf59c429bed8609`. The prior local `ec5fa1a` had the identical tree and no dirty files. It was preserved; a new work branch was created from the fetched remote head. Dominic's GitHub APPROVED review is recorded at 15:48:25 UTC on 5 November. The fresh metadata read shows the PR is now open **and no longer a draft**; this session did not change that setting. The approval predates this callback change and does not establish acceptance of this new diff or all five staging groups.

## What changed

- Added the disabled-by-default Preview endpoint `/api/lead-acknowledgements/callback`. It verifies the raw Ed25519 signature before opening a database connection and checks the exact staging project, messaging profile and test handset.
- Added a separate callback-only database identity and a single scoped RPC. It cannot read the queue, alter arbitrary suppression records, ingest leads, create execution authority, dispatch messages, or operate global STOP/RELEASE. The migration creates it **NOLOGIN**, without a password; its server-side profile/handset binding is empty. Installation alone therefore activates nothing.
- Authenticated STOP, STOPALL, STOP ALL, UNSUBSCRIBE, CANCEL, END and QUIT, plus Telnyx-classified opt-outs, record permanent SMS suppressions through the existing `suppression_records` system. UK national, +44 and 0044 variants are covered without changing the evaluator's established identifier-matching semantics.
- Provider event/message identity, suppression writes and audit commit together. Replay and worker restart do not create extra effects. START/UNSTOP is recorded as requiring review and cannot restore permission, end suppression, release STOP or send a reply.
- Delivery events use the existing durable receipt/attempt correlation; the scoped wrapper independently rechecks profile and destination. Late/conflicting/uncertain results remain evidence, not permission to retry a send or claim handset delivery.
- Fixed live suppression effective-date evaluation to use the current clock. A transaction that began before a newly effective opt-out must not treat that opt-out as future-dated at the final sending checkpoint. Existing ACL, matching and expiry semantics otherwise remain intact.

No raw inbound text, provider headers, keys or request URLs are retained. The customer-reply ledger contains only identities, timestamps, classification, the telephone needed to bind the opt-out and suppression references. Ordinary authenticated non-keyword messages are ignored by this specialised endpoint, not converted into customer enquiries or consent. This is not a conversational SMS inbox.

## Verification

All fixtures and signing keys were synthetic, local, and isolated from hosted Supabase/Telnyx. The real PostgreSQL/WASM tests execute the repository migration chain and the restricted callback RPC, then exercise the existing worker checkpoints and a mock provider transport.

| Check | Result |
| --- | --- |
| `npm run test:lead-acknowledgement` | PASS, 865/865; includes new signed STOP integration and existing Meta/Google intake/dispatch regressions |
| `npm run test:execution-dispatch` | PASS, 718/718; overlaps acknowledgement suite, not an additional independent 718 scenarios |
| `npm run test:factory-041` | PASS, 177/177 |
| `npm run test:auth` | PASS, 33/33 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 0 errors and 52 existing warnings in unrelated code |
| `npm run build` | PASS; new callback route included |
| Built route local HTTP smoke | PASS: POST to `http://127.0.0.1:3121/api/lead-acknowledgements/callback` with database flag closed returned 404, no-store, redacted body |
| `git diff --check` | PASS |

New coverage proves: queued SMS blocked; future contacts and phone variants blocked; STOP after dispatch preparation prevents the final mock invocation; global STOP remains stopped; START cannot restore; event/message replay and handler restart are harmless; audit failure rolls back both opt-out and receipt and a receipt retry succeeds once; wrong profile/destination, invalid signature, stale signatures, oversized body and wrong runtime are rejected; missing coordination lock fails closed; callback role cannot acquire sending/approval/raw-table access; scoped delivery writes one receipt. The initial focused run exposed an incorrect test expectation (`already_claimed` versus the worker's stricter `blocked` result after suppression); the assertion was corrected and now additionally verifies durable attempt preservation. The initial TypeScript closure-narrowing error was corrected before the successful checks above.

PGlite has one connection. These tests do **not** prove hosted multi-session races. The clock regression proves fresh time evaluation, not a real two-session concurrency run. STOP cannot retract a provider request already submitted before the final checkpoint.

## Hosted state and activation gate

Migration constructed: `supabase/migrations/20261105160318_acknowledgement_customer_stop_callback.sql`, SHA256 `a61624464fce3e70a1f1f0b80fc713369cc1e9c8479c8147cfa71046e4c319aa`. It has **not been applied** to staging or production. The Supabase CLI was unavailable locally; the file was constructed directly and verified by applying the complete chain only in isolated PGlite. No remote migration command was run.

No hosted callback credential, binding, LOGIN, flag or provider webhook configuration was installed or enabled. No new SMS was sent. No STOP/RELEASE operation was performed on hosted systems. Previously recorded closed staging controls were preserved by making no hosted changes; they were not freshly queried in this increment. Normal branch publication may create a Vercel Preview build, which is not callback activation. Exact publication/deployment observations are recorded in the publication evidence below or final handoff.

Before bounded hosted callback acceptance: review this new protected diff; approve/apply this exact migration in `vredwhyphrhsudggrsen`; securely provision only the callback identity; bind the exact profile and synthetic/owner handset; enable the callback flag only for the bounded test; prove provider reachability without weakening CRM access or exposing credentials. Vercel deployment authentication is still present and must be resolved as an explicit callback-ingress design, not bypassed with an ad hoc secret in a logged provider URL. Sending STOP need not be released for callback acceptance. Restore the receive-only test configuration afterwards and retain suppression/audit evidence.

## Remaining work in priority order

1. **Automatic authorisation:** implement durable, genuine form-permission provenance and the owner-approved standing rule feeding the existing Factory041 intent/compliance/approval/single-use authority primitives. Current saved review `feh-ack-permission-review-v1` is `fictional_staging_test_only`; the six fictional yes/no/not-sure records are not customer permission or live sending authority. Existing intake still holds consent unknown and the worker requires pre-existing per-enquiry authority. Do not promote fixtures, phone presence or consumed owner-test approvals into live authorisation. Implementing this belongs to the implementation agent, not to Dalbir manually creating per-lead approvals.
2. **Durable automatic invocation/recovery:** connect the authorisation result to the bounded worker, retaining durable attempt identity and no blind resend after an unknown result. Existing dormant invocation code is not a running scheduler.
3. **Hosted acceptance:** install/review the concrete staging delta and run the five groups in the completion contract, including genuine multi-session overlap, authenticated Inbox access and callback reachability. Preserve Google owner-email delivery and paused campaigns. Receipt-before-provider-ID still produces a retryable receipt response, not a false acknowledgement; bounded provider retries and reconciliation need hosted evidence.
4. **Final release:** protected-path acceptance on the resulting exact head plus the explicit production/launch packet. Never change the accepted checkpoint solely to clear CI. No Google/Telnyx approval countdown has been established by this work.

No further blanket approval is needed to construct the remaining dormant implementation. Deployment, callback credentials/configuration, standing-rule adoption and eventual production/ad activation remain distinct concrete gates. Earlier Meta handset proof and Google queue proof are preserved, not repeated or relabelled as complete automatic SMS acceptance.

## Completion Evidence Block

- Scope completed: unified receive-only STOP/delivery callback construction, existing suppression integration, current-time checkpoint correction, isolated end-to-end and regression verification.
- Created: this evidence file; `frontend/src/app/api/lead-acknowledgements/callback/route.ts`; `frontend/src/lib/lead-gateway/acknowledgementCallback.server.ts`; `frontend/src/lib/lead-gateway/acknowledgementCallback.test.mjs`; the migration named above.
- Modified: `frontend/src/lib/execution-dispatch/telnyxDeliveryCallback.server.ts`; `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs`; `frontend/src/lib/lead-gateway/previewDatabase.server.ts`; `frontend/src/lib/lead-gateway/previewDatabase.test.mjs`; `frontend/src/lib/lead-gateway/previewIntakePath.ts`; completion-contract evidence pointer. Deleted: none.
- Tests/typecheck/lint/build: exact results above. The first cross-command localhost smoke attempt could not reach its separate server session; a single-process server/request smoke passed and the server was terminated.
- Git: narrow new work branch based on current fetched PR115 head; no unrelated changes overwritten, no reset or force push. Commit/publication subject to expected-head validation; final hashes recorded with publication.
- Deployment/migration: no remote migration or activation performed. Normal review-branch Preview publication only, if built by existing integration; production excluded.
- External systems: GitHub read/approved review-branch publication and official Supabase/Telnyx documentation. No hosted database/provider mutation, outreach, ad activation or spend.
- Credentials accessed: no real provider/database credentials; ephemeral local signing keys only. Production/customer data touched: no. Existing real send not repeated.
- Remaining risks: hosted concurrency and provider reachability unproven; current single-handset restriction is deliberate; automatic authority and durable invocation still unfinished; actual callback-before-ID reconciliation needs acceptance evidence.
- Recommended next gate: finish automatic permission/standing-rule authorisation construction, then review the complete bounded staging installation/test packet. Not a production launch approval.

Official sources inspected: [Telnyx callback envelope](https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks), [Telnyx opt-out classifications](https://developers.telnyx.com/docs/messaging/messages/advanced-opt-in-out), [Supabase database functions](https://supabase.com/docs/guides/database/functions), [Supabase changelog](https://supabase.com/changelog).
