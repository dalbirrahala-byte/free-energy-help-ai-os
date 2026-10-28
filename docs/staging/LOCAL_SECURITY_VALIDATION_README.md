# FEH staging privilege proposal — isolated local validation

**REVIEW ONLY. Do not deploy, merge, or run this against a Supabase cloud project.**

The `validate_local_permissions.py` script is designed specifically for the
existing dedicated Docker Desktop container named
`supabase_db_feh-staging-role-fix` on the user's Windows PC.

## Run from PowerShell in the existing local Git worktree

```powershell
git fetch origin
git worktree add --detach C:\Projects\feh-security-review origin/review/feh-privileges-synthetic-tests-20261028
python C:\Projects\feh-security-review\docs\staging\validate_local_permissions.py
```

Do not run the SQL draft directly. Do not run the original standalone
synthetic SQL by itself against cloud staging. The runner assembles both
review files into **one local transaction** and substitutes a final ROLLBACK
for the draft's COMMIT. It checks T01–T20 and the role membership cleanup.

## Safety restrictions

- Uses **Docker exec** into only the named local Supabase DB container.
- Does not accept a database URL, project ref, cloud password, token or any
  database connection outside that local container.
- Refuses nonlocal Docker contexts and unexpected database identity.
- Requires PostgreSQL 17, the expected 26 public RLS tables, exactly 61
  migrations, and empty synthetic-relevant tables.
- Takes a baseline and a post-test snapshot of row **counts** and privilege
  catalog fingerprints; never exports names, phone numbers, or emails.
- Combines proposed permission changes and synthetic fixtures inside
  BEGIN/ROLLBACK, then verifies no test role memberships survived.
- Exits nonzero on error. ON_ERROR_STOP aborts the psql session so unfinished
  transactions are rolled back on connection close.
- PostgreSQL sequences may advance even after ROLLBACK. This is acceptable
  **only** inside the disposable local test database.

The runner is **not** a staging or production migration mechanism. The
existing 61 migration files and manifest remain untouched.

## How to interpret the output

**PASS** means the local Docker instance reported all 20 assertions passed
and the privilege/data-count snapshots matched. It does not constitute
production sign-off or verify all application access paths.

**STOP** means the test or safety preflight failed. Stop, send the full
terminal output for review, and **do not rerun** or change database grants
manually. If the test failed after beginning the transaction, the runner
attempts to independently verify rollback. Absence of a cleanup PASS should
not be treated as proof of rollback.

For a check that does not connect to Docker:

```powershell
python C:\Projects\feh-security-review\docs\staging\validate_local_permissions.py --static-only
```

A successful local run is only the first stage. Cloud staging and production
each require separate explicit owner approval.
