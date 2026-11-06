# Advertising intake preparation — 1 November 2026

**PASS: synthetic Meta lead retrieval and qualification-answer implementation. BLOCKED: authentic Meta form notification → CRM → SMS is not yet proven. Google permanent intake is also unfinished.**

This increment continues the approved preparation. It does not publish the Meta app, activate advertising, release SMS STOP, send a new message, merge, apply a remote migration or manually deploy a function.

## Current provider evidence

One default dummy lead was created using Meta's official Lead Ads Testing Tool, for FEH Page `100693684801233` and form `1788543365401126` (**FEH | UK Business Energy Review | 2 Questions | Oct 2026**). The generated synthetic lead is `1725668615656075`, created **2026-11-01 21:02:17 UTC**. No owner phone or customer details were entered. The test lead remains available; it was not deleted.

A single-lead Graph v26.0 read using the existing approved **user token** returned the correct ID, form, timestamp and generated fields. This proves actual lead-reading access with that token, without `pages_manage_ads`. It is not a fresh read using the saved staging Page token, and does not prove webhook arrival or CRM persistence.

The returned field names confirm the two FEH question identifiers:

- `when_does_your_current_business_energy_contract_end?`
- `roughly_how_much_does_your_business_spend_on_energy_each_month?`

The provider returned dummy placeholder answers, not selected option values. Contact fields are `email`, `full_name`, `phone_number` and `company_name`. No unrelated customer lead was requested.

Meta tracking reported **Pending / Lead publish in progress** for FEH app `1121337167194437`, and **Success / Successful webhook integration** for Zapier `234230510040096`. The latter is webhook-delivery success, not evidence of downstream email or SMS. It contradicts treating Zapier as dormant based on the separate diagnostics warning that no current Page admin installed it. Metricool also appears in diagnostics, without a leadgen subscription or lead-reading permission; it was not changed.

The FEH Page's Leads Access settings are currently **default access for all Page admins and connected CRMs**. The UI offers **Customise access**. No access was changed. Restricting CRM lead access needs an explicit decision because it can interrupt a vendor's existing delivery path; retain existing people access and unrelated integrations when implementing the agreed restriction.

The app's Page Webhooks screen confirms:

- `leadgen` is subscribed at v26.0.
- Callback remains the staging dashboard-only `/meta` route.
- Meta explicitly says unpublished apps receive only dashboard test webhooks; other data, including from admins, developers and testers, requires publication.
- The publication screen reports all required app settings complete and presents **Publish**. No publication was performed.

This explains the missing authentic form-delivery proof. Publishing alone will not complete intake: the callback must point to the prepared, bounded form handler and the matching staging settings must be installed first.

## CRM correction prepared and tested

Previously, the Meta mapper discarded both qualification answers. It now accepts only the two observed answer fields in addition to the existing contact fields, rejects duplicate/multivalue answers, caps each answer at 200 characters and rejects control characters. Unknown fields still do not persist. Missing answers stay absent; the application never converts a band into an invented contract date or marketing consent.

The migration adds an eleven-argument overload of the existing ingestion function, without defaults. Existing nine-argument callers remain compatible. The overload validates the answers, invokes the established atomic intake/reservation function and writes labelled text into the existing nullable `leads.notes` only for the newly accepted lead. CRM detail/edit views already expose that field. A replay never overwrites notes, backfills an existing lead or reserves another acknowledgement. A notes-storage failure rolls back the entire receipt, reservation and audit.

The function retains an empty search path, explicit relation names and only the existing ingestor's execute grant; PUBLIC, anon, authenticated, service_role and the worker have no execute permission. No table, column, role, login, sending grant or new worker route is introduced. Raw answers are not copied to audit metadata or logs.

Live staging inspection confirmed `leads.notes` is nullable text and the existing ingestion function currently has nine arguments with SECURITY DEFINER and an empty search path. The new overload is **not deployed**. Deploy the migration before a receiver build that calls eleven arguments. Expected post-state is both reviewed overloads and unchanged sending controls. For recovery, disable form intake, restore the prior receiver build and revoke the new overload grant; retain received data and audit history.

## Google delivery inspection

Account `553-034-0666`, form `402325113451`, campaign `24096131756` remains email-only in saved asset metadata. Campaigns/ad groups are paused or removed. The current editor has separate **Create webhook integration** and **Get notifications** controls; expanding both retained the owner's existing email selection. This is useful evidence that the UI supports both, not proof that a combined configuration has been saved. No field was changed, Apply was not pressed and the editor was closed.

The current hosted `/google` handler is still restricted to Google's fixed dashboard test fixture; it is not a permanent customer-lead endpoint. Complete that implementation and verify saved webhook-plus-email delivery before launch. The earlier official Google test/replay success remains valid for its limited fixture scope.

## Validation and control state

- Initial focused run identified and corrected a missing closing brace in the new test helper; no product code or remote system was executed by that failed test file.
- Focused corrected suite: **95 passed, 0 failed**.
- Lead acknowledgement suite before the final additional historical-lead replay assertion: **501 passed, 0 failed**.
- Final combined identity, suppression, compliance, outreach, authorisation, dispatch and intake regression: **1,094 passed, 0 failed, 0 skipped**. Includes a real PostgreSQL engine in isolated PGlite for atomicity/privilege checks; not multi-session race or live-provider proof.
- TypeScript typecheck, targeted ESLint, diff whitespace check and thirteen-file Edge artifact generation: PASS.
- Deno check with the identical installed postgres 4.0.0 dependency: PASS.
- Prepared artifact SHA-256: `b8c92658b0243eb3aaec12d7578ec572ed16543b82f642f21b3cfdc16b034182`. Not deployed.
- Fresh staging controls: STOP **stopped**, existing SMS attempts **1**, acknowledgement reservations **1**, active execution authorisers **0**. Exact new synthetic lead ID has **zero CRM receipts**.
- A targeted 21:00–21:20 UTC unified-log query returned no entries, including a source-count query. This is not proof of delivery or non-delivery; the CRM count and Meta status are the authoritative observations available here.
- Remote pre-increment head `78cfd391246dfa16549ec8da7e361e13e5e408d4`: CRM Navigation Guard and FEH Loop Engineering passed. Factory 041 run `41349109916`, job `124975222253`, passed tests/typecheck/lint and failed its protected-path checkpoint. This increment adds one further migration to that review surface. No checkpoint bypass or merge.

## Credential-handling exception

Opening Graph API Explorer caused its automatic initial browser snapshot to display an existing Meta user token in diagnostic tool output. Subsequent observations were redacted and the displayed token field was cleared. The value was not copied into code, fixtures, this report, screenshots or Git; no new Page token was generated or staging secret changed. This report does **not** claim the token never appeared in tool output. Revoke/expire that diagnostic user token before production use, taking care not to silently invalidate the separately saved Page credential. No evidence of access outside this conversation was observed.

## Prepared next gate

The concrete next owner decision is to isolate FEH lead delivery from the existing Zapier path, apply the reviewed staging-only migration and receiver build, and publish the Meta app with the bounded form callback. Retain the exact Page/form, nominated lead ID, owner-only test mobile, signature checks and a short expiry no later than 6 November 2026. Establish provider-originated delivery/retry; do not substitute a locally signed event and call it Meta delivery.

Replace the identified default dummy test lead only when deletion and the new owner-data submission are approved. The owner test would disclose the approved test mobile to Meta and the FEH staging CRM. No customer recipients are permitted. A subsequent single acknowledgement would use the existing fixed template, Telnyx sender ending 1020 and owner recipient ending 7373, stating callback number **01332 605506**. It requires a fresh exact-case approval, transient sending authority, one STOP release, at most one provider CREATE, replay verification and restored STOP/revoked temporary authority. Do not reuse the completed previous owner case.

App publication can enable real Page notifications at Meta's platform level; the application must reject every unapproved lead ID before requesting details. Google permanent intake, controlled automatic worker invocation, delivery/STOP callbacks, token lifecycle, contact-permission review and protected-path acceptance remain launch gates. Neither platform is approved to start spending or process general customer enquiries by this increment.

## Completion Evidence Block

- **Scope:** actual synthetic Meta lead retrieval, field-schema verification, cross-integration delivery diagnosis, Google delivery UI inspection and dormant qualification-answer correction.
- **Created:** this report; `supabase/migrations/20261101213000_meta_qualification_answers.sql`.
- **Modified:** `frontend/src/lib/lead-gateway/ingestMetaLeadAcknowledgement.server.ts`; its `.server.test.ts`; `frontend/src/lib/lead-gateway/previewDatabase.server.ts`; `frontend/src/lib/execution-dispatch/leadAcknowledgement.database.test.mjs`. **Deleted:** none.
- **Tests:** corrected focused 95/95; intermediate acknowledgement 501/501; final regression 1,094/1,094, zero skips. Typecheck/lint/diff/generator/Deno PASS.
- **Build:** no new Next route, UI component, dependency or framework configuration; Next production build not rerun. Existing notes UI inspected in source; hosted rendering of the new data remains a post-activation check.
- **Git:** narrow normal publication to the existing draft PR115/review branch; exact local/remote commits, shared tree and final clean state are recorded in the PR. No force, merge or history rewrite.
- **Deployment/migrations:** none applied; deployed staging receiver remains v7, form handler disabled and existing callback unchanged. A normal review-branch push may trigger a separate Vercel Preview; that is not the verified staging receiver.
- **External systems:** one synthetic Meta lead created/read and delivery status checked; Meta/Google configuration inspected without changing it; Supabase staging schema/control/receipt/log reads; GitHub review-branch publication only.
- **Credentials accessed:** yes, existing approved Meta user credential reused; diagnostic exposure exception described above. No password/OTP, app-secret reset, production credential or new secret storage.
- **Production/customer data:** no production CRM/database changes or customer lead records accessed. The synthetic test was on the real FEH form and was delivered to existing Zapier; downstream behavior is unknown. No new SMS or ads activated.
- **Remaining risks / next gate:** provider publication and bounded staging activation, isolation of other CRM delivery, fresh one-case SMS authority, Google permanent intake, worker/callbacks and security-review acceptance.
