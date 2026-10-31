# Bounded staging acknowledgement worker — 31 October 2026

The missing runner now selects one already-authorised enquiry and invokes the existing Factory 041 claim/consume/prepare/precall/finalize pipeline. Local Meta and Google replay tests make one simulated provider call and no second call. **This is not yet a real enquiry-to-handset proof or advertising readiness.**

## Implementation and operating boundary

- `POST /api/lead-acknowledgements/run` is a private machine trigger. It accepts only an empty JSON object, an exact 64-character hexadecimal bearer credential, no query arguments and no browser Origin. GET cannot send. It retains Vercel deployment protection.
- The route requires exact Supabase staging `vredwhyphrhsudggrsen`, Vercel Preview, database enablement, SMS enablement and separate worker enablement. The sender and one allowed test destination come from server configuration. Request data cannot select a lead, destination, approval or message.
- One call selects at most one candidate and invokes the existing worker at most once. There is no loop, automatic retry, cron registration or automatic activation from webhook intake. A scheduler/operator must eventually call this private trigger after persisted authority exists; registering that invoker is not completed here.
- The new read-only `select_lead_acknowledgement_candidate(text)` returns three IDs, never message content, contact data, a credential or an approval. It filters fresh unclaimed Meta/Google reservations against persisted authority, current exact-template approval, active authoriser, contact/destination commitment, compliance, approved adapter, suppression and STOP. It grants no authority and changes no records.
- Selection is deliberately advisory. The existing claim repeats security checks under locks, and the existing final precall checkpoint remains mandatory. Two selectors may see the same candidate; only one can acquire its durable claim. Claimed/ambiguous outcomes are never released for blind retry.
- The dedicated worker can execute the selector; the ingestion role, public application roles, service role and runtime logins without their explicit local role cannot. Raw-table privileges and RLS remain unchanged. SECURITY DEFINER is the established closed-RPC boundary, with empty search path, qualified objects and explicit revocations; no general service-role substitute or browser approval boolean is introduced.
- The HTTP result distinguishes `provider_accepted` from handset delivery, always returns `deliveryConfirmed:false`, and does not emit an automatically retryable response after entering the run. Durable attempts retain the outcome. Errors never include raw SQL, provider bodies, credentials or phone numbers.
- The read-only readiness endpoint now verifies real candidate-RPC access and reports only boolean lookup/availability values. It never claims or sends.

## Staging application and recovery

Migration created with `supabase migration new lead_acknowledgement_worker_candidate`, tested locally, then applied only to staging through the migration tool. Filename was aligned with the actual recorded version **20261031130910**, preserving identical SQL bytes.

- SHA-256: `31f23d130787c3724624e6616bea6d5501dda4acdf984ece7667bfa3c0980776`.
- Applied source MD5: `0fd4381ecd0ebd399006f7bdd3ea701d` (matches local source).
- Post-application: selector exists, worker-only EXECUTE verified, zero candidate/queue/attempt records, execution control still `stopped`.
- Security advisory categories are unchanged from the pre-application baseline; existing notices were not hidden or bypassed.
- Exact Preview branch `work/telnyx-otp-lead-sms-20261030`: `FEH_ACK_WORKER_ENABLED=false`. Existing SMS and provider-ingress flags remain false. No trigger credential was provisioned, because sending is not being activated in this increment.
- Recovery: leave the worker flag false, then revoke only the selector's worker EXECUTE if necessary after sessions drain. Do not drop queue/attempt history, reset claims, grant administrator privileges, clear STOP or resend uncertain provider operations as a recovery action.

## Validation and limits

- Focused HTTP/runner/PostgreSQL tests: **62 passed, 0 failed** after isolating the new selection fixtures from an older disabled-adapter fixture. This was test isolation, not removal of a security check.
- Full relevant dispatch, intake, identity, suppression, compliance, outreach and authorization regression: **981 passed, 0 failed, 0 skipped**. Includes the additional parameterized selector/capability test.
- Typecheck: passed. Targeted ESLint: passed. Next build: passed, including the new machine route and expanded readiness probe. The readiness edit was followed by another typecheck/lint/build.
- Build retains the existing middleware-to-proxy deprecation and npm proxy-config notice; no unrelated framework/config upgrade.
- SQL tests run in isolated PGlite with synthetic contacts and a fake provider. Its single connection exercises overlap through shared persisted state but does not establish real multi-session network concurrency or handset delivery.
- No test uses real customer contact data, a Telnyx credential or a live provider call.
- Factory 041's previously failing accepted-checkpoint drift gate remains intact. It requires reviewed acceptance before merge; local passing tests do not silently update its baseline.

## Remaining real-test requirements

Staging currently contains **zero active authorisers, authorizations, approved acknowledgement adapters and acknowledgement reservations**; its execution control is stopped. A real test needs an attributable, persisted owner-test contact/intent, exact-template approval and permission evidence, current compliance/destination commitment and approved adapter, followed by a separately attributable staging RELEASE. Synthetic fixture authority must never be copied into staging as if it were a human approval.

The private invocation credential and controlled invoker also need provisioning when the approved test is ready. The final proof must capture one accepted provider message ID, actual receipt on the owner-controlled phone, then replay the same provider event and verify no second reservation/attempt/provider call. A timeout remains indeterminate and needs reconciliation. Earlier successful OTP messages do not substitute for this acknowledgement test.

Meta `pages_manage_metadata` is already Ready for testing, verified on 31 October. Provider callback/token/subscription setup and authenticated delivery/STOP handling are separate incomplete integration work. Do not describe those as resolved by the new runner. The app's unpublished-mode restriction and Vercel-protected callback accessibility still need a reviewed solution before real provider intake.

## Completion Evidence Block

- Scope completed: bounded runner, private Preview trigger, restricted read-only candidate RPC, readiness wiring, security/replay tests and staging migration.
- Created: `frontend/src/lib/execution-dispatch/runLeadAcknowledgementOnce.ts`; `frontend/src/lib/lead-gateway/acknowledgementWorker.server.ts`; `frontend/src/lib/lead-gateway/acknowledgementWorker.test.mjs`; `frontend/src/app/api/lead-acknowledgements/run/route.ts`; `supabase/migrations/20261031130910_lead_acknowledgement_worker_candidate.sql`; this report.
- Modified: `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs`; `frontend/src/lib/lead-gateway/previewDatabase.server.ts`; `frontend/src/lib/lead-gateway/previewDatabase.test.mjs`; `frontend/src/lib/lead-gateway/previewIntakePath.ts`; `frontend/src/lib/lead-gateway/providerIngress.test.mjs`; `frontend/src/app/api/lead-intake/readiness/route.ts`.
- Deleted: none. No application dependency changes.
- Tests/typecheck/lint/build: exact results above; no real SMS test claimed.
- Git: existing draft PR #115 and approved review branch; normal expected-head publication only, no force push or merge. Final commit/tree/status and remote Preview proof are recorded in the PR body after publication.
- Database/deployment: one staging migration applied and read back; worker flag false. Preview deployment is verified separately after publication, not inferred from a local build.
- External systems accessed/mutated: Supabase staging selector and ACL; Vercel exact-branch disabled worker flag; GitHub review-branch publication and PR metadata. No advertising configuration changed.
- Credentials accessed: no existing secret values retrieved or exposed; no trigger token generated. Existing server credentials are used only by the deployed restricted readiness check.
- Production/customer data touched: no. No SMS sent, STOP/RELEASE action, authorization grant or adapter approval performed in staging.
- Remaining risks/next gate: persist attributable owner-test authority, review activation and existing security-checkpoint changes, enable a bounded invocation, and obtain actual delivery-plus-replay evidence before advertising. Production remains outside this test scope.
