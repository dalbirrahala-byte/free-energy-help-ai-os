-- Schema-drift reconciliation: table rename.
--
-- WHY THIS EXISTS: 20250727180000_customers_and_sites.sql creates a table
-- named public.sites. Every later migration and the current production
-- schema (see supabase/remote_public_schema.sql) refer to it as
-- public.customer_sites instead. The rename happened directly against
-- production (SQL editor / dashboard) and was never captured as a tracked
-- migration, so a fresh/shadow database stalls at
-- 20260805100100_enable_rls.sql with "relation public.customer_sites does
-- not exist". This migration closes that gap without editing the
-- already-applied 20250727180000 migration.
--
-- SAFE ON PRODUCTION: the rename only fires if public.sites still exists
-- and public.customer_sites does not — on the current production database
-- (where the rename already happened out-of-band) this is a documented
-- no-op.

do $$
begin
  if exists (
       select 1 from pg_tables
       where schemaname = 'public' and tablename = 'sites'
     )
     and not exists (
       select 1 from pg_tables
       where schemaname = 'public' and tablename = 'customer_sites'
     )
  then
    alter table public.sites rename to customer_sites;
    alter table public.customer_sites rename constraint sites_pkey to customer_sites_pkey;
    alter index public.sites_customer_id_idx rename to customer_sites_customer_id_idx;
    alter index public.sites_one_primary_per_customer rename to customer_sites_one_primary_per_customer;
    alter sequence public.sites_id_seq rename to customer_sites_id_seq;
  end if;
end
$$;
