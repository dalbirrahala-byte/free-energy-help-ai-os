# Restricted staging activation — 1 November 2026

**PASS: approved staging installation, Meta publication and CRM delivery isolation. BLOCKED: the authentic Meta form → CRM → acknowledgement/replay proof. Advertising is not ready.**

The owner explicitly approved execution-route activation, real provider dispatch and emergency STOP/RELEASE for the bounded staging test. That authority was retained; no repeat sending approval is requested. This increment did not release STOP, bootstrap another owner case, create an execution authorization or send another SMS because the required owner-number Meta enquiry was not obtained.

## Changes completed

- Published **Free Energy Help CRM Leads**, app `1121337167194437`. Meta displayed “Your app was successfully published”. Publication alone does not prove delivery or App Review approval.
- Changed FEH Page `100693684801233` lead access from default to custom. Kept existing people access and the FEH CRM app, removed Zapier CRM lead access. Meta's subsequent delivery tracker explicitly reported Zapier's CRM access revoked. Unrelated integrations were not changed.
- Applied staging migrations `20261101213846_meta_qualification_answers`, `20261101215140_owner_meta_acknowledgement_case` and `20261101215846_owner_test_freshness_null_guard` in project `vredwhyphrhsudggrsen`. The earlier local qualification filename was aligned with the applied version without changing its SQL.
- Deployed the reviewed thirteen-file intake artifact. Final function version **12 ACTIVE**, bundle SHA-256 `6dd27fbf099af8c5166024e49b71246c1ad82ab452f2fa79f6fcdba8f07dba73`. Settings saves increased the version; the code bundle is unchanged from the successful deployment. Platform JWT checking remains off because this provider endpoint applies its own signature/key checks.
- Rotated only the existing restricted staging ingestor password, retaining its role memberships, privilege restrictions and expiry **6 November 2026 23:59:59 UTC**. Stored the connection privately in staging Edge secrets and the exact Vercel Preview branch. Rotated the callback verification token in both matching staging locations. No production environment variable was changed.
- Published the reviewed application changes to the existing branch and draft PR115. Vercel Preview `dpl_FvbQCubLbLfVnL3RTbZY2rkY6g4b` reached **READY** for code commit `1e9319e03447b0494e508d9f0883aec1e8c3bc09`, at `https://free-energy-help-ai-jsgtkz9fk-free-energy-help.vercel.app`.

## Why the real-form test is still blocked

The approved original dummy test lead `1725668615656075` was deleted. The official Preview Form was completed with synthetic name/company/email, the nominated owner's mobile ending **7373**, and the two answers “Out of contract or not sure” and “Not sure / new premises”. Meta showed a successful submission but no usable owner-number test record could be verified.

Following the testing tool's documented Create Lead step generated another default dummy record instead. Its tracker reported FEH delivery rejected by the intentionally closed receiver and Zapier access revoked. That disposable test lead was then deleted through the testing tool; historic audit/CRM records were not erased. No dummy phone was substituted for the approved recipient.

A refreshed credential with the same four previously approved scopes produced a valid **Page** token for the correct app and FEH Page. Meta's debugger confirmed validity and Page-scoped `pages_show_list`, `leads_retrieval`, `pages_read_engagement` and `pages_manage_metadata`, plus `public_profile`; it did **not** include `pages_manage_ads`. The diagnostic token expires shortly and was not substituted for the separately saved staging Page secret.

With that token, the form's test-lead/read endpoints and one POST containing the approved synthetic owner test fields returned Graph error **100 / 33** (object unavailable, missing permissions or unsupported operation). The POST created no confirmed test lead. Meta's app permission description explicitly says `leads_retrieval` requires `pages_manage_ads`, `pages_read_engagement` and `pages_show_list` to work correctly. `pages_manage_ads` also permits managing ads associated with the Page. It was not silently added under the earlier read-leads/manage-notifications approval.

This is a precise additional permission decision, not evidence that every existing single-lead read fails. The earlier user-token read of one nominated dummy lead succeeded; that historical evidence remains valid. The current failure is obtaining/reading the form-scoped owner test using the Page credential.

The existing app callback remains the dashboard-only `/meta` URL. It was not switched to `/meta-form` because there is no verified new test lead ID to pin first. No unbounded callback or arbitrary Graph lookup was enabled. After the check, `FEH_INTAKE_RECEIVER_ENABLED=false` was saved and its displayed digest matched SHA-256 of `false`; the separate form flag also remains false. Hosted GET checks of `/meta`, `/meta-form` and `/google` all returned **404**.

## Fresh owner-case controls

The new reviewed bootstrap template can pin one already-ingested Meta owner test to a fresh case, archive the previous control state and add only two temporary capabilities. It requires STOP already stopped, the owner read-only, all previous sends resolved, no unconsumed authorization, disabled approved adapter and no competing pending queue. It does not itself release STOP, approve an intent, enable the adapter or send.

Authenticated preparation preserves the established Supabase JWT, exact staging issuer, owner identity and AAL2 checks. It validates Page/form/source/phone/time and prepares an exact new action and consent evidence for the owner test. Begin requires fresh non-null preparation and STOP stopped before the existing release/authorization primitives. Existing finish restores STOP, disables the adapter, revokes pinned grants and returns the owner to read-only. Historical attempts, consumed authorizations and acknowledgement identities are preserved. The bootstrap and new live owner case have **not** been executed.

Final independent database check:

| Control | Result |
| --- | --- |
| STOP | stopped |
| SMS attempts | 1, unchanged from the earlier successful owner test |
| Unresolved attempts | 0 |
| Acknowledgement reservations | 1, unchanged |
| Active temporary execution grants | 0 |
| Unconsumed authorizations | 0 |
| Enabled adapters | 0 |
| Owner test | finished, disabled |
| Owner role | read_only |

## Google and remaining launch work

Google's existing official dashboard intake/replay proof remains valid: one fictional lead, one acceptance and two duplicate audits, without an SMS reservation. This increment independently observed **None of your ads are running**, and the editor retained the owner's email with empty webhook URL/key fields. The editor was closed without applying changes. Saved delivery remains email-only.

The temporary `/google` receiver accepts Google's fixed fictional test fixture, not general customer enquiries. Permanent Google intake with saved webhook-plus-email delivery, controlled automatic worker invocation, provider delivery/STOP callbacks, credential renewal, contact-permission review and deployment to production are unfinished. No advertising campaign was enabled and no spend was authorized by this increment.

## Validation and review evidence

- Final owner-control database suite: **38 passed, 0 failed**.
- Final lead acknowledgement suite: **520 passed, 0 failed**.
- Execution-dispatch suite: **595 passed, 0 failed**.
- Factory 041 local suite: **177 passed, 0 failed**. These suites overlap; their counts are not added as unique tests.
- Typecheck, targeted ESLint, Next production build and diff whitespace checks: **PASS**. Isolated PostgreSQL/PGlite tests are not live-provider delivery evidence or a multi-session race test.
- Remote code head `1e9319e03447b0494e508d9f0883aec1e8c3bc09`: navigation guard, independent verifier and Vercel Preview checks passed. Factory 041 run `41354955030`, job `124992926542`, passed its tests/typecheck/lint (52 warnings, zero lint errors) and failed the protected-path checkpoint against `1d2151f1d7d624ce77d06a98dd24f32b6e74461c`.
- The protected review surface is four intake/worker API routes, middleware and nine migrations. No baseline was changed or gate bypassed. This remains a review gate before merge, not a failed SMS transport test.
- Supabase advisors retain existing categories concerning RLS-without-policy, search paths, security-definer functions and leaked-password protection. They were not remediated or represented as a clean security review.

## Next gate

Ask specifically to grant **`pages_manage_ads` to Free Energy Help CRM Leads for the current FEH Page only**, alongside the already approved scopes, refresh its Page token and securely replace the staging credential. Explain that this permission also allows Page-ad management; actual ad changes, campaign activation and spending remain excluded. This permission is already available for testing in the app configuration; it has not been granted to the credential.

After approval: verify the granted Page/permission, obtain one genuine nominated owner test lead, pin its ID and a short expiry, verify `/meta-form` callback and authentic delivery, confirm one CRM row/reservation and saved qualification answers, then exercise the already approved single-message owner case and replay. Close intake, restore STOP and revoke temporary authority afterward. Do not manufacture a locally signed event and report it as Meta-originated delivery, or reuse the prior consumed SMS authorization.

## Completion Evidence Block

- **Scope:** approved staging migrations/runtime/Preview installed; Meta app published and competing CRM delivery isolated; Page-token/form failure diagnosed; receiver closed and sending controls independently checked.
- **Created:** `docs/staging/ACK_META_OWNER_CASE_BOOTSTRAP.sql.in`; `supabase/migrations/20261101215140_owner_meta_acknowledgement_case.sql`; `supabase/migrations/20261101215846_owner_test_freshness_null_guard.sql`; this report.
- **Modified:** `frontend/src/app/acknowledgement-test-preview/page.tsx`; `frontend/src/lib/lead-gateway/ownerTestControl.database.test.mjs`.
- **Renamed:** `supabase/migrations/20261101213000_meta_qualification_answers.sql` to `supabase/migrations/20261101213846_meta_qualification_answers.sql`, unchanged contents. **Other files deleted:** none.
- **Tests/typecheck/lint/build:** exact results above; no new SMS or authentic form-to-CRM proof claimed. Report-only publication does not change the tested application tree.
- **Git/commit/push:** code local commit `b21e5ac43ee74e6aa71f73142f8adc292b7d1599` and remote `1e9319e03447b0494e508d9f0883aec1e8c3bc09` share tree `834e275dda0e0b5367052a27e32ad2f447a99516`. Normal expected-head evidence publication on the existing draft branch follows; final report commit/tree and clean status are recorded in PR115. No force, merge or baseline rewrite.
- **Deployment/migrations:** three migrations applied only to staging, Edge v12 code hash above, code Preview READY. Intake disabled. No production deployment or promotion.
- **External systems:** Meta app publication/lead access/test workflow and same-scope token refresh; Supabase staging migrations, restricted credential rotation, function/settings and control reads; Vercel branch-only sensitive settings/Preview; GitHub review branch and CI; Google read-only inspection. Telnyx dispatch was not invoked.
- **Credentials accessed:** yes, restricted staging credentials and Meta diagnostic tokens handled privately; no values in code, this report or proof screenshots. The earlier diagnostic-token exposure documented in the preceding report remains a separate historical exception and is not erased by this report.
- **Production/customer data:** no production CRM/database changes or customer SMS. Real Meta Page/app settings changed under approval. Leads Centre displayed unrelated existing record names incidentally during test-record checks; no unrelated customer details were opened or exported. Synthetic owner details were submitted only to the approved FEH Meta test workflow.
- **Remaining risks / next gate:** the specific additional Meta Page permission, actual form-to-CRM/SMS/replay proof, permanent Google intake and automatic dispatch/callback lifecycle, token lifecycle, and protected-path review. Advertising launch remains blocked.
