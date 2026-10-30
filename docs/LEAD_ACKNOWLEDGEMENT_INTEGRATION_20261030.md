# Automatic lead acknowledgement integration — 30 October 2026

**PASS for the implemented, locally tested intake/reservation/worker composition. BLOCKED for live activation.** Nothing in this increment sends a customer SMS, starts advertising, changes production, or turns the earlier OTP test into a production service.

This is the next increment after the owner-controlled staging OTP receipt and two-code verification passed. The temporary OTP deployment was subsequently deleted with owner approval. Those results are recorded in PR #115; this document supersedes the unfinished lead-reservation portion of the earlier Telnyx report.

## Implemented behaviour

- Verify the raw Meta webhook signature and configured page/form scope before reading Graph lead details. Require the Graph response to match the lead ID, form ID and creation time. Extract only the supported contact fields; ambiguous duplicates and malformed receipts fail closed.
- Save the CRM lead and one acknowledgement reservation in the same PostgreSQL transaction using the existing `ingest_external_lead` function. Marketing consent stays `unknown`. A replay cannot add another reservation or backfill historical leads.
- Claim the reservation once through a dedicated worker RPC. It requires an existing, current Factory 041 authorization, exact template approval with an evidence reference, eligible destination commitment, linked organisation/contact, the same UK mobile supplied with the lead, an approved Telnyx adapter, clear suppression and clear emergency state. Leads older than 24 hours cannot be claimed.
- Reuse the existing consumption, preparation, immediate pre-call checkpoint and finalization sequence. The destination and fixed message come from reviewed database/code bindings, never caller-provided message text or permission booleans.
- A crash or uncertain provider response after claim is held for reconciliation. The reservation is never automatically reset or resent. Provider acceptance does not prove handset delivery.

The reservation is automatic when the authenticated intake composition is invoked. **It does not automatically create contact/organisation matches, compliance decisions, human approvals, execution authorizations or adapter grants.** Those are separate existing authority boundaries. There is no new public route, Graph transport, dedicated database runtime credentials, scheduler or delivery/inbound-STOP webhook. The follow-up below adds a disabled Preview Telnyx HTTP transport; it is not connected to a route or worker invocation.

Fixed message:

> Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from 01332 605506 during business hours.

The sender supplied by the owner remains the Telnyx mobile ending 1020. Dalbir explicitly confirmed on 30 October 2026: **“customers see 01332 605506”**. This is owner confirmation of the callback caller ID, not a new outgoing-call test. The existing fixed template already matches. This confirmation alone does not create customer permission or sending authority.

## Staging and account findings

Staging is `vredwhyphrhsudggrsen`; production is excluded from migration work. Metadata inspection found no Meta webhook/Graph credentials or dedicated ingestion/worker runtime credentials in Vercel. There are no approved provider adapters in staging. The dedicated worker role remains NOLOGIN and without table access.

Staging still has the older text-returning preparation function and one-argument pre-call function. Apply these reviewed repository migrations in order before the new reservation migration:

1. `20260826100000_authoritative_prepared_envelope_checkpoint.sql`
2. `20260828120000_prepared_dispatch_destination_binding.sql`
3. `20261030130256_meta_lead_acknowledgement_queue.sql`

The initial migration request and the follow-up after caller-ID confirmation returned **confirmation expired**, not success. Fresh catalogue read-back still shows the text-returning preparation function and one-argument pre-call function. **No migration in this increment was applied.** The two existing function definitions and ACLs match the captured recovery snapshot; staging has zero approved adapters and zero dispatch attempts, and the worker is still NOLOGIN. Do not silently repair migration history: compare the Supabase-assigned versions and source migrations during the approved staging run.

Meta registration and app creation are now complete following the owner's explicit app/terms approval and secure password re-entry. **Free Energy Help CRM Leads**, app `1121337167194437`, is unpublished under Free Energy Help portfolio `1384515823534756`. Page `100693684801233` and form `1788543365401126` (**FEH | UK Business Energy Review | 2 Questions | Oct 2026**) were verified read-only. The form promises contact about the enquiry within one working day; no SMS-specific opt-in appeared in the preview. No lead was submitted. Existing Zapier and Metricool connections were left intact. Page webhook callback/token fields remain blank, `leadgen` unsubscribed, and the new app is not associated with the Page. No Page token was generated.

## Preview HTTP transport follow-up

The owner-confirmed caller number remains unchanged in `feh-callback-ack-v1`. The new `telnyxAcknowledgementHttpTransport.server.ts` uses Next's `server-only` boundary and only constructs a transport when all of these trusted server settings agree:

- `VERCEL_ENV=preview` and separate `FEH_ACK_PREVIEW_ENABLED=true`.
- Exact staging URL `https://vredwhyphrhsudggrsen.supabase.co`.
- Existing FEH Telnyx sender `+447427851020`, a nonempty private `TELNYX_API_KEY`, and one E.164 UK mobile in `FEH_ACK_PREVIEW_ALLOWED_PHONE`.
- Every request must match that sender, the one configured test recipient, SMS channel and the exact fixed acknowledgement copy. OTP flags cannot enable this transport.

No values were provisioned for the new flags; the capability remains disabled. The saved Telnyx key's presence was checked through metadata only; its value was not read or used. Production and unknown environments return no transport.

Architecture review: the transport is a final provider connector, never an authorization writer or direct public handler. It must be injected into the existing claim/consume/prepare/immediate-check/finalize worker after persisted authority has been established. Future runtime wiring must independently bind its restricted database client to staging; a configured public URL alone is not proof of that client's identity. The transport makes one POST to the fixed Telnyx endpoint, rejects redirects, bounds the timeout to 10 seconds and response body to 64 KiB, and retains only validated provider message metadata. Errors, malformed responses and timeouts remain indeterminate; no retry or claim reset is introduced. A provider accepted/sent status still is not handset-delivery proof.

The implementation follows the installed Next server-only guide and [Telnyx's Send a message API](https://developers.telnyx.com/api-reference/messages/send-a-message). Unit tests replace only the Next server-only marker in Node's isolated test process and inject fake fetch responses; they do not call Telnyx or load real credentials.

### Follow-up Completion Evidence Block

- **Scope:** record owner-confirmed caller ID; construct a disabled staging-only Telnyx HTTP connector; retry the previously approved staging prerequisite update and verify it did not run after the connector confirmation expired.
- **Created:** `frontend/src/lib/execution-dispatch/telnyxAcknowledgementHttpTransport.server.ts` and `frontend/src/lib/execution-dispatch/telnyxAcknowledgementHttpTransport.test.mjs`.
- **Modified:** `frontend/package.json` adds the new transport tests to the focused acknowledgement command; this report corrects the completed Meta/callback steps and records current limitations. **Deleted:** none. No dependency change.
- **Tests:** full execution-dispatch suite — **579 passed, 0 failed**, including **40 new transport tests** covering environment/recipient/template isolation, redirects, malformed and oversized bodies, redaction and uncertain outcomes without retry.
- **Typecheck:** exit 0. **Targeted ESLint:** exit 0. **Production build:** exit 0; existing middleware deprecation and Node module-type/npm configuration warnings remain. Exact publication evidence is recorded in PR #115 after completion.
- **Git/publication:** same review branch and draft PR #115; no merge. Exact local/remote SHAs, final status and Preview result are recorded in the PR after publication.
- **Database/deployment:** no remote migration applied; no new runtime configuration or activation; production unchanged. No test acknowledgement SMS sent.
- **External systems:** Supabase catalogue/advisory reads and expired migration confirmation; GitHub PR evidence update and review-branch publication. No Meta or Telnyx account mutation in this follow-up.
- **Credentials/customer data:** no secret values accessed; no real customer data read or sent. All new transport tests use a reserved fictional recipient and synthetic token.
- **Remaining gates:** Supabase connector confirmation for reviewed staging migrations; Meta access/Graph/webhook connection; restricted database identities and attributable contact/approval policy; delivery/STOP reconciliation; one owner-controlled end-to-end lead test; reviewed migration checkpoint before merge. Google intake needs separate implementation/verification before its launch can be declared ready.

## Review and recovery

- The existing Factory 041 CI checkpoint deliberately rejects any migration change against its accepted baseline. This new migration needs explicit architecture review and a separately reviewed checkpoint update before merge. This patch does not disable or rebaseline that control.
- Before applying, retain the current two function definitions and ACLs and verify the expected signatures and inactive worker posture. The new RPC/table introduces no login, role membership, provider credential or automatic approval.
- Recovery for the existing prerequisite functions is restoration of the captured definitions and exact ACLs. Recovery for the new capability starts by revoking its two RPC grants. Preserve the acknowledgement table and claim history after any real attempt; do not drop or reset it to permit resending.
- Existing staging advisory findings predate this change, including mutable function search paths and password-protection settings. No broad security cleanup is included. See [function search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The new functions set an empty search path and the new table deliberately has RLS with no public policies or table grants.

## Completion Evidence Block

- **Scope:** authenticated intake composition, atomic one-lead reservation, one-attempt claim, fixed-template worker composition and isolated PostgreSQL integration tests.
- **Created:** `frontend/src/lib/lead-gateway/ingestMetaLeadAcknowledgement.server.ts`; its `.test.ts`; `frontend/src/lib/execution-dispatch/executeLeadAcknowledgement.ts`; `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs`; `supabase/migrations/20261030130256_meta_lead_acknowledgement_queue.sql`; this report.
- **Modified:** `frontend/package.json` and `frontend/package-lock.json`. Added exact dev-only `@electric-sql/pglite@0.5.13`; preserved unrelated lockfile platform metadata. The existing execution-dispatch script now includes the database tests.
- **Deleted:** none.
- **Focused validation:** `npm run test:lead-acknowledgement` — **225 passed, 0 failed**. Includes 14 new intake tests and 18 new database tests. The database tests apply every repository migration, exercise the real SQL functions under the restricted roles, roll back a failed audit, reject duplicate/backfilled leads, block changed destinations and absent approval evidence, enforce STOP arriving after claim, and finalize ambiguous outcomes without retry.
- **Regression:** final `npm run test:execution-dispatch` — **539 passed, 0 failed**; `npm run test:factory-041` — **177 passed, 0 failed**. Suites overlap; do not add their counts as unique tests.
- **Typecheck:** `npm run typecheck` — exit 0.
- **Lint:** targeted ESLint — exit 0. Full `npm run lint:ci` — 0 errors, 52 existing warnings in other files.
- **Build:** `npm run build` — exit 0; 38 pages generated. Existing middleware-to-proxy deprecation, Node module-type and npm proxy-configuration notices remain.
- **Limits:** PGlite is a real PostgreSQL engine with one connection. It tests persisted behaviour and overlapping worker calls but is not proof of multi-session database lock races. All transports and records in these tests are synthetic; no provider delivery is established.
- **Git:** review branch `work/telnyx-otp-lead-sms-20261030`, draft PR #115. Exact publication SHA, final clean-tree check, remote checks and Preview status are recorded in the PR after publication; no merge is authorised by a passing local test.
- **Migration/deployment:** migration not applied (connector confirmation expired; catalogue read-back unchanged). No production release. A Git push may create a normal Preview, but the new composition remains unconnected and inactive.
- **External systems:** read-only Vercel environment metadata, Supabase schema/roles/advisories/log counts, Meta developer registration page; GitHub review-branch publication. The attempted Supabase migration was not executed.
- **Credentials accessed in this increment:** no secret values read, printed, provisioned or rotated.
- **Production/customer data:** no production mutation, real customer ingestion, acknowledgement SMS or advertising activation. Test phone numbers use reserved synthetic ranges.
- **Remaining risks/gate:** Meta registration, app creation, form inspection and owner confirmation of callback caller ID are complete (see follow-up above). Apply the staging migrations through the required connector confirmation; provision restricted runtime identities; implement the attributable approval policy and verified contact linkage; wire authenticated HTTP intake and worker execution; add authenticated delivery/STOP reconciliation; test one owner-controlled enquiry and replay before any live release.
