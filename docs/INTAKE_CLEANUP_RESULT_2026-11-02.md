# Intake cleanup response hardening — 2 November 2026

PASS for local implementation and regression validation. Permanent Google intake and routine automatic SMS dispatch remain unfinished; this is not advertising launch approval.

## Concrete defect and correction

All four Google/Meta ingress handlers awaited connection closure in an unguarded `finally` block. If the ingestion RPC had confirmed an accepted or duplicate enquiry, a subsequent close error replaced the intended HTTP 200 with a thrown exception. This could cause unnecessary provider redelivery and expose private shutdown diagnostics to runtime error handling. Existing durable deduplication still protected persisted identities; this was not evidence of another SMS being sent.

Cleanup is now attempted once and its exception cannot replace the already determined ingestion response. Accepted and duplicate receipts retain HTTP 200. Actual RPC failures retain generic HTTP 503, and rejection behavior is unchanged. No automatic retry, broader authority, new connection, or sending call was added. This follows the existing acknowledgement worker's guarded cleanup pattern.

The 16 new tests reproduced the original fault: 96 existing focused tests passed and all 16 new cases failed before the fix. Final focused result: 112 passed, zero failed. The first corrected-code run exposed two incorrect test expectations: dashboard adapters classify an unsupported RPC outcome as 503, while the form adapters explicitly classify rejection as 400. Fixtures were corrected to preserve those existing contracts; no production logic was relaxed to satisfy them.

## Completion Evidence Block

- Scope completed: preserve confirmed ingestion outcomes when connection cleanup fails, for Google form, Google dashboard, Meta form and Meta dashboard handlers.
- Modified: `frontend/src/lib/lead-gateway/googleIngress.server.ts`, `metaIngress.server.ts`, `googleWebhookTest.server.ts`, `metaWebhookTest.server.ts`, and their three existing test files `providerIngress.test.mjs`, `googleWebhookTest.test.mjs`, `metaWebhookTest.test.mjs` in that directory.
- Created: this report. Deleted: none. No packages, routes, migrations, auth policy or configuration changed.
- Tests: focused 112/112; complete `test:lead-acknowledgement` suite 541/541, zero failures/skips. Tests use synthetic RPC and Graph fixtures; no live provider or database requests.
- Typecheck: PASS. Targeted ESLint: PASS. Diff whitespace check: PASS. Existing npm proxy warning remains unrelated.
- Build: thirteen-file standalone receiver artifact generated successfully, SHA-256 `f743e113743035197d8d2fad6b6bd9415e8ad7bda1f4ee69f9d79cf214e01db1`. Local Next build not repeated: no routing, UI, dependencies or bundling configuration changed. Remote Preview/CI results must be read against the resulting commit, not inferred from local tests.
- Git: began with clean local head `201b48d84f0b7dd0dcfcea86b0869f24eb29d960`; remote PR115 head `40347205714a0fb60291de902c085ccd38136c1c`, matching tree `96aa00f5e7ceb82cdf4402d56b414bde620bde14`. Publish only these eight files with normal expected-head update; no force push, merge or unrelated change. Final commit and clean-state evidence are recorded with the run result.
- Deployment/migration status: no Supabase deployment or migration; generated artifact is not installed. Normal review-branch publication may trigger its configured Preview build. No production promotion.
- External systems accessed/mutated: GitHub PR/branch inspection and authorized review-branch publication. Read the other overnight task's recorded result to avoid duplicating its PR117 enquiry-routing work.
- Credentials accessed: none. Production/customer data touched: none. No new SMS, advertising activation, spending, consent assertion, STOP release or authority grant.
- Operational state: no live account settings or database controls changed in this increment. The previous verified closed staging state is retained as historical evidence, not claimed as a fresh live readback.
- Remaining risks: permanent Google webhook plus owner email delivery, automatic invocation and persisted authorization policy, authenticated delivery/STOP callbacks, token lifecycle and protected-path review. The reviewed security checkpoint baseline was not changed. Cleanup diagnostics are intentionally suppressed at the response boundary; resource failures still require operational monitoring.
- Next gate: verify the exact review-branch CI/Preview result; install and exercise the corrected receiver only within a bounded staging test. Continue Google combined-delivery verification and dormant automatic-dispatch work without repeating the completed Meta SMS.
