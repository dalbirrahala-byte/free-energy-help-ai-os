-- Factory 041 Phase 7A: persistent execution-authorization foundation.
--
-- WHY THIS EXISTS: Factory 041 Phases 3-6 built a chain of purely
-- in-memory, read-only decision layers (suppression evaluation, contact
-- permission, outreach eligibility, execution authorization) that
-- together answer "is this action allowed to proceed?" -- but none of it
-- persists anywhere. A future execution adapter must never be able to
-- rely on an in-memory `authorised` result alone; before any execution
-- capability can exist, FEH needs a durable record answering "was this
-- exact action authorised, under which policy, for which channel, and
-- has this idempotency key already been used?" This migration builds
-- only that durable control foundation -- per the Factory 041 Phase 7
-- approved scope.
--
-- SCOPE: one new table, its indexes, constraints, trigger and RLS
-- policies. Nothing else is touched. This migration does NOT create any
-- writer function, does NOT touch source_registry, opportunity_signals,
-- suppression_records, organisations, contacts, energy_meters,
-- data_provenance, identity_match_candidates, leads, customers,
-- customer_sites, tasks, activities, or audit_log, and does NOT grant
-- any provider/telephony/email/messaging capability. No live execution
-- is authorised by this file in any way.
--
-- IDEMPOTENCY, DATABASE-ENFORCED: `idempotency_key` is `not null`, must be
-- non-blank once trimmed (`btrim`), bounded to 200 characters after
-- trimming, and protected by a genuine unique index computed over its
-- TRIMMED canonical form (execution_authorizations_idempotency_key_idx,
-- an expression index on `btrim(idempotency_key)`, not the raw column)
-- -- so 'ACTION-123' and 'ACTION-123 ' (trailing whitespace) collide as
-- the same key rather than silently occupying two rows. Deliberately NOT
-- case-folded: only whitespace normalisation is applied, never `lower()`.
-- This is the sole, concurrency-safe authority against a duplicate
-- authorization record -- matching the exact same "no pre-insert
-- existence check; the unique index alone prevents the race" discipline
-- already used by ingest_external_lead()
-- (20260813110000_ingest_external_lead_function.sql) for
-- leads.(provider, external_lead_id). The application-layer writer built
-- alongside this migration must rely on this constraint, not a
-- check-then-insert pattern, for exactly that reason. The writer itself
-- needs no additional trimming logic: Phase 6's
-- evaluateExecutionAuthorization() already trims both actionId and
-- idempotencyKey before constructing the authorizationClaim the writer
-- persists, so this database-layer trimming is a hardening of the
-- boundary itself, not a fix for an untrimmed value the writer would
-- otherwise send.
--
-- EXECUTION STATE, DELIBERATELY MINIMAL: `execution_performed` defaults
-- to `false` and NOTHING in this migration or its companion writer ever
-- sets it to `true` -- there is no writer for that in this phase, by
-- design. The one consistency rule enforced here
-- (execution_authorizations_execution_consistency_check) only says
-- `execution_performed_at` must be null while `execution_performed` is
-- false -- it deliberately does NOT force `execution_performed_at` to be
-- non-null once `execution_performed` becomes true, since that policy
-- (e.g. whether an execution_reference is also mandatory at that point)
-- is not yet defined and inventing it now would be exactly the kind of
-- premature future-execution-semantics this phase is instructed to
-- avoid.
--
-- ALL PHASE 6 OUTCOMES PERSISTABLE, NOT JUST 'authorised':
-- `authorization_status` accepts `authorised`/`blocked`/`needs_review`/
-- `evaluation_failed` (Phase 6's own four statuses) plus two schema-level
-- placeholders for future lifecycle states, `revoked`/`expired` -- no
-- revocation or expiry WORKFLOW is implemented anywhere in this
-- migration or its writer; these two values only exist so a future,
-- separately authorised phase can update a row's status without a
-- schema change. `expires_at` is similarly a plain, unpopulated-by-
-- default nullable column -- no duration is invented, no auto-expiry job
-- exists.
--
-- DATA MINIMISATION: no raw email or telephone column exists anywhere on
-- this table. Identity is represented only via `organisation_id`/
-- `contact_id` (FK references) and the `evidence` jsonb column, which is
-- expected to hold only statuses/IDs/booleans/policy references drawn
-- from the already-non-PII evidence shape Phases 4-6 already produce --
-- never a duplicated contact/customer record. This is a documented
-- expectation for the companion writer to honour, not something a CHECK
-- constraint can fully enforce on a jsonb column.
--
-- FOREIGN KEYS, CONSERVATIVE: organisation_id/contact_id/source_id all
-- use ON DELETE SET NULL -- a durable authorization record must never be
-- silently destroyed merely because a linked organisation/contact/source
-- is later deleted, matching the exact same historical-preservation
-- discipline already established for public.data_provenance and
-- public.opportunity_signals. `actor_id` references auth.users, also
-- ON DELETE SET NULL, matching public.audit_log.actor_id's own precedent
-- exactly. No foreign key to a campaign entity is created, since no
-- campaigns table exists anywhere in this schema to reference safely --
-- `campaign_id` remains plain text, matching how campaign attribution is
-- already handled via UTM free-text fields elsewhere in this project.
--
-- SECURITY MODEL: matches the target access model already used by every
-- other Factory 039/040/041 table -- any authenticated user may SELECT,
-- only a non-read_only role may write, no anon policy anywhere.
-- public.user_can_write() is (re)defined here with CREATE OR REPLACE
-- using the identical body already used in every prior migration in this
-- chain, so this migration is safe to apply independently of exact
-- migration-application order.
--
-- SAFE / IDEMPOTENT: every statement uses IF NOT EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS, matching every prior migration in this chain.
-- Nothing here is destructive; the only object created is additive.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per the Factory 041 Phase 7
-- authorisation, this migration is created for local review only. It
-- must NOT be run against Supabase, staged, committed, or pushed until a
-- separate, explicit authorisation is given, following the same
-- multi-gate review process used throughout Factory 039/040/041.

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
-- A. public.execution_authorizations -- durable authorization record
-- ---------------------------------------------------------------------

create table if not exists public.execution_authorizations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Core authorization identity
  action_id text not null,
  idempotency_key text not null,
  requested_channel text not null,
  authorization_status text not null,
  human_approval_state text not null,
  policy_version text not null,

  -- Timing
  authorised_at timestamptz,
  expires_at timestamptz,

  -- References (all optional, all preserve the record on deletion of the referenced row)
  actor_id uuid references auth.users (id) on delete set null,
  organisation_id bigint references public.organisations (id) on delete set null,
  contact_id bigint references public.contacts (id) on delete set null,
  source_id bigint references public.source_registry (id) on delete set null,
  campaign_id text,

  -- Upstream decision context
  outreach_eligibility_status text not null,

  -- Execution state -- see header. No writer in this phase ever sets execution_performed to true.
  execution_performed boolean not null default false,
  execution_performed_at timestamptz,
  execution_reference text,

  -- Non-PII structured evidence -- see header.
  evidence jsonb,
  notes text,

  -- Trimmed-value validation (Phase 7 hardening): char_length alone would
  -- accept a whitespace-only string ('   ') as "non-empty" -- btrim()
  -- matches the exact trimming function already used by
  -- ingest_external_lead() (20260813110000) for the same class of
  -- validation, so a value that is blank once its surrounding whitespace
  -- is removed is correctly rejected here too, not just accepted because
  -- the raw byte length happened to be > 0.
  constraint execution_authorizations_action_id_length_check
    check (char_length(btrim(action_id)) > 0 and char_length(btrim(action_id)) <= 200),
  constraint execution_authorizations_idempotency_key_length_check
    check (char_length(btrim(idempotency_key)) > 0 and char_length(btrim(idempotency_key)) <= 200),
  -- Canonical-storage guarantee (Phase 7 second hardening pass): the
  -- length checks above only reject a value that is BLANK once trimmed —
  -- they do not stop a non-blank but padded value (' ACTION-123' or
  -- 'ACTION-123 ') from actually being stored with its surrounding
  -- whitespace intact. These two constraints close that gap by requiring
  -- the STORED value to already equal its own trimmed form, so the row
  -- on disk is always canonical, not just "close enough" to canonical
  -- via the unique index's btrim() expression. action_id is deliberately
  -- NOT made unique here -- only its canonical form is enforced, per the
  -- existing architecture (no uniqueness requirement on action_id).
  constraint execution_authorizations_action_id_canonical_check
    check (action_id = btrim(action_id)),
  constraint execution_authorizations_idempotency_key_canonical_check
    check (idempotency_key = btrim(idempotency_key)),
  constraint execution_authorizations_requested_channel_check
    check (requested_channel in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')),
  constraint execution_authorizations_authorization_status_check
    check (authorization_status in ('authorised', 'blocked', 'needs_review', 'evaluation_failed', 'revoked', 'expired')),
  constraint execution_authorizations_human_approval_state_check
    check (human_approval_state in ('not_required', 'approved', 'required', 'rejected', 'unknown')),
  constraint execution_authorizations_outreach_eligibility_status_check
    check (outreach_eligibility_status in ('eligible_for_handoff', 'blocked', 'needs_review', 'evaluation_failed')),
  constraint execution_authorizations_execution_consistency_check
    check (execution_performed = true or execution_performed_at is null)
);

-- Uniqueness over the TRIMMED canonical form (Phase 7 hardening): an
-- expression index on btrim(idempotency_key), not the raw column, so
-- 'ACTION-123' and 'ACTION-123 ' (trailing whitespace) collide as the
-- same key rather than silently occupying two rows. Deliberately NOT
-- case-folded (no lower()) -- case-insensitivity was not authorised by
-- the Phase 7 hardening request; only whitespace normalisation is.
create unique index if not exists execution_authorizations_idempotency_key_idx
  on public.execution_authorizations (btrim(idempotency_key));
create index if not exists execution_authorizations_action_id_idx
  on public.execution_authorizations (action_id);
create index if not exists execution_authorizations_authorization_status_idx
  on public.execution_authorizations (authorization_status);
create index if not exists execution_authorizations_organisation_id_idx
  on public.execution_authorizations (organisation_id) where organisation_id is not null;
create index if not exists execution_authorizations_contact_id_idx
  on public.execution_authorizations (contact_id) where contact_id is not null;
create index if not exists execution_authorizations_source_id_idx
  on public.execution_authorizations (source_id) where source_id is not null;
create index if not exists execution_authorizations_created_at_idx
  on public.execution_authorizations (created_at desc);

create or replace trigger execution_authorizations_set_updated_at
  before update on public.execution_authorizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- B. Row Level Security
-- ---------------------------------------------------------------------

alter table public.execution_authorizations enable row level security;

drop policy if exists execution_authorizations_select_authenticated on public.execution_authorizations;
drop policy if exists execution_authorizations_insert_write_roles on public.execution_authorizations;
drop policy if exists execution_authorizations_update_write_roles on public.execution_authorizations;
drop policy if exists execution_authorizations_delete_write_roles on public.execution_authorizations;

create policy execution_authorizations_select_authenticated on public.execution_authorizations
  for select to authenticated using (true);
create policy execution_authorizations_insert_write_roles on public.execution_authorizations
  for insert to authenticated with check (public.user_can_write());
create policy execution_authorizations_update_write_roles on public.execution_authorizations
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy execution_authorizations_delete_write_roles on public.execution_authorizations
  for delete to authenticated using (public.user_can_write());

-- No anon policy is created, matching the target access model: anon is
-- granted nothing.

-- ROLLBACK (documented, not executed)
-- drop policy if exists execution_authorizations_delete_write_roles on public.execution_authorizations;
-- drop policy if exists execution_authorizations_update_write_roles on public.execution_authorizations;
-- drop policy if exists execution_authorizations_insert_write_roles on public.execution_authorizations;
-- drop policy if exists execution_authorizations_select_authenticated on public.execution_authorizations;
-- drop table if exists public.execution_authorizations;
--
-- NOTE: public.user_can_write() is intentionally NOT dropped here -- it
-- is shared with every other RLS-protected table in this schema and
-- dropping it would break those too.
