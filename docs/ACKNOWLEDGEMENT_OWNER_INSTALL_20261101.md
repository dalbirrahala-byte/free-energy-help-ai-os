# Restricted staging owner test installation — 1 November 2026

**Installation and temporary authority: PASS. Real owner login/MFA and one-message/replay evidence: pending. STOP remains enabled; no acknowledgement SMS has been sent.**

The owner explicitly approved installing the reviewed restricted controls, temporarily granting the existing test login the required permissions, and releasing/restoring the sending stop for one owner-controlled test. This resolves the earlier automatic approval rejection; the same migration was accepted through the normal Supabase migration tool after that new approval.

## Applied and verified

- Only Supabase staging `vredwhyphrhsudggrsen` was changed. The reviewed migration is recorded remotely as **20261101130501_acknowledgement_owner_test_control**. Its SQL bytes are unchanged; the local filename was aligned with the assigned remote version.
- Remote and local SQL MD5: **44cf846bcab95fbf5dab8e25dbe0d7c5**. Local SHA-256: **5de18a2789f53d3a19fda37cb4f5bc7a7d4bb70b1f9e6fd9effab817bb7de597**.
- The control table has RLS enabled and no direct application-role access. Both private helpers deny authenticated, anonymous, service and worker EXECUTE. The four bounded entry functions grant authenticated EXECUTE and deny anonymous/service/worker EXECUTE. All six use a fixed empty search path.
- An actual request without a user identity returned `setup_required` and `blocked`; STOP remained `stopped`. No synthetic JWT context was used remotely.
- Executed the reviewed bootstrap template with the verified existing owner test account and private approved mobile. Approval reference: `owner-approved-staging-sms-20261101-explicit-controls`.
- Read-back: phase `setup`, enabled true, recipient suffix **7373**, role `admin`, exactly **2** pinned active capability grants. Preparation/start window expires **1 November 2026, 15:06:50 UTC (UK time)**.
- After setup: **0 adapters, 0 authorizations, 0 attempts, 0 reservations; STOP stopped**. User sign-in must establish a real AAL2 session before preparation or release can succeed.

## Preview configuration

Only branch `work/telnyx-otp-lead-sms-20261030`, target Preview:

| Variable | Value |
| --- | --- |
| FEH_ACK_OWNER_TEST_ENABLED | true |
| FEH_ACK_PREVIEW_ENABLED | true |
| FEH_ACK_DATABASE_ENABLED | true |
| FEH_ACK_WORKER_ENABLED | false |
| FEH_META_INGRESS_ENABLED | false |
| FEH_GOOGLE_INGRESS_ENABLED | false |

Telnyx API-key and restricted database configuration presence was checked from metadata; no secret values were decrypted, read back or printed. Existing fixed destination/sender checks remain mandatory. A new protected Preview build receives these flags; its exact deployment and status are recorded in PR #115. The generic machine trigger and provider ingress remain disabled.

## Validation and review

- The unchanged application/migration logic already passed **1,034** relevant local tests, typecheck, targeted lint and a direct Next build on 31 October. This increment changes migration naming and evidence documents, not application logic.
- GitHub CI for the reviewed code commit `f2153bffa3ec4bf1fbb29e65ee06e0f60c7252d9`: CRM Navigation Guard and FEH Loop Engineering passed. Factory 041 tests, typecheck and lint passed; its sole failed step is the accepted-checkpoint migration/application-security drift gate. The guard remains intact; this is not approval to merge.
- Post-install security advisories add exactly the expected private RLS table with no policy and four authenticated SECURITY DEFINER entry points. Their internal owner/MFA/pinned-scope guards and denied raw access were reviewed. Existing mutable-search-path, public-intake and leaked-password advisories are unchanged; none is silently described as resolved.
- Advisory references: [private RLS tables](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- No real owner-session approval, Telnyx message ID, handset receipt or remote duplicate-replay result is claimed yet. The current Cloud Browser has no retained Vercel sign-in session and reaches Vercel's protection login. Deployment Protection was not disabled and no share/bypass link was created.

## Completion and recovery

The next step is Vercel access if needed, then the **existing FEH CRM test account**, then Microsoft Authenticator enrolment. These are separate accounts. The owner must keep the password, QR/setup secret and codes private; no credential reset or duplicate test account was created. After authenticated preparation, run the single approved SMS, verify its recorded outcome and actual receipt, and replay the same enquiry without creating a new send.

The existing finish/cancel function restores STOP, disables the test adapter, revokes only the two pinned grants and restores read-only access. A two-hour scope expiry blocks new preparation/start but does not automatically remove the ordinary admin role. If setup is abandoned, confirm STOP and zero dispatch first, then revoke the temporary setup using the approved staging operator access. Do not reset reservations or indeterminate outcomes for a resend. If the test window expires, inspect the actual state before arranging another window under the existing approval; do not silently extend it or claim a test occurred.

## Completion Evidence Block

- **Created:** this installation record. **Updated:** the 31 October report with a clearly dated current-state notice. **Renamed:** owner-control migration from local construction version `20261031182643` to applied version `20261101130501`; SQL unchanged. **Application files/dependencies:** unchanged.
- **Tests:** prior 1,034-pass regression and remote CI results above; targeted post-install SQL checks confirm migration, permissions, denied unauthenticated preparation, bootstrap scope/counts and retained STOP. No new broad application rerun is needed for a byte-identical SQL rename/documentation update.
- **Git:** exact files only, normal expected-head review-branch publication; no merge/force push. Final commits/tree and protected Preview build result recorded in PR #115.
- **Database:** migration and temporary owner setup applied in staging; no adapter/intent/permission evidence/authorization/enquiry/send created yet. STOP remains enabled.
- **External systems:** Supabase staging schema/setup, two exact-branch Preview flags, GitHub evidence publication and Vercel Preview build. Browser opened the protected test route and observed Vercel login.
- **Credential values accessed:** no. **Production/customer data changed:** no. The owner test mobile was used only in the approved private staging control row.
- **Remaining gate:** real owner sign-in/MFA, one controlled send and actual delivery/replay evidence, cleanup verification. Meta/Google provider intake and advertising activation remain separate and incomplete.
