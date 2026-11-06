# Dormant acknowledgement invocation — 2 November 2026

PASS for construction and local verification. This adds the missing caller boundary for the existing private worker; it does not connect a live transport, register a scheduler, provision credentials or enable routine sending.

## Behavior

`createAcknowledgementInvocation` accepts an explicit configuration and an injected request transport. There is no default `fetch`, environment reader, application caller or cron. One invocation instance issues at most one fixed empty JSON POST, including concurrent, repeated and reentrant calls; all callers share its immutable outcome. The latch is installed before transport invocation. The existing worker remains responsible for durable claims, persisted approval/authorization, suppression, STOP and provider execution. The in-memory latch does not survive process restart and is not a substitute for those database controls.

Configuration must select the exact staging project, an explicitly enabled bounded window (at most 15 minutes), a valid trigger credential and the restricted immutable FEH deployment URL shape. Query strings, fragments, userinfo, alternate hosts, path normalization tricks and HTTP are rejected before transport. This URL check is a destination constraint, not proof of Preview deployment identity: the eventual operator must verify the exact deployment, while the existing worker independently enforces its staging/Preview gates.

The request omits cookies, rejects redirects and uses an abort signal. A bounded deadline covers transport and response parsing. A timeout, transport exception, redirect, non-200 response, invalid/oversized JSON, unknown status or contradictory response flags yields `indeterminate`, `automaticRetry:false`, `deliveryConfirmed:false`. No exception, response body, URL or credential is returned. Only the existing worker status and a validated attempt ID survive normalization; provider acceptance is never reported as handset delivery.

Integration must supply an approved transport that honors the request's abort and redirect controls and uses origin-scoped Vercel authentication. No bypass secret or new access rule was introduced here. A returned unknown outcome requires reconciliation with the existing durable attempt history; a fresh invocation instance must not be used as a blind retry. Live authenticated transport, durable scheduling/invocation coordination and production authorization policy remain unfinished.

## Verification

- 39 focused tests passed. They cover one fixed request, concurrent/repeated/reentrant invocation, expiry at start, invalid configuration, all worker outcomes, timeout/exception/redirect/error/malformed/oversized responses, private-field removal, configuration snapshotting and compatibility with the actual worker handler using an empty fake queue. The compatibility test permits only candidate selection and fails if SMS is attempted.
- Full acknowledgement suite: 605 passed, zero failures/skips. Typecheck and targeted ESLint passed. Diff whitespace check passed.
- No new network request was made by these tests. Application-source search found only the function definition, with no runtime caller.
- Prior readiness head `d758c79dabc7a1748a809f0a07e897c1e45a633b`: CRM Navigation Guard and FEH Loop Engineering passed. Factory041 run `41381048400` failed only the existing protected-path checkpoint drift step. That baseline remains unchanged.

## Completion Evidence Block

- Completed: dormant single-invocation caller boundary and response normalization, with bounded timeout and no automatic retries.
- Created: `frontend/src/lib/lead-gateway/acknowledgementInvocation.server.ts`, `frontend/src/lib/lead-gateway/acknowledgementInvocation.test.mjs`, this report. Existing runtime files modified/deleted: none.
- Tests: focused 39/39, full acknowledgement 605/605. Typecheck: PASS. Targeted lint: PASS. Diff check: PASS.
- Build: not repeated; this unreferenced server helper changes no app route, UI, dependency, bundling configuration or active deployment artifact. The preceding readiness change passed a full Next build; that is not claimed as a new build result.
- Git: clean initial local `fdfa5725c32a6028a042199126821e1459fc54bf`, remote `d758c79dabc7a1748a809f0a07e897c1e45a633b`, matching tree `1455fb340ad8ca32928dbac3a3defd1387ec5acd`. Only these three files are intended for normal expected-head publication to draft PR115. Final hashes and clean-tree evidence are recorded with the PR/run result. No merge or force push.
- Deployment/migrations: none performed; no provider settings, environment variables, database grants or STOP state changed. Review-branch publication may trigger configured Preview CI, whose result needs exact-head verification.
- External systems accessed/mutated: GitHub inspection and authorized review-branch publication only. Credentials accessed: none; fixtures use synthetic values. Production/customer data touched: none. No SMS, paid action or advertising activation.
- Remaining risks: live origin-authenticated transport and scheduling, cross-process invocation reconciliation, permanent Google delivery with email preserved, persisted routine authorization policy, authenticated provider delivery/STOP callbacks, token lifecycle and protected review acceptance. This boundary cannot by itself authorize or guarantee exactly-once delivery.
- Next gate: review the caller boundary, verify exact-head CI and prepare the concrete transport/coordination configuration while retaining closed sending. Continue the Google combined-delivery test preparation; do not repeat the already delivered Meta message.
