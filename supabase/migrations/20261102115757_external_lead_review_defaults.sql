-- Accepted provider enquiries require human review, never implied contact authority.
-- Reuse existing lead fields; no new task, due date, owner, consent or privilege.
-- Pre-state: exact deployed ingestor body, verified in staging 2026-11-02.
-- No historical backfill here. The five known staging tests are repaired separately.
do $$
begin
  if (select md5(prosrc) from pg_proc where oid =
    'public.ingest_external_lead(text,text,timestamptz,text,text,text,text,text,text)'::regprocedure)
    is distinct from 'f4254655f0f7b66969ad3ac8936c35c2' then
    raise exception 'External lead ingestor changed; review required';
  end if;
end;
$$;

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
  if v_reason is null and (v_provider is null or v_provider not in ('meta', 'google_ads')) then
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
    when 'google_ads' then
      v_lead_source := 'google_ads';
      v_source_detail := 'Google Ads Lead Form';
  end case;

  -- Idempotent insert: the Slice 2A partial unique index is the sole,
  -- concurrency-safe authority. No pre-insert existence check.
  insert into public.leads (
    provider, external_lead_id, provider_created_at, consent_status,
    company_name, contact_name, telephone, email,
    lead_source, source_detail, source_provenance, status, utm_campaign,
    consent_given, lead_owner, next_action, follow_up_required, follow_up_date
  ) values (
    v_provider, v_external_lead_id, p_provider_created_at, v_consent_status,
    v_company_name, v_contact_name, v_telephone, v_email,
    v_lead_source, v_source_detail, 'user-entered', 'New', v_utm_campaign,
    (v_consent_status = 'affirmative'), null,
    'Review enquiry, verify contact permission and assign follow-up', true, null
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

-- CREATE OR REPLACE preserves existing owner/ACL. No grants or table defaults change.
-- Recovery: restore only the previous ingestor definition after reviewed rollback;
-- retain already recorded review flags/actions and their acceptance/audit history.
