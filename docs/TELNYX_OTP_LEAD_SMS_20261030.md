# Telnyx OTP and lead acknowledgement — 30 October 2026

## Verdict

**PASS: scoped code validation and review-branch staging configuration. BLOCKED: live end-to-end delivery and advertising readiness.** Owner approval for the Telnyx/OTP/lead-SMS work was given on 30 October. Another generic approval is not needed to continue that scope. Missing integration evidence and browser availability remain substantive gaps.

The sender supplied by the owner is **07427 851020** (`+447427851020`). The signed-in Telnyx dashboard showed this active mobile assigned to the enabled `FEH Meter Lookup OTP` profile. No Telnyx settings were changed. The Cloud Browser then timed out on a destinations inspection, a troubleshooting request and its reset command. This is a tool-access limitation, not evidence of an account permission denial. UK destination enablement was not established: the profile showed one selected European destination, but its country could not be confirmed.

## Changes

- Preview OTP SMS now validates a six-digit code and committed UK mobile addresses before dispatch, rejects self-sending, uses a ten-second HTTP timeout, refuses redirects and never retries automatically. It accepts only a well-formed outbound SMS response with the expected sender and recipient, an accepted recipient state, no provider errors and a usable message ID. Uncertain responses/errors return a fixed, redacted message requiring Telnyx reconciliation before retry.
- Added a fixed-template acknowledgement adapter using existing Factory 041 dispatch types and controlled-worker composition. It checks matching authorization, adapter, channel and destination; it submits at most once per invocation. The surrounding persisted authorization, prepared attempt, suppression/STOP checkpoint and controlled finalizer remain mandatory.
- The adapter has no route, registry, HTTP transport, secret access or live activation. The existing Meta review gate remains non-executing. Adapter unit tests and an atomic-consumption fixture are not evidence of live, lead-level deduplication.
- SMS submission acceptance is not handset delivery. Keep the provider message reference and reconcile delivery separately.

The acknowledgement copy remains the reviewed version:

> Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from 01332 605506 during business hours.

The Telnyx SMS sender and the telephone callback number are separate. The actual outbound caller ID must match this copy before activation. The supplied mobile does not by itself prove the callback number.

## Isolated Preview configuration

Branch: `work/telnyx-otp-lead-sms-20261030` in `dalbirrahala-byte/free-energy-help-ai-os`, based on main `dacbdbf67427e6d333f2e0a7130276f89073b782`.

Six branch-specific Vercel variables were created, each targeting **Preview only**. They do not change the Enquiry Inbox branch or Production.

| Variable | Verified state |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Exactly `https://vredwhyphrhsudggrsen.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Exact comparison with the enabled staging publishable key; value not disclosed |
| `TELNYX_MESSAGING_FROM` | Matches the owner-supplied Telnyx sender |
| `OTP_PREVIEW_ECHO_CODE` | `false` |
| `OTP_PREVIEW_ALLOWED_PHONES` | Empty; no recipient authorized for this Preview |
| `OTP_PREVIEW_ALLOWED_EMAILS` | Empty |

The existing general Preview Telnyx API-key variable was seen in metadata only; it was not decrypted or rotated. Production variables were not edited. The first environment-creation request returned 400 because the branch did not yet exist, with no variables created. After creating the remote branch at the existing base commit, creation succeeded (six created, zero failed). Individual variable reads confirmed actual values; the list endpoint returned encrypted strings even with its decrypt option.

## Remaining work before a real lead can receive a confirmation

1. Restore Cloud Browser access and verify UK destinations, outbound settings, delivery records and reply/STOP handling in Telnyx. The profile's webhook and failover URL were blank; per-message webhooks can override these, so blank profile fields alone do not prove tracking is unavailable.
2. Choose an owner-controlled test recipient distinct from the sender. Allowlist only that destination, then perform one OTP test and verify both receipt and code expiry/reuse behavior. No test SMS was sent in this work.
3. Establish the real public OTP integration. The CRM route `/verified-meter-lookup-preview` is a test harness, disabled in production, with cookie-based challenges and simulated decision inputs. This patch does not turn it into a production verification service. Production needs a durable challenge/attempt store, server-side rate and bot controls, and integration with the actual public supplier/meter lookup source.
4. Finish the authenticated Meta intake and persisted permission/notice evidence, canonical lead persistence and unique acknowledgement reservation. Reuse the existing ingestion and Factory 041 primitives; do not accept browser-supplied booleans as authority. No live Meta secrets were present in the inspected Vercel metadata.
5. Bind the SMS adapter to an approved execution-worker identity and provider transport, with immediate suppression/STOP and immutable approved template/destination checks. Never use a general browser/Supabase role to bypass the worker boundary.
6. Add authenticated delivery-event reconciliation and duplicate/out-of-order event handling. Prove one acknowledgement for one accepted synthetic enquiry, no duplicate on webhook replay, and no send on suppression/STOP or unknown authorization. Prove caller ID matches the message.
7. Review the complete integration and release only after those tests. Do not infer advertising readiness from the completed Enquiry Inbox tests or this adapter's passing tests.

## Completion Evidence Block

- Scope completed: Telnyx sender/profile inspection, narrow OTP safety fix, dormant acknowledgement adapter, response classification, synthetic tests and isolated Preview branch configuration.
- Created: `frontend/src/lib/execution-dispatch/telnyxAcknowledgementAdapter.ts`, its `.test.ts`, `telnyxSmsResult.ts`, its `.test.ts`, and this document.
- Modified: `frontend/src/lib/verified-meter-lookup/previewOtpDelivery.ts` and its `.test.ts`.
- Deleted: none. Dependencies/package lock unchanged.
- Focused tests: `node --test src/lib/execution-dispatch/telnyxSmsResult.test.ts src/lib/execution-dispatch/telnyxAcknowledgementAdapter.test.ts src/lib/verified-meter-lookup/previewOtpDelivery.test.ts` — **51 passed, 0 failed**. OTP test file rerun after an explicit TypeScript annotation fix: all five tests passed.
- Regression: `node --test --test-reporter=dot src/lib/execution-dispatch/*.test.ts src/lib/verified-meter-lookup/*.test.ts src/lib/lead-gateway/*.test.ts` — **exit 0**, all passed.
- Typecheck: `npm run typecheck` — **exit 0** after correcting test-only inference. Targeted ESLint on all six changed/created TypeScript files — **exit 0**.
- Build: `npm run build` — **exit 0**, 38 static pages generated. Existing Next middleware-to-proxy deprecation and Node module-type/npm proxy-config notices remain; no dependency/config cleanup added.
- Diff check: `git diff --check` — clean. All test providers were mocked; tests used reserved synthetic telephone numbers.
- Git: separate review branch; no merge. Commit/push/remote Preview result are recorded in the accompanying pull request and final work report, rather than treating a local build as a remote deployment.
- Database/migrations: no schema changes, migrations or customer records written in this Telnyx phase.
- External systems: authenticated read-only Telnyx inspection; GitHub branch/code review work; six branch-scoped Vercel Preview environment variables; Supabase staging publishable-key comparison.
- Credentials: existing staging client publishable key read/compared internally only. No Telnyx API key, password or service-role credential read, exposed or rotated.
- Production/customer data: no production changes, customer sends or ad activation.
- Outstanding risk: the lead-level send reservation, approved live worker/transport, production OTP storage and real delivery/STOP/caller-ID evidence are not complete. No claim of production readiness.

## Provider references

Checked 30 October 2026 against Telnyx-maintained documentation:

- [Messaging API request/response fields](https://github.com/team-telnyx/ai/blob/main/skills/telnyx-messaging-curl/references/api-details.md)
- [Messaging events, signatures and delivery states](https://github.com/team-telnyx/knowledge-base/blob/main/wiki/dev-docs/telnyx-messaging-3--part-3.md)
- [Messaging profile destinations](https://support.telnyx.com/en/articles/3562059-setting-up-a-messaging-profile)

The response classifier deliberately treats every non-2xx/malformed/ambiguous provider response as indeterminate. It does not assume provider-level idempotency or permission to retry a CREATE request.
