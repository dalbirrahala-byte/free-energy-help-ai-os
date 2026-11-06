# One enquiry → one received acknowledgement SMS — staging evidence

**PASS for the single owner-controlled staging test.** On 1 November 2026, the CRM created one synthetic enquiry, made one successful Telnyx send attempt and the owner confirmed receipt with a handset screenshot. Replaying the identical enquiry returned `duplicate`, reserved no further acknowledgement and left the attempt count at one. This is not a claim that live Meta/Google intake or production advertising is ready.

## Observed result

| Check | Result |
| --- | --- |
| Supabase project | Staging `vredwhyphrhsudggrsen` only |
| Owner authentication | Real CRM session and one verified authenticator factor |
| Approval provenance | Owner-session intent approval and adapter approval saved; approved actor matched the configured owner |
| Synthetic enquiries / reservations | 1 / 1 |
| Dispatch attempts / successful attempts | 1 / 1 |
| Telnyx message reference | `4031a197-5ab9-428f-891e-541b9be5e082` |
| Handset receipt | Owner screenshot at 13:44 showing the exact message and sender |
| Identical intake replay | `duplicate`, same lead, `acknowledgement_reserved=false`; audit `data_differs=false` |
| Repeat claim / eligible candidates | `blocked` / 0 |
| Final test scope | `finished`, disabled |
| Final sending stop / adapter | `stopped` / disabled |
| Final temporary grants / account role | 0 active / `read_only` |

The fixed message was:

> Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from 01332 605506 during business hours.

The approved owner destination ends **7373**. The Telnyx sender ends **1020**. The customer's expected callback number is **01332 605506**. The user's handset image was inspected in the conversation and was not copied into this repository; no owner recipient number, password, MFA setup secret or provider key is published here.

## Real execution evidence

- Tested protected Preview: `dpl_EyCEptTjeDdG9nBByrCDxPXVuNd9`, source commit `c356578586347e0b543a8669ba550e4ffcb6d84e`.
- Test page: `https://free-energy-help-ai-4zdccu1jk-free-energy-help.vercel.app/acknowledgement-test-preview`.
- Owner approval prepared at **13:43:40 UTC**, while STOP remained enabled. One intent approval and one matching approved adapter were saved by the real owner session. No service-role impersonation or remote synthetic JWT was used.
- Controlled begin at **13:44:24 UTC** created the one authorization and released STOP; automatic finish at **13:44:29 UTC** restored STOP, disabled the adapter and scope, revoked the two pinned capabilities and restored read-only access.
- The restricted worker's actual Telnyx call was accepted and finalized `succeeded`. The UI's success message was derived from persisted state and correctly distinguished provider acceptance from handset delivery.
- The owner then supplied the matching handset screenshot. Receipt and replay evidence were saved in staging audit actions `ack_owner_test_receipt_confirmed` and `ack_owner_test_replay_verified` at **13:49:26 UTC**. Receipt evidence is the owner screenshot, not an authenticated provider delivery webhook.
- Final independent read-back: one lead, reservation and successful attempt; two control events; no active grants; disabled adapter/scope; read-only account; STOP stopped.

## Replay scope and limits

The exact stored form, campaign, provider lead ID, creation time and original owner-test contact fields were replayed through `ingest_google_lead_with_acknowledgement`. The database returned duplicate for the same lead and no new reservation; its own duplicate audit recorded unchanged data. A subsequent call to the existing claim primitive returned blocked and the bounded worker selector returned zero candidates. Counts remained one; no provider call was made by replay verification.

Replay verification used the connected staging operator to call the same database primitives. A proposed runtime-role-switch check failed because that connection lacked membership; no membership was granted. Two diagnostic reads initially used incorrect column names and were corrected after reading the schema. The failed compound verification transaction left no saved replay record; the successful replay/result checks and audit were then performed explicitly. None of those diagnostic operations sent an SMS or reset any claim.

The original send used the deployed application and restricted worker connection. The replay proves the live database deduplication and claim controls for this case. It does not constitute a public Google webhook delivery, Meta Graph delivery, concurrent multi-session stress test, provider-side delivery callback test or customer marketing-consent approval.

## Authentication and access recovery

Vercel login, CRM login and authenticator enrolment were completed separately. Browser credentials stayed inside secure sign-in controls. When CRM sign-in was paused, temporary authority was removed. An attempted restoration before MFA was rejected automatically; no workaround was used. After the owner completed authenticator enrolment and staging confirmed a verified factor, restoration succeeded under the existing explicit owner approval. The real database guard then accepted the owner's AAL2 session.

At completion all temporary capabilities and admin access were removed by the deployed cleanup function. The verified authenticator factor remains on the account. No credential reset, duplicate account or weakening of Deployment Protection occurred.

## Remaining integration

1. Complete authenticated Meta and Google intake and test each provider event into the same CRM Inbox, including replay at the webhook boundary.
2. Complete provider delivery/STOP callbacks and controlled automatic worker invocation. General worker, Meta ingress and Google ingress flags remain false. Owner-test/SMS Preview flags remain scoped to the review branch, but the single-use database case is finished/disabled, its adapter disabled and authority revoked; it cannot be started again.
3. Review the Factory 041 accepted-checkpoint migration/application-security drift before merge. No baseline was changed. Production, customer sending and advertising activation remain outside this completed test.

The prior 1,034 local regression tests, typecheck, targeted lint and Next build passed for this unchanged application logic. CRM Navigation Guard and FEH Loop Engineering passed for the implementation; Factory 041's tests/typecheck/lint passed but its accepted-checkpoint drift step remains unresolved. The real owner-session, provider and handset evidence above now supplements those local tests.

## Completion Evidence Block

- **Scope completed:** installed controls exercised through real owner MFA/approval; one owner SMS received; identical database replay produced no duplicate; automatic STOP/access restoration independently verified.
- **Files created:** this report. **Updated:** preparation and installation reports with final-state notices. **Deleted:** none. No application, migration or dependency logic changed in this result-recording increment.
- **Tests executed:** real Preview owner flow, persisted approval/adapter checks, one live Telnyx send, handset evidence, identical database intake replay, blocked repeat claim, zero candidates and final count/STOP/access checks. No repeated broad local tests for documentation-only changes; prior results are identified above.
- **Git:** exact evidence files only; normal expected-head publication to the existing draft PR #115. No merge or force push. Final commits/tree and documentation Preview result are recorded in that PR.
- **Database:** approved temporary scope resumed only after verified MFA; real owner preparation/begin/finish persisted their evidence. Replay and receipt audits saved. All test records retained; no claim reset or deleted evidence.
- **External systems:** Supabase staging; protected Vercel Preview/CRM; one authorised Telnyx SMS to the owner; GitHub evidence record. Provider delivery confirmed by user screenshot, not a delivery webhook.
- **Credentials:** no credential values read/exposed/committed by the agent. Existing server secrets were used only by the deployed restricted runtime for the approved send. MFA enrolment was completed privately by the owner.
- **Production/customer data touched:** none; only the approved owner test contact and synthetic enquiry. No advertising activation.
- **Remaining risks/limits:** provider intake, delivery callbacks, controlled automation, live concurrent webhook replay and reviewed checkpoint acceptance remain incomplete. This passing single-case test does not authorize general customer outreach.
