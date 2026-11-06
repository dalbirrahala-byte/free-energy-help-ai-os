# Google hosted fixture and replay result — 2 November 2026

Owner request `1cd82a7d-f1dd-4fcb-80cd-93ce655246b3` continued the Google staging connection after manually entering its replacement key. **PASS: two official Google dashboard fixture requests reached the new stable staging receiver and were safely deduplicated. NOT COMPLETE: saving the Google form configuration or the ordinary Google-to-SMS acceptance journey.**

## Exact test and result

Preflight: clean local `1ddfc9a641b09ae76add203d4dd90ef257ffae75`, remote `5902eb5f0d260685705b5cefe6c6c589fc88f24c`, matching tree `4f2e1e160dbe2679fb424559467055c08e4091e5`. Relevant receiver implementation and root AGENTS were inspected; source was not changed. PR115 remains draft and unmerged.

Google's form editor contained the exact staging URL and an owner-entered 40-character key, but showed **Invalid URL** and disabled **Apply**. The form had therefore not been saved despite the owner's attempted submission. A valid-key test was performed under the existing explicit approval to deploy and test `feh-google-lead-intake` in staging only.

- Enabled only `FEH_GOOGLE_RECEIVER_ENABLED` at **19:26:45 UTC**. Scope remained `owner-test`; legacy/Meta intake remained closed. The global sending stop was never released.
- Missing-key hosted POST returned **403** during the test window.
- Clicked Google's **Send test data** twice, once followed by a controlled repeat. Google displayed **Test data sent.** after each request.
- Staging `audit_log` recorded `external_lead_duplicate`, entity **6**, at **19:27:28.671026 UTC** and **19:29:06.518642 UTC**, both with `data_differs=false`.
- Google's fixed fictional test identity already existed as CRM lead **6** from the earlier legacy receiver test. These requests therefore prove new-endpoint provider authentication, database connectivity and duplicate handling; they do **not** prove a newly created enquiry or acknowledgement reservation.
- Final totals remained **3 Google leads**, **2 acknowledgement reservations**, **2 dispatch attempts**; lead 6 has **0 reservations**. No SMS was sent and no authority or customer permission was created.
- Restored `FEH_GOOGLE_RECEIVER_ENABLED=false` at **19:29:51 UTC**, verified the false digest, then hosted **GET 404 / POST 404**.
- Fresh final controls: **stopped**, active grants **0**, approved adapters **0**, unconsumed authorizations **0**.

## Google editor limitation and handoff

The Google editor continued displaying **Invalid URL** and disabling **Apply**, although its displayed webhook URL was exact, the field's native/ARIA validation was clear and both provider tests succeeded. No disabled control was forced. Focusing/revalidating the same URL did not clear the error. Navigating between the form's tabs to inspect the stale validation state reset the unsaved webhook fields. This was an agent-caused loss of unsaved input, not a failed key or failed receiver.

The agent restored the exact endpoint URL using normal typing and reconfirmed the original owner-email notification was selected. The key field remains for the owner to refill from their private password manager. Do not claim the webhook was saved; do not remove email notification to work around the editor. Do not repeat an Apply instruction against a disabled button. After owner entry, inspect only non-secret validation messages and, if necessary, perform another bounded validation test before handing back the enabled final save control. Keep intake closed between active tests.

One initial accessibility observation unintentionally surfaced the owner-entered key field. A subsequent broad accessibility request was rejected by automatic approval review because redaction after reading was unnecessary credential access. The agent switched to narrowly scoped non-secret status/URL/button checks; it did not retrieve the key from a vault, use it in shell commands, copy it into source, or include it in this report. Avoid full-page accessibility/screenshot capture when a populated key field is visible, and include private credential handling in the eventual release review.

## Completion Evidence Block

- **Completed:** official provider validation and controlled duplicate fixture on the newly deployed endpoint; audit correlation; no-send/control assertions; verified closure; preserved original email selection and restored public endpoint draft.
- **Files:** created this report only; no application, test or migration code modified/deleted.
- **Tests:** one hosted missing-key **403**, two Google UI **Test data sent** results with two matching durable duplicate audits, final hosted **GET 404 / POST 404**, final aggregate/control SQL readback. HTTP 200 was not independently captured for the provider-originated calls and is not asserted as an observed transport status. Prior local test suites are not newly rerun here. Documentation whitespace check passed before commit; typecheck/lint/build not applicable to this report-only change.
- **Tooling:** first audit query incorrectly used `created_at`; corrected to schema-defined `occurred_at`, then succeeded. A read-only DOM attempt used an unavailable `NodeFilter` constant; replaced with scoped visible text checks. A normal URL typing timeout left partial text; it was inspected and completed to the exact endpoint. No product source correction was required.
- **Git:** narrow evidence commit and normal expected-head publication to PR115, with final hashes in PR/run evidence. No merge, force push or accepted-checkpoint change; no unrelated changes.
- **Deployment/migration:** no code redeployment or migration. Secret refresh moved Google config to **v6**, still code **v1** and bundle `9b9ae80dbc728a174c94e048db7f674b13212fee281c323d5642a608d8f8d0bb`; legacy config **v25**, still code **v16** and unchanged bundle. STOP was not changed.
- **External systems:** Google Ads official test UI and unsaved form preparation; Supabase staging switch changes, synthetic audit writes through the restricted receiver, and read-only verification; GitHub evidence publication. Owner-email setting was not changed. Account banner continued to say no ads running; no ad activation/spend.
- **Credential handling:** owner-entered integration key used by Google's test UI; initial populated field was inadvertently included in an accessibility observation, subsequent checks excluded credential values. No credential value is committed or reproduced here.
- **Production/customer data touched:** no. **Real sends:** none. **Final runtime state:** closed intake and stopped SMS sending.
- **Remaining gates:** Google form must be successfully saved/reopened with email preserved; fresh ordinary owner-only Google payload/reservation and replay proof; Preview key alignment; renewal of expiring restricted ingestion credentials; automatic acknowledgement authority/invocation, customer STOP callbacks and protected-path/five-group acceptance.

## Follow-up after owner re-entry — 19:56 UTC

Owner request `b3494f85-543a-4bd4-87a6-74e3fd3c89b1` confirmed the key had been re-entered. Preflight was clean local `a1e7a983b5ba03ba5b6e57d495c28e23ff54476c`, remote `6bbc65c899735e76126e9a73299a04a91253a811`, matching tree `fb79a2f6f14f08adf73c3888c0d5bc606b35473b`. No concurrent changes were overwritten.

The non-secret UI character counter confirmed 40 characters. A single further Google **Send test data** request was made during a bounded receiver-only validation window, with STOP retained. Google again displayed **Test data sent.** Supabase's function-edge log aggregate for **19:55–19:57 UTC**, restricted to function `ba5b9c42-952b-4711-814c-7a9aa700815a`, independently reported **one POST, HTTP 200**. The durable audit at **19:56:07.579899 UTC** was `external_lead_duplicate`, entity **6**, `data_differs=false`. This is authentication and duplicate-fixture proof, not a fresh acknowledgement reservation or SMS test.

Receiver false was saved at **19:56:41 UTC** and its false digest verified. Subsequent hosted **GET 404 / POST 404** confirmed closure. Final SQL readback: STOP **stopped**, grants **0**, approved adapters **0**, unconsumed authorizations **0**, reservations **2**, dispatch attempts **2**. Google configuration is now **v8**, still code **v1** with the same bundle; legacy configuration **v27**, still code **v16** with the same bundle. No code redeployment or migration occurred.

The Google form still reports **Invalid URL** on Lead management and disables **Apply**, despite the successful authenticated POST. Other form sections display check marks. The original owner-email option remains selected; the populated key and URL are retained in the current unsaved editor. Do not reload or change tabs, repeat the test, request a new key, or treat this as a saved permanent connection.

No page WebMCP tools are available. The connected Google Ads action catalog was inspected: its 34 supported actions do not include updating this lead-form webhook/email delivery configuration. No connector mutation was attempted. A normal attempt to click the inner webhook panel's **Close** control was rejected by automatic approval review because it might discard the unsaved key and URL. That action was not executed, forced, or bypassed. The next UI recovery step requires specific owner approval for that potential loss of unsaved fields; final credential submission remains an owner handoff. The prior combined email/webhook save limitation is also documented in `GOOGLE_META_INTAKE_STAGING_2026-11-01.md`; removing owner email is not an approved workaround.

### Follow-up Completion Evidence Block

- **Scope completed:** re-entered-key provider validation, independently observed HTTP 200, exact duplicate audit correlation, verified receiver closure and no-send controls; inspected supported save alternatives.
- **Files:** modified this evidence report only; no application/test/migration files created, modified or deleted.
- **Tests and results:** one official Google test succeeded; one matching HTTP 200 and duplicate audit; final GET 404 / POST 404; final control/count SQL passed. Google permanent save remains **BLOCKED** by editor validation. No fresh enquiry-to-reservation or SMS result is claimed.
- **Typecheck/lint/build:** not applicable to this evidence-only change; prior suites were not rerun. `git diff --check` passed.
- **Git:** narrow local commit and normal expected-head publication to the existing draft branch; exact resulting hashes recorded in PR115. No merge, force push, baseline change or unrelated edits.
- **Deployment/migration:** unchanged function code/bundles, config revisions v8/v27 from the bounded enable/disable window; no migration. Sending STOP was never released.
- **External systems:** Google Ads official synthetic test and read-only UI inspection; Supabase staging receiver switch and read-only controls/audit/log checks; Google Ads connector capability discovery; GitHub evidence update. No ads, spend, outreach or real SMS.
- **Credentials accessed:** no credential value read in this follow-up; Google's test used the owner-entered key. All new browser observations excluded its value. The earlier observation incident remains disclosed above.
- **Production/customer data touched:** no. Existing synthetic lead identity only; no new send authority or consent.
- **Remaining gates:** successful permanent Google form save with original email preserved, ordinary bounded intake/reservation proof, automatic attributable acknowledgement authority/invocation, customer STOP and delivery handling, Preview/credential alignment and final acceptance review.
- **Next gate:** owner decision on the explicitly described Google editor recovery risk; keep current key/URL draft intact and staging closed meanwhile. No additional deployment approval or newly generated key is needed for the already-passed validation.
