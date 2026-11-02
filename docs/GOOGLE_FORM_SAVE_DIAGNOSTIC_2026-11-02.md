# Google form-save diagnostic and repair gate — 2 November 2026

Owner request `75c792cb-6c98-4b18-b6fd-8a2ee9b1a849` explicitly approved closing the inner webhook section despite the potential loss of unsaved fields, and requested a lasting solution. **The approved action completed; the fields survived. Permanent save remains BLOCKED, and the underlying Google validation cause is not established.**

## Current evidence

Preflight local `56dddb5fa4e2d0012e348cd6ac7597e63c265f35`, remote `d895076071fdc7608ae405fc3184ee6b682f261c`, matching tree `d4c7a65344b99e128a48ff8be169840bac10d744`; clean local tree. Root AGENTS and existing implementation/evidence govern this report; no application code change is justified by the observations.

- Clicked **Close inside the webhook section** after the exact owner approval. The section collapsed; Apply stayed disabled and Lead management retained Invalid URL.
- Reopened via its **Create** control. The exact public staging URL and the non-secret 40-character key counter were retained. No key value was read, copied, generated or changed.
- Performed one ordinary keyboard revalidation of the public URL by deleting/retyping its final character, then blurring. The exact URL was restored. Invalid URL and disabled Apply persisted. This cleared the old test-success indicator, so that indicator is not currently displayed; it does not invalidate the already-recorded HTTP 200/audit evidence.
- All four other section headings show completion check marks. The error is attached to Lead management. Native/ARIA URL validation was clear. Neither these observations nor the successful webhook POST establish the underlying cause of Google's save refusal.
- No disabled button was forced, form tab switched, page reloaded, email delivery removed, asset replaced, new provider test invoked, or campaign activated. The current key/URL draft is preserved.
- Google's official instructions require entering URL/key, successfully testing, and saving. The published error-state guidance does not explain this observed combination of a successful HTTP 200 test and persistent Invalid URL/disabled Apply. See [Google webhook setup](https://support.google.com/google-ads/answer/16729613?hl=en) and [WebhookDelivery API fields](https://developers.google.com/google-ads/api/reference/rpc/v26/WebhookDelivery).
- The previous run established that no page WebMCP or available Google Ads connector action can update this lead-form delivery configuration. No unsupported private API, hidden application state or credential extraction was used.
- The account's **Help → Contact us** control opened a private Google Ads chat surface. No message was typed or sent. Its generated campaign recommendations were not acted on. The help chat was closed again to preserve the editor.

## Prepared private support report — NOT SENT

**Subject:** Existing lead form passes webhook POST test but Apply is disabled with Invalid URL

Please investigate the saved/draft lead-delivery configuration for Google Ads account **553-034-0666**, lead-form asset **402325113451**, associated campaign **24096131756**. The campaign must remain paused, and the original owner-email notification must be preserved.

The exact webhook endpoint is `https://vredwhyphrhsudggrsen.supabase.co/functions/v1/feh-google-lead-intake`. During an approved staging test on **2 November 2026 at 19:56:07 UTC**, Google displayed Test data sent and our receiver independently logged one authenticated **POST 200**, with a matching durable duplicate-test audit. Earlier tests also succeeded. No SMS was sent.

However, Lead management continues to show **Invalid URL**, and **Apply** remains disabled. Other form sections show completion check marks; the URL field has no native/ARIA validation error. Closing/reopening the webhook section retained the entered fields but did not clear the error. Ordinary keyboard revalidation of the exact public URL also did not clear it.

Please identify the precise field/validation rule preventing save and provide a supported repair for this existing asset that preserves both webhook delivery and the original email notification. Please do not remove email delivery, activate ads, alter budgets, duplicate the campaign/form, or request the secret key in chat. If a server-side or product issue needs escalation, please route it to the appropriate Google Ads team and provide a case reference.

The staging receiver is intentionally closed outside approved test windows; a current unsolicited probe will not return 200. Please use the recorded successful test evidence rather than treating the closed state as proof of a wrong key. A coordinated additional test can be arranged only if diagnostically necessary. No key, token, password, customer data, raw request headers or secret-bearing response is included in this report.

## Lasting resolution and acceptance

1. Obtain the exact Google validation failure and a supported correction to this existing asset. Use its official editor, or a supported Google Ads API update only when an authorized capability exists. Do not invent a proxy endpoint, relax receiver authentication, remove email delivery or force disabled UI controls merely to get a save.
2. Preserve the existing stable FEH staging URL and private key. Avoid repeated key generation/re-entry as a diagnostic step: the key has already authenticated successfully. Owner handoff remains necessary for any new credential entry/final credential submission; the final control must first be enabled.
3. After a successful save, reopen and independently verify the retained webhook endpoint and original owner-email delivery, with campaign paused. Only then call this a saved staging connection. The present receiver remains restricted owner-test scope, not an active production intake.
4. Complete the existing bounded ordinary-enquiry reservation/replay acceptance, credential renewal/monitoring, automatic acknowledgement authority/invocation, signed customer STOP/delivery handling and protected-path review. The earlier fixed Google dashboard fixture proves none of these additional gates.

## Completion Evidence Block

- **Completed:** owner-approved inner Close/reopen recovery; retained-field verification without secret access; one precise public-URL revalidation; identified private official support entry point; prepared a secret-free support report and durable repair acceptance criteria.
- **Files:** created this diagnostic/support report only; no application, test or migration changes/deletions.
- **Tests:** close/reopen retained exact URL and 40-character counter; save validation still failed; key value excluded from observations. No new hosted fixture, SMS or customer test. Prior HTTP 200/duplicate proof remains in `GOOGLE_HOSTED_FIXTURE_RESULT_2026-11-02.md`. Documentation whitespace check performed before commit.
- **Typecheck/lint/build:** not applicable; no source changes and no redundant test rerun.
- **Git:** narrow commit and normal expected-head publication to draft PR115, final hashes in its publication record; no merge, force push or protected-checkpoint change. Preserve unrelated work; local tree clean after publication.
- **Deployment/migration:** none. No Supabase/Vercel configuration or runtime-control changes this increment. Last verified state remains Google config v8/code v1, legacy config v27/code v16, receiver closed, STOP stopped, zero active grants/approved adapters/unconsumed authorizations, two reservations/two attempts.
- **External systems:** Google Ads editor/help read and reversible unsaved public-URL editing; official Google documentation; GitHub evidence publication. No message submitted to Google or others.
- **Credentials accessed:** no values read or changed; existing user-entered credential remained in the UI. **Production/customer data touched:** no. **Real sends/ad activation/spend:** none.
- **Tooling:** a read-only tablist locator initially matched three elements; narrowed to the Lead management stepper. No browser safety rejection occurred after the owner's exact Close approval.
- **Remaining risk/gate:** root cause and permanent save unproven. Sending the prepared report through Google's private help/support channel needs explicit approval for that external communication; approval to close the form is already satisfied and must not be requested again.
