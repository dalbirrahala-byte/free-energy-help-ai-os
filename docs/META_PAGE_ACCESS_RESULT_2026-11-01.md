# Meta Page access and staging credential — 1 November 2026

**PASS: the approved FEH Page access, Page token storage and lead-notification subscription are complete. The complete advertising-to-CRM-to-SMS journey remains unproven.**

This follows the owner's explicit approval to grant **Free Energy Help CRM Leads** access to the FEH Facebook Page to read leads and manage notifications, including generating and securely storing its Page token in staging. It supersedes the pending-access status in `META_FORM_CONNECTION_PREPARATION_2026-11-01.md`; that report's disabled-handler, publication, sending and production limits still apply.

## Access and storage verified

- App: **Free Energy Help CRM Leads**, `1121337167194437`.
- Page: **Free Energy Help**, `100693684801233`.
- OAuth selection: **current Pages only**, exactly this Page selected. The separate Derby Energy Limited Page and future Pages were not selected.
- Meta confirmed `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` and `leads_retrieval` as **granted**, plus the standard `public_profile`. No advertising-management permission was added.
- The initial Page-token flow requested only listing/content scopes. The subsequent explicit four-scope request completed the approved lead-reading and notification permissions; the final granted permissions were checked using `GET me/permissions`.
- A Page token was obtained for the exact Page. Calling `GET me?fields=id,name` with that token returned the FEH Page ID and name, rather than a personal user ID.
- Saved as **FEH_META_PAGE_TOKEN** in encrypted Edge Function secrets for staging project **vredwhyphrhsudggrsen**, saved timestamp **1 November 2026 20:47:32 UTC**. The displayed saved SHA-256 digest matched the generated token, compared privately.
- No token value was printed, committed, written to a local file, placed in a screenshot or copied into chat. The temporary Explorer token input and working variable were cleared and the Explorer tab closed after checks. The token is not claimed to be permanent: expiry/renewal behavior still needs verification before a durable production connection.

The token has Page-level access. The existing application gate, not the provider credential itself, restricts staging retrieval to one nominated test lead and a finite test window.

## Page notification subscription verified

The pre-change read of `100693684801233/subscribed_apps` returned no entries visible to this app. A single `POST` with `subscribed_fields=leadgen` returned `success: true`. Readback returned **Free Energy Help CRM Leads** with the `leadgen` subscription. The app-level callback remains the existing staging dashboard-test `/meta` callback; it was not changed to `/meta-form`.

Meta's official Lead Ads Testing Tool independently listed this app on the FEH Page and displayed **This app has no issues**. This is a provider setup diagnostic, not proof of a received form submission, a successful customer-lead read, or an acknowledgement SMS.

The tool also lists existing Zapier and Metricool associations with warning indicators. They were neither modified nor diagnosed in this step. Their downstream behavior must be understood before a real-form synthetic submission; this report makes no assertion that other integrations cannot react to it.

## Form verification and least-privilege limit

The exact intended form exists in Meta's testing UI:

- **FEH | UK Business Energy Review | 2 Questions | Oct 2026**
- ID **1788543365401126**

Its preview asks when the current business-energy contract ends and roughly how much the business spends on energy each month. Visible preview identifiers are `when_does_your_current_business_energy_contract_end?` and `roughly_how_much_does_your_business_spend_on_energy_each_month?`. These are UI observations, not yet a verified Graph payload schema or completed CRM field mapping.

A direct form metadata API read returned code 100/subcode 33 (object unavailable or missing permissions). A narrow Page form-list read then returned code 200 explicitly requiring **pages_manage_ads**. That broader permission was **not** requested or granted. The official testing UI provided form identity and preview without adding it. Actual single-test-lead retrieval remains to be proven; do not infer from the form-list error that it will succeed or fail.

No lead was created, deleted, read or submitted. The preview was closed without entering answers. No consent wording or contact-permission policy was changed.

## Final controls and next work

Fresh staging checks after the access/storage/subscription work:

| Check | Result |
| --- | --- |
| SMS emergency control | stopped |
| Existing SMS attempts | 1, unchanged |
| Existing acknowledgement reservations | 1, unchanged |
| Active execution authorisers | 0 |
| Hosted GET `/meta-form` | 404, still disabled |

No new SMS, STOP release, app publication, ad activation, production change, deployment, migration or merge occurred. The previous one-use SMS case remains completed; its authorisation cannot be reused.

Next, prepare a nominated synthetic enquiry and confirm the form-answer mapping, authentic provider delivery/re-delivery and one durable acknowledgement reservation. Keep the exact lead-ID gate and finite expiry. Resolve effects on other existing integrations before submitting the real form. App publication and any new bounded SMS execution/STOP release require their separate owner decisions once prepared. Google permanent intake, automatic worker and callbacks, consent/authorisation review, and the existing protected-path security checkpoint remain open.

## Completion Evidence Block

- **Scope completed:** approved Page access granted and verified; Page credential generated, identity checked and saved encrypted in staging; Page `leadgen` subscription written and read back; official Meta diagnostics and form preview inspected.
- **Files created:** this evidence report. **Files modified/deleted:** none in this increment. Application code and existing reports unchanged.
- **Validation:** four requested permissions granted; Page identity correct; saved secret digest match; subscription write returned success and GET readback confirmed app/field; testing UI reports no app issues; staging STOP/count query unchanged; disabled route returned 404.
- **Tests/typecheck/lint/build:** not rerun because this increment changes provider configuration and documentation, not application code. The previous 1,082-test regression result is historical, not a new run.
- **Git/commit/push:** prepared for a narrow normal expected-head publication to the existing review branch and draft PR115; final hashes/status recorded in the PR. No merge, force push or baseline rewrite.
- **Deployment/migrations:** no deployment or migration; existing staging Edge v7 and disabled form handler retained.
- **External systems:** Meta OAuth/Page subscription changed; Supabase staging secret added and control state read; GitHub evidence publication only. Google/Telnyx unchanged.
- **Credentials accessed:** yes, approved Meta user/Page tokens generated and used privately; Page token saved only to approved staging secrets. No password/OTP requested, no app secret reset, no production credential accessed.
- **Production/customer data:** no production CRM/database or advertising changes; no customer lead records accessed. The real FEH Page's app access and subscription changed as approved.
- **Remaining risks:** unproven actual form delivery/retrieval/answer mapping, token lifecycle, effects of existing Page integrations, app publication, new bounded sending authority, permanent Google intake, worker/callbacks and prior protected-path review.
- **Recommended next gate:** complete preparation for the controlled form enquiry/replay test, preserving the existing lead-ID and STOP restrictions; request only the specific additional activation decisions that the prepared test requires.
