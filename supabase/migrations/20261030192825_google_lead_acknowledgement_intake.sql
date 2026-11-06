-- Native Google Ads lead forms join the same durable acknowledgement queue.
-- No website traffic is relabelled as a Google lead-form submission.
-- No permission/compliance/approval, credentials or provider activation is added.
alter table public.leads drop constraint leads_provider_check;
alter table public.leads add constraint leads_provider_check
  check (provider is null or provider in ('meta','google_ads'));
alter table public.lead_acknowledgements drop constraint lead_acknowledgements_provider_check;
alter table public.lead_acknowledgements add constraint lead_acknowledgements_provider_check
  check (provider in ('meta','google_ads'));
alter table public.lead_acknowledgements alter column page_id drop not null;
alter table public.lead_acknowledgements add constraint lead_acknowledgements_page_scope_check
  check ((provider='meta' and page_id is not null) or (provider='google_ads' and page_id is null));

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

create function public.ingest_google_lead_with_acknowledgement(
  p_form_id text, p_campaign_id text, p_external_lead_id text, p_provider_created_at timestamptz,
  p_company_name text default null, p_contact_name text default null,
  p_telephone text default null, p_email text default null
)
returns table(outcome text,lead_id bigint,acknowledgement_reserved boolean)
language plpgsql volatile security definer set search_path='' as $$
declare receipt record;
begin
  if p_form_id is null or p_form_id !~ '^[1-9][0-9]{0,18}$'
    or p_campaign_id is null or p_campaign_id !~ '^[1-9][0-9]{0,18}$'
    or p_external_lead_id is null or p_external_lead_id !~ '^[A-Za-z0-9_-]{6,100}$'
    or p_provider_created_at is null or not pg_catalog.isfinite(p_provider_created_at)
    or p_provider_created_at > pg_catalog.transaction_timestamp()+interval '5 minutes' then
    return query select 'rejected'::text,null::bigint,false;return;
  end if;
  select * into receipt from public.ingest_external_lead('google_ads',p_external_lead_id,
    p_provider_created_at,'unknown',p_company_name,p_contact_name,p_telephone,p_email,p_campaign_id);
  if receipt.outcome='accepted' then
    insert into public.lead_acknowledgements(lead_id,provider,external_lead_id,page_id,form_id,provider_created_at)
    values(receipt.lead_id,'google_ads',p_external_lead_id,null,p_form_id,p_provider_created_at);
    insert into public.audit_log(action,entity_type,entity_id,correlation_id,result,metadata)
    values('lead_acknowledgement_reserved','lead',receipt.lead_id::text,pg_catalog.gen_random_uuid(),'success',
      pg_catalog.jsonb_build_object('template_version','feh-callback-ack-v1','provider','google_ads','execution_allowed',false));
    return query select 'accepted'::text,receipt.lead_id::bigint,true;return;
  end if;
  return query select receipt.outcome::text,receipt.lead_id::bigint,false;
end;
$$;
revoke all on function public.ingest_google_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text)
  from public,anon,authenticated,service_role,execution_dispatch_worker;
grant execute on function public.ingest_google_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text)
  to external_lead_ingestor;

-- Preserve the deployed worker RPC name for compatibility; all source-specific
-- checks remain explicit and every Factory 041 approval check stays in place.
create or replace function public.claim_meta_lead_acknowledgement(
  p_lead_id bigint, p_execution_authorization_id bigint, p_provider_adapter_id bigint
)
returns table (
  claim_status text, authorization_id bigint, action_id text, idempotency_key text,
  contact_id bigint, destination text, policy_version text, authorization_expires_at timestamptz,
  claimed_at timestamptz, provider_adapter_id bigint
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_auth public.execution_authorizations%rowtype;
  v_lead public.leads%rowtype;
  v_queue public.lead_acknowledgements%rowtype;
  v_contact public.contacts%rowtype;
  v_approval public.execution_intent_approvals%rowtype;
  v_compliance public.compliance_decisions%rowtype;
  v_adapter public.execution_provider_adapters%rowtype;
  v_intent public.execution_intents%rowtype;
  v_mobile text;
begin
  claim_status := 'blocked';
  if p_lead_id is null or p_lead_id <= 0 or p_execution_authorization_id is null
     or p_execution_authorization_id <= 0 or p_provider_adapter_id is null
     or p_provider_adapter_id <= 0 then return next; return; end if;
  select * into v_auth from public.execution_authorizations ea
    where ea.id = p_execution_authorization_id for update;
  if not found or v_auth.authorization_status is distinct from 'authorised'
     or v_auth.requested_channel is distinct from 'SMS'
     or v_auth.consumed_at is not null or v_auth.execution_performed is distinct from false
     or v_auth.expires_at is null or v_auth.expires_at <= pg_catalog.transaction_timestamp()
     then return next; return; end if;
  select * into v_intent from public.execution_intents ei
    where ei.id = v_auth.execution_intent_id for update;
  if not found or v_intent.contact_id is distinct from v_auth.contact_id
     or v_intent.organisation_id is distinct from v_auth.organisation_id
     or v_intent.requested_channel is distinct from 'SMS'
     or v_intent.action_id is distinct from v_auth.action_id then return next; return; end if;
  select * into v_approval from public.execution_intent_approvals eia
    where eia.execution_intent_id = v_auth.execution_intent_id order by eia.id desc limit 1;
  if not found or v_approval.decision is distinct from 'approved'
     or v_approval.id is distinct from v_auth.approval_decision_id
     or v_approval.reason is distinct from 'feh-callback-ack-v1'
     or nullif(pg_catalog.btrim(v_approval.evidence_reference), '') is null
     then return next; return; end if;
  perform e.id from public.execution_authorisers e
    where e.id = v_auth.execution_authoriser_grant_id and e.revoked_at is null
      and e.capability = 'execution_authoriser' and e.user_id = v_auth.actor_id for share;
  if not found then return next; return; end if;
  select * into v_lead from public.leads l where l.id = p_lead_id for share;
  if not found or v_lead.provider not in ('meta','google_ads')
     or v_lead.provider is null
     or v_lead.lead_source is distinct from (case v_lead.provider when 'meta' then 'meta_ads' else 'google_ads' end)
     or v_lead.organisation_id is distinct from v_auth.organisation_id
     then return next; return; end if;
  select * into v_queue from public.lead_acknowledgements q where q.lead_id = p_lead_id for update;
  if not found then return next; return; end if;
  if v_queue.status <> 'awaiting_authority' then
    claim_status := 'already_claimed'; return next; return;
  end if;
  if v_queue.provider is distinct from v_lead.provider
     or v_queue.external_lead_id is distinct from v_lead.external_lead_id
     or v_queue.provider_created_at is distinct from v_lead.provider_created_at
     or v_queue.provider_created_at < pg_catalog.transaction_timestamp() - interval '24 hours'
     or v_queue.provider_created_at > pg_catalog.transaction_timestamp() + interval '5 minutes'
     or v_auth.action_id is distinct from (v_queue.provider || ':feh-callback-ack-v1:' || v_queue.external_lead_id)
     then return next; return; end if;
  select * into v_contact from public.contacts c where c.id = v_auth.contact_id for share;
  v_mobile := pg_catalog.regexp_replace(pg_catalog.btrim(v_lead.telephone), '[ ()-]', '', 'g');
  if v_mobile ~ '^07[1-57-9][0-9]{8}$' then v_mobile := '+44' || pg_catalog.substr(v_mobile, 2);
  elsif v_mobile ~ '^00447[1-57-9][0-9]{8}$' then v_mobile := '+' || pg_catalog.substr(v_mobile, 3); end if;
  if v_contact.id is null or v_contact.organisation_id is distinct from v_auth.organisation_id
     or v_mobile is null or v_mobile !~ '^\+447[1-57-9][0-9]{8}$'
     or pg_catalog.btrim(v_contact.phone) is distinct from v_mobile then return next; return; end if;
  select * into v_compliance from public.compliance_decisions cd where cd.id = v_auth.compliance_decision_id;
  if not found or v_compliance.decision is distinct from 'eligible'
     or v_compliance.contact_id is distinct from v_auth.contact_id
     or v_compliance.organisation_id is distinct from v_auth.organisation_id
     or v_compliance.requested_channel is distinct from 'SMS'
     or v_compliance.execution_intent_id is distinct from v_auth.execution_intent_id
     or v_compliance.policy_version is distinct from 'FEH_CONTACT_PERMISSION_V1'
     or v_compliance.expires_at <= pg_catalog.transaction_timestamp()
     or public.verify_destination_commitment(v_auth.contact_id, 'SMS',
       v_compliance.destination_commitment_nonce, v_compliance.destination_commitment) is distinct from 'verified'
     then return next; return; end if;
  select * into v_adapter from public.execution_provider_adapters epa
    where epa.id = p_provider_adapter_id for share;
  if not found or v_adapter.status is distinct from 'approved' or v_adapter.channel is distinct from 'SMS'
     or v_adapter.adapter_key is distinct from 'TELNYX_FEH_CALLBACK_ACK_V1'
     or v_adapter.approved_by is null or v_adapter.approved_at is null
     then return next; return; end if;
  if public.evaluate_suppression_live(v_auth.execution_intent_id) is distinct from 'clear'
     or public.evaluate_execution_emergency_stop() is distinct from 'clear'
     then return next; return; end if;
  update public.lead_acknowledgements q set status = 'claimed',
    execution_authorization_id = v_auth.id, claimed_at = pg_catalog.transaction_timestamp()
    where q.lead_id = p_lead_id;
  insert into public.audit_log (action, entity_type, entity_id, correlation_id, result, metadata)
  values ('lead_acknowledgement_claimed', 'lead', p_lead_id::text, pg_catalog.gen_random_uuid(), 'success',
    pg_catalog.jsonb_build_object('execution_authorization_id', v_auth.id, 'execution_allowed', false));
  claim_status := 'claimed'; authorization_id := v_auth.id; action_id := v_auth.action_id;
  idempotency_key := v_auth.idempotency_key; contact_id := v_auth.contact_id;
  destination := pg_catalog.btrim(v_contact.phone); policy_version := v_auth.policy_version;
  authorization_expires_at := v_auth.expires_at; claimed_at := pg_catalog.transaction_timestamp();
  provider_adapter_id := v_adapter.id;
  return next;
end;
$$;

-- Existing function owners and ACLs are retained by CREATE OR REPLACE.
-- Recovery: disable intake first and revoke the Google RPC grant. Restore the
-- prior two function definitions only after retaining any Google reservation
-- and attempt history. Never erase durable claims to make retries possible.
