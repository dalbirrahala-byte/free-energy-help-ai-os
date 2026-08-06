-- Schema-alignment migration: updated_at trigger function + triggers only.
--
-- WHY THIS EXISTS: supabase/remote_public_schema.sql (the last pg_dump of
-- actual production) defines public.set_updated_at() and two triggers
-- (customer_sites_set_updated_at, customers_set_updated_at) that keep
-- customer_sites.updated_at / customers.updated_at current on every UPDATE.
-- Neither the function nor either trigger is created by any tracked
-- migration in this repo — like the customer_sites rename and FK rename
-- found earlier, these were applied directly in the SQL editor / dashboard
-- and never captured. This was found during the same remote-vs-migrations
-- comparison and is fixed here as its own, narrowly scoped migration.
--
-- SCOPE: this migration adds exactly the function and the two triggers
-- production already has. It does not touch tables, columns, indexes, or
-- RLS. Notably, public.user_roles also has an updated_at column but has
-- NO such trigger on production today (confirmed against
-- supabase/remote_public_schema.sql) — adding one would be a behaviour
-- change, not alignment, so it is deliberately left out here.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION and CREATE OR REPLACE
-- TRIGGER (PostgreSQL 14+; this project runs 17.x) are both safe to rerun
-- and safe wherever the function/triggers already exist, so applying this
-- against the current production database is a documented no-op.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger customer_sites_set_updated_at
  before update on public.customer_sites
  for each row execute function public.set_updated_at();

create or replace trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ROLLBACK
-- drop trigger if exists customers_set_updated_at on public.customers;
-- drop trigger if exists customer_sites_set_updated_at on public.customer_sites;
-- drop function if exists public.set_updated_at();
