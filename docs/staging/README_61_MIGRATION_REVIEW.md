# FEH CRM — 61-migration staging preparation (review only)

**Status:** documentation + offline manifest/source copier. **Never apply SQL from this PR.** No production or staging DDL, no data copy, no deployment/merge/SMS.

## Goal

Establish schema parity for a separate synthetic-data-only CRM staging environment, without importing any real customer data or affecting the working CRM. This PR prepares an independently reviewable, fixed list of migration sources and a safe, **offline-only** materialisation script. It does **not** include migrations copied into the PR or any code that connects to a database.

| Environment | Supabase project | Current state |
| --- | --- | --- |
| Production | \`kupuswwutonsagftivkv\` | 61 migrations recorded as applied; operational FEH CRM |
| Staging | \`vredwhyphrhsudggrsen\` | Separate healthy project, **zero migrations applied** |
| Vercel Preview | \`free-energy-help-ai-os\` | **Still shares Production Supabase URL and publishable key**; do not run integration tests |

**Source pinned for review:** repository \`dalbirrahala-byte/free-energy-help-ai-os\`, commit \`92e1044a9d2426d7910c0e50cc39865a7b2a6097\` (the \`main\` HEAD observed at preparation).

## Reconciliation result (not a deployment)

- **61** recorded Production migration versions; **63** SQL migration files present in the pinned GitHub checkout.
- **60** GitHub filenames match Production \`version + name\` exactly.
- The final Production migration is recorded as \`20260901124827_health_check_crm_persistence\`, while GitHub calls the equivalent SQL \`20260831120000_health_check_crm_persistence.sql\`. The stored Production SQL and GitHub source were compared **after comments, case and whitespace normalisation** and matched. The offline copier renames the GitHub source to the **Production-recorded version** when constructing the staging-only output; it must **never apply both**.
- Two extra GitHub SQL files are **NOT** listed as applied in Production. They are excluded from the staging parity baseline, pending separate review:
  - \`20260826100000_authoritative_prepared_envelope_checkpoint.sql\`
  - \`20260828120000_prepared_dispatch_destination_binding.sql\`
- Neither exclusion is automatically approved for future Production deployment. Their presence in Git is not evidence that their dispatch changes are live.

## Files in this PR

1. \`staging_61_manifest.csv\` — 61 ordered versions, production filename, GitHub source path, original GitHub blob SHA, risk tags and phase. Acts as a strict allowlist.
2. \`prepare_staging_migrations.py\` — offline source copier. Requires a **separate, clean Git checkout at the pinned original commit**. Validates the manifest and source blob SHAs, writes exactly 61 SQL files to a new directory **outside the checkout**, renaming only the Health Check timestamp. Generates SHA-256 verification manifest. No network/DB commands.
3. \`STAGING_RUNBOOK.md\` — detailed reviewer, isolation, security and rollout gates.

See the runbook **before** doing anything with the generated SQL. The script prints success only for local file preparation, never for migration execution.

## Dominic — review gates

- Review the production/source reconciliation and the two excluded execution-security changes; do not silently include them.
- Review \`SECURITY DEFINER\`, roles/grants, RLS, \`anon\` callable Health Check RPCs, Factory 041 STOP and `external_lead_ingestor` role; ensure no real sending route becomes active.
- Verify separate staging Auth users, synthetic fixtures, and environment isolation before any Preview test. Existing authenticated \`SELECT USING (true)\` policies and broad write-role DELETE policies need independent review.
- Confirm a safe staging-only migration method, current migration history, rollback/recovery plan, and a read-only preflight. **No \`db push\`, migration repair/reset or remote SQL execution under this PR.**
- Vercel Preview currently reuses Production Supabase settings. Changing Preview URL and key requires another gated operation; do not modify shared Production+Preview variables carelessly.
- Avoid exposing credentials, copying Production Auth/users/leads, triggering TT Massive Zapier, or real Meta/Telnyx execution.

## Approval boundary

The owner approved creation of a **Draft PR for Dominic to review**. That is **not** approval to merge it, apply migrations, change Vercel, enable messaging, use provider credentials, send SMS or launch ads.

**Next authorised gate after review:** ask owner for explicit, separate approval to apply the reviewed 61-version plan to staging **only**. No action on Production.
