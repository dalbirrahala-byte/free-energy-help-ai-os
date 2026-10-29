# FEH CRM critical path — security to useful daily operation

**Working plan, review only.** This document records the sequence; it
does not authorize publication, spending, sending messages, deployments,
cloud SQL changes or data sharing.

## Current evidence (29 October 2026)

- **PASS:** 20/20 synthetic SQL assertions on the isolated 63-migration
  development database; ACL/role-membership and fixture-count rollback
  verified by its local test runner.
- **PASS (read-only):** the cloud staging database's 61 ordered migration
  versions/names match the reviewed GitHub CSV manifest exactly.
- **PENDING:** run 20/20 assertions against an **isolated local exact-61**
  baseline; script prepared under
  `docs/staging/prepare_exact61_local.py`.
- **SECURITY REMEDIATION REQUIRED:** prior read-only cloud checks found
  17 of 26 public tables with TRUNCATE grants to externally accessible
  `anon`/`authenticated` database roles. The proposal is only a
  review document, not an applied fix.
- **NOT ESTABLISHED:** that the current live CRM has any local-only
  authorization error. Local-63 table SELECT grants differ from cloud.
- **NOT DONE:** cloud staging security deployment, full application
  regression and separately approved production deployment.

## Gate 1 — Prove the permissions repair on exact-61, then stage it

**Next technical action:** local exact-61 rollback-only test in its own
Docker project. Keep the existing 63 database unchanged.

After local PASS, review a *new forward-only staging migration* and
function/privilege impact. Test authenticated staff roles, anonymous
website intake functions, RLS restrictions, audit logging and role-based
writes. Confirm no synthetic records or temporary role membership remain.
Do not change the original 61 migration files.

**Owner approval required** before any cloud staging DDL; a separate
approval and verified staging evidence are required before production.

## Gate 2 — Make every qualified enquiry a CRM record

Trace website Business Energy Health Check and FEH Meta Instant Forms
end to end: consent/provenance -> authenticated server-side ingestion ->
idempotent deduplication -> `New` pipeline -> named owner and due follow-up
-> audit and lead-source reporting. Do not rely on the unowned vendor
Zapier link.

Use synthetic lead payloads, no live Meta lead collection or advertising
changes until separate approval. Capture failures and prevent silent
loss or double entry. Preserve UK GDPR consent controls.

## Gate 3 — Controlled, dependable follow-up

Connect CRM events to a reviewable follow-up queue and notifications.
Prepare Telnyx SMS/OTP in disabled/test mode and complete sender/number,
rate-limit, suppression, spend cap and emergency-stop tests.

**Live SMS, OTP activation, automated calls, bulk outreach and ad spend
remain blocked** until explicitly approved. Show intended sender and
callback phone number to recipients as reviewed.

## Gate 4 — Make the CRM useful to an energy consultant every day

Build Mission Control around real verified records: renewal timing,
out-of-contract/deemed cases, change of tenancy, supplier/meter
identification, billing disputes, pending LOAs and callback deadlines.
Integrate POWWR pricing/meter lookup only after reviewing the provided
API contract, credentials and supplier permissions. Pilot bill
validation and e-sign with test documents first.

AI agents must operate in evidence-based **shadow/reviewer-gated mode**
until their inputs, auditing, consent and emergency-stop behavior pass.
Avoid presenting placeholders as active integrations.

## Operating principle

A useful first release is:
**one enquiry -> one auditable CRM lead -> one owned next action ->
confirmed follow-up -> clear contract/dispute outcome.**

Only then automate additional channels. Keep the owner involved for
production changes, external messages, expense and policy decisions,
not for routine read-only diagnostics or review-only coding.

## Immediate blocked item

Complete the exact-61 **local** test, then return with a staging
approval request specifying exactly what SQL, which target, expected
impact, rollback/recovery and evidence are proposed. No cloud changes
are implicit in this plan.
