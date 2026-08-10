-- Repair: least-privilege EXECUTE grants for security-sensitive RLS helper
-- functions, and correct the default-privilege rule that caused this.
--
-- WHY THIS EXISTS: post-apply verification of 20260810090000 found that
-- public.is_admin() carries a direct, explicit EXECUTE grant for `anon` —
-- not inherited through PUBLIC (that was already revoked in that
-- migration), but produced by a pre-existing project-wide default rule:
--
--   alter default privileges for role postgres in schema public
--     grant execute on functions to postgres, anon, authenticated, service_role;
--
-- Every function created BY the postgres role in the public schema
-- automatically receives this grant at CREATE time, before any REVOKE
-- FROM PUBLIC in the same migration can affect it (REVOKE ... FROM PUBLIC
-- only removes the PUBLIC-inherited privilege, not a role-specific direct
-- grant). Checking public.user_can_write() (created earlier, same
-- mechanism, same postgres-owned default rule) found the identical gap.
--
-- Confirmed against live database evidence before writing this migration:
--   - The responsible default-privilege rule is defined by role `postgres`
--     for schema `public` (a separate, unrelated rule owned by
--     `supabase_admin` also exists but is not implicated — nothing in
--     this project is created as that role).
--   - Both public.is_admin() and public.user_can_write() are owned by
--     `postgres`, matching that rule exactly.
--   - This migration's executing role is `postgres` itself, so it has
--     the authority to alter that role's default privileges.
--
-- Practical severity of the original gap was low in both cases (both
-- functions resolve to `false` for an anon caller, since neither
-- auth.uid() nor any anon policy on user_roles exists to satisfy them),
-- but neither function was ever intended to be callable by unauthenticated
-- clients, so this closes the gap at both levels: the two functions that
-- already exist, and the systemic default that produced it.
--
-- SCOPE: this migration touches ONLY function-level EXECUTE privileges on
-- public.is_admin() and public.user_can_write(), plus the schema-level
-- default-privilege rule (owned by postgres) for future public-schema
-- functions. It does not alter any table, RLS policy, application data,
-- or historical migration. RLS itself is not touched, disabled, or
-- bypassed anywhere in this file. service_role and postgres are not
-- referenced by any REVOKE/GRANT here, so their existing EXECUTE access
-- (from the same original default rule) is unaffected.
--
-- WHY BOTH A DEFAULT-PRIVILEGE FIX AND EXPLICIT PER-FUNCTION REVOKES ARE
-- NEEDED: ALTER DEFAULT PRIVILEGES only changes the template applied at
-- CREATE time for objects created AFTER the rule changes — it has zero
-- retroactive effect on objects that already exist, because their ACL
-- was already materialized at their own creation time. Fixing the
-- default rule alone would prevent the *next* function from inheriting
-- anon access, but would leave is_admin() and user_can_write() exactly
-- as exposed as before. Both parts are required together.
--
-- SAFE / IDEMPOTENT: every REVOKE/GRANT/ALTER DEFAULT PRIVILEGES
-- statement below is safe to rerun — revoking an already-revoked or
-- granting an already-granted privilege is a no-op, not an error.

-- 1 & 2. Close the gap on the two existing functions.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.user_can_write() from anon;

-- 3. Explicitly (re)assert the access the application actually needs,
--    independent of whatever the prior default-privilege history was —
--    makes the intended end-state self-documenting rather than relying
--    on an implicit grant from project bootstrap.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.user_can_write() to authenticated;

-- 4. Fix the source: stop this from recurring for the NEXT function
--    created by postgres in the public schema.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- ROLLBACK (documented, NOT executed as part of this migration — restores
-- broader-than-necessary access; only use if this migration is found to
-- break something unexpected, and prefer a forward fix over reinstating
-- the wider grant where possible)
-- alter default privileges for role postgres in schema public
--   grant execute on functions to anon;
-- grant execute on function public.user_can_write() to anon;
-- grant execute on function public.is_admin() to anon;
