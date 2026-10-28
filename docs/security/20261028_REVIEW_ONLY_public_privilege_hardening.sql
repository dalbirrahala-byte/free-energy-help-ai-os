-- FEH REVIEW ONLY -- NOT AN APPROVED OR DEPLOYABLE MIGRATION.
-- This file is deliberately outside supabase/migrations/.
-- Do not execute, rename into migrations/, merge, or deploy without a separate approval.
-- Scope: PostgreSQL 17, exact reviewed 26-table public schema, owner postgres.
-- Source: 2026-10-28 read-only Supabase checks, staging and production.
--
-- Existing cloud state: 26/26 public tables have RLS; 17/26 grant TRUNCATE
-- to both anon and authenticated. Local Docker grants differ from cloud.
-- This is a proposal, not evidence of exploitation or a successful test.
--
-- Purpose:
--   * Remove unneeded destructive/DDL-oriented privileges from API roles.
--   * Align six core CRM tables plus audit_log with the existing RLS policies.
--   * Deny public access by default on newly created postgres-owned tables.
--   * Preserve function grants, RLS policies, service_role grants, data, and
--     the original 61 migration files.
--
-- Pre-deployment gates (NOT fulfilled by this file):
--   1. Security review of ALL exposed query paths and RLS policies.
--   2. Explicit approval for cloud STAGING deployment and rollback plan.
--   3. A newly approved migration version; keep reviewed 61-file history intact.
--   4. Validate staging including synthetic role tests under least privilege.
--   5. Separate explicit approval before any PRODUCTION deployment.
--
-- SECURITY NOTE: ALTER DEFAULT PRIVILEGES for supabase_admin is NOT included:
-- the managed postgres role lacks SET membership; a privileged operator must
-- separately review and implement that future-table hardening.
--
-- Beginning of proposed SQL, for review only.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '45s';

do $feh_preflight$
declare
  n_public integer;
begin
  if current_user <> 'postgres' then
    raise exception 'FEH review preflight: expected postgres ownership context';
  end if;
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'FEH review preflight: PostgreSQL 17 required';
  end if;

  select count(*) into n_public
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p');

  if n_public <> 26 then
    raise exception 'FEH review preflight: expected 26 public tables, found %', n_public;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
      and (not c.relrowsecurity or c.relowner <> 'postgres'::regrole)
  ) then
    raise exception 'FEH review preflight: public table owner/RLS drift';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'leads'
      and policyname = 'leads_select_authenticated'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles'
      and policyname = 'user_roles_select_own'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles'
      and policyname = 'user_roles_admin_manage'
  ) then
    raise exception 'FEH review preflight: essential RLS policy absent';
  end if;
end
$feh_preflight$;

-- First remove legacy broad table grants on the seven reviewed CRM tables.
-- RLS remains enabled and unchanged. No customer or synthetic records touched.
revoke all privileges on table
  public.leads,
  public.customers,
  public.customer_sites,
  public.tasks,
  public.activities,
  public.user_roles,
  public.audit_log
from anon, authenticated;

-- ADR-008: any authenticated staff may read operational records; only
-- authorised non-read_only identities can write, as enforced by existing RLS.
grant select, insert, update, delete on table
  public.leads,
  public.customers,
  public.customer_sites,
  public.tasks,
  public.activities
to authenticated;

-- Self-role SELECT (including user_can_write() invoker) and admin-managed
-- role mutations remain constrained by existing user_roles RLS policies.
grant select, insert, update, delete on table
  public.user_roles
to authenticated;

-- Existing audit_log policy permits authenticated self/NULL-actor inserts
-- and admin-only reads; no UPDATE or DELETE access is granted.
grant select, insert on table
  public.audit_log
to authenticated;

-- Across *all* public tables, remove non-application destructive and
-- schema-maintenance privileges from directly exposed API roles.
-- Do NOT touch service_role; review its separate maintenance need later.
revoke truncate, trigger, references, maintain
on all tables in schema public
from anon, authenticated;

-- Fail closed for future tables created by postgres. Future table grants
-- must be explicitly reviewed and added by their own approved migration.
-- Existing table privileges above are unaffected by this ALTER DEFAULT.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;

-- Post-change assertions: failure aborts the enclosing transaction.
do $feh_assert$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p')
      and (
        has_table_privilege('anon',c.oid,'TRUNCATE')
        or has_table_privilege('authenticated',c.oid,'TRUNCATE')
        or has_table_privilege('anon',c.oid,'TRIGGER')
        or has_table_privilege('authenticated',c.oid,'TRIGGER')
      )
  ) then
    raise exception 'FEH review assertion: unsafe API table privilege remains';
  end if;

  if has_table_privilege('anon','public.leads','SELECT')
     or has_table_privilege('anon','public.user_roles','SELECT')
     or has_table_privilege('anon','public.audit_log','INSERT')
     or not has_table_privilege('authenticated','public.leads','SELECT')
     or not has_table_privilege('authenticated','public.leads','UPDATE')
     or not has_table_privilege('authenticated','public.user_roles','SELECT')
     or not has_table_privilege('authenticated','public.audit_log','INSERT')
     or has_table_privilege('authenticated','public.audit_log','UPDATE')
  then
    raise exception 'FEH review assertion: CRM table grants do not match approved RLS model';
  end if;

  if exists (
    select 1 from pg_default_acl d
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'r'
      and (
        exists (select 1 from aclexplode(d.defaclacl) x
                where x.grantee in ('anon'::regrole, 'authenticated'::regrole))
      )
  ) then
    raise exception 'FEH review assertion: postgres future-table grants still exposed';
  end if;
end
$feh_assert$;

commit;
-- END REVIEW-ONLY SQL. Do not execute without the deployment gates above.
