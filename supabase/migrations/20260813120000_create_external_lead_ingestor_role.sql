-- Factory 025C Slice 2C.1a: dedicated database role — creation only.
--
-- WHY THIS EXISTS: public.ingest_external_lead (Slice 2B) is currently
-- callable by nobody but the function owner — deliberately dormant,
-- since no application-facing role should be able to invoke it, and no
-- privileged shortcut (service_role) is permitted. A future,
-- separately-gated migration (Slice 2C.1b) will grant this role EXECUTE
-- on that one function and nothing else. This migration does ONLY the
-- identity creation — activation is explicitly out of scope here.
--
-- SCOPE: creates exactly one role. No GRANT, no REVOKE, no table
-- privilege, no schema privilege, no function EXECUTE, no ownership
-- change, no other role, no RLS/policy change, no other database object
-- of any kind. public.ingest_external_lead, public.ingest_public_lead,
-- public.leads, public.audit_log, and every existing grant/policy are
-- all completely untouched by this file.
--
-- INERT BY DESIGN: this role is created with `password null` — it
-- cannot authenticate via password, and therefore cannot be connected to
-- from any application code, regardless of its LOGIN attribute. LOGIN is
-- set now (rather than deferred to a later ALTER ROLE) purely so that
-- Slice 2C.1b's eventual real-password activation is the only remaining
-- step — not a schema/attribute change bundled with a credential change.
-- No password is generated, stored, or referenced anywhere in this file.
--
-- ATTRIBUTES: NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION,
-- NOBYPASSRLS, NOINHERIT — this role holds no elevated capability of any
-- kind, and NOINHERIT means it cannot silently pick up privileges from
-- any group role it might ever be added to (it is not added to any role
-- here, or anywhere else in this project's migration chain). It owns no
-- database object. It has no table privilege, no schema-modification
-- privilege, and no function EXECUTE grant — those remain exactly as
-- they already are for every existing role, since PUBLIC's existing
-- schema USAGE on `public` is the only privilege this role has by
-- default (confirmed live during the Slice 2C.1 discovery review; no
-- explicit schema grant is included here because none is needed).
--
-- SAFE / IDEMPOTENT: wrapped in a guarded DO block checking pg_roles
-- first, matching the identical pattern already used for CHECK
-- constraints in 20260811100000_leads_source_attribution.sql and
-- 20260806130000_fix_customer_sites_fkey_name.sql (Postgres has no
-- native CREATE ROLE IF NOT EXISTS).

do $$
begin
  if not exists (
    select 1 from pg_roles where rolname = 'external_lead_ingestor'
  ) then
    create role external_lead_ingestor
      with
        login
        nosuperuser
        nocreatedb
        nocreaterole
        noreplication
        nobypassrls
        noinherit
        password null;
  end if;
end
$$;

-- ROLLBACK (documented, not executed): safe at any point, since nothing
-- in this project references this role until a later, separately-gated
-- migration grants it anything.
-- drop role if exists external_lead_ingestor;
