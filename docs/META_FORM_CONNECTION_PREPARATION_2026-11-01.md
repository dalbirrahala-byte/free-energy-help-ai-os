# Meta real-form staging preparation — 1 November 2026

**PASS: Meta required settings completed; restricted real-form receiver prepared, tested and installed disabled. BLOCKED: actual FEH Page access and publication still need the specific owner decision. Advertising journey remains unproven.**

## Account work completed

The existing FEH privacy page, `https://freeenergyhelp.co.uk/about/privacy`, was inspected. It already describes enquiry handling, a right to request deletion and the contact address for exercising rights. That existing URL was saved as both the privacy-policy URL and the data-deletion instructions URL for **Free Energy Help CRM Leads**, app `1121337167194437`. No policy text or legal basis was invented or changed.

A fresh Meta publication-page load showed **All required app settings are complete** and **Unpublished App Publish Status**. This clears Meta's missing-settings check; it is not legal approval, App Review approval or evidence of real-form retrieval.

The Graph API Explorer request is prepared with `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, and `leads_retrieval`. No token was generated, no OAuth grant submitted, no Page subscribed, no publication performed, and no customer data requested. These Page permissions are broader than one lead; the staging application's request gate is what restricts the test to one independently nominated enquiry. Do not describe the token as technically restricted to a single lead. No advertising-management permission was selected in this request.

## Restricted form receiver

The existing Meta ingress, Graph reader, normalizer and atomic acknowledgement-reservation RPC are reused. The separate staging artifact now includes `/meta-form`, alongside the unchanged `/meta` dashboard test and `/google` synthetic test paths.

The form handler requires all of the following:

- Exact staging project `vredwhyphrhsudggrsen`; no production or mixed-runtime selection.
- Actual FEH Page `100693684801233` and form `1788543365401126`.
- Explicit form-test enablement, signing secret, private Page token and verification token.
- One independently configured numeric `FEH_META_TEST_LEAD_ID`. Every reference in a batch must match before any Graph call. Merely checking the returned phone would read unrelated customer data before rejecting it.
- One approved UK mobile; the Telnyx sending number cannot be the recipient.
- A finite configured expiry no later than **6 November 2026 23:59:59 UTC**, checked per request, before Graph and again before persistence. A short test window should be chosen at activation.
- Matching Graph lead ID, form ID, timestamp and phone; narrow contact-field mapping; unknown marketing consent.

Only the existing restricted `feh_ack_preview_ingestor` login may reserve through the existing queue RPC. The original `feh_intake_preview_receiver` remains unable to queue. Edge runtime rejects the worker identity, and the artifact has no SMS transport, scheduler or worker route. No database grants, roles, migrations or authority records were changed.

The original Meta signature helper now imports Buffer explicitly, matching the Edge runtime fix already proven for dashboard notifications.

## Deployment and verification

Staging Edge Function `feh-staging-lead-intake`, ID `fe0cf53b-36da-4131-b3a0-1b44c29098d1`, updated from v6 to **v7 ACTIVE**. The actual form feature remains **disabled**; no new form-test settings or credentials were provisioned. Meta's saved callback still points to the dashboard-test `/meta` route.

- Thirteen-file artifact SHA-256: `c82308869238c11d9ab04068ce4a59690f1510006c03f74fe4c89dd123213d3d`.
- Supabase bundle SHA-256: `b2e46c5e515647c5d06def6a135abb10298656a3a4c982112db7f410b669afbc`.
- Previous v6 rollback artifact verified: `d1778909124c04efcdb46f505ff57c9601c196d640f4fc94e654883272797b19`.
- Hosted checks: GET and POST `/meta-form` return **404**; POST `/run` returns **404**; unauthenticated GET `/meta` and wrong-key POST `/google` return **403**. No provider credentials or customer payloads were used for these checks.
- Fresh staging read after deployment: STOP **stopped**, SMS attempts **1**, acknowledgement reservations **1**, active execution authorisers **0**. The previous single-use owner case remains finished.

Local checks: **174 focused tests passed**; broader security, identity, suppression, compliance, authorisation, dispatch and intake suite **1,082 passed, 0 failed, 0 skipped**. Typecheck, targeted ESLint, diff whitespace and thirteen-file generator passed. Deno check passed against the identical installed postgres 4.0.0 dependency. No live Graph request or new SMS occurred. Mock HTTP/RPC composition is explicitly distinguished from the existing real PostgreSQL atomicity tests and from outstanding provider-originated proof.

## Security review checkpoint

Remote commit `509c253dce95e30d59458402bbcc98d4a6786213` was inspected before this increment. CRM Navigation Guard and FEH Loop Engineering passed. Factory 041 run `41344970190`, job `124962745302`, passed its tests, typecheck and isolated lint; only the protected-path drift step failed.

That step compares against `1d2151f1d7d624ce77d06a98dd24f32b6e74461c`. The outstanding review contains four added intake/worker/readiness API routes, the staging-only middleware exception, and six added staging/queue/control migrations:

- `frontend/src/app/api/lead-acknowledgements/run/route.ts`
- `frontend/src/app/api/lead-intake/google/route.ts`
- `frontend/src/app/api/lead-intake/meta/route.ts`
- `frontend/src/app/api/lead-intake/readiness/route.ts`
- `frontend/src/middleware.ts`
- `supabase/migrations/20261030130256_meta_lead_acknowledgement_queue.sql`
- `supabase/migrations/20261030191817_lead_ack_preview_runtime_identities.sql`
- `supabase/migrations/20261030192825_google_lead_acknowledgement_intake.sql`
- `supabase/migrations/20261031130910_lead_acknowledgement_worker_candidate.sql`
- `supabase/migrations/20261101130501_acknowledgement_owner_test_control.sql`
- `supabase/migrations/20261101182034_restricted_staging_intake_receiver.sql`

This increment adds no further protected-path files. The baseline was not changed or bypassed. The listed changes require a reviewed acceptance decision before merge; passing functional tests alone do not supply it.

## Next controlled steps and remaining limits

1. Obtain owner confirmation for the Page-level access grant and private staging storage/use of the Page credential. Confirm the exact FEH Page and granted permissions; do not request advertising or unrelated-business access. Additional permissions must not be silently added if Meta refuses the minimal scope.
2. Create or identify a specifically authorised synthetic enquiry on the real FEH form, with the owner's approved test mobile. Pin its ID and a short expiry before any Graph read. Arrange an authentic provider notification/re-delivery and retain its evidence; a locally signed replay alone is not proof of Meta-originated form delivery.
3. Confirm app publication requirements/use-case approvals and obtain the explicit publication decision. Prepare the callback change to `/meta-form`, restricted ingestor credentials and settings before enabling the bounded test. Keep advertising paused and SMS STOP on. Publication allows real Page notifications at the platform level, while this handler rejects unapproved IDs before Graph retrieval.
4. Prove actual retrieval and one durable reservation. SMS execution needs a new bounded authorisation; the completed owner case cannot be reused. No new SMS is approved or sent by this increment.
5. Complete Google permanent intake while preserving email delivery; its temporary webhook remains removed. Finish controlled automatic worker invocation, delivery/STOP callbacks, consent/authorisation review and security-checkpoint acceptance before a production launch decision.

The current Meta contact mapping covers company, name, phone and email. The real form's qualification-answer field names and CRM mapping still need verification when form access is available. Do not claim that all form answers are already mapped. The temporary receiver is not suitable for permanent advertising intake.

## Completion Evidence Block

- **Scope completed:** saved existing FEH policy/deletion links and verified Meta settings readiness; prepared four minimal permission choices without granting; hardened and bundled real-form staging intake; installed disabled v7; documented the exact outstanding security gate.
- **Created:** `frontend/src/lib/lead-gateway/metaFormStaging.test.mjs`; this report.
- **Modified:** `frontend/src/lib/lead-gateway/ingestMetaLeadAcknowledgement.server.ts`, `intakeReceiver.server.ts`, `metaIngress.server.ts`, `metaWebhookReview.server.ts`, `previewDatabase.server.ts`, `providerIngress.test.mjs`; `scripts/build-intake-receiver.mjs`. **Deleted:** none.
- **Tests:** focused 174/174; relevant regression 1,082/1,082; five hosted negative/disabled checks passed. No skipped regression tests.
- **Typecheck:** PASS. **Lint:** PASS. **Build/runtime:** generator, Deno check and hosted bundle PASS. Next.js build not rerun: no new Next route, page, dependency or framework configuration; application typecheck and affected handler tests passed.
- **Git/commit/push:** exact files prepared for a normal expected-head publication on the existing review branch and draft PR115; final hashes and clean-state result are recorded in that PR. No merge, force push or baseline rewrite.
- **Deployment/migrations:** staging Edge v7 active with form feature disabled; no new settings or database migrations. A review-branch push may create a separate Vercel Preview; that Preview is not the verified runtime here.
- **External systems:** Meta existing non-secret app URLs saved and permission choices prepared; Supabase staging function updated and control-state read; GitHub review branch only. Google/Telnyx unchanged.
- **Credentials accessed:** no provider secret, Page token, password, OTP or database credential read/generated/copied in this increment. Existing service authentication was reused.
- **Production/customer data:** no production CRM/database changes, no customer records requested or processed; unpublished Meta app settings changed. No ads enabled or SMS sent.
- **Remaining risks:** actual Page access/retrieval/publication, qualification-answer mapping, new single-test sending authority, permanent Google connection, callbacks/automatic worker, policy review and the protected-path checkpoint remain incomplete. Existing advisor findings were not changed; no new schema or RLS change here.
- **Recommended next gate:** the concrete Page access approval, followed by verified token scope and a nominated real-form test; app publication is a separate explicit decision. Production and advertising stay excluded.
