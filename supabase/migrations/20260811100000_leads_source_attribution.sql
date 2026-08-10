-- Factory 023 Phase 1: lead source/attribution foundation.
--
-- WHY THIS EXISTS: today `leads` has zero concept of where a lead came
-- from (website, referral, outbound, AI search, etc.) or whether its
-- data was entered by a human, inferred by AI, or independently
-- verified. Every future Revenue Engine capability (AI lead generation,
-- AI-search attribution, AI voice reception) needs somewhere honest to
-- record that provenance from the moment a lead is created. This
-- migration adds only that — no scoring, no assigned-owner, no
-- qualification/review-status fields, no suppression/consent table.
-- Those are deliberately deferred to a later factory once their real
-- shape is known, per the Factory 023 architecture assessment.
--
-- SCOPE: three new columns on the existing public.leads table plus one
-- CHECK constraint. No new table, no RLS policy change (leads' existing
-- RLS already governs every column on the table automatically), no
-- change to any other table or historical migration.
--
-- SAFE / IDEMPOTENT: ADD COLUMN IF NOT EXISTS is safe to rerun. The
-- constraint is added via a guarded DO block (Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS), matching the pattern already used in
-- 20260806130000_fix_customer_sites_fkey_name.sql.
--
-- Existing rows: lead_source/source_detail become NULL (honestly
-- "unknown", not a fabricated value); source_provenance defaults to
-- 'user-entered', the accurate default for every lead created before
-- this feature existed.

alter table public.leads add column if not exists lead_source text;
alter table public.leads add column if not exists source_detail text;
alter table public.leads add column if not exists source_provenance text not null default 'user-entered';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_source_provenance_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_source_provenance_check
      check (source_provenance in ('user-entered', 'ai-inferred', 'verified'));
  end if;
end
$$;

-- ROLLBACK (documented, not executed)
-- alter table public.leads drop constraint if exists leads_source_provenance_check;
-- alter table public.leads drop column if exists source_provenance;
-- alter table public.leads drop column if exists source_detail;
-- alter table public.leads drop column if exists lead_source;
