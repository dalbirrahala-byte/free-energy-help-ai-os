# One owner-controlled staging SMS: approval and recovery flow

**Prepared and locally validated; database installation and activation are BLOCKED pending explicit approval of the new security access.** No role, capability, adapter approval, authorization, enquiry or RELEASE has been written in staging by this increment. The owner-created test account remains read-only; no acknowledgement SMS was sent.

## What was missing

Staging inspection found the known owner-created test login, confirmed email and existing sign-in history, but role `read_only` and zero verified MFA factors. There were zero active execution grants, approved adapters, contacts, organisations, intents and control events. The stopped state is therefore the existing fail-closed default. General approval in this conversation is not a persisted authenticated CRM approval record.

The foundation intentionally has no application writer to approve an adapter or bootstrap an execution operator. Its human authorization and RELEASE functions derive the actor from `auth.uid()`; generic authenticated users cannot call them. This change adds a bounded owner flow while retaining those primitives and their controls.

## Concrete flow prepared

1. **Privileged operator setup, only after explicit owner approval:** resolve the existing test account in staging, confirm it is still read-only, then temporarily grant its admin role and the existing `execution_authoriser` and `execution_controller` capabilities. Bind one private single-use configuration to that account, the owner-approved mobile and a two-hour approval-start window. The reviewed template is `docs/staging/ACK_OWNER_TEST_BOOTSTRAP.sql.in`. It creates no adapter, enquiry, authorization or RELEASE and performs no send. It must never run against production.
2. **Owner signs in with MFA:** the new `/acknowledgement-test-preview` screen uses the canonical CRM session and administrator MFA checks. No password, JWT or service-role key is copied into code. The database independently checks the real Supabase JWT issuer, authenticated role, AAL2, exact configured operator, current admin role, active pinned capabilities, enablement and expiry.
3. **Approve and prepare one test:** a button shows the fixed message and the configured mobile suffix. The bounded function creates one clearly labelled synthetic owner-test enquiry, a canonical contact, destination commitment, 15-minute own-test permission evidence, an attributable exact-template approval and the matching Telnyx adapter approval. Marketing consent on the lead stays unknown. STOP remains enabled; no authorization or message is produced by this step.
4. **Run once:** a separate button transactionally releases staging STOP and creates the existing controlled authorization. The server uses the returned IDs, restricted worker connection and existing fixed-recipient transport for one attempt. The generic machine trigger remains disabled and has no trigger token. Repeated begin requests cannot start a second attempt.
5. **Close and recover:** the server's `finally` path calls the owner-bound cleanup function, which restores STOP through the existing writer, disables the test adapter, revokes the two pinned temporary grants and restores the original read-only role. Every approval and attempt is retained. A timeout remains indeterminate and is never resent. If the process is killed or cleanup fails, the screen provides a separate restore/close control; it never claims STOP was restored without a confirmed result.

The two-hour window prevents new preparation/start through these controls; it does **not** independently expire the ordinary admin role. The test must be finished or explicitly cancelled to remove that temporary role. If owner setup is abandoned before any RELEASE, the privileged staging operator can revoke the temporary setup after confirming STOP is still enabled. Do not claim an automatic role-expiry mechanism exists.

## Security scope for approval

The proposed migration creates one private control table and six functions. Raw table access is revoked from public, anonymous, authenticated, service, ingestion and worker roles. Two helper functions remain inaccessible to application roles. The four bounded entry functions are granted EXECUTE to `authenticated`, because Supabase browser sessions use that database role; **actual approval/release is additionally restricted to the configured owner with MFA, administrator role, pinned execution grants and an active test scope**. The runtime worker cannot configure, approve or release itself. There is no actor parameter or application-side JWT claim override.

The adapter is approved only for `SMS` and `TELNYX_FEH_CALLBACK_ACK_V1`, with the real authenticated owner and timestamp saved. The existing Factory 041 claim, consume, prepared dispatch, final suppression/STOP/destination checks and outcome finalization remain mandatory. Installation itself inserts no configuration or grants to a person. Preparing a test refuses unexpected existing adapters, reservations or authorizations, so it cannot silently adopt another workload.

The intended owner recipient ends **7373**, Telnyx sender ends **1020**, and the message promises the callback number **01332 605506**. The exact existing fixed message is displayed on the screen. No customer, campaign or production activation is included.

## Automatic-review rejection

On 31 October the Supabase `apply_migration` request was rejected before execution. The review stated that the migration creates privileged approval/release functions and grants their execution to authenticated users, conflicting with the preceding description that no permissions would be granted. That description meant no personal/operator grants, but was too broad: the migration **does** propose database function EXECUTE permissions, as explicitly set out above. The installation was not retried through another tool or method.

Read-back confirmed no control table, no recorded migration, the test role still read-only, zero active grants/adapters/attempts and STOP still enabled. The SQL is retained for review rather than presented as deployed. The affected schema/permission installation and temporary-account activation need explicit owner approval.

Repository `AGENTS.md` requires explicit approval for “Creation, grant, revocation, or weakening of authority” and “Emergency STOP or RELEASE operations.” This request concerns those new security permissions; prior SMS test approval is retained.

## Verification and remaining evidence

- Full relevant dispatch, intake, identity, suppression, compliance, outreach, execution authorization and authentication regression: **1,034 passed, 0 failed, 0 skipped**.
- Twenty new owner-control PostgreSQL/coordinator tests cover wrong owner/project/role, missing or weak MFA, disabled/expired/revoked scope, no authority at install, attributed preparation with STOP retained, one provider call, replay, timeout, lost begin response, blocked overlapping begin, cleanup after expiry, honest cleanup failure/recovery, failed authorization rolling RELEASE back, and refusal to adopt an existing adapter. They execute the actual bootstrap template with synthetic values.
- Typecheck and targeted ESLint: passed. A direct `next build` completed successfully and generated the new route. An earlier redirected npm build produced an incomplete log and was not treated as proof.
- Local PGlite uses synthetic identities and a mocked provider; it does not prove network concurrency, real Supabase MFA/session behavior or handset delivery. Real owner authentication and delivery/replay verification remain pending.
- Success text on the screen comes from persisted attempt/control/access state, never a caller-editable success URL. Provider acceptance remains explicitly distinct from handset delivery.
- The prior Factory 041 accepted-checkpoint drift gate remains intact and needs reviewed acceptance before merge. No baseline is silently changed.

This manual synthetic owner test will prove the controlled sending path. It does not prove an authenticated Meta/Google webhook connection, start an automatic scheduler, establish general customer permission, or complete delivery/STOP webhook integration. Those remaining integrations stay separately tracked in PR #115.

## Completion Evidence Block

- **Created:** this report; `docs/staging/ACK_OWNER_TEST_BOOTSTRAP.sql.in`; `supabase/migrations/20261031182643_acknowledgement_owner_test_control.sql`; `frontend/src/lib/lead-gateway/ownerTestControl.server.ts`; `frontend/src/lib/lead-gateway/ownerTestControl.database.test.mjs`; `frontend/src/app/acknowledgement-test-preview/actions.ts`; `frontend/src/app/acknowledgement-test-preview/page.tsx`.
- **Modified:** `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs` adds the synthetic `auth.jwt()` stub required to load the new dormant migration in isolated tests. **Deleted:** none. Application dependencies unchanged.
- **Tests/typecheck/lint/build:** results and limits above. No real SMS or owner MFA test claimed.
- **Git:** existing approved draft review branch and PR #115; normal expected-head publication only, no merge or force push. Final local/remote commits, tree and Preview result are recorded in the PR body after publication.
- **Database:** installation rejected; migration remains unapplied. Bootstrap template NOT executed. No staging role, capability, adapter, contact, approval, authorization or STOP/RELEASE mutation occurred.
- **External systems:** read-only Supabase staging/account/advisory inspection; rejected migration request; GitHub review work and its protected Vercel Preview. No production or advertising changes.
- **Credentials:** no passwords, provider secrets, tokens or private connection values retrieved, displayed or committed. MFA inspection returned only a factor count.
- **Production/customer data:** none. The proposed live test is only the previously approved owner-controlled phone.
- **Remaining risks/next gate:** explicit approval for the bounded authenticated RPC permissions and temporary staging operator grants; then schema/configuration installation, owner CRM sign-in/MFA setup, one controlled send, cleanup verification and actual receipt/replay evidence. Automatic cleanup has an explicit recovery path and is not guaranteed after process termination.
