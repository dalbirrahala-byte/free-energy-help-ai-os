# FEH database permissions — review notes (28 October 2026)

Status: **REVIEW ONLY. Not deployed, not merged, not approved for database execution.**

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
3. Neither file has been executed. The full 20 assertions have NOT yet passed.

The SQL proposal is outside the Supabase migrations folder to prevent accidental inclusion in the existing migration workflow. Its exact 26-table preflight is intended to fail closed if the schema changes.

## Important unresolved issues

- The future-table default privileges for supabase_admin are broad. The draft only addresses those owned by postgres; supabase_admin requires separate authorization and review.
- service_role grants are deliberately unchanged and still need a separate least-privilege review.
- Ordinary table grants on public tables outside the explicitly reviewed operational set remain subject to existing RLS and need feature-specific audits.
- Transaction-local role grants have not yet been validated on the user's local Windows Docker database or in cloud staging.
- The existing GitHub staging runner validates exactly 61 migrations on its original branch. A new versioned, approved migration and a separately authorized staging rollout process will be necessary.
- Test identity insert/update paths, sequence access, role administration, audit logging, and Health Check ingestion must all be verified with synthetic identities before production consideration.

## Required approval sequence

Security review of the proposal; local synthetic testing; separate authorization for cloud staging changes; staging regression and cleanup evidence; review of remaining default grants; separate explicit production approval.

No GitHub merges, cloud changes, live sends, or advertising expenditure are authorized by this review-only branch.
