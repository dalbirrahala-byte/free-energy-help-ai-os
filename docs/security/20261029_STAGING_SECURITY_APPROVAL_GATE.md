# FEH CRM — staging security change: owner approval gate

**Prepared 29 October 2026. REVIEW ONLY. No cloud database change, publication, merge, live message, or spend is approved by this file.**

## 1. Proposed target and authorization

- **Only permitted target if separately approved:** FEH CRM cloud staging project `vredwhyphrhsudggrsen` (free-energy-help-crm-staging).
- **Not permitted:** production project `kupuswwutonsagftivkv`, Vercel Production, Telnyx live sends, Meta campaign activation, customer records, migrations from the 63-file source.
- **Proposal:** Create a new, forward-only versioned migration *after* the current 61 migration history based on [the reviewed hardening draft](./20261028_REVIEW_ONLY_public_privilege_hardening.sql).
- **No merge or deployment now.** The current draft intentionally lives in `docs/security/` rather than `supabase/migrations/`.

## 2. Verified evidence and preflight fingerprint

Local tests (user-provided PowerShell evidence, 29 October):
- Exact source-63 isolated database: **20/20 assertions PASS**; test data counts and role/ACL fingerprint unchanged after ROLLBACK.
- Exact approved staging-61 isolated database: **20/20 assertions PASS**, including rollback/fingerprint check.
- The two local databases are separate Docker projects, and neither result is a cloud staging deployment.

Read-only connected checks (29 October):
- Staging: **61/61 migration versions and names** match the reviewed manifest in order.
- Staging: **26 public tables, all with RLS enabled and owned by postgres**.
- Staging: **17 public tables grant TRUNCATE** to each of `anon` and `authenticated`.
- Staging: checked lead, task, activity, customer, customer-site, role-assignment, audit, Auth-user and Storage-object counts are **all zero**.
- Production: **26 public tables with RLS**, **17 TRUNCATE grants** to the same roles, and **3 lead records**: one tagged `Website`, two without a lead source. None had an external lead ID. This is only the inspected production CRM database, not proof no Meta leads exist in other systems.
- Cloud `postgres` currently cannot SET either dormant `external_lead_ingestor` or `execution_dispatch_worker` role without a separately reviewed temporary transaction-scoped grant.

## 3. What the proposed SQL changes

The reviewed draft would, **in staging only**:

1. Check the expected PostgreSQL version, `postgres` ownership, all 26 RLS-enabled public tables, and essential policies before DDL.
2. Remove broad direct table privileges from `anon` and `authenticated` on seven reviewed CRM tables.
3. Regrant only RLS-governed `SELECT/INSERT/UPDATE/DELETE` for authenticated staff on five operational tables and `user_roles`; grant `SELECT/INSERT` on `audit_log`. Keep anonymous direct table access denied for those objects.
4. Revoke `TRUNCATE/TRIGGER/REFERENCES/MAINTAIN` from `anon` and `authenticated` on all public tables.
5. Remove broad per-schema default TABLE grants for **future postgres-owned** objects. The `supabase_admin` default-grant repair is **not covered** and needs a separate permission review.
6. Preserve RLS policies, SECURITY DEFINER functions and their carefully scoped EXECUTE rights, service-role grants, Auth identities, data and the original 61 applied migrations.

**This is a candidate, not a certified migration.** It requires review of actual app access patterns and roles. No public intake RPC or default-grant fix may be blindly broadened to achieve a green test.

## 4. Before the separate staging authorization is used

- Confirm project ID twice and recheck **exact 61** migration history, **26/26** RLS, empty synthetic-relevant tables and role attributes. Fail closed on any drift.
- Confirm no existing unexpected active staging application or customer traffic.
- Independently review the exact candidate SQL, function privileges and app queries. Verify `user_roles`, sequence access, audit grants and deliberate deny-by-default tables.
- Prepare a forward-only migration ID and checksum with a clear **stop/recovery** plan. No database resets, migration history repair, broad GRANT ALL, or copying customer data.
- Review Vercel Preview-to-staging URL/key *effective* pairing; metadata shows Preview-only and Production-only variables, but the deployed target has not been independently proven.
- Ensure test execution uses **only staging**, a scoped identity, one bounded synthetic transaction, and no live provider transport.

## 5. After any separately authorized staging migration

Collect sanitized evidence for:

- Migration record added exactly once; no unintended schema/function changes.
- `TRUNCATE` denied to `anon` and `authenticated` on every public table.
- Existing lead/role/audit RLS and ingestion RPC privileges unchanged.
- **T01–T20** pass against the actual cloud-staging project and every test fixture / temporary role grant is removed.
- Synthetic web Health Check intake, invalid/duplicate handling, audit minimization, assigned/unassigned/read-only staff permissions, administrator role management, task and callback writes.
- Production migration history, public-table grants, counts, Vercel Production and all live provider settings untouched.
- Reviewer sign-off before any Preview app integration test; independent production approval after staging success.

**If anything fails:** stop all further DDL/requests, keep the failed state isolated, record the exact version and sanitized error, review forward recovery. Never automatically restore unsafe `TRUNCATE` grants as a rollback.

## 6. CRM delivery work that can continue without this approval

**Meta:** A dormant raw-body HMAC verifier and pure adapter are present. No demonstrated live provider route, Graph lead retrieval, durable inbox, accepted-lead-to-owned-task transaction or delivery reconciliation. Build/test these against fakes with no live Meta subscription or credentials; use FEH-owned form IDs only.

**Telnyx:** A guarded preview OTP transport and pure voice adapter exist, but no approved live SMS/automated call activation. Prepare synthetic delivery/STOP/idempotency tests and keep sending disabled.

**Mission Control:** Prioritize lead source and owner, renewal window, callback due today, overdue follow-ups, COT/deemed/billing case status, and auditable next actions. Do not display placeholders as working integrations.

## 7. Owner decision required

A **new, separate approval** is needed for the *specific cloud staging-only* security migration and bounded synthetic test execution. Approval would **not** authorize production changes, live contact, advertising spend, automatic PR merging, Vercel Preview application access, or real lead imports.
