-- Factory 041 Phase 2: FEH suppression / do-not-contact foundation.
--
-- WHY THIS EXISTS: FEH's Factory 040 Energy Opportunity Radar is designed
-- to eventually surface organisations worth contacting -- but nothing in
-- this codebase has ever had a durable, first-class place to record that
-- a business or contact must NOT be approached (do-not-call, consent
-- withdrawn, a legal restriction, an internal quality block, etc.).
-- lib/ai-workforce/workers/complianceWorker.ts already names this exact
-- gap as its own missing prerequisite ("Requires a real suppression_records
-- data source"). This migration builds only that storage layer -- per the
-- Factory 041 Phase 1 (discovery) and Phase 2 (approved scope) reports.
--
-- SCOPE: one new table, its indexes, constraints and RLS policies.
-- Nothing else is touched. This migration does NOT build any evaluation/
-- enforcement function, does NOT wire suppression into any contact path
-- (none exists anywhere in this codebase to wire into), does NOT touch
-- source_registry or opportunity_signals (Factory 040), and does NOT
-- touch organisations/contacts/energy_meters/data_provenance/
-- identity_match_candidates/leads/customers/customer_sites/tasks/
-- activities or any existing revenue-engine/action-queue object.
--
-- FAIL-SAFE DESIGN NOTE (storage-level only -- see header of the
-- companion identity-resolution module for the logic-level equivalent):
-- this table only ever RECORDS a suppression decision; it contains no
-- "is_contactable" helper, view, or function that could itself return a
-- wrong permissive answer under uncertainty, because no such evaluation
-- logic is built anywhere in this phase. A future factory that builds an
-- actual contact-decision path is expected to treat "no matching
-- suppression row" as the only permissive state, and any ambiguous or
-- partial match as suppressive -- that evaluation rule is intentionally
-- NOT encoded here, since encoding it prematurely, before any real
-- contact path exists, would risk becoming exactly the kind of unused,
-- unverified logic this project's own history (lib/website-leads' orphaned
-- write API) already shows is a real failure mode.
--
-- SCOPE FIELDS: a row may be scoped by any combination of
-- organisation_id / contact_id / email / telephone / domain / source_id /
-- channel / campaign_id -- at least one identifying field must be
-- present, enforced by a guard CHECK, so an empty/no-op suppression row
-- can never be inserted.
--
-- SECURITY MODEL: matches the target access model already used by
-- public.organisations / public.contacts / public.source_registry /
-- public.opportunity_signals -- any authenticated user may SELECT, only a
-- non-read_only role may write, no anon policy anywhere. This table is
-- deliberately NOT admin-only for SELECT: any future compliance check
-- needs every authenticated operational user (not just admins) to be
-- able to read suppression state before it could ever gate a contact
-- decision -- restricting read access here would make the table
-- structurally unusable for its own stated purpose. public.
-- user_can_write() is (re)defined here with CREATE OR REPLACE using the
-- identical body already used in 20260818100000 and 20260819100000, so
-- this migration is safe to apply independently of exact
-- migration-application order.
--
-- NO CUSTOMER/CONTACT DATA EXPOSED TO ANON: no anon policy is created on
-- this table, matching every other real table in this schema.
--
-- SAFE / IDEMPOTENT: every statement uses IF NOT EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS, matching every prior migration in this chain.
-- Nothing here is destructive; the only object created is additive.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per the Factory 041 Phase 2
-- authorisation, this migration is created for local review only. It
-- must NOT be run against Supabase, staged, committed, or pushed until a
-- separate, explicit authorisation is given, following the same
-- multi-gate review process used for Factory 039 and Factory 040.

-- ---------------------------------------------------------------------
-- Shared helper function (defensively redefined, order-independent)
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

-- ---------------------------------------------------------------------
-- A. public.suppression_records -- do-not-contact / suppression storage
--
-- A row suppresses at whichever scope its populated identifying columns
-- describe -- organisation-wide, contact-specific, or identifier-specific
-- (email/telephone/domain, which can catch a shared inbox/switchboard
-- across organisations), optionally narrowed further to one source or
-- campaign. Precedence/interpretation logic (which row wins when several
-- apply) is explicitly an application-layer concern for a later,
-- separately authorised phase -- this migration only guarantees every
-- row is unambiguous about WHAT it suppresses and WHY.
-- ---------------------------------------------------------------------

create table if not exists public.suppression_records (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),

  -- Scope (at least one of the eight identifying fields below must be set)
  organisation_id bigint references public.organisations (id) on delete set null,
  contact_id bigint references public.contacts (id) on delete set null,
  email text,
  telephone text,
  domain text,
  source_id bigint references public.source_registry (id) on delete set null,
  channel text,
  campaign_id text,

  -- Reason / basis
  reason text not null,
  legal_basis text,
  requested_by text not null,

  -- Duration
  scope text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,

  -- Evidence / notes
  evidence_reference text,
  notes text,

  constraint suppression_records_reason_check
    check (reason in (
      'DO_NOT_CALL', 'DO_NOT_EMAIL', 'DO_NOT_WHATSAPP', 'GLOBAL', 'COMPLAINT',
      'CONSENT_WITHDRAWN', 'LEGAL_RESTRICTION', 'INTERNAL_QUALITY_BLOCK', 'COOLING_PERIOD'
    )),
  constraint suppression_records_requested_by_check
    check (requested_by in ('ORGANISATION', 'INTERNAL', 'REGULATORY')),
  constraint suppression_records_scope_check
    check (scope in ('PERMANENT', 'TEMPORARY', 'SOURCE_SPECIFIC', 'CAMPAIGN_SPECIFIC')),
  constraint suppression_records_channel_check
    check (channel is null or channel in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')),
  constraint suppression_records_temporary_has_end_check
    check (scope <> 'TEMPORARY' or ends_at is not null),
  constraint suppression_records_end_after_start_check
    check (ends_at is null or ends_at > starts_at),

  -- Guard: an unscoped suppression row (nothing identifying) is never
  -- valid -- prevents an accidental no-op row from being mistaken for a
  -- real suppression by any future reader.
  constraint suppression_records_has_identifying_scope_check
    check (
      organisation_id is not null or contact_id is not null or email is not null
      or telephone is not null or domain is not null or source_id is not null
    )
);

create index if not exists suppression_records_organisation_id_idx
  on public.suppression_records (organisation_id) where organisation_id is not null;
create index if not exists suppression_records_contact_id_idx
  on public.suppression_records (contact_id) where contact_id is not null;
create index if not exists suppression_records_email_idx
  on public.suppression_records (email) where email is not null;
create index if not exists suppression_records_telephone_idx
  on public.suppression_records (telephone) where telephone is not null;
create index if not exists suppression_records_domain_idx
  on public.suppression_records (domain) where domain is not null;
create index if not exists suppression_records_source_id_idx
  on public.suppression_records (source_id) where source_id is not null;
create index if not exists suppression_records_reason_idx
  on public.suppression_records (reason);
create index if not exists suppression_records_scope_idx
  on public.suppression_records (scope);
create index if not exists suppression_records_ends_at_idx
  on public.suppression_records (ends_at) where ends_at is not null;

-- No updated_at column/trigger: suppression rows are intentionally
-- append-only in spirit (a changed decision is recorded as a NEW row,
-- e.g. a fresh GLOBAL suppression, rather than mutating history) --
-- matching the same discipline already used for public.audit_log and
-- public.data_provenance elsewhere in this schema. Nothing in this
-- migration prevents an UPDATE (RLS still permits it to a writer role),
-- but no lifecycle column implies one is expected.

-- ---------------------------------------------------------------------
-- B. Row Level Security
-- ---------------------------------------------------------------------

alter table public.suppression_records enable row level security;

drop policy if exists suppression_records_select_authenticated on public.suppression_records;
drop policy if exists suppression_records_insert_write_roles on public.suppression_records;
drop policy if exists suppression_records_update_write_roles on public.suppression_records;
drop policy if exists suppression_records_delete_write_roles on public.suppression_records;

create policy suppression_records_select_authenticated on public.suppression_records
  for select to authenticated using (true);
create policy suppression_records_insert_write_roles on public.suppression_records
  for insert to authenticated with check (public.user_can_write());
create policy suppression_records_update_write_roles on public.suppression_records
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy suppression_records_delete_write_roles on public.suppression_records
  for delete to authenticated using (public.user_can_write());

-- No anon policy is created, matching the target access model: anon is
-- granted nothing, and no customer/contact-identifying data in this
-- table is ever exposed to an unauthenticated caller.

-- ROLLBACK (documented, not executed)
-- drop policy if exists suppression_records_delete_write_roles on public.suppression_records;
-- drop policy if exists suppression_records_update_write_roles on public.suppression_records;
-- drop policy if exists suppression_records_insert_write_roles on public.suppression_records;
-- drop policy if exists suppression_records_select_authenticated on public.suppression_records;
-- drop table if exists public.suppression_records;
--
-- NOTE: public.user_can_write() is intentionally NOT dropped here -- it
-- is shared with every other RLS-protected table in this schema and
-- dropping it would break those too.
