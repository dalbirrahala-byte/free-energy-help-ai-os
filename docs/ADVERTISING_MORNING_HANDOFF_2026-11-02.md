# Advertising readiness — morning handoff, 2 November 2026

**PASS for the overnight engineering increments. BLOCKED for advertising launch: permanent Google delivery, automatic operation and callback persistence are still unfinished.** This is the final run of the finite overnight sequence; no extension or additional SMS is scheduled by this work.

## New final-run implementation

Added `verifyTelnyxWebhookSignature`, a dormant, server-only authentication prerequisite for future delivery and inbound STOP callbacks. It verifies Ed25519 signatures over the exact timestamp, pipe and raw body bytes using Node's crypto implementation. It requires a canonical base64 32-byte public key and 64-byte signature, bounded nonempty body (64 KiB), and a safe integer clock within five minutes of the signed timestamp. Future timestamps beyond that tolerance also fail. Missing/malformed configuration, tampering and cryptographic errors return only false; no raw diagnostics or callback content escape.

The key must eventually be pinned in trusted server configuration. A key supplied by the incoming request would not establish authenticity. The helper reads no environment or provider credentials, exposes no route, registers no webhook and changes no database or suppression state. Source search confirms no application caller. It verifies bytes only: it intentionally does not claim JSON validity, event/account scope, delivery or contact permission. A five-minute signature window is not event deduplication. Existing Factory041 authorization, suppression, atomic consumption, durable attempt identity and STOP checks remain unchanged.

Protocol references inspected on 2 November: [Telnyx official Node webhook verification example](https://github.com/team-telnyx/telnyx-node/blob/master/examples/webhook-verification/README.md) and [Telnyx webhook help](https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks). The implementation uses no Telnyx SDK or new dependency. The symmetric five-minute tolerance and body limit are explicit local verification constraints, not new sending or consent policy.

## Completed overnight

| Increment | Result and limits | Evidence |
| --- | --- | --- |
| Intake cleanup | Four Google/Meta handlers preserve confirmed intake results when connection cleanup fails. No authority changes. | [Cleanup result](INTAKE_CLEANUP_RESULT_2026-11-02.md) |
| Readiness | Each restricted identity is diagnosed independently; redacted failures cannot prevent the other probe. Health is not sending permission. | [Readiness result](INTAKE_READINESS_RESULT_2026-11-02.md) |
| Worker caller | One dormant invocation instance makes at most one request; uncertain results are not retried. No live transport, scheduler or new authority. | [Invocation result](ACK_INVOCATION_RESULT_2026-11-02.md) |
| Callback authentication | Raw-byte Ed25519 verification, strict input bounds and timestamp checks. No callback processing or persistence yet. | This report; 46 focused tests |

Final acknowledgement suite: **651 passed, 0 failed, 0 skipped**. This includes the earlier tests; do not add the successive totals together. Final focused signature tests: **46 passed**. Typecheck and targeted ESLint passed. Tests use ephemeral synthetic signing keys and make no live requests. They cover changed bytes/timestamps/keys, canonical base64 (including unused padding bits), merged duplicate headers, missing/malformed input, clock boundaries, byte-view offsets and exact size bounds. An explicit test demonstrates that repeated valid signatures still verify: durable receipt deduplication remains required.

No local Next build was rerun for the unreferenced helper because it changes no route, dependency or active bundle. The earlier readiness increment passed a full local build. Those are separate results. No new Supabase artifact was installed overnight.

## Evidence that remains valid, without repeating the send

The genuine Meta provider test lead `1781907386353507` reached staging CRM lead 12; one Telnyx-accepted SMS was received on the owner's handset. Two controlled signed replays returned 200 with two duplicate audits and unchanged one lead, one reservation, one attempt. These were locally signed replays, not two further Meta-originated deliveries. Full details remain in [the Meta result](META_PERMISSION_AND_SMS_RESULT_2026-11-01.md).

Last independently recorded live closure, 1 November: STOP stopped; active grants, enabled adapters and unconsumed authorizations all zero; owner read_only; both intake switches false; function configuration v20/code v16. Overnight runs did not requery live STOP, release it, install migrations or change these controls. Do not describe historical readback as a fresh morning live check.

## Google: concrete remaining work

Account `553-034-0666`, form `402325113451`, campaign `24096131756` remain the intended scope. The overnight Google editor inspection found the existing owner email notification saved, webhook URL/key empty and no ads running. Both delivery controls were visible together; that does not prove saved combined delivery. The editor was closed without Apply. Login was available; this was not a login blocker.

The earlier official Google test proved fictional lead 6 and replay, without an SMS reservation. The webhook was removed to restore email delivery. The currently deployed receiver is closed and restricted to expiring synthetic tests; it is not a permanent customer intake route. Accordingly no permanent Google-to-SMS connection is claimed.

Next implementation/test gate:

1. Review a durable, least-privilege Google intake destination and identity using existing ingestion primitives. Define expected form/account/campaign checks, request limits, key lifecycle and error/redaction behavior. Do not reuse the expiring synthetic receiver as a live endpoint.
2. Prepare a bounded staging test configuration, keeping campaign paused and SMS STOP closed. Save the intended webhook alongside the existing email only after the destination is ready. Read back both settings and retain a documented restoration path.
3. Use the official provider test with synthetic data to prove one receipt and duplicate handling, then verify owner email delivery remains intact. A dashboard success alone is insufficient proof of email delivery. No real customer SMS is part of this intake-only gate.
4. Establish separately reviewed attributable acknowledgement authority and invocation before a later, newly authorized end-to-end send. Never reuse the consumed Meta authorization.

## Callback and automatic-operation acceptance requirements

- Bind the authentic callback to the intended messaging profile, expected sender/recipient and persisted provider message/attempt identity. An authentic event from another profile or destination must not update this case.
- Persist provider event identity atomically and handle duplicate, late and out-of-order delivery statuses without changing immutable execution evidence or authorizing a resend. Record delivery evidence separately from provider submission acceptance. Ambiguous outcomes require reconciliation, never blind CREATE retries.
- Route verified inbound opt-out evidence through reviewed suppression primitives and attributable audit. Keyword interpretation, scope and any resubscription behavior require an explicit policy decision; this helper invents none. A customer STOP must not be treated as an emergency RELEASE or silently undone by a later callback.
- Complete durable invocation coordination, origin-scoped authenticated transport and the persisted routine approval/authorization policy. The in-memory invocation latch does not survive restart and is not the durable queue or authorization boundary.
- Test all of the above offline first, then propose a bounded staging activation with exact postconditions and restoration. No general sending, customer data processing, production promotion or ad launch is authorized by this report.

## Protected-path acceptance packet

The accepted Factory041 checkpoint remains `1d2151f1d7d624ce77d06a98dd24f32b6e74461c`. A fresh local comparison found the same 14 protected paths: four API routes, middleware and nine migrations. The new signature helper adds none. This inventory prepares review; it is not architect acceptance and does not replace review of each complete diff.

| Protected path (relative to repository root) | Review focus |
| --- | --- |
| `frontend/src/app/api/lead-acknowledgements/run/route.ts` | Private trigger authentication, exact staging gates, one candidate, existing durable dispatch controls |
| `frontend/src/app/api/lead-intake/google/route.ts` | Provider authentication/scope, ingestion identity, duplicate behavior and bounded cleanup |
| `frontend/src/app/api/lead-intake/meta/route.ts` | Signature/Page/form/lead checks, Graph identity and ingestion-only boundary |
| `frontend/src/app/api/lead-intake/readiness/route.ts` | Read-only RPC, isolated redacted diagnostics, Vercel protection retained |
| `frontend/src/middleware.ts` | Exact four-path Preview/staging exception to CRM session login; independent machine authentication remains required |
| `supabase/migrations/20261030130256_meta_lead_acknowledgement_queue.sql` | Reservation uniqueness, attributable authority and atomic claim |
| `supabase/migrations/20261030191817_lead_ack_preview_runtime_identities.sql` | Narrow runtime identities/memberships, no shared postgres escalation |
| `supabase/migrations/20261030192825_google_lead_acknowledgement_intake.sql` | Google identity, replay behavior and existing authority checks |
| `supabase/migrations/20261031130910_lead_acknowledgement_worker_candidate.sql` | Read-only selector, live STOP/suppression/approval filters |
| `supabase/migrations/20261101130501_acknowledgement_owner_test_control.sql` | AAL2 owner approval, single-use case, STOP restoration and cleanup |
| `supabase/migrations/20261101182034_restricted_staging_intake_receiver.sql` | Restricted ingest-only identity, no worker/queue/table authority |
| `supabase/migrations/20261101213846_meta_qualification_answers.sql` | Preserve submitted answers without fabricating consent or dates |
| `supabase/migrations/20261101215140_owner_meta_acknowledgement_case.sql` | Fresh owner case, preserved completed history, exact existing Meta reservation |
| `supabase/migrations/20261101215846_owner_test_freshness_null_guard.sql` | Unknown/null freshness fails closed |

For prior remote head `71840a8c4f13ed4fd60cee99059c02d98b157454`, fresh GitHub evidence confirms Vercel deployment success, CRM Navigation Guard success (41391508878), FEH Loop Engineering success (41391508980), and Factory041 run 41391508882 failure only at **Reject migration or application-security drift from accepted checkpoint**. All preceding tests/typecheck/lint steps passed. This is an acceptance gate, not a password problem. No baseline, workflow or protection was changed to turn it green.

For the new code head `aeccc6fe01ce0ca249531b4076718685bce2d26b`, Vercel reports deployment completed; CRM Navigation Guard 41404534090 and FEH Loop Engineering 41404534014 passed. Factory041 run 41404534071 passed every test, typecheck and isolated lint step, then failed only the same protected-path checkpoint. No manual Preview runtime exercise is claimed for this dormant helper. The subsequent evidence-only commit has separate checks, whose results are not inferred here.

Acceptance must name the exact reviewed head/tree and protected diffs, preserve approval/STOP/suppression invariants, distinguish source from installed migrations and record the permitted next deployment scope. It does not itself authorize a merge or production launch.

## Completion Evidence Block

- Scope completed: dormant Telnyx signature verifier and 46 regression tests; current-head/previous-run reconciliation; exact prior-head CI diagnosis; protected-path inventory and consolidated finite-run handoff.
- Created: `frontend/src/lib/execution-dispatch/telnyxWebhookSignature.server.ts`, `frontend/src/lib/execution-dispatch/telnyxWebhookSignature.test.mjs`, this report. Existing runtime files modified/deleted: none.
- Tests: focused 46/46; acknowledgement 651/651, zero failures/skips. Typecheck PASS; targeted lint PASS; staged whitespace check PASS. Build not rerun for the stated dormant-helper scope. No UI behavior changes require a manual browser test.
- Initial Git: local clean `ed5dc367f0a9eff66115cb8b31cf158998125a9a`; remote `71840a8c4f13ed4fd60cee99059c02d98b157454`; identical tree `826e3e1ebe26426dae1262b63d07b36a989dc7c8`. Different commit histories were preserved; no reset, overwrite, merge or force push.
- Code commit: local `b90bcc46417e04c41fbeffd14f6332fb02c6781c`; remote `aeccc6fe01ce0ca249531b4076718685bce2d26b`; matching tree `93ffa7be12c4f4dc0a4c6d329bcd4f5977ae6894`. Exact two code/test files were reviewed, staged, committed and published using an expected-head normal update to draft PR115. Local tree was clean after code commit. This report is the only intended evidence follow-up; its final publication/clean-state hashes are recorded in PR115.
- Deployment/migrations: automatic code-head Vercel deployment completed, verified by GitHub status. No manual deployment, production or Supabase deployment, settings mutation, grants or STOP operation. Staging function remains at the previously recorded v20, not verified afresh here.
- External access: GitHub reads and authorized review-branch publication; public official Telnyx documentation; finite task schedule inspection. No provider/dashboard mutation. Earlier overnight read-only Google inspection is documented separately.
- Credentials accessed: no account/provider credentials; only ephemeral locally generated test key pairs. Production/customer data touched: no. No SMS, email, advertising activation, paid generation or spend.
- Remaining risks: permanent Google/email delivery; durable callback deduplication/correlation and reviewed STOP suppression; routine attributable authorization; authenticated durable worker invocation; token lifecycle; protected-path acceptance and eventual launch decision.
- Recommended next gate: review the callback persistence/suppression design and permanent Google receiver scope while keeping sending closed. No repeated Meta send or further overnight scheduling is needed.
