# Automatic SMS authority: first working local build — 5 November 2026

**Construction and local mock execution PASS. Hosted staging acceptance PENDING. Advertising launch NOT APPROVED.**

This implements Dalbir's request to start the missing SMS build, then present the completed security-sensitive changes for Dominic's review and obtain the specific installation/activation decisions before final launch. It is a new implementation increment, not another monitoring-only status report. Previous real Meta/Google owner sends were not repeated.

## What works in this increment

The new private database bridge accepts recorded enquiry permission only through a separate restricted recorder. It matches the persisted enquiry to a reviewed provider/form/page/campaign, question, notice version, test contact and recipient. Exact affirmative answers qualify; missing, negative, uncertain or conflicting evidence does not. Existing marketing-consent fields remain unchanged.

A separate authenticated owner operation adopts the exact notice and **v2 message**, with MFA and an existing active authoriser grant. The persisted rule is deliberately limited to **one new enquiry, one pinned test contact, one form and a 15-minute window**. Each channel needs its own reviewed binding. It cannot renew itself, reuse an older fictional review, authorise an enquiry submitted before approval, or reopen an exhausted rule. This bounded construction is not a standing production sending policy.

For a qualifying enquiry, the bridge creates a system intent plus attributable policy approval, destination-bound compliance evidence and a single-use Factory041 authorisation. The human identity comes from the recorded rule adoption; the machine never fabricates an owner JWT or claims the owner clicked approval for that individual enquiry. `approval_mode=owner_delegated_rule` and the rule/permission references identify the provenance. Existing human-only authorisation writers are unchanged; the new private writer requires security review as a distinct delegation boundary.

`runAutomaticAcknowledgementOnce` then hands the same authorisation to the existing claim → consume → prepare → checkpoint-three → finalise process. It uses separate authoriser and worker clients and a mock-injectable transport. It adds no timer, public route, credentials or live provider wiring. A committed authorisation survives a lost response/restart with the same identity. A crash after claim remains held for reconciliation. Timeout, uncertain acceptance and finalisation failure cannot trigger a blind resend.

The v2 message is:

> Free Energy Help: Thanks for your enquiry. Dalbir will call from 01332 605506 during business hours. Reply STOP to stop automated texts.

Its action/template/adapter keys are versioned independently of the historical v1 handset-test message. V1 defaults and evidence are preserved. The draft database changes pin the adapter and message version at claim and recognise v2 delivery receipts through the existing restricted callback. A v1 adapter cannot execute a v2 acknowledgement.

## Evidence and limits

The new database tests apply every repository migration, then the [draft SQL](staging/ACK_AUTOMATIC_AUTHORITY_DRAFT.sql), in isolated PGlite PostgreSQL. All actors, grants, notices, contacts and provider responses are synthetic. No actual customer permission is asserted.

| Contract acceptance group | New local result | Hosted acceptance |
| --- | --- | --- |
| Eligible enquiry | PASS: both Meta and Google fixtures produce one system intent, one authority and one mock v2 SMS; lead marketing consent stays unknown. | Pending: actual verified form-answer extraction, identity binding, authenticated rule adoption and restricted runtime wiring. |
| Duplicate / restart | PASS: permission replay, exhausted rule, coordinator restart, lost authority response, crash after claim and finalisation interruption preserve one authority/attempt and no second send. | Pending: independent PostgreSQL sessions, concurrent intake/worker overlap and deployed restart evidence. PGlite is one connection. |
| Customer / global STOP | PASS: the existing callback blocks queued and later enquiries; START does not restore permission; global STOP blocks authority and later claim; opt-out at checkpoint three prevents the provider call. | Pending: callback installation/configuration and the bounded staging acceptance exercise. |
| Permission / suppression | PASS: no/missing/unknown/conflicting answers, unreviewed question/form, wrong recipient/time, missing or expired approval, expired authority, revoked grant, missing adapter and ambiguous identity fail closed. Roles have no raw-table/send/owner-approval rights or LOGIN. | Pending: final reviewed real form notices, source mappings, owner endpoint and hosted role/credential checks. |
| Delivery / uncertainty | PASS: timeout stays indeterminate; receipt-before-ID is unmatched; retry of that receipt after ID persistence records evidence once; delivery failure/out-of-order receipts do not cause another dispatch; audit failure rolls back the new authority chain. | Pending: hosted signed-callback verification, durable unmatched-receipt reconciliation/monitoring and shutdown evidence. |

These are **local component/integration results**, not a declaration that the five final staging groups passed. An accepted mock provider response proves neither Telnyx delivery nor handset receipt. The existing callback parser/signature tests remain covered by the broader acknowledgement regression suite.

The bridge deliberately requires an existing, independently reviewed contact/organisation binding; it does not manufacture identity resolution for new customers. The verified intake currently does not call the new recorder. No owner approval UI for this new executable rule is connected. The existing six fictional permission-review records are neither read nor promoted.

## Installation and review packet

1. **Implementation agent:** finish the verified Meta/Google question extraction and the authenticated owner review surface, using the actual reviewed source notice/question keys. Connect the private authoriser to a restricted durable invocation mechanism, with a recovery view that distinguishes unclaimed authority from a claimed/indeterminate attempt. Preserve Google's owner email delivery.
2. **Dominic:** review the completed protected diff, including the new SQL draft, the policy-delegated writer, role separation, exact contact/source/notice binding, one-enquiry cap, time window, lock order and versioned message selection. The new SQL is a review artifact outside migrations, not an exception to security review. The accepted Factory041 baseline must not be moved merely to clear CI.
3. **Implementation agent, after the specific installation approval:** generate the numbered migration from this reviewed SQL using the Supabase CLI; compare staging drift and apply only to `vredwhyphrhsudggrsen`, together with the pending callback migration `20261105160318`. Inspect privileges/advisors, provision only the reviewed restricted identities and verify the closed state. Do not install a partially reviewed packet.
4. **Dalbir:** adopt the exact executable staging rule through the authenticated review control when it is ready. That adoption is separate from his permission to build. Any new real SMS, grant, STOP release or sender activation must be named in the bounded test packet; consumed authority must never be reused.
5. **Implementation agent:** run the five hosted groups, document the exact head, installed definitions, outcomes and restored closed controls, and prepare the production delta/rollback packet. **Dalbir's final launch approval** comes after those results and security acceptance. No merge, production migration or campaign activation is included in this increment.

No new blanket approval is requested to continue routine dormant construction. The immediate remaining work belongs to the implementation process, not to Dalbir filling technical fields in the CRM. There is no Google/Telnyx authorisation countdown represented by these FEH controls.

## Completion Evidence Block

- **Baseline:** clean local `work/sms-authority-construction-20261105` at PR115 head `ceda4fa24dee9d02da1ff242679d3611946cc1c2`, tree `e607af9480ecf3a1cdfb327d914c37584eff802f`. Remote head rechecked unchanged before publication. Root/frontend AGENTS and prior callback/completion evidence read; unrelated local work preserved.
- **Exact implementation:** local code commit `53ecc40d40d5e285f647344cf284b8ebf4ca4991`, GitHub code commit [`8bec37908e36213154a97d5f203077547055baaa`](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/commit/8bec37908e36213154a97d5f203077547055baaa), identical tree `5675d790d06aba24a60d65848e32ca2704a27b01`. The publication adds only this report and the contract pointer afterward. Draft SQL SHA-256: `497a30d61474f6864acb6b00762f692d45e06e7a24aedf8c396c4f2ea5099156`.
- **Created:** `docs/staging/ACK_AUTOMATIC_AUTHORITY_DRAFT.sql`; `frontend/src/lib/execution-dispatch/runAutomaticAcknowledgementOnce.ts`; `frontend/src/lib/lead-gateway/acknowledgementAuthority.database.test.mjs`; this evidence document.
- **Modified:** `frontend/src/lib/execution-dispatch/executeLeadAcknowledgement.ts`; `frontend/src/lib/execution-dispatch/telnyxAcknowledgementAdapter.ts`; latest-evidence pointer in `docs/ADVERTISING_COMPLETION_CONTRACT_2026-11-02.md`. **Deleted:** none. No existing migration or accepted baseline was rewritten.
- **Focused tests:** `node --test src/lib/lead-gateway/acknowledgementAuthority.database.test.mjs` — **35 PASS, 0 FAIL**. Rerun after final contact-ID pinning.
- **Regression:** `npm run test:lead-acknowledgement` — **900 PASS** (includes the 35 new cases); `npm run test:execution-dispatch` — **718 PASS**; `npm run test:factory-041` — **177 PASS**; `npm run test:auth` — **33 PASS**. Counts overlap; do not sum them as distinct tests.
- **Typecheck:** `npm run typecheck` — PASS. **Lint:** targeted ESLint on the four added/changed JavaScript/TypeScript files — PASS. **Build:** `npm run build` — PASS. This builds a local production bundle; it is not a production deployment. **Whitespace:** `git diff --check` — PASS.
- **Tooling:** Supabase CLI was not found in this workspace. The SQL is deliberately a named draft, not a handcrafted timestamped migration; local database tests execute it explicitly. Remote advisors and migration application were not run. Existing non-failing npm proxy/module-type notices remain unchanged; no dependency upgrades were attempted.
- **Publication:** narrow normal expected-head publication to PR115's existing branch under retained authorisation; containing commit/tree are available in this file's Git history. No force push, merge, branch deletion, destructive cleanup or accepted-checkpoint change. Local construction commit retained; final publication checkout is intended to match the remote tree and be clean, verified at handoff.
- **Review / CI:** PR115 was open, unmerged and no longer draft at inspection. Its sole recorded Dominic review was `DISMISSED` and predates this build; it is not acceptance of these changes. New remote CI results must be checked against the publication head. Local green checks do not waive protected-path review or hosted acceptance.
- **Deployment / migration:** new SQL **not installed**; pending callback migration **not installed by this run**; no new runtime/endpoint enabled. A normal branch push may trigger the already-authorised Vercel Preview workflow; its state is reported separately after publication. No manual deployment, hosted SQL mutation, STOP/RELEASE, grant, adapter activation, provider test traffic, SMS or ad activation/spend.
- **External systems:** GitHub source/review inspection and review-branch publication; official Supabase documentation lookup. No customer-facing communication, support enquiry or messages to Dominic. **Credentials accessed:** no private credential values. **Production/customer data touched:** no.
- **Remaining risks / next gate:** exact provider form capture and owner endpoint wiring; generation/review of the final migration; standing-rule lifecycle beyond the deliberately narrow test cap; actual independent-session race testing; unmatched callback reconciliation and operational monitoring; hosted five-group acceptance; Dominic's security review and Dalbir's separate staging/launch decisions. Neither channel is declared ready for advertising by this report.
