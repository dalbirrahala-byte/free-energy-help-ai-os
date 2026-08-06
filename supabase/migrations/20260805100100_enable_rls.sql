-- Enables Row Level Security on every real, exposed operational table:
-- leads, customers, customer_sites, tasks, activities. Addresses the Supabase
-- Security Advisor warnings on leads/tasks/activities, and brings
-- customers/customer_sites (created without RLS by the same prior migration) up to
-- the same standard, per the Phase 5 instruction to review all exposed
-- operational tables, not only the three originally flagged.
--
-- STATUS: tracked in version control, NOT YET APPLIED to any database.
--
-- Prerequisites, in order:
--   1. 20260805100000_user_roles.sql applied.
--   2. Authentication functioning in production (Phase 3).
--   3. At least one admin row bootstrapped (see that migration's note).
--   4. Every existing query path re-verified against these policies on a
--      staging project first (see docs/SUPABASE_RLS.md test checklist).
--
-- Access model: organisation-wide authenticated access (ADR-008).
--   - Any authenticated user, regardless of role, may SELECT every row —
--     all five Version 1.0 roles include "records:view".
--   - Only a non-read_only role may INSERT/UPDATE/DELETE — matches
--     "records:write" in frontend/src/lib/auth/roles.ts.
--   - The anon role is granted nothing on any of these tables, anywhere
--     in this migration. Public-facing website lead capture
--     (/business-energy-quote, /leads/web/[ref]) does not write to these
--     tables today — it uses browser local storage — so no anon INSERT
--     policy is needed. If that changes, it requires its own reviewed
--     migration, not a broadening of these policies.

create or replace function public.user_can_write()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.id = auth.uid() and ur.role <> 'read_only'
  );
$$;

alter table public.leads enable row level security;
alter table public.customers enable row level security;
alter table public.customer_sites enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

-- leads
create policy leads_select_authenticated on public.leads
  for select to authenticated using (true);
create policy leads_insert_write_roles on public.leads
  for insert to authenticated with check (public.user_can_write());
create policy leads_update_write_roles on public.leads
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy leads_delete_write_roles on public.leads
  for delete to authenticated using (public.user_can_write());

-- customers
create policy customers_select_authenticated on public.customers
  for select to authenticated using (true);
create policy customers_insert_write_roles on public.customers
  for insert to authenticated with check (public.user_can_write());
create policy customers_update_write_roles on public.customers
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy customers_delete_write_roles on public.customers
  for delete to authenticated using (public.user_can_write());

-- customer_sites
create policy customer_sites_select_authenticated on public.customer_sites
  for select to authenticated using (true);
create policy customer_sites_insert_write_roles on public.customer_sites
  for insert to authenticated with check (public.user_can_write());
create policy customer_sites_update_write_roles on public.customer_sites
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy customer_sites_delete_write_roles on public.customer_sites
  for delete to authenticated using (public.user_can_write());

-- tasks
create policy tasks_select_authenticated on public.tasks
  for select to authenticated using (true);
create policy tasks_insert_write_roles on public.tasks
  for insert to authenticated with check (public.user_can_write());
create policy tasks_update_write_roles on public.tasks
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy tasks_delete_write_roles on public.tasks
  for delete to authenticated using (public.user_can_write());

-- activities
create policy activities_select_authenticated on public.activities
  for select to authenticated using (true);
create policy activities_insert_write_roles on public.activities
  for insert to authenticated with check (public.user_can_write());
create policy activities_update_write_roles on public.activities
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy activities_delete_write_roles on public.activities
  for delete to authenticated using (public.user_can_write());

-- ROLLBACK
-- drop policy if exists activities_delete_write_roles on public.activities;
-- drop policy if exists activities_update_write_roles on public.activities;
-- drop policy if exists activities_insert_write_roles on public.activities;
-- drop policy if exists activities_select_authenticated on public.activities;
-- drop policy if exists tasks_delete_write_roles on public.tasks;
-- drop policy if exists tasks_update_write_roles on public.tasks;
-- drop policy if exists tasks_insert_write_roles on public.tasks;
-- drop policy if exists tasks_select_authenticated on public.tasks;
-- drop policy if exists customer_sites_delete_write_roles on public.customer_sites;
-- drop policy if exists customer_sites_update_write_roles on public.customer_sites;
-- drop policy if exists customer_sites_insert_write_roles on public.customer_sites;
-- drop policy if exists customer_sites_select_authenticated on public.customer_sites;
-- drop policy if exists customers_delete_write_roles on public.customers;
-- drop policy if exists customers_update_write_roles on public.customers;
-- drop policy if exists customers_insert_write_roles on public.customers;
-- drop policy if exists customers_select_authenticated on public.customers;
-- drop policy if exists leads_delete_write_roles on public.leads;
-- drop policy if exists leads_update_write_roles on public.leads;
-- drop policy if exists leads_insert_write_roles on public.leads;
-- drop policy if exists leads_select_authenticated on public.leads;
-- alter table public.activities disable row level security;
-- alter table public.tasks disable row level security;
-- alter table public.customer_sites disable row level security;
-- alter table public.customers disable row level security;
-- alter table public.leads disable row level security;
-- drop function if exists public.user_can_write();
