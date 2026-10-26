# Approved staging execution setup

The owner approved installing the reviewed 61-file baseline and synthetic database testing on `vredwhyphrhsudggrsen`. This setup does not merge code into main or authorise any other environment, provider, customer contact or advertising.

## Entry point and protection

- Branch: `ops/staging-61-execution-20261026`.
- Existing workflow: **FEH Loop Engineering**, `.github/workflows/feh-loop-engineering.yml`.
- The existing `independent-verifier` job and its checks are unchanged. The separate `staging-install` job requires those checks to pass, a manual `workflow_dispatch`, this exact repository and branch, and the `feh-crm-staging-61` environment.
- Configure that environment **before entering secrets or dispatching**. Required reviewer: `dalbirrahala-byte` (the owner). Allow the owner to review their own manually initiated run. Disable administrator bypass. Restrict deployment branches to the exact branch above, with no tags or main allowed.
- Set environment variable `STAGING_EXECUTION_SHA` to the full reviewed commit on this branch. A different workflow revision stops before credentials are exposed to the execution step. Changes need review and an explicit update to this non-secret pin.
- Approval is a GitHub environment gate; green CI or a PR comment does not bypass it.
- Workflow and staging-job concurrency do not cancel an in-progress manual installation. Do not manually cancel an installation unless responding to an actual incident; a cancellation can leave a prefix of committed migrations.

The workflow already exists with `workflow_dispatch` on main, so use **Actions → FEH Loop Engineering → Run workflow → this branch**. Do not merge this branch to make it runnable. No push trigger was added. The branch may still trigger Vercel's existing Preview integration; no Vercel configuration or Preview application tests are part of this work.

## Secure credential entry

Use GitHub **Settings → Environments → feh-crm-staging-61 → Environment secrets → Add secret**. Do not use repository-wide secrets, chat, workflow inputs, source files or logs.

| Name | Value entered by the owner directly into GitHub |
| --- | --- |
| `FEH_STAGING_ACCESS_TOKEN` | Short-lived Supabase scoped PAT restricted to project `vredwhyphrhsudggrsen` only |
| `FEH_STAGING_DB_PASSWORD` | Existing database password for that staging project only; no password reset is part of this setup |

Create the scoped token on Supabase's **Account → Access Tokens** page. Minimum capabilities for this implementation: Project Settings read (project fingerprint), Database read/write (queries and rollback-only tests), and Database Pooling Configuration read (CLI connection discovery). Check the actual permission names shown in Supabase and CLI diagnostics; stop on missing scope rather than granting unrelated capabilities. API-key secrets, Auth administration, Storage writes, Production resources and provider credentials are unnecessary. No automatic CLI login, temporary database role provisioning or network-ban removal is requested: the CLI receives the existing staging password.

Environment secrets are released only after the required reviewer approves the job. They are present only in the execution step, after tool installation. The runner uses the fixed `https://api.supabase.com/v1/projects/vredwhyphrhsudggrsen` API path for fingerprint/SQL tests; HTTP redirects and automatic retries are disabled. The CLI applies migrations using the fixed project reference and password supplied via environment, never a command-line secret.

## Immutable baseline and runner

- Source commit: `92e1044a9d2426d7910c0e50cc39865a7b2a6097`.
- Reviewed generated manifest SHA-256: `a4ff46c03b6d2d617c429deba27a4b1728f703054d17c1068b5d6aa39f1c5bd6`.
- Exactly the existing 61-row CSV allowlist and source blob hashes; no SQL content changes.
- Existing reviewed Health Check version is `20260901124827`; do not add `20260831120000` as another migration.
- Excluded: `20260826100000_authoritative_prepared_envelope_checkpoint.sql` and `20260828120000_prepared_dispatch_destination_binding.sql`.
- Supabase CLI `2.122.0`, exact npm version with lockfile. It runs from a separate temporary directory containing only the 61 approved files, never from the normal 63-file migration directory.
- CLI `db push --dry-run`, then `db push --skip-vault --yes` with the fixed target. No seed, roles.sql, vault changes, reset, repair, history manipulation, function deployment or config push.

## Preflight, execution and recovery

The authenticated project must match ID, name, healthy status and database host. For first application, public tables/functions, Auth users and Storage objects must be empty and migration history absent/empty. A second fingerprint and state check occurs immediately before applying. Any partial or unknown history stops. If the exact full baseline is already present, installation is skipped and synthetic tests can be rerun only if business data and Auth remain empty.

The supported CLI owns transaction handling and version-history entries. **The entire 61-file batch is not promised to be atomic.** Earlier migrations can remain committed if a later migration fails. Recovery is deliberately non-destructive: stop at the first error; record the actual version list and sanitized error; do not retry writes, reset, roll back schema, rewrite history or automatically continue a partial baseline. An interrupted HTTP response is unverified, not success. Record the last known history before deciding a separate reviewed recovery action. No snapshot restore or destructive recovery has been tested or is authorised by this setup.

## Synthetic verification

`synthetic_database_tests.sql` contains 20 numbered assertions: RLS coverage, dormant-role posture, intake/dispatch privileges, dedicated-ingestor acceptance, duplicate/conflicting duplicate handling, rejection cases, consent/source/time persistence, audit events and minimisation, anonymous and unassigned-user access, assigned staff writes, callback tasks/activity history, fail-closed invalid dispatch and Health Check deduplication.

These tests use an explicit SQL transaction and roll back all fixture rows, including the single synthetic Auth identity. Identity sequences may advance; this is normal PostgreSQL behaviour and is **not** repaired/reset. Reserved `example.invalid` addresses and an Ofcom drama-range phone are synthetic; no external transport exists in this test. No UI/Preview/Meta/Telnyx test occurs.

Existing ADR-008 grants authenticated organisation-wide SELECT. The test explicitly records that baseline behaviour; it does not claim tenant isolation. Database tests do not prove HTTP webhook delivery or messaging readiness.

The GitHub step summary reports actual pre/post versions, versions installed this run, tests actually executed, and aggregate fixture cleanup. Failures remain failures. The local Python guard suite and YAML/SQL syntax checks are preparation evidence only, not migration or database-test completion.
