-- Factory 027: persisted lead-quality classification (Hot/Warm/Nurture/Reject).
--
-- WHY THIS EXISTS: lib/revenue-engine already computes a deterministic
-- qualification readiness (qualification.ts) and priority score
-- (prioritization.ts) for every lead, but both are deliberately recomputed
-- fresh on every page read and never persisted — a convention that works
-- when the only consumer is the lead detail page. Factory 027's brief is
-- different: later factories (live-transfer routing, sales-agent
-- assignment, AI-assisted qualification) need to QUERY and FILTER leads by
-- classification, which requires a real, indexable column, not a value
-- that only exists inside one page's render. This migration adds exactly
-- that storage and nothing else — the scoring logic itself lives entirely
-- in application code (frontend/src/lib/revenue-engine/
-- leadQualityClassification.ts, syncLeadQualification.ts), not here.
--
-- SCOPE: four new nullable columns and two CHECK constraints on the
-- existing public.leads table. No other table, column, function, RLS
-- policy, or grant is touched anywhere in this file. In particular:
--   - public.ingest_public_lead, public.ingest_external_lead, and
--     public.record_public_lead_rejection (the Factory 024/025/026A
--     ingestion/consent/dedup/audit boundary) are not referenced, altered,
--     or affected in any way.
--   - No RLS policy is added or changed. The existing
--     leads_select_authenticated / leads_update_write_roles policies
--     (20260806120000_repair_rls_and_audit_log.sql) already govern these
--     new columns automatically, since RLS is row-level, not column-level.
--   - No grant is added. anon has no UPDATE grant on public.leads today
--     (structurally blocked by RLS even though a legacy blanket
--     GRANT ALL exists at the table level) and this migration does not
--     change that — these columns can only ever be written by an
--     authenticated, non-read_only role, via the application's existing
--     write path, exactly like every other leads column.
--
-- WHO WRITES THESE COLUMNS: only frontend/src/lib/revenue-engine/
-- syncLeadQualification.ts, called from an authenticated Server Action
-- (new-lead creation, or an explicit "Recompute qualification" action on
-- the lead detail page) — never from the anon-facing ingestion functions.
--
-- FIELDS ADDED:
--   - qualification_classification: the calculated Hot/Warm/Nurture/Reject
--     label. Closed CHECK allow-list, matching the discipline already used
--     for source_provenance/consent_status. NULL means "never scored yet"
--     (every existing lead, and every new lead until first sync) — an
--     honest "not computed", never a fabricated default classification.
--   - qualification_score: the same 0-100 priorityScore already computed
--     by prioritization.ts, persisted verbatim — not a second, competing
--     number. NULL until first scored.
--   - qualification_reasons: structured jsonb array of {factor, detail}
--     explaining the score/classification, composed from the already-
--     explained LeadPriorityResult.contributingFactors and
--     LeadQualificationResult.criteria. NULL until first scored.
--   - qualification_computed_at: when the persisted value was last
--     computed, so staff/other factories can tell a stale score (e.g.
--     after contract_end changes) from a fresh one. NULL until first
--     scored.
--
-- ADDITIVE AND REVERSIBLE: no existing column, row, or value is read,
-- modified, or deleted by this migration. A lead with all four columns
-- NULL behaves exactly as it did before this migration — nothing in the
-- application reads these columns except the new Factory 027 code paths,
-- which treat NULL as "not yet scored" throughout.
--
-- CONSENT BOUNDARY (unchanged by this file): consent_given
-- (20260812100000_leads_attribution_and_consent.sql) is not touched, not
-- redefined, and not read by any CHECK constraint here. Marketing
-- eligibility is intentionally NOT a stored column — it's a trivial,
-- always-fresh derivation (consent_given === true AND classification !=
-- 'Reject', see isMarketingEligible() in leadQualityClassification.ts)
-- computed at read time so it can never drift out of sync with a
-- consent_given value that changed after a classification was last
-- persisted.
--
-- SAFE / IDEMPOTENT: ADD COLUMN IF NOT EXISTS is safe to rerun, matching
-- every prior migration in this chain. CHECK constraints use the guarded
-- DO-block pattern already established in
-- 20260811100000_leads_source_attribution.sql (Postgres has no native
-- ADD CONSTRAINT IF NOT EXISTS).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: per the Factory 027 approval, this
-- migration is created for local review only and must not be run against
-- Supabase, staged, committed, or pushed in this session.

alter table public.leads add column if not exists qualification_classification text;
alter table public.leads add column if not exists qualification_score smallint;
alter table public.leads add column if not exists qualification_reasons jsonb;
alter table public.leads add column if not exists qualification_computed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_qualification_classification_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_qualification_classification_check
      check (qualification_classification is null or qualification_classification in ('Hot', 'Warm', 'Nurture', 'Reject'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_qualification_score_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_qualification_score_check
      check (qualification_score is null or (qualification_score >= 0 and qualification_score <= 100));
  end if;
end
$$;

-- ROLLBACK (documented, not executed)
-- alter table public.leads drop constraint if exists leads_qualification_score_check;
-- alter table public.leads drop constraint if exists leads_qualification_classification_check;
-- alter table public.leads drop column if exists qualification_computed_at;
-- alter table public.leads drop column if exists qualification_reasons;
-- alter table public.leads drop column if exists qualification_score;
-- alter table public.leads drop column if exists qualification_classification;
