# FEH Verified Lead + OTP — Review-Only Foundation

Status: **review-only / non-executing**

This package prepares the deterministic qualification and mobile-verification boundary for a future progressive FEH Health Check. It does **not** change the current public form, database schema, Meta/Google campaigns, Telnyx configuration, SMS delivery, Mission Control runtime, or production deployment.

## Commercial target

Future journey:

1. UK business eligibility
2. Energy need: electricity / gas / both / COT / billing or meter issue
3. Contract end / renewal timing
4. Approximate monthly spend
5. Current supplier
6. Responsible for / authorised to discuss the business energy account
7. Business and contact details
8. Mobile OTP verification
9. Authoritative CRM persistence
10. Human callback / quotation workflow

The mobile-verification step is a quality gate, not contact permission by itself.

## Review-only CRM vocabulary

- `REJECTED_NOT_BUSINESS` — not a UK business enquiry.
- `UNVERIFIED` — missing consent and/or no valid mobile verification evidence.
- `VERIFIED_REVIEW` — mobile verified, but authority/urgency/value does not justify the hot-lead state.
- `VERIFIED_CALL_NOW` — mobile verified + consent + declared authority + urgent renewal + meaningful spend.

Priority vocabulary:

- `Blocked`
- `Review`
- `Warm`
- `Hot`

A `Hot` classification is a recommendation for prompt **human** review/callback. It does not authorize SMS, phone, email, Meta/Google actions, provider execution, or any Factory 041 execution route.

## Hot-lead rule in this review package

All must be true:

- UK business
- enquiry contact consent is present
- mobile verification state is `VERIFIED`
- authority is explicitly `YES`
- renewal is out of contract or within 90 days
- monthly spend is at least the `1000_2000` band

The current supplier is useful qualification evidence but is not required to classify a verified urgent lead as hot; absence is retained as a review reason.

## OTP reuse

`verifiedLeadOtpReview.ts` deliberately reuses the existing
`verified-meter-lookup/otpChallenge.ts` receipt validation.

That existing primitive already provides:

- six-digit OTP format
- UK telephone normalization
- challenge expiry
- attempt/lockout handling at challenge verification
- destination binding
- request binding
- HMAC-backed verification receipts
- timing-safe digest comparison

The review wrapper:

- accepts a previously issued/verified receipt
- validates it specifically as an SMS receipt for the same request and telephone
- returns only `VERIFIED` or `HOLD`
- always returns `executionAllowed: false`

It contains **no delivery transport** and does not read provider credentials.

## Deliberately not implemented

This branch does **not**:

- alter the live Health Check UI
- add database columns or apply migrations
- create or persist OTP challenges
- send a real OTP
- call Telnyx or another provider
- mark a production CRM record hot
- activate the internal owner alert in PR #110
- activate the customer acknowledgement gate from PR #109
- restart Meta or Google Ads
- change tracking/conversion configuration
- merge, deploy, or change environment variables

## Future review gates before runtime wiring

1. Confirm the final progressive-form questions and wording.
2. Confirm lawful-basis/consent wording and data-minimisation requirements.
3. Decide the authoritative persistence model for OTP challenge/receipt evidence.
4. Keep OTP secrets server-only and separately provisioned.
5. Add rate limiting, bot controls and abuse monitoring at the request boundary.
6. Bind verified evidence to exactly one authoritative CRM lead.
7. Preserve provider-neutral dispatch and Factory 041 STOP/suppression controls.
8. Prove duplicate/replay handling before any customer acknowledgement.
9. Prove Meta/Google attribution separately from lead verification.
10. Complete staging tests before any production schema/runtime change.

## Files

- `frontend/src/lib/website-leads/verifiedLeadQualification.ts`
- `frontend/src/lib/website-leads/verifiedLeadQualification.test.ts`
- `frontend/src/lib/website-leads/verifiedLeadOtpReview.ts`
- `frontend/src/lib/website-leads/verifiedLeadOtpReview.test.ts`
- `docs/VERIFIED_LEAD_OTP_REVIEW_ONLY.md`

## Review request

Dominic should review:

- whether the hot-lead rule matches FEH commercial priorities
- whether OTP receipt reuse preserves the meter-lookup primitive's trust boundary
- whether any future persistence would accidentally treat identity verification as marketing consent
- whether the eventual CRM state transition needs an additional persisted verification record rather than a lead-column flag
- whether test coverage should be widened before any UI or database integration

**Do not merge or deploy from this document alone.**
