# Meta permission and owner-number SMS result — 1 November 2026

**PASS: approved Meta permission, provider-originated test intake, qualification answers, and one provider-accepted SMS. BLOCKED: the post-send replay check needs Meta reauthentication. Advertising is not ready to launch.**

## Approved scope and result

The owner approved `pages_manage_ads` for Free Energy Help CRM Leads (`1121337167194437`), limited to the existing Free Energy Help Page (`100693684801233`), and private storage of the refreshed Page token in staging. OAuth completed successfully. Graph permission readback showed the five requested Page/lead permissions granted; Page identity readback matched the intended Page. The other Derby Page and future Pages were excluded. The token is Page-scoped, not technically restricted to one lead; the receiver enforces the exact test-lead, form, phone and expiry restrictions.

The refreshed Page token was saved to `FEH_META_PAGE_TOKEN` in Supabase staging `vredwhyphrhsudggrsen`, with a private digest match. The previously refused form read succeeded. No production project, advertising campaign or spend was activated.

## Provider-originated enquiry and SMS evidence

| Evidence | Observed result |
| --- | --- |
| Form | `1788543365401126` |
| Successful test lead | `1781907386353507` |
| Meta creation time | `2026-11-01T23:04:28Z` |
| Initial callback before new ID was pinned | HTTP 400 at `23:04:31.679Z` |
| Meta retry after pinning | HTTP 200 at `23:05:06.149Z` |
| Staging CRM lead | `12`, source `meta_ads` |
| CRM rows / acknowledgement reservations | `1 / 1` |
| Contract answer | `out_of_contract_or_not_sure` |
| Spend answer | `not_sure_/_new_premises` |
| Fresh owner case | `0a0add17-a17a-48f9-8e97-8ea1bdf42c02` |
| Intent / execution authorization | `2 / 2` |
| Attempts for this authorization | `1`, status `succeeded` |
| Telnyx message reference | `4031a199-5db0-4346-b6bd-4d0b61d0f9a3` |
| Case closed | `2026-11-01T23:06:57.727297Z` |

The contact was the already approved owner test mobile ending 7373, with synthetic name, company and email. The acknowledgement uses the approved callback number **01332 605506**. Telnyx acceptance is confirmed; handset delivery of this new message has not yet been confirmed. The earlier handset screenshot belongs to the earlier synthetic test and is not reused as delivery proof for this message.

The actual initial notification and successful retry came from Meta's custom `test_leads` creation flow. No locally signed notification, direct SQL insert or forged JWT was used to manufacture this initial receipt. One `external_lead_accepted`, one `lead_acknowledgement_reserved`, and one `lead_acknowledgement_claimed` audit were observed for lead 12.

The existing owner bootstrap template was applied for lead 12 under the retained explicit staging approval. It archived the finished previous case and supplied two temporary capabilities. Preparation and the single send used the owner's existing authenticated AAL2 browser session and the unchanged server actions on Preview `free-energy-help-ai-4zdccu1jk-free-energy-help.vercel.app`. Its older explanatory copy still describes a synthetic test; the live database case selected the existing Meta lead. The newer Preview was not substituted for that authenticated runtime or claimed as manually tested.

## Test setup findings

- Initial custom test `1847982296431272` was created while the previous `/meta` callback was registered. Early deliveries returned 404. It did not enter the CRM or send SMS. A later attempt to delete this obsolete test returned Meta error `1892035` (Could Not Delete Lead); deletion is not claimed.
- The form preview displayed successful submission but did not independently establish a new provider test identity. That screen alone was not used as delivery proof.
- The testing tool's generic Create lead action produced `2007646016574347`, with Meta dummy contact fields. Its notifications returned 400 because it was not the pinned owner-number test. Its Track status failure is not the outcome of successful owner-number lead `1781907386353507`.
- A fresh custom owner-number test was then created after callback correction and pinned before Meta's next retry. Only this last identity entered the CRM and obtained sending authority.

The saved Page callback is `/functions/v1/feh-staging-lead-intake/meta-form`, with `leadgen` subscribed at v26.0. A small receiver compatibility change sends the former `/meta` URL through the same form handler only while the restricted form test is enabled. Signature, Page, form, exact lead, owner phone and finite expiry checks all remain enforced. No worker, scheduler or SMS transport was added to the public receiver.

## Replay limitation

The post-send replay has **not** passed yet. A diagnostic attempt to call the existing queue RPC under `external_lead_ingestor` through the operator SQL connection was rejected at `SET ROLE`; no replay RPC ran and no role grant was added to bypass it. Meta's webhook sample dialog offers fixed dummy IDs, not a replay of this existing enquiry. Obtaining the existing signing secret for a clearly labelled controlled HTTP replay prompted Meta password reauthentication. That sign-in is the next required user interaction; no further permission expansion or SMS approval is requested.

After authentication, use the already approved signing secret only to construct a controlled replay for lead `1781907386353507`, temporarily reopen the exact-lead intake window, verify duplicate audit evidence with the row/reservation/attempt counts unchanged, and close the window again. Keep STOP on throughout. Distinguish this controlled signed replay from the genuine Meta-originated initial delivery above. Never issue another SMS CREATE or reset the consumed authorization.

## Closed state and credential handling

Independent final readback: STOP `stopped`; active execution grants `0`; enabled adapters `0`; unconsumed authorizations `0`; owner role `read_only`; one reservation and one attempt for this Meta case. Both `FEH_META_FORM_TEST_ENABLED` and `FEH_INTAKE_RECEIVER_ENABLED` are saved as `false`, confirmed by digest. Unauthenticated hosted GET and POST `/meta-form` both returned 404 after closure.

A callback verification value appeared in an earlier diagnostic GET URL. It was replaced in Supabase, the exact Vercel Preview branch variable, and Meta's Page verification configuration. No Page token, app secret or database credential is included in this report. Subsequent diagnostic queries strip URL query strings at source. During Meta's redirect back to the default User tab, an unused User callback was briefly configured; it was removed, and the intended Page callback/subscription was verified separately. The temporary Graph token input was cleared.

## Validation and review branch

- Focused receiver tests: **85 passed, 0 failed**.
- Full acknowledgement suite: **525 passed, 0 failed, 0 skipped**.
- TypeScript typecheck, targeted ESLint and diff whitespace checks: **PASS**.
- Thirteen-file receiver artifact SHA-256: `3f9c850aafbaebd797b1a61cfad132df7498faa4b3823726a05a940658f3f0f4`.
- Supabase deployment code v16, final configuration v18 ACTIVE; bundle hash `0149447052fa48ce0bc78f7509351d88f86c485bf41e9d312e9ff731e2e6594c`. All thirteen fetched file contents matched the generated artifact. The first deployment request failed before installation due to an inherited import-map path; supplying the explicit `deno.json` path succeeded.
- Remote code commit `756a16d6f61ae2f1e3c14317d5daf56b1791737c`, local code commit `2884e2744f853f6f56d9cd073976515cb1078bf7`, identical tree `b1abb8d56f69cf53d5ffb2cb221465d5c23c11f4`.
- Code-commit CI: CRM guard and independent verifier passed; Vercel deployment completed. Factory 041 tests, typecheck and isolated lint passed; its existing protected-path checkpoint drift step failed (run `41359700871`). No checkpoint or protection was bypassed.

Next.js build was not repeated locally because this increment changes only the standalone receiver branch and its tests; the artifact was generated, deployed and exercised live. The automatic review-branch Vercel build passed.

## Completion Evidence Block

- **Scope completed:** approved Page permission/token refresh; exact staging callback; provider-originated owner test into CRM; both qualification answers retained; one approved SMS accepted; stop/access cleanup verified.
- **Created:** this report. **Modified:** `frontend/src/lib/lead-gateway/intakeReceiver.server.ts`, `frontend/src/lib/lead-gateway/metaFormStaging.test.mjs`. **Deleted:** no repository files.
- **Tests:** focused 85/85; acknowledgement 525/525; two closed-route hosted checks passed. **Typecheck:** PASS. **Lint:** PASS. **Build:** receiver generation/deployment/file match PASS; remote Preview build PASS; local Next build not rerun for the stated reason.
- **Git:** code committed locally and published with an expected-head normal update to `work/telnyx-otp-lead-sms-20261030`; no force push or merge. This evidence-only follow-up's final hashes and clean-state result are recorded in draft PR115.
- **Deployment/migrations:** staging receiver/configuration v18, both test switches off; existing owner-case bootstrap used; no new schema migration or production deployment.
- **External systems accessed/mutated:** Meta Page authorization, private staging token and callback, synthetic test leads; Supabase staging receiver/settings/owner case/CRM test/audit; Vercel Preview-branch verification variable and automatic Preview; GitHub review branch; Telnyx one authorized test send. Google unchanged in this increment.
- **Credentials accessed:** yes, Meta user/Page tokens and newly generated callback verification values; securely stored without inclusion in this report. App-secret replay access stopped at Meta reauthentication. The owner's existing authenticated CRM session was reused; no password, OTP or JWT was read or fabricated.
- **Production/customer data touched:** no production CRM/database or real customer records; only approved owner test contact and synthetic data. No advertising spend enabled.
- **Remaining risks:** post-send replay proof, handset receipt, permanent Google intake with existing email delivery preserved, automatic worker/authorization policy and provider callback lifecycle, token lifecycle, and the protected-path review checkpoint. The earlier Google dashboard test remains separate from a permanent Google-to-SMS connection.
- **Next gate:** complete Meta reauthentication for the controlled replay under existing approval; then finish the remaining Google/automatic-dispatch work before any launch decision.
