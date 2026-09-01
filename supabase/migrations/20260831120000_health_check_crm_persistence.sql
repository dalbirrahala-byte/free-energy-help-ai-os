-- Factory 043 Phase 2: dedicated Health Check CRM persistence and explicit
-- conversion disposition. Local construction only; not applied to Supabase.

alter table public.leads add column if not exists energy_supply text;
alter table public.leads add column if not exists enquiry_reason text;
alter table public.leads add column if not exists campaign_id text;
alter table public.leads add column if not exists lead_owner text;
alter table public.leads add column if not exists next_action text;
alter table public.leads add column if not exists follow_up_required boolean;
alter table public.leads add column if not exists follow_up_date date;

-- One non-public trusted primitive owns validation, deduplication, insertion,
-- and auditing. Both public RPCs below are thin SECURITY DEFINER wrappers, so
-- ingestion logic cannot diverge. Its disposition is a closed vocabulary.
create or replace function public._ingest_public_lead_core(
  p_company_name text, p_contact_name text, p_telephone text, p_email text,
  p_lead_source text, p_consent_given boolean, p_source_detail text default null,
  p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_term text default null,
  p_utm_content text default null, p_additional_context text default null,
  p_energy_supply text default null, p_enquiry_reason text default null,
  p_campaign_id text default null, p_contract_end date default null,
  p_lead_owner text default null, p_next_action text default null,
  p_follow_up_required boolean default null, p_follow_up_date date default null,
  p_require_health_check_fields boolean default false
)
returns table (lead_id bigint, disposition text)
language plpgsql volatile security definer set search_path to ''
as $$
declare
  v_company_name text := btrim(p_company_name);
  v_contact_name text := btrim(p_contact_name);
  v_telephone text := btrim(p_telephone);
  v_email text := lower(btrim(p_email));
  v_lead_source text := btrim(p_lead_source);
  v_source_detail text := left(nullif(btrim(p_source_detail), ''), 200);
  v_utm_source text := left(nullif(btrim(p_utm_source), ''), 150);
  v_utm_medium text := left(nullif(btrim(p_utm_medium), ''), 150);
  v_utm_campaign text := left(nullif(btrim(p_utm_campaign), ''), 150);
  v_utm_term text := left(nullif(btrim(p_utm_term), ''), 150);
  v_utm_content text := left(nullif(btrim(p_utm_content), ''), 150);
  v_context text := left(nullif(btrim(p_additional_context), ''), 500);
  v_energy_supply text := nullif(btrim(p_energy_supply), '');
  v_enquiry_reason text := left(nullif(btrim(p_enquiry_reason), ''), 160);
  v_campaign_id text := left(nullif(btrim(p_campaign_id), ''), 150);
  v_next_action text := left(nullif(btrim(p_next_action), ''), 200);
  v_id bigint;
begin
  if p_consent_given is distinct from true then raise exception 'consent_required'; end if;
  if v_company_name is null or v_company_name = '' or length(v_company_name) > 200 then raise exception 'invalid_company_name'; end if;
  if v_contact_name is null or v_contact_name = '' or length(v_contact_name) > 200 then raise exception 'invalid_contact_name'; end if;
  if v_telephone is null or length(regexp_replace(v_telephone, '[^0-9]', '', 'g')) < 10 or length(v_telephone) > 30 then raise exception 'invalid_telephone'; end if;
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid_email'; end if;
  if v_lead_source is null or v_lead_source = '' then raise exception 'invalid_lead_source'; end if;
  if p_require_health_check_fields then
    if v_energy_supply not in ('electricity', 'gas', 'both') then raise exception 'invalid_energy_supply'; end if;
    if v_enquiry_reason is null then raise exception 'invalid_enquiry_reason'; end if;
    if p_lead_owner is not null then raise exception 'invalid_lead_owner'; end if;
    if p_follow_up_required is distinct from true then raise exception 'invalid_follow_up_requirement'; end if;
    if p_follow_up_date is not null then raise exception 'invalid_follow_up_date'; end if;
  end if;

  select l.id into v_id from public.leads l
  where lower(l.email) = v_email
    and regexp_replace(l.telephone, '[^0-9]', '', 'g') = regexp_replace(v_telephone, '[^0-9]', '', 'g')
    and l.lead_source = v_lead_source and l.created_at >= now() - interval '10 minutes'
  order by l.created_at desc limit 1;
  if v_id is not null then
    begin
      insert into public.audit_log (action, actor_id, actor_role, entity_type, entity_id, correlation_id, result, metadata)
      values ('public_lead_duplicate_suppressed', null, null, 'lead', v_id::text, gen_random_uuid(), 'success', jsonb_build_object('lead_source', v_lead_source, 'window_minutes', 10));
    exception when others then null; end;
    return query select v_id, 'duplicate_suppressed'::text;
    return;
  end if;

  insert into public.leads (
    company_name, contact_name, telephone, email, status, notes, lead_source,
    source_detail, source_provenance, utm_source, utm_medium, utm_campaign,
    utm_term, utm_content, consent_given, energy_supply, enquiry_reason,
    campaign_id, contract_end, lead_owner, next_action, follow_up_required, follow_up_date
  ) values (
    v_company_name, v_contact_name, v_telephone, v_email, 'New', v_context,
    v_lead_source, v_source_detail, 'user-entered', v_utm_source, v_utm_medium,
    v_utm_campaign, v_utm_term, v_utm_content, true, v_energy_supply,
    v_enquiry_reason, v_campaign_id, p_contract_end, p_lead_owner, v_next_action,
    p_follow_up_required, p_follow_up_date
  ) returning id into v_id;

  begin
    insert into public.audit_log (action, actor_id, actor_role, entity_type, entity_id, correlation_id, result, metadata)
    values ('public_lead_ingested', null, null, 'lead', v_id::text, gen_random_uuid(), 'success',
      jsonb_build_object('lead_source', v_lead_source, 'utm_source', v_utm_source, 'utm_medium', v_utm_medium, 'utm_campaign', v_utm_campaign, 'campaign_id', v_campaign_id));
  exception when others then null; end;
  return query select v_id, 'created'::text;
end;
$$;

-- Backward compatibility: existing 13-argument callers keep their bigint
-- return contract and never parse a disposition or pass new parameters.
create or replace function public.ingest_public_lead(
  p_company_name text, p_contact_name text, p_telephone text, p_email text,
  p_lead_source text, p_consent_given boolean, p_source_detail text default null,
  p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_term text default null,
  p_utm_content text default null, p_additional_context text default null
)
returns bigint language plpgsql volatile security definer set search_path to ''
as $$
declare v_result record;
begin
  select * into strict v_result from public._ingest_public_lead_core(
    p_company_name, p_contact_name, p_telephone, p_email, p_lead_source,
    p_consent_given, p_source_detail, p_utm_source, p_utm_medium, p_utm_campaign,
    p_utm_term, p_utm_content, p_additional_context
  );
  return v_result.lead_id;
end;
$$;

-- The Health Check-only RPC returns explicit disposition to control conversion.
create function public.ingest_health_check_lead(
  p_company_name text, p_contact_name text, p_telephone text, p_email text,
  p_lead_source text, p_consent_given boolean, p_source_detail text default null,
  p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_term text default null,
  p_utm_content text default null, p_additional_context text default null,
  p_energy_supply text default null, p_enquiry_reason text default null,
  p_campaign_id text default null, p_contract_end date default null,
  p_lead_owner text default null,
  p_next_action text default 'Review enquiry and assign follow-up',
  p_follow_up_required boolean default true, p_follow_up_date date default null
)
returns jsonb language plpgsql volatile security definer set search_path to ''
as $$
declare v_result record;
begin
  select * into strict v_result from public._ingest_public_lead_core(
    p_company_name, p_contact_name, p_telephone, p_email, p_lead_source,
    p_consent_given, p_source_detail, p_utm_source, p_utm_medium, p_utm_campaign,
    p_utm_term, p_utm_content, p_additional_context, p_energy_supply,
    p_enquiry_reason, p_campaign_id, p_contract_end, p_lead_owner, p_next_action,
    p_follow_up_required, p_follow_up_date, true
  );
  return jsonb_build_object('lead_id', v_result.lead_id, 'disposition', v_result.disposition);
end;
$$;

revoke all on function public._ingest_public_lead_core(text,text,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean,date,boolean) from public, anon, authenticated, service_role;
revoke all on function public.ingest_public_lead(text,text,text,text,text,boolean,text,text,text,text,text,text,text) from public, authenticated;
grant execute on function public.ingest_public_lead(text,text,text,text,text,boolean,text,text,text,text,text,text,text) to anon;
revoke all on function public.ingest_health_check_lead(text,text,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean,date) from public, authenticated;
grant execute on function public.ingest_health_check_lead(text,text,text,text,text,boolean,text,text,text,text,text,text,text,text,text,text,date,text,text,boolean,date) to anon;

-- No direct table privileges are granted. RLS posture and rejection auditing remain unchanged.
