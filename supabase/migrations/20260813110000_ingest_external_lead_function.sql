-- Factory 025C Slice 2B: dormant external-lead ingestion function.
--
-- WHY THIS EXISTS: Slice 2A added the idempotency schema (provider,
-- external_lead_id, provider_created_at, consent_status, and the partial
-- unique index) to public.leads but created no way to write to it. This
-- migration adds that write path: a new, separate, narrowly-scoped
-- SECURITY DEFINER function, public.ingest_external_lead(...), built for
-- already-verified external-provider payloads (Meta Lead Ads first).
--
-- public.ingest_public_lead is NOT modified, referenced in any write
-- capacity, or affected by this migration in any way — it remains the
-- sole trust boundary for the public website form, unchanged.
--
-- DORMANT BY DESIGN: this migration grants EXECUTE to nobody. Postgres
-- grants EXECUTE to PUBLIC by default on every new function, and this
-- project's own default privileges separately grant `authenticated`
-- EXECUTE on every new function owned by `postgres` — both defaults are
-- explicitly revoked below (two separate REVOKE statements; PUBLIC alone
-- is not sufficient here, see the REVOKE block's own comment for why),
-- and nothing replaces either. `anon`'s equivalent default was already
-- closed project-wide in an earlier migration. No role — not anon, not
-- authenticated, not any application-facing identity — can call this
-- function as of this migration. A separate, later, independently-gated
-- migration will provision a dedicated server-only database
-- role/credential and grant it EXECUTE on this function alone; that is
-- explicitly out of scope here, per the Architect's Slice 2B security
-- decisions. Until that gate exists, this function is inert — reviewable
-- and testable via direct privileged connection, but unreachable by any
-- real request path.
--
-- RETURN CONTRACT: this function deliberately does not follow
-- ingest_public_lead's `returns bigint / raise exception on failure`
-- shape. It returns a structured outcome — exactly one of 'accepted',
-- 'duplicate', or 'rejected' — for ordinary business-rule results.
-- Genuine system/database failures (most importantly, an audit_log
-- write failing) are NEVER coerced into one of those three outcomes:
-- they propagate as an uncaught Postgres exception, aborting the whole
-- transaction. This is deliberate: a webhook caller can safely retry an
-- aborted transaction (the provider's own retry mechanism recovers it,
-- per the approved Slice 2 audit-atomicity decision), but a rejection or
-- duplicate result must always be trustworthy, never a masked failure.
--
-- IDEMPOTENCY: uses the Slice 2A partial unique index
-- (leads_provider_external_lead_id_unique) as the sole, concurrency-safe
-- authority via `insert ... on conflict ... do nothing returning id`.
-- There is no pre-insert existence check — a check-then-insert would
-- race under concurrent delivery, which the partial unique index alone
-- correctly prevents.
--
-- CONFLICT HANDLING: a repeated (provider, external_lead_id) whose
-- incoming email/telephone/company_name differ from what's already
-- stored is still reported as 'duplicate' (never a fourth outcome) and
-- the stored row is never overwritten — the discrepancy is recorded only
-- in the audit_log metadata's `data_differs` flag, for human review,
-- matching the advisory-only philosophy already used by
-- lib/revenue-engine/duplicateDetection.ts.
--
-- REJECTION VOCABULARY: closed and machine-readable — exactly six coded
-- values (invalid_provider, invalid_external_lead_id,
-- invalid_consent_status, invalid_email, invalid_telephone,
-- missing_contact_identifier). No free-text/diagnostic message field
-- exists anywhere in the return contract or audit metadata; the coded
-- reason is the only signal, so it can never be bypassed by a
-- human-readable substitute.
--
-- SOURCE ATTRIBUTION: lead_source and source_detail are derived
-- internally from provider (currently only 'meta' -> 'meta_ads' / 'Meta
-- Lead Ads') — neither is a function parameter, so a caller cannot
-- submit a provider/lead_source pair that disagree. source_provenance is
-- deliberately left at the existing 'user-entered' value — this
-- migration does NOT introduce or modify the source_provenance
-- taxonomy, per the Architect's explicit Slice 2B decision; any future
-- redesign of that taxonomy is deferred to a separately reviewed factory.
--
-- CONSENT MAPPING: consent_given (the pre-existing boolean, untouched in
-- shape or default) is set true only when consent_status = 'affirmative'
-- — both 'refused' and 'unknown' map to false. Unknown consent is never
-- treated as affirmative consent.
--
-- PII MINIMISATION: audit metadata never contains raw email, telephone,
-- company_name, contact_name, notes, or any provider payload fragment —
-- only provider, external_lead_id, the coded reason, and boolean flags.
--
-- SCOPE: exactly one function and two REVOKE statements (PUBLIC and
-- authenticated — see the REVOKE block's own comment for why both are
-- required). No table, column, index, RLS policy, or existing grant is
-- touched. No role is created. No other function is altered.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun. The
-- REVOKE statement is safe to rerun (revoking an unheld privilege is a
-- no-op in Postgres).

create or replace function public.ingest_external_lead(
  p_provider text,
  p_external_lead_id text,
  p_provider_created_at timestamptz default null,
  p_consent_status text default 'unknown',
  p_company_name text default null,
  p_contact_name text default null,
  p_telephone text default null,
  p_email text default null,
  p_utm_campaign text default null
)
returns table (
  outcome text,
  lead_id bigint,
  reason text
)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_provider text;
  v_external_lead_id text;
  v_consent_status text;
  v_company_name text;
  v_contact_name text;
  v_telephone text;
  v_email text;
  v_utm_campaign text;
  v_lead_source text;
  v_source_detail text;
  v_reason text;
  v_new_lead_id bigint;
  v_existing_lead_id bigint;
  v_existing_email text;
  v_existing_telephone text;
  v_existing_company_name text;
  v_data_differs boolean;
begin
  v_reason := null;

  -- provider: closed allow-list, re-validated here independent of the
  -- Slice 2A CHECK constraint so a rejection produces a clean coded
  -- reason rather than a raw constraint-violation error.
  v_provider := nullif(btrim(p_provider), '');
  if v_reason is null and (v_provider is null or v_provider not in ('meta')) then
    v_reason := 'invalid_provider';
  end if;

  -- external_lead_id: non-blank, bounded length, mirroring the Slice 2A
  -- CHECK constraint.
  v_external_lead_id := nullif(btrim(p_external_lead_id), '');
  if v_reason is null and (v_external_lead_id is null or length(v_external_lead_id) > 200) then
    v_reason := 'invalid_external_lead_id';
  end if;

  -- consent_status: closed three-value vocabulary, mirroring the
  -- Slice 2A CHECK constraint.
  v_consent_status := btrim(p_consent_status);
  if v_reason is null and (v_consent_status is null or v_consent_status not in ('affirmative', 'refused', 'unknown')) then
    v_reason := 'invalid_consent_status';
  end if;

  -- email: optional field, validated only when present — same shape
  -- discipline as public.ingest_public_lead.
  v_email := nullif(lower(btrim(p_email)), '');
  if v_reason is null and v_email is not null
     and (length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
  then
    v_reason := 'invalid_email';
  end if;

  -- telephone: optional field, validated only when present — same
  -- digit-count discipline as public.ingest_public_lead.
  v_telephone := nullif(btrim(p_telephone), '');
  if v_reason is null and v_telephone is not null
     and (length(regexp_replace(v_telephone, '[^0-9]', '', 'g')) < 10 or length(v_telephone) > 30)
  then
    v_reason := 'invalid_telephone';
  end if;

  -- at least one contact identifier is required overall.
  if v_reason is null and v_email is null and v_telephone is null then
    v_reason := 'missing_contact_identifier';
  end if;

  if v_reason is not null then
    insert into public.audit_log (
      action, actor_id, actor_role, entity_type, entity_id,
      correlation_id, result, metadata
    ) values (
      'external_lead_rejected', null, null, 'lead', null,
      gen_random_uuid(), 'failure',
      jsonb_build_object('provider', v_provider, 'reason', v_reason)
    );

    return query select 'rejected'::text, null::bigint, v_reason;
    return;
  end if;

  -- Attribution/context fields are enrichment, not identity — truncated
  -- rather than rejected, matching public.ingest_public_lead's existing
  -- discipline for the same class of field.
  v_company_name := left(nullif(btrim(p_company_name), ''), 200);
  v_contact_name := left(nullif(btrim(p_contact_name), ''), 200);
  v_utm_campaign := left(nullif(btrim(p_utm_campaign), ''), 200);

  -- provider -> canonical source mapping. Never a function parameter, so
  -- a caller cannot submit a provider/lead_source pair that disagree.
  -- Extending this for a future approved provider is one new branch in
  -- a small, separately-reviewed migration.
  case v_provider
    when 'meta' then
      v_lead_source := 'meta_ads';
      v_source_detail := 'Meta Lead Ads';
  end case;

  -- Idempotent insert: the Slice 2A partial unique index is the sole,
  -- concurrency-safe authority. No pre-insert existence check.
  insert into public.leads (
    provider, external_lead_id, provider_created_at, consent_status,
    company_name, contact_name, telephone, email,
    lead_source, source_detail, source_provenance, status, utm_campaign,
    consent_given
  ) values (
    v_provider, v_external_lead_id, p_provider_created_at, v_consent_status,
    v_company_name, v_contact_name, v_telephone, v_email,
    v_lead_source, v_source_detail, 'user-entered', 'New', v_utm_campaign,
    (v_consent_status = 'affirmative')
  )
  on conflict (provider, external_lead_id) where provider is not null
  do nothing
  returning id into v_new_lead_id;

  if v_new_lead_id is not null then
    -- Accepted: lead creation and its acceptance audit event must
    -- succeed together — deliberately no exception handler here. A
    -- failure writing this audit row propagates uncaught and rolls back
    -- the lead insert too, relying on the provider's own automatic
    -- retry to recover cleanly.
    insert into public.audit_log (
      action, actor_id, actor_role, entity_type, entity_id,
      correlation_id, result, metadata
    ) values (
      'external_lead_accepted', null, null, 'lead', v_new_lead_id::text,
      gen_random_uuid(), 'success',
      jsonb_build_object('provider', v_provider, 'external_lead_id', v_external_lead_id)
    );

    return query select 'accepted'::text, v_new_lead_id, null::text;
    return;
  end if;

  -- Conflict: (provider, external_lead_id) already exists. The existing
  -- row is never overwritten, regardless of whether the incoming data
  -- matches it — advisory only, same philosophy as
  -- lib/revenue-engine/duplicateDetection.ts.
  select l.id, l.email, l.telephone, l.company_name
    into v_existing_lead_id, v_existing_email, v_existing_telephone, v_existing_company_name
  from public.leads l
  where l.provider = v_provider
    and l.external_lead_id = v_external_lead_id;

  v_data_differs := (
    v_existing_email is distinct from v_email
    or v_existing_telephone is distinct from v_telephone
    or v_existing_company_name is distinct from v_company_name
  );

  insert into public.audit_log (
    action, actor_id, actor_role, entity_type, entity_id,
    correlation_id, result, metadata
  ) values (
    'external_lead_duplicate', null, null, 'lead', v_existing_lead_id::text,
    gen_random_uuid(), 'success',
    jsonb_build_object(
      'provider', v_provider,
      'external_lead_id', v_external_lead_id,
      'data_differs', v_data_differs
    )
  );

  return query select 'duplicate'::text, v_existing_lead_id, null::text;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function —
-- revoked here. That alone is NOT sufficient in this project: this
-- Supabase project's default privileges separately, automatically grant
-- `authenticated` EXECUTE on every new function owned by `postgres`, as
-- its own directly-recorded ACL entry — independent of, and untouched
-- by, a bare `revoke all ... from public` (confirmed live via
-- pg_default_acl during the Slice 2B security review; this is the exact
-- same mechanism already found and fixed once for
-- public.ingest_public_lead in 20260812130000_revoke_authenticated_
-- ingest_public_lead.sql). Both revokes are required together; neither
-- alone leaves the function dormant. `anon`'s equivalent default grant
-- was already closed project-wide in
-- 20260810110000_harden_function_execute_privileges.sql, so no anon-
-- specific revoke is needed here — only PUBLIC and authenticated.
--
-- These are the ONLY grant-related statements in this migration —
-- nothing replaces them. The function remains uncallable by PUBLIC,
-- anon, authenticated, or any other application-facing role until a
-- separate, later, independently-gated migration provisions a dedicated
-- server-only role and grants it EXECUTE on this function specifically.
revoke all on function public.ingest_external_lead(
  text, text, timestamptz, text, text, text, text, text, text
) from public;

revoke execute on function public.ingest_external_lead(
  text, text, timestamptz, text, text, text, text, text, text
) from authenticated;

-- ROLLBACK (documented, not executed): since this function is dormant —
-- unreachable by any application role — nothing could depend on it.
-- drop function if exists public.ingest_external_lead(
--   text, text, timestamptz, text, text, text, text, text, text
-- );
