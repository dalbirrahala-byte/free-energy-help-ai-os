# Staging delivery-receipt increment — 2 November 2026

**PASS for the five-enquiry repair and the new tested delivery-receipt foundation. Advertising launch remains BLOCKED by permanent intake, automatic authority/invocation, STOP handling and acceptance work.**

This continues Dalbir's request `14aaea14-6e62-42d6-a65e-271cf87f5578` within retained bounded staging implementation/testing/publication approvals. No new provider send, execution authority, STOP release, production change or advertising activation was performed.

## Completed and installed

The preceding [follow-up repair](FOLLOW_UP_REPAIR_RESULT_2026-11-02.md) is installed and verified: all five known staging test enquiries have a review action and follow-up flag; new accepted Meta/Google enquiries get those defaults; replays preserve staff edits. Local commit `230b6e7381110e15e3f5bac057c5c2311197054e`, published commit `3357cf1baca85d2dddc822bf4e0f6c82d032853e`, matching tree `216ef11c04f051119e63c9cddef7aeabd3827072`.

The new delivery handler verifies the exact signed raw bytes using the existing Ed25519 verifier, then validates event/message identity, the pinned messaging profile, fixed FEH sender, single configured staging recipient, event/status pairing and time. Only outbound SMS delivery events are accepted. Inbound STOP/START is rejected; this change does not invent an opt-out or resubscription policy.

The new receipt writer reuses the persisted Factory041 dispatch attempt, consumed authorization, claimed acknowledgement, contact and original destination commitment. It requires one unambiguous provider message match. Unknown messages, ambiguous matches and changed destinations cannot be accepted by matching the telephone alone. No attempt, authorization, claim or execution result is modified.

The dedicated receipt table was added only after searching existing receipt/webhook models and finding no durable SMS delivery-event store. It records event/message/profile identifiers, timestamps, attempt identity and delivery status; it contains no message text, phone number, headers, signature or provider URL. A primary key deduplicates provider events; a repeated identical event returns `duplicate`, whereas changed evidence under the same event ID returns `conflict`. Receipt and attributable provider-event audit are atomic. Separate delayed or contradictory events are retained, not used to overwrite a current delivery projection or authorize retry.

Receipt evidence can arrive after emergency STOP, expiry or grant revocation. Recording such historical evidence does not reopen sending. `succeeded` still means provider acceptance; a delivery receipt is separate carrier evidence, not a new execution result or a human handset confirmation. An indeterminate attempt stays indeterminate until a separately reviewed reconciliation process resolves it. No provider CREATE retry exists here.

The migration `acknowledgement_delivery_receipts` was applied **only to staging `vredwhyphrhsudggrsen`**. Preflight confirmed no conflicting table/function, required existing relations/verifier present, and closed sending controls. Local full-migration PostgreSQL tests provided equivalent migration validation. Installed function-body MD5 `1dc45fd826e64d0e5aa7a2b38b4b8123` matches the reviewed local source. RLS is enabled; all eight existing app/runtime roles tested have neither table access nor writer execution permission, including `service_role`. No callback role, route, credential or provider configuration was added.

Post-install verification: a synthetic unknown-message probe returned `unmatched`; stored receipts **0**; reservations **2**; attempts **2**; active grants **0**; approved adapters **0**; latest emergency event **STOP**. The earlier five repairs still have their five attributable audits. No existing contact values or private provider response were retrieved. Security advisors show the same 2/3/5/1 pre-existing warning counts and one expected additional INFO for the deliberately inaccessible, no-policy receipt table (11 such tables total).

## Verification

- Acknowledgement suite: **728/728**, zero failures/skips. This adds **42** callback boundary tests and **19** real PostgreSQL receipt tests, including a signed callback through the actual SQL writer and replay with one receipt/audit and zero additional mock sends.
- Factory041 suite: **177/177**, zero failures/skips.
- Focused pre-integration run: **98/98**; the three additional integration cases then passed in the full 728 run.
- Typecheck, targeted ESLint and diff whitespace checks: **PASS**.
- No new app route, dependency, framework configuration or imported runtime caller was added, so a local production build was not repeated. No live provider callback test is claimed.
- PGlite executes PostgreSQL invariants in one connection; it does not prove multi-session race timing. The database event primary key provides structural replay uniqueness. A staging concurrent callback test belongs to later activation acceptance.

Official provider references used: [Telnyx webhook envelope, signatures and replay guidance](https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks), [delivery update schema](https://main--telnyxdotcom-docs.netlify.app/api/messaging/delivery-update), and [opt-out behavior](https://developers.telnyx.com/docs/messaging/messages/advanced-opt-in-out). No real callback or account credential was used as a fixture.

## Google and remaining acceptance work

Fresh Google Ads inspection succeeded without a login block. Account `553-034-0666`, form `402325113451`, campaign `24096131756`: owner email notification remained selected, webhook URL/key remained empty, and the dashboard stated no ads are running. The editor was closed without saving. Earlier official Google lead 6/replay proved the fixed fictional fixture only and created no SMS reservation. There is still **no permanent Google-to-SMS connection**.

The remaining Google limitation is implementation/scope, not a missing password: the public staging receiver accepts only Google's fixed fictional test payload, while the protected Preview path accepts only the separately configured owner test phone. The public receiver and database identity have a finite test lifetime. Saving that temporary closed receiver as a permanent destination would not meet the requested journey. The owner email must remain selected when the reviewed permanent connection is eventually saved and rechecked; no duplicate email sending service is needed.

Remaining gates, without redoing the delivered Meta test:

1. Review and implement the permanent Google receiver's identity/lifetime and exact lead scope, then configure it alongside the retained owner email and prove provider acceptance/replay while the campaign stays paused. Do not silently broaden the test receiver or drop its expiry.
2. Complete persisted, attributable routine acknowledgement authorization and durable worker invocation. Existing test-case approval/consumed authorization must not be reused; unknown contact permission cannot become approval.
3. Add the reviewed callback route and dedicated least-privilege writer/profile configuration, request deadlines and operational monitoring. This migration does not grant a caller or activate provider callbacks. Correlation that arrives before message identity persistence remains unacknowledged for receipt retry/manual reconciliation, never a new send.
4. Decide and implement inbound STOP suppression scope through existing suppression primitives, with no automatic START reauthorization or emergency RELEASE. This is a policy decision separate from recording outbound delivery evidence.
5. Complete authenticated Inbox/access acceptance and protected-path review. The accepted checkpoint remains `1d2151f1d7d624ce77d06a98dd24f32b6e74461c`. There are now **16** protected paths: the [previous 14-path packet](ADVERTISING_MORNING_HANDOFF_2026-11-02.md) plus the two 2 November migrations. No checkpoint was changed to make CI green.

Prior repair head `3357cf1baca85d2dddc822bf4e0f6c82d032853e`: Vercel reported deployment complete; CRM Navigation Guard `41443275497` and FEH Loop Engineering `41443275490` passed. Factory041 `41443275484` passed tests, typecheck and lint, failing only the protected-path acceptance checkpoint. Results for this subsequent receipt commit must be recorded separately; they are not inferred from that earlier run.

## Completion Evidence Block

- Scope completed: exact five-test repair/prevention checkpoint published; signed delivery-event validation, durable correlated receipt/audit persistence and replay/uncertainty protections implemented, tested and storage installed in staging with no runtime access.
- Created: `frontend/src/lib/execution-dispatch/telnyxDeliveryCallback.server.ts`; `frontend/src/lib/execution-dispatch/telnyxDeliveryCallback.test.mjs`; `supabase/migrations/20261102122054_acknowledgement_delivery_receipts.sql`; this report. Modified: `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs`. Deleted: none.
- Tests: 728/728 acknowledgement; 177/177 Factory041; typecheck PASS; targeted lint PASS; diff check PASS. Build not repeated for the dormant handler, for reasons above.
- Git: narrow expected-head publication to draft PR115 from local `230b6e7381110e15e3f5bac057c5c2311197054e` / remote `3357cf1baca85d2dddc822bf4e0f6c82d032853e`, initially matching tree and clean local state. Final publication hashes/tree/clean state are recorded in the PR. No unrelated changes, reset, force push or merge.
- Deployment/migration: receipt storage/writer installed and verified in staging. App callback remains unwired; receiver switches, function configuration, credentials, grants and STOP unchanged. Production excluded. Recovery is to retain evidence and revoke a future writer before removing a route, never erase send/receipt history.
- External systems: GitHub branch/PR publication and read-only checks; Google Ads read-only inspection; Supabase staging migration and non-sensitive verification; official Telnyx documentation. Credentials accessed: **no**. Production/customer data changed: **no**. The five known staging test follow-up records are the only existing lead rows modified in this run.
- Remaining risk/gate: permanent Google delivery, routine authority/invocation, callback activation and STOP policy, authenticated acceptance and protected review. Advertising remains paused; no additional real SMS is authorized by this work.
