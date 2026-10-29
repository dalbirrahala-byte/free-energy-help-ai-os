# FEH database permissions — review notes (28 October 2026)

Status: **REVIEW ONLY. Locally tested inside rollback-only Docker transaction; not deployed or merged, and not authorized for cloud database execution.**

This review branch is based on ops/staging-61-execution-20261026.
The original 61 migrations, the pinned manifest and production configurations are unchanged.

## Verified read-only findings

- Both connected cloud environments have 26 public tables with RLS enabled.
- Both environments have 17 public tables permitting TRUNCATE by anon and authenticated database roles. This includes leads and user_roles.
- Both cloud environments currently permit table SELECT by authenticated; the local Docker database does not. Therefore the local function failure must not be assumed to affect production.
- The local Docker test failed at T13 because a direct anonymous lead SELECT raised a permission error. A permission denial is a secure outcome.
- The original cloud test was blocked because postgres lacked SET permission for two dormant worker roles.
- Cloud postgres currently has administrative membership in those roles but not permission to switch into them.
- No actual customer records were queried, changed, or exported by these checks.

## Proposed changes for review

1. The review-only SQL proposal in this folder would remove excess table privileges from the two API roles, retain existing RLS, and restore the explicitly approved CRM table operations.
2. The modified staging synthetic script would verify absence of TRUNCATE, accept permission denial for anonymous reads, and try temporary transaction-local worker-role membership for its tests, followed by ROLLBACK and cleanup verification.
3. Both proposals were assembled and executed together in an isolated local Docker transaction on 29 October 2026. All 20 assertions reported PASS; the test transaction rolled back. No cloud execution has been authorized.

The SQL proposal is outside the Supabase migrations folder to prevent accidental inclusion in the existing migration workflow. Its exact 26-table preflight is intended to fail closed if the schema changes.

## Local validation profiles

- `approved-staging-61` remains the validator's default; it requires the
  exact 61 reviewed staging version/name pairs.
- `local-source-63` is an explicitly selected development-only diagnostic
  for the existing Docker database. It checks the **complete set of 63**
  source migration filenames, including both excluded dispatch migrations
  and the pre-alias Health Check source version.
- The held-back dispatch migrations change the
  `prepare_execution_dispatch` result from scalar text into a structured
  envelope. Proposed T19 now checks fail-closed behavior for either shape.
- Even 20/20 passing against the local 63 source is **not** evidence that
  the approved cloud 61-migration staging environment passes. Test both
  separately before seeking any deployment approval.

## Local validation evidence — 29 October 2026

**User-supplied VS Code PowerShell screenshot; observed output, not independently executed by the assistant.**
Runner: `python C:\Projects\feh-security-review\docs\staging\validate_local_permissions.py --profile local-source-63`.
Review commit used for the observed run: `31ef762`.

The terminal reported:

```text
PASS: T01–T20 labels, rollback-only test assembly and guards
PASS: dedicated Docker database, exact 63 migrations and empty RLS baseline
NOTE: This 63-migration development database is NOT equivalent to approved cloud staging's 61 migrations. Results are only a local diagnostic, never staging approval.
Running rollback-only local SQL checks ...
PASS: local table counts, role membership and ACLs match pre-test state
PASS: all 20 synthetic assertions reported success after rollback
NOTE: PostgreSQL identity sequences may advance despite ROLLBACK.
```

Interpretation: **PASS (local 63-migration diagnostic only)**. The runner's count and ACL/role-membership comparisons matched their starting values after ROLLBACK. Its output does **not** prove sequence values were restored, application-level end-to-end behavior, parity with the cloud staging 61-version baseline, or that the proposed hardening can safely be deployed. Keep the review-only status until independent staging-61 validation and security review.

## Staging-baseline preparation — 29 October 2026

A read-only comparison of Supabase cloud staging's current
`supabase_migrations.schema_migrations` and the reviewed CSV manifest
confirmed **61/61 exact ordered version and name matches**. This is
schema-history evidence only; no migration was applied or privilege changed.

New review-only scripts provide a separate local exact-61 test environment:

- `docs/staging/prepare_exact61_local.py` verifies and prepares 61 pinned
  migration files, uses a new local Docker project and unique ports, and
  optionally invokes the rollback-only 20-assertion validator.
- `docs/staging/validate_local_permissions.py` now binds the
  `approved-staging-61` and `local-source-63` profiles to **different**
  explicitly named local database containers.
- `docs/staging/EXACT61_LOCAL_VALIDATION.md` explains the single Windows
  command and failure safeguards.

**The exact-61 local database test has not yet been executed.**
A test PASS in either local profile does not constitute cloud staging
authorization. No PR merge or cloud staging/production DDL is authorized.

## Important unresolved issues

- The future-table default privileges for supabase_admin are broad. The draft only addresses those owned by postgres; supabase_admin requires separate authorization and review.
- service_role grants are deliberately unchanged and still need a separate least-privilege review.
- Ordinary table grants on public tables outside the explicitly reviewed operational set remain subject to existing RLS and need feature-specific audits.
- Transaction-local role membership changes were validated and rolled back in the dedicated local Windows Docker test. They have **not** been executed or validated in cloud staging.
- The existing GitHub staging runner validates exactly 61 migrations on its original branch. A new versioned, approved migration and a separately authorized staging rollout process will be necessary.
- Test identity insert/update paths, sequence access, role administration, audit logging, and Health Check ingestion must all be verified with synthetic identities before production consideration.

## Required approval sequence

Security review of the proposal; local synthetic testing; separate authorization for cloud staging changes; staging regression and cleanup evidence; review of remaining default grants; separate explicit production approval.

No GitHub merges, cloud changes, live sends, or advertising expenditure are authorized by this review-only branch.
