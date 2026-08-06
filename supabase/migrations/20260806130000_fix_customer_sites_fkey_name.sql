-- Schema-alignment migration: customer_sites FK naming mismatch only.
--
-- WHY THIS EXISTS: 20250727180000_customers_and_sites.sql declares
-- customer_id inline on a table named "sites", so Postgres auto-named
-- the foreign key constraint "sites_customer_id_fkey".
-- 20250727190000_rename_sites_to_customer_sites.sql renames the table,
-- its primary key, its indexes, and its identity sequence — but renaming
-- a table does not rename constraints attached to it, so the FK
-- constraint keeps the old "sites_customer_id_fkey" name. Production's
-- actual schema (supabase/remote_public_schema.sql) has this constraint
-- named "customer_sites_customer_id_fkey" instead. This was found during
-- the remote-vs-migrations comparison and is fixed here as its own,
-- narrowly scoped migration.
--
-- SCOPE: this migration renames exactly one FK constraint. It does not
-- touch triggers, indexes, updated_at columns, or anything else — those
-- are separate, deliberately out of scope here.
--
-- SAFE / IDEMPOTENT: only acts if the old constraint name exists and the
-- new name doesn't yet, so it is a no-op wherever the constraint is
-- already named correctly (including if the table doesn't exist at all
-- yet, or was already fixed by a prior run of this file).

do $$
begin
  if to_regclass('public.customer_sites') is not null
     and exists (
       select 1 from pg_constraint
       where conname = 'sites_customer_id_fkey'
         and conrelid = 'public.customer_sites'::regclass
     )
     and not exists (
       select 1 from pg_constraint
       where conname = 'customer_sites_customer_id_fkey'
         and conrelid = 'public.customer_sites'::regclass
     )
  then
    alter table public.customer_sites
      rename constraint sites_customer_id_fkey to customer_sites_customer_id_fkey;
  end if;
end
$$;
