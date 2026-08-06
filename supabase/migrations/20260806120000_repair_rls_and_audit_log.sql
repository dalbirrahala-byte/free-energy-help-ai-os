-- Production repair migration: completes RLS + audit_log.
--
-- WHY THIS EXISTS: 20260805100100_enable_rls.sql and
-- 20260805100200_audit_log.sql are recorded as applied in the remote
-- migration history table, but supabase/remote_public_schema.sql (the
-- last pg_dump of the actual production schema) shows their effects were
-- never actually realized on production:
--   - public.leads, public.tasks, public.activities have NO row level
--     security enabled at all on production today.
--   - public.customers and public.customer_sites DO have RLS enabled, but
--     with older, more permissive policies (separate "_anon" /
--     "_authenticated" policies granting anon and authenticated blanket
--     access) rather than the write-role-gated policies the tracked
--     migration defines.
--   - public.user_can_write() does not exist on production.
--   - public.audit_log does not exist on production at all.
--
-- This migration brings production in line with the tracked migrations'
-- intent without editing either already-applied file (repo rule: never
-- modify a migration already recorded as applied remotely).
--
-- DETERMINISTIC / REPEATABLE: every policy is dropped with
-- "DROP POLICY IF EXISTS" immediately before being recreated with
-- "CREATE POLICY", so this migration is safe to run more than once and
-- safe to run regardless of which of the old/new/no policies currently
-- exist. Table/function/index creation uses IF NOT EXISTS throughout.
--
-- Access model (ADR-008), matching 20260805100100_enable_rls.sql:
--   - Any authenticated user may SELECT every row on the five
--     operational tables.
--   - Only a non-read_only role may INSERT/UPDATE/DELETE.
--   - anon is granted nothing on any of these tables.

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
drop policy if exists leads_select_anon on public.leads;
drop policy if exists leads_insert_anon on public.leads;
drop policy if exists leads_update_anon on public.leads;
drop policy if exists leads_delete_anon on public.leads;
drop policy if exists leads_select_authenticated on public.leads;
drop policy if exists leads_insert_write_roles on public.leads;
drop policy if exists leads_update_write_roles on public.leads;
drop policy if exists leads_delete_write_roles on public.leads;

create policy leads_select_authenticated on public.leads
  for select to authenticated using (true);
create policy leads_insert_write_roles on public.leads
  for insert to authenticated with check (public.user_can_write());
create policy leads_update_write_roles on public.leads
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy leads_delete_write_roles on public.leads
  for delete to authenticated using (public.user_can_write());

-- customers (drops the older anon/authenticated blanket policies seen on
-- production, in addition to the tightened ones, so this is safe to run
-- whichever state customers is currently in)
drop policy if exists customers_select_anon on public.customers;
drop policy if exists customers_insert_anon on public.customers;
drop policy if exists customers_update_anon on public.customers;
drop policy if exists customers_delete_anon on public.customers;
drop policy if exists customers_select_authenticated on public.customers;
drop policy if exists customers_insert_authenticated on public.customers;
drop policy if exists customers_update_authenticated on public.customers;
drop policy if exists customers_delete_authenticated on public.customers;
drop policy if exists customers_insert_write_roles on public.customers;
drop policy if exists customers_update_write_roles on public.customers;
drop policy if exists customers_delete_write_roles on public.customers;

create policy customers_select_authenticated on public.customers
  for select to authenticated using (true);
create policy customers_insert_write_roles on public.customers
  for insert to authenticated with check (public.user_can_write());
create policy customers_update_write_roles on public.customers
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy customers_delete_write_roles on public.customers
  for delete to authenticated using (public.user_can_write());

-- customer_sites (same rationale as customers above)
drop policy if exists customer_sites_select_anon on public.customer_sites;
drop policy if exists customer_sites_insert_anon on public.customer_sites;
drop policy if exists customer_sites_update_anon on public.customer_sites;
drop policy if exists customer_sites_delete_anon on public.customer_sites;
drop policy if exists customer_sites_select_authenticated on public.customer_sites;
drop policy if exists customer_sites_insert_authenticated on public.customer_sites;
drop policy if exists customer_sites_update_authenticated on public.customer_sites;
drop policy if exists customer_sites_delete_authenticated on public.customer_sites;
drop policy if exists customer_sites_insert_write_roles on public.customer_sites;
drop policy if exists customer_sites_update_write_roles on public.customer_sites;
drop policy if exists customer_sites_delete_write_roles on public.customer_sites;

create policy customer_sites_select_authenticated on public.customer_sites
  for select to authenticated using (true);
create policy customer_sites_insert_write_roles on public.customer_sites
  for insert to authenticated with check (public.user_can_write());
create policy customer_sites_update_write_roles on public.customer_sites
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy customer_sites_delete_write_roles on public.customer_sites
  for delete to authenticated using (public.user_can_write());

-- tasks
drop policy if exists tasks_select_anon on public.tasks;
drop policy if exists tasks_insert_anon on public.tasks;
drop policy if exists tasks_update_anon on public.tasks;
drop policy if exists tasks_delete_anon on public.tasks;
drop policy if exists tasks_select_authenticated on public.tasks;
drop policy if exists tasks_insert_write_roles on public.tasks;
drop policy if exists tasks_update_write_roles on public.tasks;
drop policy if exists tasks_delete_write_roles on public.tasks;

create policy tasks_select_authenticated on public.tasks
  for select to authenticated using (true);
create policy tasks_insert_write_roles on public.tasks
  for insert to authenticated with check (public.user_can_write());
create policy tasks_update_write_roles on public.tasks
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy tasks_delete_write_roles on public.tasks
  for delete to authenticated using (public.user_can_write());

-- activities
drop policy if exists activities_select_anon on public.activities;
drop policy if exists activities_insert_anon on public.activities;
drop policy if exists activities_update_anon on public.activities;
drop policy if exists activities_delete_anon on public.activities;
drop policy if exists activities_select_authenticated on public.activities;
drop policy if exists activities_insert_write_roles on public.activities;
drop policy if exists activities_update_write_roles on public.activities;
drop policy if exists activities_delete_write_roles on public.activities;

create policy activities_select_authenticated on public.activities
  for select to authenticated using (true);
create policy activities_insert_write_roles on public.activities
  for insert to authenticated with check (public.user_can_write());
create policy activities_update_write_roles on public.activities
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy activities_delete_write_roles on public.activities
  for delete to authenticated using (public.user_can_write());

-- audit_log (table itself absent on production; created here idempotently)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text,
  action text not null check (char_length(action) > 0),
  entity_type text,
  entity_id text,
  correlation_id uuid not null,
  result text not null check (result in ('success', 'failure', 'denied')),
  metadata jsonb
);

create index if not exists audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);
create index if not exists audit_log_action_idx on public.audit_log (action);
create index if not exists audit_log_correlation_id_idx on public.audit_log (correlation_id);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.id = auth.uid() and ur.role = 'admin'
    )
  );

drop policy if exists audit_log_insert_self on public.audit_log;
create policy audit_log_insert_self
  on public.audit_log
  for insert
  to authenticated
  with check (actor_id = auth.uid() or actor_id is null);

-- ROLLBACK
-- drop policy if exists audit_log_insert_self on public.audit_log;
-- drop policy if exists audit_log_select_admin on public.audit_log;
-- alter table public.audit_log disable row level security;
-- drop table if exists public.audit_log;
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
--
-- NOTE: rolling back leaves leads/tasks/activities with RLS disabled and
-- customers/customer_sites with NO policies at all (not restored to the
-- old anon/authenticated ones), which is more restrictive than today's
-- production, not a true revert. Re-review before using in anger.
