-- Factory 024 Phase 1: lead attribution (UTM) and consent foundation.
--
-- WHY THIS EXISTS: Factory 023 Phase 1 added lead_source/source_detail/
-- source_provenance so a lead's origin could be recorded. Factory 024
-- connects the public business-energy-quote form to real lead creation,
-- which needs two more things this migration adds and nothing else:
-- (1) campaign/UTM attribution alongside the existing lead_source columns,
-- and (2) an honest record of whether consent to be contacted was actually
-- given, since the public form's consent checkbox has never had anywhere
-- server-side to be recorded.
--
-- SCOPE: five new nullable UTM columns plus one new NOT NULL DEFAULT FALSE
-- consent column on the existing public.leads table. No other table,
-- column, constraint, function, or RLS policy is touched. In particular,
-- the public-ingestion RLS policy that would let an anonymous request
-- actually insert a lead is a separate, independently-reviewed migration —
-- deliberately NOT part of this file.
--
-- SAFE / IDEMPOTENT: ADD COLUMN IF NOT EXISTS is safe to rerun, matching
-- every prior migration in this chain.
--
-- Existing rows: the five UTM columns become NULL (honestly "no campaign
-- data was ever captured for this lead", not a fabricated value).
-- consent_given defaults to FALSE for every existing row — this is the
-- accurate statement for all pre-Factory-024 leads, since no consent flag
-- has ever been recorded before now; it is not a claim that consent was
-- refused, only that it was never formally captured.

alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_term text;
alter table public.leads add column if not exists utm_content text;
alter table public.leads add column if not exists consent_given boolean not null default false;

-- ROLLBACK (documented, not executed)
-- alter table public.leads drop column if exists consent_given;
-- alter table public.leads drop column if exists utm_content;
-- alter table public.leads drop column if exists utm_term;
-- alter table public.leads drop column if exists utm_campaign;
-- alter table public.leads drop column if exists utm_medium;
-- alter table public.leads drop column if exists utm_source;
