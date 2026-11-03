# Google form validation and expiring staging test window — 3 November 2026

Owner request `5ba4f856-acd7-4c30-abda-cd1ebde379e0` supplied Google's instruction to send test data before saving the webhook. The previous instruction to Apply before testing was premature. The owner is now using their own Chrome browser; its unsaved form is not shared with Cloud Browser. Do not infer an empty owner draft from the separate cloud draft. A fresh cloud read of the persisted asset still showed no webhook URL/key, with the original email notification retained. No permanent save is claimed.

## Narrow implementation

The existing Google-only staging receiver now requires a canonical UTC start and expiry, at most **15 minutes apart**, in addition to its existing enabled flag, private key, staging project, form/campaign and owner-test scope. Missing, malformed, future-start, expired, reversed or excessive intervals fail closed. These settings are `FEH_GOOGLE_RECEIVER_TEST_STARTED_AT` and `FEH_GOOGLE_RECEIVER_TEST_EXPIRES_AT`; they are non-credential controls.

The time check runs on each request and again after reading its body. A warm instance or cold start cannot renew the fixed deadline. Existing restricted database construction also uses the shared readiness check. The timeout stops admitting new requests; it does not cancel an already admitted database transaction. The environment flag itself is not automatically rewritten to false: restore it after the owner test. No worker/provider transport, sending authority, STOP release, consent inference or retries were added.

Existing legacy and Meta expiry controls were inspected. Their settings and handlers are unchanged; the Google-only route keeps separate scope and switches. Restricted database identity expiry on 6 November remains authoritative and has not been extended.

## Validation and deployment

- Clean preflight: local `1d8fa9e83a2530ba3d5c65d6be54a801e86c99a6`, remote `186557da3f365e393d12de8f382fea544985b369`, identical tree `2ec5c89f84167e781b32cbcc4cd3a62800be6cd1`. Root/frontend AGENTS and applicable engineering/environment documentation read; no concurrent source changes found.
- Focused receiver/PostgreSQL tests: **68/68 PASS**. New coverage proves exact time boundaries, malformed/excessive windows, warm/cold expiry and body-streaming expiry without opening ingestion.
- Full acknowledgement suite: **796/796 PASS** (includes the focused tests; do not sum them).
- `npm run typecheck`: PASS. Targeted ESLint on the four changed frontend files: no errors. Root build script was outside ESLint's base path and ignored; its `node --check` and both artifact-manifest checks passed instead.
- Next production build not rerun: no Next route, UI, dependency or configuration changed; the deployed Edge artifact was rebuilt and validated directly.
- Nine-file artifact SHA-256: `78959b0993928a31b979bf6be202c074eefb28f3e4b7b9edb3bd880d0dac3961`.
- Only `lib/googleReceiverConfiguration.server.mjs`, `lib/googleReceiver.server.mjs` and `index.ts` differ from the retrieved deployed artifact. The other six files exactly match.
- Deployed only `feh-google-lead-intake` in staging `vredwhyphrhsudggrsen`, existing function ID `ba5b9c42-952b-4711-814c-7a9aa700815a`. Code identifier **10**, bundle `decb1af8e7eeb17e0e19c3c8530585d38c8d8e870029e9a9e893662cf684e680`; all nine retrieved deployed files matched the generated artifact exactly. Existing own-key authentication and `verify_jwt=false` were preserved under retained staging deployment/test approval.
- Before configuration, hosted GET/empty POST each returned **404**.
- At **01:01:06 UTC**, saved enabled=true with an explicitly expired interval `2026-11-02T00:00:00.000Z`–`2026-11-02T00:15:00.000Z`. Hosted GET/empty POST each still returned **404**, proving that enabled=true cannot bypass expiry. These calls contained no provider key or lead payload.
- Readbacks at **00:56:15** and **01:01:38 UTC**: latest control STOP, active execution grants **0**, approved adapters **0**, unconsumed authorised records **0**, reservations **2**, attempts **2**.
- After the expired-window check, Google configuration **11**, same code identifier 10/bundle; legacy configuration **29**, unchanged code16/bundle. Legacy and Meta intake false digests were verified. No production or database schema changes occurred.

## Owner-browser handoff

After publishing this evidence, configure one current interval of at most 15 minutes for the existing owner/fictional test. Record its exact start/expiry and hosted readiness responses in PR115. The owner should click **Send test data once** in the populated local form, wait for success, preserve the selected owner email, then Apply. If Google returns an error, keep the draft and report only the error text. Do not generate another key, remove email delivery or enable campaigns. No further SMS is authorised.

After the reply, correlate the provider request/audit, verify persisted webhook plus owner email from a fresh read, and restore `FEH_GOOGLE_RECEIVER_ENABLED=false`. If the owner does not respond before expiry, the route fails closed automatically. A new interval requires a fresh operational decision within the retained bounded test scope; never silently extend an active window. Google's fixed fixture remains intake-only and does not prove an ordinary Google-to-SMS journey.

## Completion Evidence Block

- **Scope:** diagnosed the missing UI test prerequisite; implemented and verified a bounded Google-only staging window; prepared the owner-browser validation sequence.
- **Created:** this report. **Modified:** `googleReceiverConfiguration.server.ts`, `googleReceiver.server.ts`, `googleReceiver.test.mjs`, `googleReceiver.database.test.mjs`, `scripts/build-google-receiver.mjs`. **Deleted:** none.
- **Tests/typecheck/lint/build:** exact results above; documentation/diff whitespace checked before commit. No new real SMS or valid-key provider test performed in this increment.
- **Git:** exact six-file commit and normal expected-head publication to draft PR115; resulting hashes in PR record. Preserve accepted checkpoint and unrelated files. No merge, force push or baseline adjustment.
- **Deployment/migration:** Google staging artifact installed and matched; no SQL migration, production or manual Vercel deployment. Branch Preview/CI status after publication not yet checked.
- **External systems:** Supabase staging code deployment and non-credential configuration; read-only aggregate controls; Google saved-form UI; GitHub draft branch/PR; official documentation. No advertising activation/spend/outreach.
- **Credentials:** no private values read, changed, printed or placed in the report. Existing key and restricted logins remain in platform environment; test probes used no credentials.
- **Runtime at this evidence checkpoint:** receiving closed by expired interval despite enabled flag; sending STOP unchanged with zero active authority. A subsequent bounded owner window must be explicitly recorded in PR115 and restored to disabled after the reply.
- **Remaining gates:** local Google test/save and persistent email/webhook readback, ordinary reservation/replay proof, Preview key alignment and credential renewal, automatic attributable authority/invocation, signed delivery/customer STOP handling, five staging acceptance groups and protected-path review. No advertising launch readiness is claimed.

## 08:05 UK follow-up — Completion Evidence Block

The interval from 01:04:02.993 through 01:19:02.993 UTC expired. The Google receiver log contained exactly two requests in that interval, matching our documented readiness probes (one GET 405 and one POST 403). There was no HTTP 200. The staging audit recorded zero duplicate events for fictional lead 6 during the interval. Its latest duplicate was 2 November at 19:56:07.579899 UTC.

A fresh read of Google asset 402325113451 under account 553-034-0666 showed a blank webhook URL and empty key. The owner email notification was selected and the account showed no ads running. This read reflects the saved asset. The owner's local draft is separate.

At 08:04:26 UTC staging showed STOP, zero active grants, zero approved adapters, zero unconsumed authorised records, two total reservations and two total attempts. Lead 6 had zero reservations. At 08:05:12 UTC we restored `FEH_GOOGLE_RECEIVER_ENABLED=false` and verified its digest. Hosted GET and empty POST both returned 404. Final configuration revisions were Google 13 and legacy 31. The receiver code was unchanged.

Code-head `3080e30ba70f568ed1e1c2bb3a631532676c01c5` passed Navigation (41557287228), Engineering (41557287090) and Vercel status. Factory 041 (41557287084) passed its focused tests, execution-dispatch tests, typecheck and lint. Its only failed step was the protected migration/application-security comparison against the accepted checkpoint. That comparison remains pending review.

Only this evidence file was edited. The local tree was clean before the check at `75652d2522e36cfa3faba8f632629bce29ab7d80`, with the previously reconciled code-head tree `b4bb71f22e1e7ffb8e2fec8f089297f974ea5197`. The evidence commit and normal expected-head publication are identified in draft PR115. Validation for the documentation change was the staged diff and whitespace check. No code build or migration was required. No credential values, real SMS or production systems were involved. The next gate is a new bounded window when the owner has their populated local form open and **Send test data** available, followed by a successful provider test, Apply, and independent readback of both webhook and email delivery.
