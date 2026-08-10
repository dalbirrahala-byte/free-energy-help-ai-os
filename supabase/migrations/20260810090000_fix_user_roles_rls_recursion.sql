-- Repair: fix infinite recursion in user_roles RLS.
--
-- WHY THIS EXISTS: user_roles_admin_manage (defined in the already-applied
-- 20260805100000_user_roles.sql) is a FOR ALL policy whose USING/WITH CHECK
-- condition queries public.user_roles from inside its own policy body:
--
--   using (exists (select 1 from public.user_roles ur
--                  where ur.id = auth.uid() and ur.role = 'admin'))
--
-- Because the policy's command scope is ALL (not just INSERT/UPDATE/
-- DELETE), it also governs SELECT — including the SELECT embedded in its
-- own condition. Evaluating that inner SELECT re-triggers user_roles' RLS,
-- which re-evaluates this same policy, which runs the same inner SELECT
-- again: unbounded recursion. This was dormant since 2026-08-05 because
-- nothing in the app ever read from user_roles under normal RLS until
-- Factory 022's user_can_write() (20260809100000) did so for the first
-- time from a live INSERT policy, surfacing the bug as:
--   "infinite recursion detected in policy for relation \"user_roles\""
--
-- ROOT-CAUSE FIX: move the admin check into a SECURITY DEFINER helper
-- function. A SECURITY DEFINER function runs with the privileges of its
-- owner (the migration-running role), which is not subject to the
-- calling user's RLS — so its internal SELECT against user_roles does
-- NOT re-trigger user_roles_admin_manage, breaking the recursion. This
-- is the standard, well-established pattern for self-referential RLS
-- checks in Postgres/Supabase. search_path is pinned to '' (empty) so
-- the function cannot be hijacked by objects earlier in a caller's
-- search_path; every reference inside it is already fully schema-
-- qualified (public.user_roles, auth.uid()), so this is a pure hardening
-- step with no behavioural change.
--
-- LEAST PRIVILEGE: Postgres grants EXECUTE on every new function to
-- PUBLIC by default, which would let an unauthenticated (anon) caller
-- invoke this admin-check function directly via RPC. That's revoked
-- immediately below, and EXECUTE is re-granted only to `authenticated`
-- — the only role that ever reaches a code path calling this function
-- (user_roles_admin_manage is scoped `to authenticated`; anon has no
-- policy on user_roles at all, and service_role bypasses RLS entirely,
-- so neither needs it).
--
-- SCOPE: this migration touches ONLY public.user_roles' own RLS policy
-- and adds one new helper function (plus its grants). It does NOT touch
-- user_can_write(), suppliers, supplier_products, or any other table/
-- policy — once user_roles' own policy stops recursing, user_can_write()'s
-- existing (unmodified) query against user_roles resolves normally with
-- no further change needed there.
--
-- PRESERVED BEHAVIOUR:
--   - user_roles_select_own is untouched — any authenticated user still
--     sees only their own role row.
--   - Admin-only management of role assignments is preserved exactly:
--     only a user whose own row has role = 'admin' may INSERT/UPDATE/
--     DELETE/SELECT via this policy, identical to before — only the
--     *mechanism* of that check changed, not who is allowed to do what.
--   - No anon access is introduced anywhere, on user_roles or on the new
--     function.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION, REVOKE, GRANT, and
-- DROP POLICY IF EXISTS + CREATE POLICY are all safe to rerun. Note that
-- CREATE OR REPLACE FUNCTION does not reset an existing function's grants
-- on its own — the explicit REVOKE/GRANT pair below is what guarantees
-- the correct end state on every run, whether this is a first apply or
-- a rerun.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.id = auth.uid() and ur.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists user_roles_admin_manage on public.user_roles;

create policy user_roles_admin_manage
  on public.user_roles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RECOVERY NOTE (not a rollback script): if this migration causes an
-- unforeseen issue, do not reinstate the previous user_roles_admin_manage
-- definition — it is the known-defective recursive policy this migration
-- exists to remove, and restoring it reintroduces the outage. Instead:
--   1. Stop/pause writes that depend on the affected policy.
--   2. Diagnose and repair forward with a new, reviewed migration, or
--   3. Restore the database from the last known-good backup/snapshot
--      taken before this migration was applied.
-- If you need to remove only what this migration added without
-- reinstating the broken policy, the safe subset is:
--   drop policy if exists user_roles_admin_manage on public.user_roles;
--   revoke all on function public.is_admin() from authenticated;
--   drop function if exists public.is_admin();
-- Note this leaves user_roles with NO admin-manage policy at all
-- (only user_roles_select_own remains) until a corrected policy is
-- applied — safer than the recursive state, but admins temporarily lose
-- the ability to manage other users' roles until repaired forward.
