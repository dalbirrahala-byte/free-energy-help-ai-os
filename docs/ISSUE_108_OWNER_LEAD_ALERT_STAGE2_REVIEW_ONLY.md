# FEH Issue #108 — Stage 2A: internal owner SMS alert candidate (REVIEW ONLY)

**Scope: pure evaluator plus synthetic tests. This is neither live Meta ingestion nor an SMS sender.**

## Commercial purpose

When a *newly accepted*, authenticated Meta enquiry from the new FEH-owned form has been securely persisted in FEH CRM, prepare exactly one internal notification for an approved FEH member:

> FEH CRM: New verified Meta enquiry received. Sign in to the CRM and arrange a callback within one working day.

Do not put a customer name, email, phone number, spending information, MPAN/MPRN, account number, or bearer-token link in the SMS. This is an internal **staff** alert and must remain entirely separate from optional **customer** acknowledgement messaging and direct marketing permissions.

## Exact proposed implementation

1. A pure, non-sending TypeScript review evaluator in frontend/src/lib/lead-gateway/ownerLeadAlertReview.ts.
2. A standalone synthetic test suite in frontend/src/lib/lead-gateway/ownerLeadAlertReview.test.ts.
3. This handoff for independent review.

The FEH-owned Instant Form ID is **1788543365401126**. The TT Massive form ID **1618322856411605** must not trigger this FEH-only alert. A matching form ID string alone is NOT proof of authenticated Meta origin.

Only a newly accepted CRM lead, not a duplicate or rejected or unknown outcome, can become a *candidate* for an alert. All decisions, including a complete set of positive assertions, retain **executionAllowed=false**, **messageStatus=not_sent**. No SMS transport, contact destination, credentials, network request or database write exists in this change.

## Architectural cautions

- The current Meta adapter is a pure normaliser, not a signature verifier, Graph lead retriever or live CRM connector.
- The existing public.ingest_external_lead RPC distinguishes accepted, duplicate and rejected outcomes; it does not prove real Meta webhook acceptance is running.
- FEH v1's organisations table holds *customer company* information. It is not a tenant membership table. The draft intentionally avoids adding an invented tenantId.
- Independently verified FEH staff membership and database permissions must be tested under synthetic staging accounts before any automated staff notification.
- Consent or permission to respond to a customer enquiry is not blanket consent to send the customer marketing texts.
- Existing PR #109 (merged) is the separate, non-executing customer acknowledgement gate. This PR does not reopen it or activate it.
- CRM auth/RLS risks, staff admission and broad DELETE permissions remain separate gates for Dominic, not solved by a boolean in this module.
- No customer data used, and no secrets configured.

## Gates before subsequent operational stages

1. Verify signed Meta webhook provenance and Graph lead retrieval in an approved isolated staging setup. Reject stale/replayed/untrusted events.
2. Atomically persist and audit an accepted lead; verify its real CRM ID and unique external lead reference.
3. Verify a named authorised FEH lead owner and callback task without granting broad database privileges.
4. Verify an approved internal mobile destination, staff notification policy, minimum SMS content, provider cost/approval, suppression and STOP, and exactly-one durable attempt reservation.
5. Integrate Telnyx only after separate approval, credentials management, actual sending verification, delivery statuses, indeterminate outcome handling, and no blind retry.
6. Independently test and authorise any customer acknowledgement flow.
7. Confirm manual Meta lead-retrieval reconciliation before activating the £200 UK Meta trial. A saved or previewed form does not establish receipt or CRM persistence.

## Validation evidence

- Isolated local execution: Node 22.16.0, experimental TypeScript type stripping, **31 tests passed, 0 failed**.
- Isolated strict core-module TypeScript check: TypeScript 5.8.3, noEmit, strict, ES2022, NodeNext — **passed**.
- **Not yet run:** full FEH native repository typecheck, lint, build, native CI suite, Meta signed webhook / CRM / Telnyx staging end-to-end, and live notification.
- Source code and tests here are review-only and must remain dormant. No new migration, RLS grant, production deployment, secret, campaign change, paid action or SMS.
- No claim of a working operational SMS system.

## Dominic's next action

Please independently review the branch against root AGENTS.md, frontend AGENTS.md, ADR-008, PR #109 and all Factory 041 invariant gates. Run focused tests and full repository typecheck, inspect role authorization and proposed trustworthy source evidence, and return approval or concrete corrections. **Keep this PR in DRAFT. Do not merge, deploy or activate SMS.**

**Approved scope of this PR:** code, tests and a review handoff only; authorisation to create a draft PR does not authorise subsequent production stages.
