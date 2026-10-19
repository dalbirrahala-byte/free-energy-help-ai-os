# FEH staging runbook — 61 Production-aligned migrations

**REVIEW ONLY.** No step in this document constitutes permission to execute remote SQL, merge a PR, redeploy, send a message, or change an environment variable.

## Mandatory reviewer preflight

1. Confirm both project references **read-only**:
   - Production: \`kupuswwutonsagftivkv\` — DO NOT CONNECT A WRITER, MODIFY OR REPAIR.
   - Staging: \`vredwhyphrhsudggrsen\` — separate Supabase Free project, initially healthy and empty.
2. Verify that Production's live migration history is still 61 versions in the manifest's exact order, and that staging's \`supabase_migrations.schema_migrations\` is empty. If either changes, STOP and reconcile afresh. Do not infer parity from filenames alone.
3. Review the pinned GitHub commit and all source blobs. \`main\` can advance; do not blindly refresh to HEAD. The two unrecorded execution-dispatch SQL files are NOT authorised for staging parity.
4. Inspect fresh project defaults, trusted extensions, active \`auth\` configuration, database roles and grants. Some SQL may depend on role names / PostgreSQL defaults not present in a newly created project. Changes to auth, grants or roles require separate technical approval.
5. Prepare the 61-file source tree OFFLINE with \`python docs/staging/prepare_staging_migrations.py /path/to/clean-pinned-main-checkout /path/to/NEW-output-directory\` (from this PR's checkout). The second checkout must match commit \`92e1044a9d2426d7910c0e50cc39865a7b2a6097\`. Compare the generated SHA256 manifest to Git blob references; never run a db command from the normal 63-file repo.

## Staging phases — plan only

| Phase | Manifest rows | Count | Scope |
| --- | --- | ---: | --- |
| A | 1–14 | 14 | CRM data model, staff roles, RLS, audit, supplier foundations |
| B | 15–26 | 12 | Attribution, consent, public and external lead intake, deduplication |
| C | 27–29 | 3 | Organisation identity, intent signals, suppression |
| D | 30–60 | 31 | Factory 041 authorization, dispatch controls, emergency STOP |
| E | 61 | 1 | Health Check intake under Production-recorded version |

**The batches above are for review and checkpoint planning, not a licence to run them independently.** Early batches can have intermediate authorization behaviour that must not be exposed to public traffic. Prefer a single fully reviewed, atomic/isolated staging migration strategy or a tool-reviewed transaction plan where compatible.

## Important mismatch handling

- GitHub file \`20260831120000_health_check_crm_persistence.sql\` was compared to the SQL stored in Production's \`20260901124827_health_check_crm_persistence\` migration. They matched after stripping comments and normalising SQL whitespace/case. Use **ONLY \`20260901124827\`** as the generated staging filename, ensuring exactly 61 migration versions. The script does not rewrite executable SQL.
- Hold \`20260826100000_authoritative_prepared_envelope_checkpoint.sql\` and \`20260828120000_prepared_dispatch_destination_binding.sql\`: they are in GitHub but are not recorded as applied on Production. Do not enable them, modify dispatch behaviour, or auto-run every file in GitHub's migration directory.
- If any SQL fails because of a missing PostgreSQL role/extension, schema drift, or privilege, STOP and investigate. Never auto-run \`migration repair\`, \`db reset\`, delete, rebase, or Production-side changes.

## FEH security gates

**G1 — Staging schema review.** Check RLS actually enabled for \`leads\`, \`customers\`, \`customer_sites\`, \`tasks\` and \`activities\`. Existing \`authenticated SELECT USING(true)\` policies broadly expose rows; existing \`user_can_write()\` roles have DELETE rights. New staging must use only synthetic data and dedicated test Auth users; no real FEH users or imported Production Auth state.

**G2 — Function and role review.** Check \`SECURITY DEFINER\` routines, \`search_path\`, ownership, \`anon\`, \`authenticated\`, \`service_role\` and \`external_lead_ingestor\` grants. Health Check includes \`anon\` callable RPCs. No provider credential for dormant ingestor, dispatcher or execution worker should be provisioned. Factory 041 suppression and STOP must remain fail-closed.

**G3 — Target fingerprint and isolation.** Before any actual schema application, obtain new **explicit human approval** for running reviewed migrations against *only* staging. Pin the target project reference in deployment tooling and independently check it twice. After apply, list migrations and objects from staging and compare against Production structure without any data copying. Ensure public endpoints are not live until rate limits and contact permissions are assessed.

**G4 — Vercel environment separation.** Existing variables \`NEXT_PUBLIC_SUPABASE_URL\` and \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` are currently **shared across Production and Preview**, meaning Preview can address the Production database. Do not overwrite the shared values in place for both environments. After separate owner approval, split into separate Production-only and Preview-only entries with the matching URL+publishable key pair. Keep Telnyx credentials Preview-only. Do not redeploy until the new Preview reads only staging and cannot reach Production; confirm a read-only project fingerprint.

**G5 — End-to-end tests (separate approval).** First synthetic lead insert/dedup and isolated CRM reads. Then signed Meta webhook/Graph lead retrieval with form ID \`1788543365401126\`; don't trigger TT Massive form \`1618322856411605\` or its unknown Zapier routing. Only after verifying an accepted lead in staging may an independently approved, one-message Telnyx test be sent to an explicitly verified internal recipient. Review webhook delivery receipts and transport retries. No customer texts and no £200 Meta campaign launch as part of staging work.

## Independent proof required after any separately authorised application

- Exactly 61 staging migration history entries with the same version order as this PR's manifest.
- Appropriate public objects/functions/sequences match reviewed source expectations, *not* just SQL files present.
- Public \`leads\` row count is zero before synthetic fixtures; no imported live records.
- RLS/grants and user-role boundary tested with positive **and negative** synthetic identities, including anonymous access and unassigned authenticated users.
- All real Telnyx/Meta senders or external provider dispatcher calls remain disabled.
- Production migration history, schemas, lead count, Vercel Production environment variables, active service and public customer data stay unchanged.

## Recovery and stop conditions

On unexpected SQL, migration checksum mismatch, wrong project, RLS regression, role problem, unexpectedly changed Production state, or possible external messaging: **STOP**. Keep Preview unused for integration tests and keep all ad spending paused. Document sanitized error, last attempted staging version, pre/post staging state, and approved recovery option. Do not improvise a rollback against Production.

## Completion evidence for this PR

- Change scope: manifest, review documentation and **offline-only** generator. No existing migration SQL modified.
- No remote SQL apply, Vercel mutation, provider credential access, SMS or live lead processing.
- Do not merge, even if CI is green and Dominic approves review-only text, without new owner approval for the next stage.
