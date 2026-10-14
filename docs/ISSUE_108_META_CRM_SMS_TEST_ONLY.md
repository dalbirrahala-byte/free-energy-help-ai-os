# Issue #108 — FEH Meta lead → CRM callback → SMS acknowledgement (Stage 1, review-only)

**Status:** Draft implementation, synthetic-data only. **No live SMS, no CRM writes, no webhook listener, no TT data import, no new provider, no secrets and no deployment.**

## Confirmed business requirement
- FEH owner-approved callback number: **01332 605506**. The actual outbound caller ID shown on a recipient's phone **still requires a separate test**.
- Meta Instant Form completion screen text (not configured by this PR):
  > Thank you for your enquiry. Dalbir from Free Energy Help will call you about it from 01332 605506 during business hours.
- One-off administrative SMS candidate (NOT enabled):
  > Free Energy Help: Thank you for your enquiry. Dalbir will call you about it from 01332 605506 during business hours.
- A branded SMS sender may not be the same thing as the outbound telephone caller ID. Do not claim otherwise.

## Included in this Draft PR
1. `frontend/src/lib/lead-gateway/acknowledgementReview.ts`: **pure non-executing decision gate** for pre-normalised Meta leads. Checks source-authentication evidence, CRM persistence, explicit callback request, form notice, administrative-SMS permission assessment, SMS suppression, mobile validity, prior attempts, duplicates, reservation evidence, caller-ID verification, timestamp and STOP. Every outcome is **executionAllowed=false / messageStatus=not_sent**.
2. `frontend/src/lib/lead-gateway/acknowledgementReview.test.ts`: 36 synthetic tests. No network calls, database calls or provider dispatch.
3. This document.

The output state `candidate_for_separate_review` **does NOT authorise sending**. The caller cannot establish source authenticity by setting evidence fields to true. These must eventually be independently assembled at a trusted server boundary from persisted, independently verified records. The proposed unique key **does not create an actual durable idempotency reservation**.

## Existing FEH architecture
- `frontend/src/lib/lead-gateway/adapters/meta.ts` is a **pure normalizer**; it does NOT authenticate Meta webhook signatures, retrieve Graph lead details or persist anything.
- `frontend/src/lib/lead-gateway/canonicalExternalLead.ts` is a pre-CRM data type. It currently supports only Meta; a TT or website adapter must be separately designed and authenticated, NOT disguised as Meta.
- Reuse the established Factory 041 permission, suppression, authorisation, STOP, durable-attempt and provider dispatch boundaries. Do not wire this gate into a live dispatcher.

## Next engineering slices (NOT implemented here)
- Independently verified Meta webhook reception and narrow Graph lead retrieval; reject replayed/untrusted events.
- CRM lead persistence, tenant RLS, attribution, duplicate/consent/notice receipt, callback owner and callback task with SLA.
- TT integration under its own verified lead source and data-sharing/consent rules; coordinate to avoid duplicate SMS by TT and FEH.
- Independently reviewed administrative-SMS legal basis, privacy notice, marketing distinction, suppression and recipient rights (especially sole traders).
- Separate approved SMS provider integration, fixed sender identity, webhook delivery receipts, provider errors and indeterminate outcomes. Do not blindly retry ambiguous provider attempts.
- Controlled tests of caller ID, lead-to-SMS latency, actual delivery and pickup rate after separate explicit owner approval.

## Suggested CRM tracking fields (design only; NO migration)
`provider`, `external_lead_id`, `form_id`, `campaign_id`, `ad_id`, `received_at`, `verified_at`, `notice_version`, `sms_permission_receipt`, `suppression_receipt`, `ack_idempotency_key`, `sms_attempt_status`, `provider_message_reference`, `sent_at`, `delivered_at`, `callback_due_at`, `first_call_attempt_at`, `answered_at`, `appointment_at`, `contract_outcome`. Keep PII out of debug logs.

## Verification and approvals
- Locally executed on Node 22.16.0 with `node --experimental-strip-types --test frontend/src/lib/lead-gateway/acknowledgementReview.test.ts`: **36 passed, 0 failed**. Used a temporary local stand-in for the existing canonical type during standalone strict TypeScript check; check passed. The stand-in is **not committed**.
- Not run: full FEH repository `npm run typecheck`, lint, build, CI, authenticated Supabase staging/RLS tests or real Meta webhook E2E. These must not be presented as passing.
- **Reviewer: Dominic.** Review and run native codebase checks, recommend additional safe engineering slices, and keep this Draft PR unmerged pending explicit separate approval.
- **Owner approval gate:** real SMS, provider/credentials/fees, production migrations, live Meta form changes, campaign changes, merge/deploy and real customer-data processing remain unauthorised.
