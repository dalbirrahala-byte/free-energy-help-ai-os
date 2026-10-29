# FEH exact-61 local staging-baseline validation

**Status: review-only. No cloud staging or production changes are authorized.**

## Why this exists

The existing local development database contains **63 migrations** (the two
held-back dispatch migrations plus the unaliased Health Check migration).
It passed 20/20 synthetic assertions with its permission changes rolled
back on 29 October 2026, but its schema is **not equivalent** to the
approved **61-migration cloud staging baseline**.

The 61-migration version set uses the pinned 63-file source commit
`92e1044a9d2426d7910c0e50cc39865a7b2a6097`, excludes two
held-back dispatch migrations, and uses `20260901124827` for the reviewed
Health Check SQL. The existing
`docs/staging/prepare_staging_migrations.py` verifies the pinned source,
file names and hashes before writing a separate 61-file output tree.

## One-time Windows test

From the VS Code PowerShell terminal, while Docker Desktop is running:

```powershell
git fetch origin
if ($LASTEXITCODE -ne 0) { throw "Git fetch failed" }

git -C C:\Projects\feh-security-review switch --detach origin/review/feh-privileges-synthetic-tests-20261028
if ($LASTEXITCODE -ne 0) { throw "Review update failed" }

python C:\Projects\feh-security-review\docs\staging\prepare_exact61_local.py --start-and-test
```

The script may take several minutes on the first run while the local
Supabase images and migrations start. **Do not rerun on STOP.** Send the
full output for inspection instead.

For a preparation-only run, omit `--start-and-test`; that mode never
starts or contacts a database.

## Safety boundaries

- Reuses the existing review worktree and creates a second **clean pinned
  source worktree** at `C:\Projects\feh-staging61-source-pin`.
- Creates a fresh **local-only** 61-migration Supabase project at
  `C:\Projects\feh-staging61-local`.
- Project ID: `feh-staging-61-local`. The expected database container is
  `supabase_db_feh-staging-61-local`.
- Uses distinct local ports 54420–54423 and excludes nonessential services
  to reduce CPU and memory usage.
- Does **not** reset, overwrite, stop, or change the existing
  `supabase_db_feh-staging-role-fix` source-63 database.
- Pins local Supabase CLI `2.111.0`, matching the earlier Windows
  project; starts the new local stack only.
- Requires 26 public tables with RLS, an exact ordered
  61-version/name migration history, and empty synthetic-relevant tables.
- Runs the proposed privilege hardening and T01–T20 within the *same local
  transaction*. The test replaces the draft COMMIT with ROLLBACK and
  verifies that role memberships, table ACLs and row counts match their
  pretest snapshots.
- No cloud project ID, access token, password, database URL, `db push`,
  `db reset`, deployment, live communications or external APIs are used.
- PostgreSQL identity sequences may advance despite ROLLBACK: this is
  acceptable only in the disposable local database.

### Meaning of a PASS

20/20 on **exact-61 local** would establish local evidence that the
proposal and synthetic suite also work with that migration baseline.
It would **not** establish that the cloud staging project has been
modified, nor authorize its migration, nor prove all application-level
end-to-end workflows.

After an exact-61 local PASS, prepare a reviewable *new forward-only*
migration for staging (without editing the original 61). Independently
review application access and rollback/recovery readiness. Only then
request the owner's **separate cloud staging approval**. Production
requires another explicit approval after staging tests.

## Recovery on failure

If preparation, Docker startup, a preflight or SQL test returns STOP,
record the failure and do not retry blindly. Do not delete worktrees,
run `supabase db reset`, apply a cloud migration or grant database
privileges manually. The script never resets another Docker project.
