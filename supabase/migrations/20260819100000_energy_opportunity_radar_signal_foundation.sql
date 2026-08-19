-- Factory 040 Phase 3A: FEH Energy Opportunity Radar -- signal foundation.
--
-- WHY THIS EXISTS: FEH wants to reduce dependence on purchased/static lead
-- lists by discovering legitimate UK business-energy opportunities from
-- multiple replaceable sources (public registries, licensed feeds, Apollo,
-- purchased datasets, manual imports, marketing channels, FEH's own CRM
-- data) while never becoming locked into any single provider. This
-- migration lays only the evidence-capture foundation for that -- per the
-- Factory 040 Phase 1 (architecture discovery) and Phase 2 (detailed
-- conceptual design) reports:
--   - public.source_registry: one row per registered source/provider,
--     governing whether and how it may contribute signals.
--   - public.opportunity_signals: an OBSERVATION layer. A signal is
--     evidence, never itself a lead, an opportunity, or permission to
--     contact anyone through any channel.
--
-- SCOPE: two new tables, their indexes, constraints, triggers and RLS
-- policies. Nothing else is touched. In particular, this migration does
-- NOT create energy_opportunities, suppression_records, any adapter code,
-- any scoring/matching/promotion logic, any permission-union change, or
-- any UI -- all explicitly deferred to later, separately authorised
-- phases per the Factory 040 Phase 2 report §S/§V.
--
-- FACTORY 039 INTEGRATION: public.organisations remains the sole canonical
-- business-identity anchor. This migration does not create a second
-- organisation/company master and does not auto-create organisations --
-- opportunity_signals.organisation_id is nullable specifically so an
-- unmatched signal can exist safely pending identity resolution by a
-- later, separately authorised matching/promotion phase (Factory 039's
-- own identity_match_candidates table remains the sole mechanism for
-- proposing a match; this migration only adds an optional pointer to a
-- resolved match, never a competing matching mechanism). No existing
-- Factory 039 table, column, constraint, index, trigger, or RLS policy is
-- altered, renamed, or dropped anywhere in this file.
--
-- PROVENANCE / EVIDENCE BOUNDARY: opportunity_signals distinguishes
-- SOURCE FACT (structured_facts jsonb, only ever populated from
-- structured, source-verified data), NORMALISED DATA (the bulk of the
-- table's columns), AI INFERENCE (energy_relevance_hypothesis, always
-- paired with the ai_inferred flag), and HUMAN VERIFIED DATA (the
-- evidence_quality/status lifecycle columns, only ever advanced by a
-- reviewing human or a later, separately authorised process). AI-inferred
-- content can never silently become source_verified = true -- there is no
-- statement in this migration that sets one from the other; that
-- separation is enforced by keeping them as independent columns with
-- independent defaults, for the application layer to respect.
--
-- COMPLIANCE REPRESENTATION (schema only -- no crawling, no external
-- calls, no access-control bypass of any kind is implemented or implied
-- anywhere in this file): source_registry.legal_classification,
-- robots_txt_status, terms_of_service_status, crawl_permission_state, and
-- enabled together let FEH represent source allow/block state, robots.txt
-- and Terms-of-Service posture, and a deterministic kill switch. A CHECK
-- constraint (source_registry_public_web_compliance_check) makes it
-- structurally impossible to mark a PUBLIC_WEB source both enabled and
-- non-compliant with robots.txt/ToS at the same time -- this is enforced
-- at the database level, not left to application discipline alone.
-- Historical evidence is never deleted when a source is disabled:
-- source_id on opportunity_signals is NOT NULL with ON DELETE RESTRICT,
-- so a source with any recorded signals cannot be deleted at all, only
-- disabled (enabled = false) -- matching the "historical provenance must
-- remain intact" requirement exactly, and mirroring the same ON DELETE
-- RESTRICT discipline Factory 039 already established for
-- contacts.organisation_id / energy_meters.organisation_id.
--
-- NO SECRETS: source_registry intentionally has no column for API keys,
-- tokens, or credentials of any kind. Any real provider credential a
-- future adapter needs belongs in server-side environment configuration,
-- never in this table.
--
-- DEDUPLICATION FOUNDATION ONLY: opportunity_signals.duplication_fingerprint
-- is a plain, non-unique, indexed column -- the actual fingerprint
-- computation and the decision to mark a row 'superseded' are explicitly
-- application-layer logic for a later phase. It is deliberately NOT a
-- unique constraint: the intended pattern is that a genuine repeat
-- observation is still insertable, then linked via superseded_by_signal_id
-- to the earlier row and marked status = 'superseded' -- a unique
-- constraint would block that pattern outright instead of enabling it.
--
-- SECURITY MODEL: matches the target access model already used by
-- public.organisations / public.contacts / public.energy_meters /
-- public.identity_match_candidates (Factory 039) -- any authenticated
-- user may SELECT, only a non-read_only role may write, no anon policy
-- anywhere. public.user_can_write() is (re)defined here with CREATE OR
-- REPLACE using the identical body from
-- 20260818100000_organisation_identity_foundation.sql, so this migration
-- is safe to apply independently of exact migration-application order --
-- no conflict, no behavioural difference either way. No change to the
-- existing Permission union (frontend/src/lib/auth/roles.ts) is made or
-- required by this migration; per the Factory 040 Phase 2 report §O, a
-- future, separately authorised phase may introduce more granular
-- opportunity-radar-specific permissions -- documented as an open item,
-- not implemented here.
--
-- SAFE / IDEMPOTENT: every statement uses IF NOT EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS, matching every prior migration in this chain.
-- Nothing here is destructive; every object created is additive. No
-- existing table, column, constraint, index, trigger, function, or policy
-- is dropped, renamed, or altered anywhere in this file.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per the Factory 040 Phase 3A
-- authorisation, this migration is created for local review only. It
-- must NOT be run against Supabase, staged, committed, or pushed until a
-- separate, explicit authorisation is given, following the same
-- multi-gate review process used for Factory 039.

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
-- A. public.source_registry -- provider-neutral source governance
--
-- Four conceptual groups, per the Factory 040 Phase 2 design:
--   SOURCE IDENTITY   : source_key, source_name, provider, source_type,
--                        discovery_capable, enrichment_capable,
--                        contact_data_capable
--   SOURCE GOVERNANCE  : enabled, legal_classification, access_method,
--                        robots_txt_status, terms_of_service_status,
--                        crawl_permission_state, rate_limit_*,
--                        retention_days
--   SOURCE HEALTH      : last_checked_at, last_successful_fetch_at,
--                        health_status, consecutive_failure_count
--   SOURCE ECONOMICS   : cost_model, unit_cost, reliability_score, notes
--
-- reliability_score is intentionally a plain nullable numeric column with
-- no computation logic here -- it is meant to be populated only by a
-- later, separately authorised learning-loop process (Factory 040 Phase
-- 2 report §Q), never hand-entered as a guessed figure. That expectation
-- is documentation only in this migration, not enforced by a constraint.
-- ---------------------------------------------------------------------

create table if not exists public.source_registry (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- SOURCE IDENTITY
  source_key text not null,
  source_name text not null,
  provider text not null,
  source_type text not null,
  discovery_capable boolean not null default false,
  enrichment_capable boolean not null default false,
  contact_data_capable boolean not null default false,

  -- SOURCE GOVERNANCE
  enabled boolean not null default false,
  legal_classification text not null,
  access_method text not null,
  robots_txt_status text not null default 'NOT_YET_REVIEWED',
  terms_of_service_status text not null default 'NOT_YET_REVIEWED',
  crawl_permission_state text not null default 'NOT_APPLICABLE',
  rate_limit_requests_per_minute integer,
  rate_limit_min_delay_ms integer,
  retention_days integer,

  -- SOURCE HEALTH
  last_checked_at timestamptz,
  last_successful_fetch_at timestamptz,
  health_status text not null default 'UNKNOWN',
  consecutive_failure_count integer not null default 0,

  -- SOURCE ECONOMICS
  cost_model text not null default 'FREE',
  unit_cost numeric,
  reliability_score numeric,
  notes text,

  constraint source_registry_source_type_check
    check (source_type in ('DISCOVERY', 'ENRICHMENT', 'INBOUND', 'IMPORT', 'CHANNEL', 'INTERNAL')),
  constraint source_registry_legal_classification_check
    check (legal_classification in ('PUBLIC', 'LICENSED_AUTHORISED', 'CUSTOMER_CONSENTED', 'COMMERCIAL', 'FEH_FIRST_PARTY')),
  constraint source_registry_access_method_check
    check (access_method in ('API', 'LICENSED_FEED', 'PUBLIC_WEB', 'MANUAL_UPLOAD', 'INTERNAL_QUERY')),
  constraint source_registry_robots_txt_status_check
    check (robots_txt_status in ('COMPLIANT', 'RESTRICTED', 'NOT_YET_REVIEWED', 'NOT_APPLICABLE')),
  constraint source_registry_terms_of_service_status_check
    check (terms_of_service_status in ('COMPLIANT', 'RESTRICTED', 'NOT_YET_REVIEWED', 'NOT_APPLICABLE')),
  constraint source_registry_crawl_permission_state_check
    check (crawl_permission_state in ('NOT_APPLICABLE', 'PERMITTED', 'SUSPENDED')),
  constraint source_registry_health_status_check
    check (health_status in ('HEALTHY', 'DEGRADED', 'FAILING', 'UNKNOWN')),
  constraint source_registry_cost_model_check
    check (cost_model in ('FREE', 'SUBSCRIPTION', 'PER_RECORD', 'PER_CALL')),
  constraint source_registry_consecutive_failure_count_check
    check (consecutive_failure_count >= 0),

  -- Structural compliance gate: a PUBLIC_WEB source cannot be enabled
  -- unless BOTH robots.txt and Terms-of-Service posture are confirmed
  -- compliant. This is the one governance rule enforced at the database
  -- level rather than left to application discipline alone.
  constraint source_registry_public_web_compliance_check
    check (
      access_method <> 'PUBLIC_WEB'
      or not enabled
      or (robots_txt_status = 'COMPLIANT' and terms_of_service_status = 'COMPLIANT')
    )
);

create unique index if not exists source_registry_source_key_idx
  on public.source_registry (source_key);
create index if not exists source_registry_source_type_idx
  on public.source_registry (source_type);
create index if not exists source_registry_enabled_idx
  on public.source_registry (enabled);
create index if not exists source_registry_health_status_idx
  on public.source_registry (health_status);

create or replace trigger source_registry_set_updated_at
  before update on public.source_registry
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- B. public.opportunity_signals -- evidence-first observation layer
--
-- A signal is an OBSERVATION. It is NOT automatically a lead, an
-- opportunity, permission to contact, permission for AI Voice, permission
-- for email, or permission for WhatsApp. Nothing in this migration (or
-- any trigger defined here -- there are none) grants any of those things;
-- that logic belongs entirely to later, separately authorised phases
-- (energy_opportunities, suppression_records, promotion engine, action
-- handoff -- none of which are created here).
--
-- organisation_id is nullable: an unmatched signal (no confident
-- organisation match yet) can exist safely, carrying
-- unresolved_candidate_name/unresolved_candidate_domain as a best-guess
-- hint, pending resolution by a later matching phase built on Factory
-- 039's identity_match_candidates -- never by auto-creating a new
-- organisation here.
-- ---------------------------------------------------------------------

create table if not exists public.opportunity_signals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Linkage
  organisation_id bigint references public.organisations (id) on delete set null,
  unresolved_candidate_name text,
  unresolved_candidate_domain text,
  source_id bigint not null references public.source_registry (id) on delete restrict,
  data_provenance_id uuid references public.data_provenance (id) on delete set null,
  identity_match_candidate_id bigint references public.identity_match_candidates (id) on delete set null,

  -- Observation
  external_reference text,
  observed_at timestamptz not null,
  source_url text,
  source_title text,
  source_excerpt text,

  -- Classification (NORMALISED DATA)
  signal_family text not null,
  signal_type text not null,
  structured_facts jsonb,

  -- Interpretation (AI INFERENCE zone, when populated)
  energy_relevance_hypothesis text,
  confidence smallint,
  evidence_quality text not null default 'unverified',
  geographic_relevance text,

  -- Deduplication (foundation only -- see header comment)
  duplication_fingerprint text not null,
  superseded_by_signal_id bigint references public.opportunity_signals (id) on delete set null,

  -- Verification (HUMAN VERIFIED DATA boundary)
  ai_inferred boolean not null default false,
  source_verified boolean not null default false,

  -- Compliance inheritance
  legal_classification text not null,
  contactability_hint text,

  -- Lifecycle
  status text not null default 'observed',

  constraint opportunity_signals_signal_family_check
    check (signal_family in (
      'BUSINESS_CHANGE', 'PROPERTY_DEVELOPMENT', 'ENERGY_DEMAND', 'PROCUREMENT',
      'PAIN_SERVICE', 'COMMERCIAL_INTELLIGENCE', 'RENEWABLE_DECARBONISATION',
      'METERING_INFRASTRUCTURE', 'CUSTOMER_RENEWAL', 'DIGITAL_INTENT'
    )),
  constraint opportunity_signals_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 100)),
  constraint opportunity_signals_evidence_quality_check
    check (evidence_quality in (
      'verified-primary', 'verified-secondary', 'corroborated',
      'ai-inferred', 'unverified', 'stale', 'conflicting'
    )),
  constraint opportunity_signals_legal_classification_check
    check (legal_classification in ('PUBLIC', 'LICENSED_AUTHORISED', 'CUSTOMER_CONSENTED', 'COMMERCIAL', 'FEH_FIRST_PARTY')),
  constraint opportunity_signals_status_check
    check (status in (
      'observed', 'needs_identity_match', 'matched', 'needs_review',
      'verified', 'rejected', 'promoted', 'expired', 'superseded'
    )),
  constraint opportunity_signals_source_excerpt_length_check
    check (source_excerpt is null or char_length(source_excerpt) <= 2000)
);

create index if not exists opportunity_signals_source_id_idx
  on public.opportunity_signals (source_id);
create index if not exists opportunity_signals_organisation_id_idx
  on public.opportunity_signals (organisation_id) where organisation_id is not null;
create index if not exists opportunity_signals_status_idx
  on public.opportunity_signals (status);
create index if not exists opportunity_signals_observed_at_idx
  on public.opportunity_signals (observed_at desc);
create index if not exists opportunity_signals_signal_family_idx
  on public.opportunity_signals (signal_family);
create index if not exists opportunity_signals_duplication_fingerprint_idx
  on public.opportunity_signals (duplication_fingerprint);
create index if not exists opportunity_signals_superseded_by_signal_id_idx
  on public.opportunity_signals (superseded_by_signal_id) where superseded_by_signal_id is not null;
create index if not exists opportunity_signals_identity_match_candidate_id_idx
  on public.opportunity_signals (identity_match_candidate_id) where identity_match_candidate_id is not null;

create or replace trigger opportunity_signals_set_updated_at
  before update on public.opportunity_signals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- C. Row Level Security -- new tables only. No existing-table RLS is
-- touched anywhere in this file, including no change to any Factory 039
-- policy.
-- ---------------------------------------------------------------------

alter table public.source_registry enable row level security;
alter table public.opportunity_signals enable row level security;

-- source_registry
drop policy if exists source_registry_select_authenticated on public.source_registry;
drop policy if exists source_registry_insert_write_roles on public.source_registry;
drop policy if exists source_registry_update_write_roles on public.source_registry;
drop policy if exists source_registry_delete_write_roles on public.source_registry;

create policy source_registry_select_authenticated on public.source_registry
  for select to authenticated using (true);
create policy source_registry_insert_write_roles on public.source_registry
  for insert to authenticated with check (public.user_can_write());
create policy source_registry_update_write_roles on public.source_registry
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy source_registry_delete_write_roles on public.source_registry
  for delete to authenticated using (public.user_can_write());

-- opportunity_signals
drop policy if exists opportunity_signals_select_authenticated on public.opportunity_signals;
drop policy if exists opportunity_signals_insert_write_roles on public.opportunity_signals;
drop policy if exists opportunity_signals_update_write_roles on public.opportunity_signals;
drop policy if exists opportunity_signals_delete_write_roles on public.opportunity_signals;

create policy opportunity_signals_select_authenticated on public.opportunity_signals
  for select to authenticated using (true);
create policy opportunity_signals_insert_write_roles on public.opportunity_signals
  for insert to authenticated with check (public.user_can_write());
create policy opportunity_signals_update_write_roles on public.opportunity_signals
  for update to authenticated using (public.user_can_write()) with check (public.user_can_write());
create policy opportunity_signals_delete_write_roles on public.opportunity_signals
  for delete to authenticated using (public.user_can_write());

-- No anon policy is created for either table, matching the target access
-- model: anon is granted nothing.
--
-- OPEN QUESTION (documented, not decided here): per the Factory 040
-- Phase 2 report §O, opportunity_signals holds raw, unreviewed evidence
-- that may warrant a stricter SELECT policy (e.g. admin-only, matching
-- data_provenance's pattern) rather than the standard authenticated-read
-- policy applied above. The standard pattern was used here to avoid
-- introducing new access-control asymmetry without explicit authorisation
-- in this narrowly-scoped phase -- revisit explicitly in a later phase if
-- warranted.

-- ROLLBACK (documented, not executed)
-- drop policy if exists opportunity_signals_delete_write_roles on public.opportunity_signals;
-- drop policy if exists opportunity_signals_update_write_roles on public.opportunity_signals;
-- drop policy if exists opportunity_signals_insert_write_roles on public.opportunity_signals;
-- drop policy if exists opportunity_signals_select_authenticated on public.opportunity_signals;
-- drop policy if exists source_registry_delete_write_roles on public.source_registry;
-- drop policy if exists source_registry_update_write_roles on public.source_registry;
-- drop policy if exists source_registry_insert_write_roles on public.source_registry;
-- drop policy if exists source_registry_select_authenticated on public.source_registry;
-- drop table if exists public.opportunity_signals;
-- drop table if exists public.source_registry;
--
-- NOTE: public.user_can_write() is intentionally NOT dropped here -- it
-- is shared with leads/customers/customer_sites/tasks/activities/
-- suppliers/supplier_products/user_roles/organisations/contacts/
-- energy_meters/identity_match_candidates RLS policies and dropping it
-- would break those too.
