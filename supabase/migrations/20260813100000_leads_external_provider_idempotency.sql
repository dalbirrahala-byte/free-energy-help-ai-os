-- Factory 025C Slice 2A: external-provider idempotency foundation.
--
-- WHY THIS EXISTS: Factory 025C is designing a future secure gateway for
-- external acquisition channels (Meta/Facebook Lead Ads first, per the
-- approved provider sequencing). A prerequisite, resolved in the Slice 2A
-- design-decision review, is that public.leads has no way to represent
-- "which external system produced this lead" or "which of that system's
-- own lead identifiers does this correspond to" — meaning a retried
-- webhook delivery has no database-enforced way to be recognised as the
-- same event rather than a new lead. This migration adds only that
-- foundation: the columns and the uniqueness constraint. It does NOT
-- create any function, route, grant, or policy that could ever write to
-- these columns — nothing can populate them until a separately-approved,
-- separately-reviewed Slice 2B exists.
--
-- SCOPE: four new nullable columns and four CHECK constraints plus one
-- partial unique index on the existing public.leads table. No other
-- table, column, function, RLS policy, or grant is touched anywhere in
-- this file. public.ingest_public_lead is not referenced, altered, or
-- affected by this migration in any way — its own explicit column list
-- means new nullable columns elsewhere on the table have zero effect on
-- it.
--
-- FIELDS ADDED (see the Factory 025C Slice 2 design-decision report for
-- the full reasoning; summarised here):
--   - provider: the external system's identity, e.g. 'meta'. Deliberately
--     a small CHECK allow-list, not free text — this is the identity-
--     scoping half of a uniqueness constraint, where a typo would
--     silently create a phantom duplicate-identity bucket. Extending the
--     allow-list for a future approved provider (LinkedIn, Reddit,
--     WhatsApp) is a small, explicit, separately-reviewed migration, not
--     a redesign.
--   - external_lead_id: that provider's own unique identifier for the
--     lead — the idempotency key. Never hashed or transformed; stored
--     exactly as the provider issues it (after trimming), since the
--     future ingestion function needs to compare it verbatim against
--     what the provider will send on a retry.
--   - provider_created_at: the provider's own event timestamp, distinct
--     from this table's existing `created_at` (which is this database's
--     own insert time, not when the prospect actually submitted the
--     form on the provider's platform). No default of now() — a NULL
--     here honestly means the provider did not supply, or a future
--     adapter could not resolve, a trustworthy creation timestamp; it
--     must never be fabricated from local processing time.
--   - consent_status: a three-state, provider-attested consent signal
--     ('affirmative' | 'refused' | 'unknown'), entirely separate from
--     the existing `consent_given` boolean. `consent_given` is NOT
--     touched, NOT redefined, and NOT backfilled by this migration — it
--     remains exactly as Factory 024 defined it, still authoritative for
--     website leads via public.ingest_public_lead's own hardcoded
--     post-validation `true`. The distinction that matters:
--       NULL              = this row predates or is outside the external-
--                            provider consent model entirely (every
--                            existing row, and every future website lead)
--       consent_status = 'unknown'     = an external-provider lead was
--                            ingested, but no explicit consent evidence
--                            was found in that provider's payload
--       consent_status = 'affirmative' = the provider payload contained
--                            explicit consent evidence
--       consent_status = 'refused'     = the provider payload contained
--                            an explicit negative signal, if a future
--                            provider ever supplies one (no current
--                            adapter produces this value yet)
--     NULL and 'unknown' are deliberately different states: NULL means
--     "this consent model does not apply to this row at all"; 'unknown'
--     means "this consent model applies, and no evidence was found."
--     Collapsing them would lose exactly the distinction this column
--     exists to preserve.
--
-- INVARIANT ENFORCED: provider and external_lead_id are always set
-- together or not at all (leads_provider_external_lead_id_pairing_check).
-- A row can never have one without the other — there is no approved
-- scenario in the current design where a lead has a known external
-- provider but no identifier for it, or vice versa.
--
-- DEFERRED (explicitly out of scope, per the Slice 2 design-decision
-- review — not added here): campaign_id, form_id, raw provider payload,
-- provider metadata JSON, any fingerprint/hash column, webhook signature
-- fields, access tokens, provider secrets, any other Meta-specific
-- business field.
--
-- SAFE / IDEMPOTENT: ADD COLUMN IF NOT EXISTS is safe to rerun, matching
-- every prior migration in this chain. CHECK constraints use the guarded
-- DO-block pattern already established in
-- 20260811100000_leads_source_attribution.sql (Postgres has no native
-- ADD CONSTRAINT IF NOT EXISTS). The unique index uses
-- CREATE UNIQUE INDEX IF NOT EXISTS, natively supported.
--
-- Existing rows: all four new columns become NULL for every existing
-- row (website and otherwise) — an honest "this concept does not apply
-- to this row," not a fabricated value. The partial unique index
-- (`WHERE provider IS NOT NULL`) means NULL-provider rows never
-- participate in the uniqueness check at all — every existing lead and
-- every future website lead continues to behave exactly as before.

alter table public.leads add column if not exists provider text;
alter table public.leads add column if not exists external_lead_id text;
alter table public.leads add column if not exists provider_created_at timestamptz;
alter table public.leads add column if not exists consent_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_provider_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_provider_check
      check (provider is null or provider in ('meta'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_external_lead_id_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_external_lead_id_check
      check (
        external_lead_id is null
        or (btrim(external_lead_id) <> '' and char_length(external_lead_id) <= 200)
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_provider_external_lead_id_pairing_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_provider_external_lead_id_pairing_check
      check ((provider is null) = (external_lead_id is null));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_consent_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_consent_status_check
      check (consent_status is null or consent_status in ('affirmative', 'refused', 'unknown'));
  end if;
end
$$;

-- Partial: only rows with a provider participate in the uniqueness
-- check, so ordinary website leads (provider IS NULL) are structurally
-- excluded, exactly like every other lead today.
create unique index if not exists leads_provider_external_lead_id_unique
  on public.leads (provider, external_lead_id)
  where provider is not null;

-- ROLLBACK (documented, not executed)
-- drop index if exists leads_provider_external_lead_id_unique;
-- alter table public.leads drop constraint if exists leads_consent_status_check;
-- alter table public.leads drop constraint if exists leads_provider_external_lead_id_pairing_check;
-- alter table public.leads drop constraint if exists leads_external_lead_id_check;
-- alter table public.leads drop constraint if exists leads_provider_check;
-- alter table public.leads drop column if exists consent_status;
-- alter table public.leads drop column if exists provider_created_at;
-- alter table public.leads drop column if exists external_lead_id;
-- alter table public.leads drop column if exists provider;
