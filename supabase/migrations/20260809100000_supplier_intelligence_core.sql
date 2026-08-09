-- Factory 022 Stage 1: Supplier Intelligence core registry.
--
-- WHY THIS EXISTS: introduces the first real, live-queryable supplier
-- reference data (suppliers and their products/contract types). This is
-- a foundation for later stages that will progressively feed the
-- existing /suppliers demo UI (Factory 012,
-- frontend/src/lib/suppliers/demo-data.ts) with live data. This
-- migration ONLY adds the two registry tables below — it does not
-- touch, rename, or remove any existing table or column, and it does
-- not modify frontend/src/lib/suppliers/* or the /suppliers page at
-- all. In particular, customer_sites.current_supplier (free text) is
-- left completely untouched; reconciling it against this new registry
-- is an explicit later-stage concern, out of scope here.
--
-- SCOPE: two new tables (suppliers, supplier_products), their indexes,
-- constraints, RLS, and policies. No AI/scoring logic, no external data
-- integrations, no changes to any other table.
--
-- SECURITY MODEL: matches the target access model already defined (but
-- not yet applied) in 20260806120000_repair_rls_and_audit_log.sql —
-- any authenticated user may SELECT, only a non-read_only role may
-- write. public.user_can_write() is (re)defined here with CREATE OR
-- REPLACE using the identical body from that migration, so this
-- migration is safe to apply independently of whether
-- 20260806120000 has landed yet — no conflict, no behavioural
-- difference either way.
--
-- SAFE / IDEMPOTENT: every statement uses IF NOT EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS, so this migration is safe to run more than
-- once. Nothing here is destructive.

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

create table if not exists public.suppliers (
  id bigint generated always as identity primary key,
  name text not null,
  category text,
  status text not null default 'Active',
  is_preferred boolean not null default false,
  electricity_available boolean not null default false,
  gas_available boolean not null default false,
  risk_level text,
  market_segment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id bigint generated always as identity primary key,
  supplier_id bigint not null references public.suppliers (id) on delete cascade,
  product_name text not null,
  fuel_type text not null,
  rate_type text not null,
  min_term_months integer,
  max_term_months integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_products_fuel_type_check
    check (fuel_type in ('Electricity', 'Gas', 'Dual')),
  constraint supplier_products_rate_type_check
    check (rate_type in ('Fixed', 'Flex', 'Renewable')),
  constraint supplier_products_term_check
    check (min_term_months is null or max_term_months is null or min_term_months <= max_term_months)
);

create index if not exists suppliers_status_idx
  on public.suppliers (status);
create index if not exists suppliers_market_segment_idx
  on public.suppliers (market_segment);
create index if not exists supplier_products_supplier_id_idx
  on public.supplier_products (supplier_id);
create index if not exists supplier_products_fuel_type_idx
  on public.supplier_products (fuel_type);

alter table public.suppliers enable row level security;
alter table public.supplier_products enable row level security;

drop policy if exists suppliers_select_authenticated on public.suppliers;
drop policy if exists suppliers_insert_write_roles on public.suppliers;
drop policy if exists suppliers_update_write_roles on public.suppliers;
drop policy if exists suppliers_delete_write_roles on public.suppliers;

create policy suppliers_select_authenticated on public.suppliers
  for select to authenticated using (true);
create policy suppliers_insert_write_roles on public.suppliers
  for insert to authenticated with check (public.user_can_write());
create policy suppliers_update_write_roles on public.suppliers
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy suppliers_delete_write_roles on public.suppliers
  for delete to authenticated using (public.user_can_write());

drop policy if exists supplier_products_select_authenticated on public.supplier_products;
drop policy if exists supplier_products_insert_write_roles on public.supplier_products;
drop policy if exists supplier_products_update_write_roles on public.supplier_products;
drop policy if exists supplier_products_delete_write_roles on public.supplier_products;

create policy supplier_products_select_authenticated on public.supplier_products
  for select to authenticated using (true);
create policy supplier_products_insert_write_roles on public.supplier_products
  for insert to authenticated with check (public.user_can_write());
create policy supplier_products_update_write_roles on public.supplier_products
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy supplier_products_delete_write_roles on public.supplier_products
  for delete to authenticated using (public.user_can_write());

-- No anon policy is created for either table, matching the target
-- access model: anon is granted nothing.

-- ROLLBACK
-- drop policy if exists supplier_products_delete_write_roles on public.supplier_products;
-- drop policy if exists supplier_products_update_write_roles on public.supplier_products;
-- drop policy if exists supplier_products_insert_write_roles on public.supplier_products;
-- drop policy if exists supplier_products_select_authenticated on public.supplier_products;
-- drop policy if exists suppliers_delete_write_roles on public.suppliers;
-- drop policy if exists suppliers_update_write_roles on public.suppliers;
-- drop policy if exists suppliers_insert_write_roles on public.suppliers;
-- drop policy if exists suppliers_select_authenticated on public.suppliers;
-- alter table public.supplier_products disable row level security;
-- alter table public.suppliers disable row level security;
-- drop table if exists public.supplier_products;
-- drop table if exists public.suppliers;
--
-- NOTE: public.user_can_write() is intentionally NOT dropped here — it
-- is shared with leads/customers/customer_sites/tasks/activities RLS
-- policies (per 20260806120000) and dropping it would break those too.
