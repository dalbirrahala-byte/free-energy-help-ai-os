-- Schema-alignment migration: missing indexes only.
--
-- WHY THIS EXISTS: the remote-vs-migrations comparison (see the
-- migration-chain review) found four indexes present on production
-- (supabase/remote_public_schema.sql) that no tracked migration ever
-- creates. Like the customer_sites FK rename (20260806130000) and the
-- updated_at trigger function (20260806140000), these were added
-- directly in the SQL editor / dashboard and never captured. This
-- migration closes that gap for indexes only.
--
-- SCOPE: adds exactly the four indexes below, with the exact names and
-- definitions already on production. It does not create, drop, or alter
-- any table, column, RLS policy, trigger, or function.
--
-- SAFE / IDEMPOTENT: every statement uses CREATE INDEX IF NOT EXISTS, so
-- running this against the current production database — where these
-- indexes already exist — is a documented no-op.

create index if not exists customer_sites_contract_end_idx
  on public.customer_sites (contract_end);

create index if not exists customer_sites_is_primary_idx
  on public.customer_sites (customer_id, is_primary);

create index if not exists customers_source_lead_id_idx
  on public.customers (source_lead_id)
  where source_lead_id is not null;

create index if not exists customers_status_idx
  on public.customers (status);

-- ROLLBACK
-- drop index if exists public.customers_status_idx;
-- drop index if exists public.customers_source_lead_id_idx;
-- drop index if exists public.customer_sites_is_primary_idx;
-- drop index if exists public.customer_sites_contract_end_idx;
