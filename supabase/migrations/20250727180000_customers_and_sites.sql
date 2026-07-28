-- Customers module: customers, sites (multi-site ready), and CRM links.
-- Apply in Supabase SQL Editor or via CLI before using /customers routes.

create table if not exists public.customers (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  company_name text not null,
  contact_name text,
  telephone text,
  email text,
  status text not null default 'Active',
  notes text,
  source_lead_id bigint references public.leads (id) on delete set null,
  constraint customers_source_lead_id_unique unique (source_lead_id)
);

create index if not exists customers_company_name_idx on public.customers (company_name);
create index if not exists customers_created_at_idx on public.customers (created_at desc);

create table if not exists public.sites (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  customer_id bigint not null references public.customers (id) on delete cascade,
  name text not null default 'Primary site',
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  is_primary boolean not null default false,
  current_supplier text,
  contract_end date
);

create index if not exists sites_customer_id_idx on public.sites (customer_id);

create unique index if not exists sites_one_primary_per_customer
  on public.sites (customer_id)
  where is_primary = true;

alter table public.tasks
  add column if not exists customer_id bigint references public.customers (id) on delete set null;

create index if not exists tasks_customer_id_idx on public.tasks (customer_id);

alter table public.activities
  add column if not exists customer_id bigint references public.customers (id) on delete set null;

create index if not exists activities_customer_id_idx on public.activities (customer_id);

-- Lead → Customer conversion (application workflow, not automatic):
-- 1. INSERT customers (...) RETURNING id; set source_lead_id = lead.id
-- 2. INSERT sites (customer_id, is_primary true, copy supplier/dates from lead or site form)
-- 3. UPDATE leads SET status = 'Won' WHERE id = lead.id
-- 4. UPDATE tasks SET customer_id = :customer_id WHERE lead_id = :lead_id
-- 5. UPDATE activities SET customer_id = :customer_id WHERE lead_id = :lead_id
