-- Factory 039 Phase 3: FEH canonical organisation-identity foundation.
--
-- WHY THIS EXISTS: today FEH has no durable business-identity entity --
-- "company_name" is a free-text field duplicated independently on leads
-- and customers, with no shared anchor between a lead and the customer
-- it becomes, no support for multiple contacts or sites-with-meters per
-- business, and no structured way to record where an imported fact came
-- from or how confident FEH is that two records describe the same real
-- business. This migration lays the minimum additive foundation for
-- that, per the Factory 039 Phase 1 / Phase 1B / Phase 2 architecture
-- reports (read-only discovery and design -- no prior Factory 039 phase
-- touched the database):
--   - a new public.organisations table as the canonical business
--     identity anchor
--   - nullable organisation_id links from the EXISTING leads and
--     customers tables (never required, never backfilled here)
--   - new public.contacts and public.energy_meters tables, so a
--     business can eventually have more than one contact and more than
--     one metered supply, without inventing a second, competing
--     "company" concept
--   - new public.data_provenance and public.identity_match_candidates
--     tables, so future data ingestion (Companies House, Apollo, energy
--     data providers, etc.) can record source/confidence and propose
--     matches for human review, WITHOUT ever silently merging records
--
-- ARCHITECT DECISION (Factory 039 Phase 3 authorisation): existing
-- public.customer_sites does NOT gain an organisation_id in this
-- migration. For an existing customer-owned site, organisation identity
-- is resolved through customer_site -> customer -> organisation. This
-- avoids a second, independently-writable path to the same fact on a
-- table that already holds real production data, and prevents
-- customer_sites.organisation_id ever drifting from
-- customers.organisation_id. A future factory may evolve sites into an
-- independently organisation-owned entity if/when FEH needs to model a
-- prospect/pre-customer site with no customer row yet -- deliberately
-- not solved here. public.contacts and public.energy_meters, being
-- brand-new tables with zero existing rows, do NOT carry that same
-- constraint: both have their own required organisation_id directly (so
-- a prospect's contact or meter can exist before any customer/site row
-- does), with an OPTIONAL customer_site_id for when a site link is
-- already known. This is a deliberate, narrower denormalisation than the
-- customer_sites case above -- accepted only because these two tables
-- have no pre-existing single source of truth to drift from.
--
-- ARCHITECT DECISION (Factory 039 Phase 3B revision): delete behaviour
-- across every new table follows one consistent rule, chosen to
-- preserve FEH commercial/history data over convenience:
--   - REAL OWNED BUSINESS RECORDS (contacts.organisation_id,
--     energy_meters.organisation_id) use ON DELETE RESTRICT, not
--     CASCADE. An organisation with any contact or meter still attached
--     to it CANNOT be deleted until those child rows are explicitly
--     reassigned or removed first -- deleting an organisation must never
--     silently take real business records down with it. This is a
--     deliberate strengthening, not a relaxation: it makes accidental
--     data loss structurally impossible rather than merely unlikely.
--   - HISTORICAL / AUDIT-ADJACENT RECORDS (every entity-reference column
--     on data_provenance and identity_match_candidates) use ON DELETE
--     SET NULL instead. Their whole purpose is to outlive the record
--     they describe -- a provenance row or a match-review row must never
--     be destroyed merely because its subject was later deleted,
--     reassigned, or found to be a duplicate. Because a row can now lose
--     its only entity/source reference this way, the "exactly one
--     entity/source must be set" CHECK constraints on both tables have
--     been loosened to "at most one" -- see sections F/G below for the
--     full reasoning.
--   - leads.organisation_id / customers.organisation_id remain ON DELETE
--     SET NULL, unchanged from the original draft -- deleting an
--     organisation must never delete or block deletion of a pre-existing
--     lead/customer row that merely points at it.
--   - contacts.customer_site_id remains ON DELETE SET NULL, unchanged --
--     a contact survives removal of its site link.
--   - energy_meters.customer_site_id changes from CASCADE to SET NULL --
--     a meter's historical/consumption data must survive a site record
--     being removed, exactly like contacts; only the site link itself is
--     cleared. The meter's organisation_id (RESTRICT-protected, see
--     above) remains its independently meaningful anchor throughout.
--
-- SCOPE: five new tables (organisations, contacts, energy_meters,
-- data_provenance, identity_match_candidates), their indexes,
-- constraints, triggers and RLS policies; plus one new nullable,
-- indexed organisation_id column (with an inline FK) on each of the
-- EXISTING public.leads and public.customers tables. Nothing else is
-- touched:
--   - public.customer_sites, public.tasks, public.activities,
--     public.suppliers, public.supplier_products, public.user_roles,
--     public.audit_log: zero columns, constraints, indexes, triggers, or
--     RLS policies changed.
--   - No existing column on leads or customers is altered, renamed, or
--     dropped. Every existing leads/customers row remains fully valid
--     with organisation_id = NULL, meaning "not yet linked to an
--     organisation" -- identical in spirit to every other honestly-
--     nullable column already on these tables (qualification_*,
--     consent_status, etc.).
--   - No backfill. No existing leads.organisation_id or
--     customers.organisation_id value is ever set by this file. That is
--     explicitly a separate, later, application-layer process (Factory
--     039 Phase 2 design report, section 13/N) requiring its own
--     authorisation.
--   - No identity-resolution logic, no scoring formula, no automatic
--     merge of any kind. public.identity_match_candidates only ever
--     stores a proposed match for a human to review; nothing in this
--     migration writes an organisation_id anywhere based on a match.
--   - No RLS policy on any EXISTING table is added, dropped, or
--     modified. RLS is defined here only for the five new tables.
--   - qualification_classification/_score/_reasons/_computed_at (Factory
--     027), renewal-intelligence logic, task/action-queue behaviour, and
--     authentication are entirely unaffected -- nothing in this file
--     reads or references any of them.
--
-- PRODUCTION-STATE CAVEAT (see Factory 039 Phase 1B report): this
-- session has no live read access to the production database. This
-- migration is written against the EXPECTED schema state implied by the
-- full committed migration history (public.leads, public.customers,
-- public.customer_sites, public.user_roles, public.audit_log,
-- public.user_can_write(), public.is_admin(), public.set_updated_at()
-- are all assumed present, per that history). Per the Factory 039
-- Ready-to-Execute Gate, the exact live state of those objects, and of
-- the Factory 027 qualification columns specifically, MUST be
-- independently verified read-only against the real Supabase project
-- before this file is ever applied -- this migration's presence in the
-- repository is not evidence that verification has happened.
--
-- SECURITY MODEL: matches the target access model already used by
-- public.customers / public.customer_sites / public.suppliers /
-- public.supplier_products -- any authenticated user may SELECT, only a
-- non-read_only role may write, no anon policy anywhere. public.
-- user_can_write() and public.is_admin() are (re)defined here with
-- CREATE OR REPLACE using the identical bodies from
-- 20260809100000_supplier_intelligence_core.sql and
-- 20260810090000_fix_user_roles_rls_recursion.sql respectively, so this
-- migration is safe to apply independently of exactly which prior
-- migrations have already landed on production -- no conflict, no
-- behavioural difference either way. public.data_provenance is the one
-- exception to the standard pattern: it is admin-only for SELECT
-- (matching audit_log_select_admin) and has NO update/delete policy at
-- all (append-only by RLS default-deny, also matching public.audit_log)
-- -- provenance history should never be silently rewritten.
--
-- SAFE / IDEMPOTENT: every statement uses IF NOT EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS / a guarded existence check, matching every
-- prior migration in this chain. Nothing here is destructive; every
-- object created is additive.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per the Factory 039 Phase 3
-- authorisation, this migration is created for review only. It must NOT
-- be run against Supabase, staged, committed, or pushed until a
-- separate, explicit Ready-to-Execute authorisation is given, following
-- read-only live verification of the items listed in the Factory 039
-- Phase 1B and Phase 3 reports.

-- ---------------------------------------------------------------------
-- Shared helper functions (defensively redefined, order-independent)
-- ---------------------------------------------------------------------

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

revoke all on function public.user_can_write() from public;
grant execute on function public.user_can_write() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.id = auth.uid() and ur.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- A. public.organisations -- canonical FEH business identity
-- ---------------------------------------------------------------------

create table if not exists public.organisations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legal_name text,
  trading_name text,
  company_number text,
  website text,
  domain text,
  sic_code text,
  employee_count_band text,
  revenue_band text,
  multi_site boolean,
  status text not null default 'Active',
  notes text,
  constraint organisations_identity_name_check
    check (legal_name is not null or trading_name is not null)
);

create unique index if not exists organisations_company_number_idx
  on public.organisations (company_number)
  where company_number is not null;
create index if not exists organisations_domain_idx
  on public.organisations (domain);
create index if not exists organisations_status_idx
  on public.organisations (status);
create index if not exists organisations_legal_name_idx
  on public.organisations (legal_name);
create index if not exists organisations_trading_name_idx
  on public.organisations (trading_name);

create or replace trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- B. leads.organisation_id -- nullable, no backfill
-- ---------------------------------------------------------------------

alter table public.leads
  add column if not exists organisation_id bigint references public.organisations (id) on delete set null;

create index if not exists leads_organisation_id_idx
  on public.leads (organisation_id);

-- ---------------------------------------------------------------------
-- C. customers.organisation_id -- nullable, no backfill
-- ---------------------------------------------------------------------

alter table public.customers
  add column if not exists organisation_id bigint references public.organisations (id) on delete set null;

create index if not exists customers_organisation_id_idx
  on public.customers (organisation_id);

-- ---------------------------------------------------------------------
-- D. public.contacts -- multi-contact-per-organisation
-- ---------------------------------------------------------------------

create table if not exists public.contacts (
  id bigint generated always as identity primary key,
  organisation_id bigint not null references public.organisations (id) on delete restrict,
  customer_site_id bigint references public.customer_sites (id) on delete set null,
  full_name text,
  first_name text,
  last_name text,
  job_title text,
  seniority text,
  email text,
  phone text,
  direct_dial text,
  is_primary boolean not null default false,
  verification_status text not null default 'Unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_verification_status_check
    check (verification_status in ('Unverified', 'Verified', 'Invalid'))
);

create index if not exists contacts_organisation_id_idx
  on public.contacts (organisation_id);
create index if not exists contacts_customer_site_id_idx
  on public.contacts (customer_site_id);
create index if not exists contacts_email_idx
  on public.contacts (email);
create unique index if not exists contacts_one_primary_per_organisation
  on public.contacts (organisation_id)
  where is_primary = true;

create or replace trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- E. public.energy_meters -- electricity/gas supply-point foundation
--
-- Does not assert FEH is entitled to any particular regulated dataset --
-- every value is nullable and honestly "not yet known" until a
-- legitimate, authorised, or consented source provides it.
-- customer_site_id is intentionally OPTIONAL (unlike contacts, which
-- also allows this): a meter must always resolve to a known
-- organisation, but a prospect/pre-customer meter can exist before any
-- customer_sites row does, so it cannot be required here. organisation_id
-- is ON DELETE RESTRICT (an organisation cannot be deleted while it still
-- owns meter records -- see the Phase 3B architect decision above);
-- customer_site_id is ON DELETE SET NULL so a meter's historical/
-- consumption data survives a site record being removed, only losing its
-- site link, not itself.
--
-- MPAN/MPRN validation (Phase 3B revision): the original strict
-- digit-only regex CHECKs have been removed. A Postgres CHECK constraint
-- can never prove an MPAN/MPRN is genuine -- that requires the actual
-- regulated data source, not a format guess -- and a strict regex risked
-- rejecting a legitimate value that a future adapter passes through with
-- ordinary formatting noise (spaces, a leading checksum letter, etc.)
-- before FEH's own normalisation step has run. Normalisation and real
-- validity checking are an application-layer adapter responsibility, per
-- the Factory 039 Phase 2 provider-adapter-boundary design, not this
-- migration's. The one constraint retained is a safe, purely structural
-- one: a meter tagged Electricity should not also carry a Gas MPRN, and
-- vice versa -- this catches an obvious data-entry/mapping mistake
-- without asserting anything about the identifier's own correctness.
--
-- Uniqueness (Phase 3B revision): MPAN/MPRN are NOT uniquely constrained.
-- A DB-level unique index would block a legitimate second/updated meter
-- record for the same physical supply point -- e.g. a re-ingested record
-- from a different source pending reconciliation, or a deliberately kept
-- historical/superseded record -- which would conflict with FEH's
-- preference for preserving historical data over enforcing premature
-- correctness. Whether two meter rows describe the same physical supply
-- point is exactly the kind of question the confidence-based identity-
-- resolution layer (public.identity_match_candidates) exists to answer
-- with human review, not a blunt DB constraint that silently rejects the
-- second insert.
-- ---------------------------------------------------------------------

create table if not exists public.energy_meters (
  id bigint generated always as identity primary key,
  organisation_id bigint not null references public.organisations (id) on delete restrict,
  customer_site_id bigint references public.customer_sites (id) on delete set null,
  fuel_type text not null,
  mpan text,
  mprn text,
  profile_class text,
  meter_type text,
  supplier_name text,
  consumption_eac_kwh numeric,
  consumption_aq_kwh numeric,
  consumption_band text,
  supply_address_line1 text,
  supply_address_line2 text,
  supply_city text,
  supply_postcode text,
  verification_status text not null default 'Unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint energy_meters_fuel_type_check
    check (fuel_type in ('Electricity', 'Gas')),
  constraint energy_meters_verification_status_check
    check (verification_status in ('Unverified', 'Verified', 'Invalid')),
  constraint energy_meters_fuel_identifier_consistency_check
    check (
      (fuel_type <> 'Electricity' or mprn is null) and
      (fuel_type <> 'Gas' or mpan is null)
    )
);

create index if not exists energy_meters_organisation_id_idx
  on public.energy_meters (organisation_id);
create index if not exists energy_meters_customer_site_id_idx
  on public.energy_meters (customer_site_id);
create index if not exists energy_meters_fuel_type_idx
  on public.energy_meters (fuel_type);
create index if not exists energy_meters_mpan_idx
  on public.energy_meters (mpan)
  where mpan is not null;
create index if not exists energy_meters_mprn_idx
  on public.energy_meters (mprn)
  where mprn is not null;

create or replace trigger energy_meters_set_updated_at
  before update on public.energy_meters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- F. public.data_provenance -- entity/record-level "where did this
-- come from", complementary to (not a replacement for) public.audit_log
-- ("what happened, who did it, when"). Uses typed FK columns rather
-- than a loose polymorphic entity_type/entity_id pair, deliberately
-- prioritising referential integrity over audit_log's looser pattern --
-- this table is scoped to a small, fixed set of FEH canonical record
-- types, unlike audit_log's much wider, open-ended event vocabulary.
--
-- DELETE BEHAVIOUR (Phase 3B revision): every entity FK below is ON
-- DELETE SET NULL, not CASCADE. Provenance exists specifically to answer
-- "where did this fact come from" for as long as possible -- deleting
-- the lead, customer, site, contact, meter, or organisation a provenance
-- row describes must never silently destroy that history. Because a row
-- can therefore end up with every entity column null (its one-time
-- subject has since been deleted), the original "exactly one entity
-- column must be set" CHECK has been loosened to "at most one" below --
-- the row's own source_category / provider / source_record_id /
-- confidence / metadata remain meaningful, standalone historical
-- evidence even once its live link is gone.
-- ---------------------------------------------------------------------

create table if not exists public.data_provenance (
  id uuid primary key default gen_random_uuid(),
  organisation_id bigint references public.organisations (id) on delete set null,
  contact_id bigint references public.contacts (id) on delete set null,
  energy_meter_id bigint references public.energy_meters (id) on delete set null,
  lead_id bigint references public.leads (id) on delete set null,
  customer_id bigint references public.customers (id) on delete set null,
  customer_site_id bigint references public.customer_sites (id) on delete set null,
  field_name text,
  source_category text not null,
  provider text,
  source_record_id text,
  ingested_at timestamptz not null default now(),
  verification_status text not null default 'Unverified',
  confidence smallint,
  permitted_use text,
  metadata jsonb,
  correlation_id uuid,
  created_at timestamptz not null default now(),
  constraint data_provenance_source_category_check
    check (source_category in ('PUBLIC', 'LICENSED_AUTHORISED', 'CUSTOMER_CONSENTED', 'COMMERCIAL', 'FEH_FIRST_PARTY')),
  constraint data_provenance_verification_status_check
    check (verification_status in ('Unverified', 'Verified', 'Invalid')),
  constraint data_provenance_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 100)),
  constraint data_provenance_at_most_one_entity_check
    check (
      (case when organisation_id is null then 0 else 1 end) +
      (case when contact_id is null then 0 else 1 end) +
      (case when energy_meter_id is null then 0 else 1 end) +
      (case when lead_id is null then 0 else 1 end) +
      (case when customer_id is null then 0 else 1 end) +
      (case when customer_site_id is null then 0 else 1 end) <= 1
    )
);

create index if not exists data_provenance_organisation_id_idx
  on public.data_provenance (organisation_id) where organisation_id is not null;
create index if not exists data_provenance_contact_id_idx
  on public.data_provenance (contact_id) where contact_id is not null;
create index if not exists data_provenance_energy_meter_id_idx
  on public.data_provenance (energy_meter_id) where energy_meter_id is not null;
create index if not exists data_provenance_lead_id_idx
  on public.data_provenance (lead_id) where lead_id is not null;
create index if not exists data_provenance_customer_id_idx
  on public.data_provenance (customer_id) where customer_id is not null;
create index if not exists data_provenance_customer_site_id_idx
  on public.data_provenance (customer_site_id) where customer_site_id is not null;
create index if not exists data_provenance_provider_idx
  on public.data_provenance (provider);
create index if not exists data_provenance_ingested_at_idx
  on public.data_provenance (ingested_at desc);
create index if not exists data_provenance_source_category_idx
  on public.data_provenance (source_category);

-- ---------------------------------------------------------------------
-- G. public.identity_match_candidates -- confidence-based identity
-- resolution review queue. Proposes matches only; nothing in this
-- migration (or any trigger defined here -- there are none) ever writes
-- an organisation_id onto leads/customers automatically. match_status
-- defaults to REVIEW_REQUIRED, never VERIFIED.
--
-- DELETE BEHAVIOUR (Phase 3B revision): source_lead_id/source_customer_id/
-- source_organisation_id are ON DELETE SET NULL, not CASCADE --
-- identity-resolution evidence (the confidence score, evidence jsonb,
-- and any VERIFIED/REJECTED review decision already made) should survive
-- deletion of the lead/customer/organisation it once referenced, exactly
-- like data_provenance above. candidate_organisation_id is ALSO ON
-- DELETE SET NULL here (reviewed separately, per the Phase 3 audit
-- request): even a candidate match that named an organisation later
-- found to be a duplicate and removed retains historical value (e.g. "we
-- proposed candidate #47, later cleaned up") -- it is preserved as a
-- nullable reference rather than deleted outright. Because a row can
-- therefore end up with none of its four source columns set, the
-- original "exactly one source" CHECK has been loosened to "at most
-- one" below. No automatic merge behaviour is introduced anywhere in
-- this table by this revision -- it remains proposal-only.
-- ---------------------------------------------------------------------

create table if not exists public.identity_match_candidates (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source_lead_id bigint references public.leads (id) on delete set null,
  source_customer_id bigint references public.customers (id) on delete set null,
  source_organisation_id bigint references public.organisations (id) on delete set null,
  source_external_reference text,
  candidate_organisation_id bigint references public.organisations (id) on delete set null,
  match_confidence smallint not null,
  match_status text not null default 'REVIEW_REQUIRED',
  evidence jsonb,
  created_by_process text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  constraint identity_match_candidates_status_check
    check (match_status in ('VERIFIED', 'REVIEW_REQUIRED', 'REJECTED', 'UNMATCHED')),
  constraint identity_match_candidates_confidence_check
    check (match_confidence >= 0 and match_confidence <= 100),
  constraint identity_match_candidates_at_most_one_source_check
    check (
      (case when source_lead_id is null then 0 else 1 end) +
      (case when source_customer_id is null then 0 else 1 end) +
      (case when source_organisation_id is null then 0 else 1 end) +
      (case when source_external_reference is null then 0 else 1 end) <= 1
    )
);

create index if not exists identity_match_candidates_candidate_organisation_id_idx
  on public.identity_match_candidates (candidate_organisation_id);
create index if not exists identity_match_candidates_source_lead_id_idx
  on public.identity_match_candidates (source_lead_id) where source_lead_id is not null;
create index if not exists identity_match_candidates_source_customer_id_idx
  on public.identity_match_candidates (source_customer_id) where source_customer_id is not null;
create index if not exists identity_match_candidates_source_organisation_id_idx
  on public.identity_match_candidates (source_organisation_id) where source_organisation_id is not null;
create index if not exists identity_match_candidates_match_status_idx
  on public.identity_match_candidates (match_status);

-- ---------------------------------------------------------------------
-- H. Row Level Security -- new tables only. No existing-table RLS is
-- touched anywhere in this file.
-- ---------------------------------------------------------------------

alter table public.organisations enable row level security;
alter table public.contacts enable row level security;
alter table public.energy_meters enable row level security;
alter table public.identity_match_candidates enable row level security;
alter table public.data_provenance enable row level security;

-- organisations
drop policy if exists organisations_select_authenticated on public.organisations;
drop policy if exists organisations_insert_write_roles on public.organisations;
drop policy if exists organisations_update_write_roles on public.organisations;
drop policy if exists organisations_delete_write_roles on public.organisations;

create policy organisations_select_authenticated on public.organisations
  for select to authenticated using (true);
create policy organisations_insert_write_roles on public.organisations
  for insert to authenticated with check (public.user_can_write());
create policy organisations_update_write_roles on public.organisations
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy organisations_delete_write_roles on public.organisations
  for delete to authenticated using (public.user_can_write());

-- contacts
drop policy if exists contacts_select_authenticated on public.contacts;
drop policy if exists contacts_insert_write_roles on public.contacts;
drop policy if exists contacts_update_write_roles on public.contacts;
drop policy if exists contacts_delete_write_roles on public.contacts;

create policy contacts_select_authenticated on public.contacts
  for select to authenticated using (true);
create policy contacts_insert_write_roles on public.contacts
  for insert to authenticated with check (public.user_can_write());
create policy contacts_update_write_roles on public.contacts
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy contacts_delete_write_roles on public.contacts
  for delete to authenticated using (public.user_can_write());

-- energy_meters
drop policy if exists energy_meters_select_authenticated on public.energy_meters;
drop policy if exists energy_meters_insert_write_roles on public.energy_meters;
drop policy if exists energy_meters_update_write_roles on public.energy_meters;
drop policy if exists energy_meters_delete_write_roles on public.energy_meters;

create policy energy_meters_select_authenticated on public.energy_meters
  for select to authenticated using (true);
create policy energy_meters_insert_write_roles on public.energy_meters
  for insert to authenticated with check (public.user_can_write());
create policy energy_meters_update_write_roles on public.energy_meters
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy energy_meters_delete_write_roles on public.energy_meters
  for delete to authenticated using (public.user_can_write());

-- identity_match_candidates
drop policy if exists identity_match_candidates_select_authenticated on public.identity_match_candidates;
drop policy if exists identity_match_candidates_insert_write_roles on public.identity_match_candidates;
drop policy if exists identity_match_candidates_update_write_roles on public.identity_match_candidates;
drop policy if exists identity_match_candidates_delete_write_roles on public.identity_match_candidates;

create policy identity_match_candidates_select_authenticated on public.identity_match_candidates
  for select to authenticated using (true);
create policy identity_match_candidates_insert_write_roles on public.identity_match_candidates
  for insert to authenticated with check (public.user_can_write());
create policy identity_match_candidates_update_write_roles on public.identity_match_candidates
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy identity_match_candidates_delete_write_roles on public.identity_match_candidates
  for delete to authenticated using (public.user_can_write());

-- data_provenance: admin-only SELECT (matches audit_log_select_admin),
-- write via the existing application write-path role gate, and
-- deliberately NO update/delete policy -- append-only by RLS
-- default-deny, matching public.audit_log exactly.
drop policy if exists data_provenance_select_admin on public.data_provenance;
drop policy if exists data_provenance_insert_write_roles on public.data_provenance;

create policy data_provenance_select_admin on public.data_provenance
  for select to authenticated using (public.is_admin());
create policy data_provenance_insert_write_roles on public.data_provenance
  for insert to authenticated with check (public.user_can_write());

-- No anon policy is created for any table in this migration, matching
-- the target access model: anon is granted nothing.

-- ROLLBACK (documented, not executed)
-- drop policy if exists data_provenance_insert_write_roles on public.data_provenance;
-- drop policy if exists data_provenance_select_admin on public.data_provenance;
-- drop policy if exists identity_match_candidates_delete_write_roles on public.identity_match_candidates;
-- drop policy if exists identity_match_candidates_update_write_roles on public.identity_match_candidates;
-- drop policy if exists identity_match_candidates_insert_write_roles on public.identity_match_candidates;
-- drop policy if exists identity_match_candidates_select_authenticated on public.identity_match_candidates;
-- drop policy if exists energy_meters_delete_write_roles on public.energy_meters;
-- drop policy if exists energy_meters_update_write_roles on public.energy_meters;
-- drop policy if exists energy_meters_insert_write_roles on public.energy_meters;
-- drop policy if exists energy_meters_select_authenticated on public.energy_meters;
-- drop policy if exists contacts_delete_write_roles on public.contacts;
-- drop policy if exists contacts_update_write_roles on public.contacts;
-- drop policy if exists contacts_insert_write_roles on public.contacts;
-- drop policy if exists contacts_select_authenticated on public.contacts;
-- drop policy if exists organisations_delete_write_roles on public.organisations;
-- drop policy if exists organisations_update_write_roles on public.organisations;
-- drop policy if exists organisations_insert_write_roles on public.organisations;
-- drop policy if exists organisations_select_authenticated on public.organisations;
-- drop table if exists public.identity_match_candidates;
-- drop table if exists public.data_provenance;
-- drop table if exists public.energy_meters;
-- drop table if exists public.contacts;
-- drop index if exists customers_organisation_id_idx;
-- alter table public.customers drop column if exists organisation_id;
-- drop index if exists leads_organisation_id_idx;
-- alter table public.leads drop column if exists organisation_id;
-- drop table if exists public.organisations;
--
-- NOTE: public.user_can_write() and public.is_admin() are intentionally
-- NOT dropped here -- they are shared with leads/customers/
-- customer_sites/tasks/activities/suppliers/supplier_products/user_roles
-- RLS policies and dropping them would break those too.
