# Row Level Security — Free Energy Help AI Sales OS

## Status: migrations written, tracked, **not applied to any database**

Three migration files exist under `supabase/migrations/`, in apply order:

1. `20260805100000_user_roles.sql` — the `public.user_roles` table RBAC depends on, with its own RLS.
2. `20260805100100_enable_rls.sql` — RLS on `leads`, `customers`, `sites`, `tasks`, `activities`.
3. `20260805100200_audit_log.sql` — the audit trail table, with its own RLS (see [AUDIT_LOGGING.md](./AUDIT_LOGGING.md)).

None have been run against Supabase. Applying them is a deliberate, separate step — not part of this implementation pass — because RLS is table-wide and binary: the moment it's enabled, every query against that table is evaluated against policies, and this app currently has no service-role bypass anywhere (confirmed: both `lib/supabase/client.ts` and `lib/supabase/server.ts` use the identical anon/publishable key). A missing policy means a broken query, immediately, for the whole app.

## Why these three tables were in scope beyond the Advisor warning

Supabase Security Advisor flagged `leads`, `tasks`, `activities`. Inspection found `customers` and `sites` were created by the one tracked migration in this repo, which also never enabled RLS — they're very likely in the same unprotected state, just not yet flagged. All five are covered in migration 2, per the instruction to review every exposed operational table, not only the three originally reported.

Also found: `leads`, `tasks`, and `activities` have **no migration file in this repo at all** — they predate the one tracked migration and must have been created directly against the database. That's very likely why Advisor flagged exactly those three. This migration set doesn't retroactively document their creation (out of scope here), but it's worth closing as a separate follow-up so the full schema is version-controlled.

## Policy design

Matches the approved access model (organisation-wide authenticated access, ADR-008):

- **SELECT**: any authenticated user, any role — all five roles have `records:view`.
- **INSERT/UPDATE/DELETE**: any authenticated user whose role is not `read_only` — via a shared `public.user_can_write()` SQL function, checked against `public.user_roles`.
- **anon role**: granted nothing, on any table, anywhere in these migrations. The public-facing website lead-capture pages (`/business-energy-quote`, `/leads/web/[ref]`) don't write to these tables today — they use browser local storage — so no anon INSERT policy was needed. If that changes, it needs its own reviewed migration.

`user_roles` itself has RLS: any user can read their own row (needed for the app to know their role); only an existing admin can grant/change/revoke any role, including their own.

## Apply sequence (when ready — not run yet)

1. Confirm Supabase Auth is enabled on the project.
2. Apply `20260805100000_user_roles.sql`.
3. Bootstrap the first admin (see that file's comment — cannot be done through the policies themselves, since granting a role requires an existing admin row).
4. Confirm authentication is functioning in the target environment (Phase 3 complete).
5. Apply `20260805100100_enable_rls.sql` on a **staging/preview Supabase project first**, not production. Re-verify every existing query path (every Server Action, every Server Component `select`) against the checklist below.
6. Apply to production once staging is clean.
7. Apply `20260805100200_audit_log.sql` at any point after step 2 (it only depends on `user_roles`, not on RLS being live on the operational tables).

## Manual policy test checklist (run before applying to production)

RLS behaviour can't be unit tested without a live database — this checklist is the substitute, to be run against staging:

- [ ] Unauthenticated request to each table: zero rows returned (SELECT), insert/update/delete rejected.
- [ ] Authenticated `read_only` user: SELECT succeeds on all five tables; INSERT/UPDATE/DELETE all rejected.
- [ ] Authenticated `consultant`/`operations`/`manager`/`admin`: SELECT and INSERT/UPDATE/DELETE all succeed on all five tables.
- [ ] Every existing page (`/leads`, `/leads/[id]`, `/customers`, `/customers/[id]`, `/tasks`, Mission Control `/`) still loads its data correctly as an authenticated non-read_only user.
- [ ] Every existing Server Action (add/edit lead, add task, add activity, add/edit customer, delete activity) still succeeds as an authenticated non-read_only user.
- [ ] A `read_only` user attempting any of the above mutations gets the app's existing error handling, not a raw Postgres error leaking to the page.
- [ ] `user_roles`: a non-admin cannot read another user's row, and cannot change any role including their own.
- [ ] `audit_log`: a non-admin cannot SELECT; any authenticated user can INSERT a row attributed to themselves; nobody (any role) can UPDATE or DELETE a row via the API — no such policy exists, which is RLS's implicit deny.

## Rollback

Each migration file ends with its own commented-out rollback SQL (drop policies, disable RLS, drop the `user_can_write()` function / tables). Rollback removes protection — running it turns a table fully open to anyone with the anon key again, so it should only ever be used to recover from a broken deployment, immediately followed by a fix-and-reapply, never left in that state.
