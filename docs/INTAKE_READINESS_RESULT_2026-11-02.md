# Readiness diagnostics and Google inspection — 2 November 2026

PASS for the bounded readiness implementation and local validation. Permanent Google delivery and routine automatic SMS remain incomplete.

## Google configuration observation

Inspected the existing signed-in Google Ads account 553-034-0666, form 402325113451 and campaign 24096131756. Google displayed that none of the ads were running because campaigns/ad groups were paused or removed. The existing owner's email notification appeared in Lead management. Expanding Create webhook showed empty URL/key fields alongside the retained email row. Send test data was disabled. This demonstrates both controls are exposed together, not that a combined configuration has been saved or proved reliable.

Exited the editor without Apply, entering credentials or changing delivery settings. The previously tested receiver remains a restricted, expiring staging destination, not a permanent live customer route. No permanent Google connection or new Google-to-SMS proof is claimed. Completing combined saved delivery remains a separate test; do not point a live campaign at the closed synthetic receiver.

## Readiness defect corrected

The previous route created each connection outside its try block and did not catch verification, candidate lookup or close exceptions. A failure in the ingestor could abort the entire request and prevent any worker diagnostic. A close exception could replace the intended readiness response with an unstructured failure.

The route now delegates to a server-only, testable handler that snapshots configuration, isolates each connection's failures, always attempts cleanup, and continues to the second identity. Unexpected exceptions return a fixed PROBE_UNAVAILABLE reason; cleanup failures mark that connection unavailable, retain any earlier failure reason, and produce HTTP 503. A failed worker connection clears candidate lookup/availability flags. Existing safe verification diagnostics remain supplied by the restricted database adapter.

The only RPC remains `select_lead_acknowledgement_candidate`; the probe cannot claim, authorize, release STOP or dispatch. HTTP 200 means connection/candidate lookup health, not sending permission, delivery proof or advertising readiness. Production/wrong-project/disabled scopes remain 404 before connection creation. No raw errors, candidate IDs, phone numbers or credentials are returned.

## Previous increment verification

For remote commit `7dfbdf0b034f38ead502541801969a280d7b79dd`, CRM Navigation Guard and FEH Loop Engineering succeeded. Factory 041 run `41370136015` passed Factory 041/044/045, authentication and execution-dispatch tests, typecheck and isolated lint; only the existing protected-path checkpoint drift step failed. This evidence applies to that previous commit. Its accepted checkpoint was not changed.

## Completion Evidence Block

- Completed: isolated, redacted connection/candidate readiness checks and 25 new regression tests; direct Google form inspection without saving changes.
- Created: `frontend/src/lib/lead-gateway/intakeReadiness.server.ts`, `frontend/src/lib/lead-gateway/intakeReadiness.test.mjs`, this report. Modified: `frontend/src/app/api/lead-intake/readiness/route.ts`. Deleted: none.
- Tests: focused readiness 25/25; full acknowledgement suite 566/566, zero failures or skips. Includes independent factory/verification/cleanup failures, malformed or multiple candidates, candidate RPC failures, invalid recipient, disabled scope, failed identity and configuration snapshot checks. Synthetic dependencies only; no live database/provider calls.
- Typecheck: PASS. Targeted ESLint: PASS. Full local Next.js production build: PASS, including dynamic readiness route. Diff whitespace check: PASS. Existing npm proxy-config notice and middleware/proxy deprecation are unrelated.
- Architecture/security: reuse existing restricted database adapter and candidate selector; same protected route and staging gates. No new capability, authority writer, scheduler, provider transport, migration or consent policy. Protected route modification remains subject to existing review acceptance.
- Git: initial local `def34040b4447a6beec7fa1cb42063659967b8c3` and remote `7dfbdf0b034f38ead502541801969a280d7b79dd` matched tree `565e4504fe85847bd2272470bbcb0a042d461b99`; local tree initially clean. Publish only these four reviewed files with expected-head normal update. Final hashes and clean-state evidence recorded in PR115/run result. No merge or force push.
- Deployment/migrations: no Supabase deployment, migration or setting change. Review-branch publication may trigger its configured Preview; exact new-head remote build is not inferred from local build success.
- External systems: read Google Ads editor and exit without saving; read GitHub checks/PR and publish the authorized draft branch update. No provider or live database mutations.
- Credentials accessed: none. Production/customer data touched: none; no leads downloaded. No SMS, advertising activation, spend, STOP release, grant or token provisioning.
- Operational state: sending/account settings unchanged by this increment. Last verified STOP state is prior evidence; no fresh live STOP query was performed here.
- Remaining gates: permanent Google webhook/email save and provider test; automatic invocation with persisted authorization; authenticated delivery/STOP callbacks; token lifecycle; protected-path acceptance and final production release decision. Neither a healthy readiness response nor this code publication completes those gates.
- Next action: inspect exact new-head Preview/CI, then continue the dormant invocation work and concrete Google combined-delivery test preparation without reopening general sending.
