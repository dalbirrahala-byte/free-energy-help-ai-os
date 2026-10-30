-- One durable reservation per provider lead, independent of process retries.
-- Ingestion is NOT sending authority. Only a separately persisted, current
-- Factory 041 approval for this exact acknowledgement can claim a reservation.
-- No credentials, role memberships, provider activation or automatic approvals.
create table public.lead_acknowledgements (
  lead_id bigint primary key references public.leads(id) on delete restrict,
  provider text not null check (provider = 'meta'),
  external_lead_id text not null,
  page_id text not null check (page_id ~ '^[0-9]{1,100}$'),
  form_id text not null check (form_id ~ '^[0-9]{1,100}$'),
  provider_created_at timestamptz not null,
  received_at timestamptz not null default transaction_timestamp(),
  template_version text not null default 'feh-callback-ack-v1'
    check (template_version = 'feh-callback-ack-v1'),
  status text not null default 'awaiting_authority'
    check (status in ('awaiting_authority', 'claimed')),
  execution_authorization_id bigint unique
    references public.execution_authorizations(id) on delete restrict,
  claimed_at timestamptz,
  unique (provider, external_lead_id),
  check ((status = 'claimed') = (claimed_at is not null)),
  check ((status = 'claimed') = (execution_authorization_id is not null))
);
alter table public.lead_acknowledgements enable row level security;
revoke all on public.lead_acknowledgements from public, anon, authenticated, service_role,
  external_lead_ingestor, execution_dispatch_worker;

-- The dedicated ingestor must be reached only AFTER raw-byte Meta HMAC and
-- configured page/form checks plus a matching Graph lead-detail response.
-- It gets no table access. The existing ingestion RPC remains authoritative
-- for CRM validation, duplicate detection, source attribution and auditing.
create function public.ingest_meta_lead_with_acknowledgement(
  p_page_id text, p_form_id text, p_external_lead_id text,
  p_provider_created_at timestamptz, p_company_name text default null,
  p_contact_name text default null, p_telephone text default null,
  p_email text default null, p_campaign_id text default null
)
returns table (outcome text, lead_id bigint, acknowledgement_reserved boolean)
language plpgsql volatile security definer set search_path = '' as $$
declare v_receipt record;
begin
  if p_page_id is null or p_page_id !~ '^[0-9]{1,100}$'
     or p_form_id is null or p_form_id !~ '^[0-9]{1,100}$'
     or p_external_lead_id is null or p_external_lead_id !~ '^[0-9]{6,100}$'
     or p_provider_created_at is null or not pg_catalog.isfinite(p_provider_created_at)
     or p_provider_created_at > pg_catalog.transaction_timestamp() + interval '5 minutes' then
    return query select 'rejected'::text, null::bigint, false; return;
  end if;
  select * into v_receipt from public.ingest_external_lead(
    'meta', p_external_lead_id, p_provider_created_at, 'unknown',
    p_company_name, p_contact_name, p_telephone, p_email, p_campaign_id
  );
  if v_receipt.outcome = 'accepted' then
    insert into public.lead_acknowledgements
      (lead_id, provider, external_lead_id, page_id, form_id, provider_created_at)
    values (v_receipt.lead_id, 'meta', p_external_lead_id, p_page_id, p_form_id, p_provider_created_at);
    insert into public.audit_log (action, entity_type, entity_id, correlation_id, result, metadata)
    values ('lead_acknowledgement_reserved', 'lead', v_receipt.lead_id::text,
      pg_catalog.gen_random_uuid(), 'success',
      pg_catalog.jsonb_build_object('template_version', 'feh-callback-ack-v1', 'execution_allowed', false));
    return query select 'accepted'::text, v_receipt.lead_id::bigint, true; return;
  end if;
  -- A retry never backfills an old lead, changes evidence, or reserves again.
  return query select v_receipt.outcome::text, v_receipt.lead_id::bigint, false;
end;
$$;
revoke all on function public.ingest_meta_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.ingest_meta_lead_with_acknowledgement(text,text,text,timestamptz,text,text,text,text,text)
  to external_lead_ingestor;

-- Claim is an irreversible one-attempt reservation, NOT provider acceptance.
-- A crash after claim is held for reconciliation, never automatically resent.
-- The approval reason identifies the exact fixed template; its evidence
-- reference must cover the verified form notice, callback request, permission
-- assessment and actual caller ID. This RPC does not manufacture that evidence.
create function public.claim_meta_lead_acknowledgement(
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
  if not found or v_lead.provider is distinct from 'meta'
     or v_lead.lead_source is distinct from 'meta_ads'
     or v_lead.organisation_id is distinct from v_auth.organisation_id
     then return next; return; end if;
  select * into v_queue from public.lead_acknowledgements q where q.lead_id = p_lead_id for update;
  if not found then return next; return; end if;
  if v_queue.status <> 'awaiting_authority' then
    claim_status := 'already_claimed'; return next; return;
  end if;
  if v_queue.external_lead_id is distinct from v_lead.external_lead_id
     or v_queue.provider_created_at is distinct from v_lead.provider_created_at
     or v_queue.provider_created_at < pg_catalog.transaction_timestamp() - interval '24 hours'
     or v_queue.provider_created_at > pg_catalog.transaction_timestamp() + interval '5 minutes'
     or v_auth.action_id is distinct from ('meta:feh-callback-ack-v1:' || v_queue.external_lead_id)
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
revoke all on function public.claim_meta_lead_acknowledgement(bigint,bigint,bigint)
  from public, anon, authenticated, service_role, external_lead_ingestor;
grant execute on function public.claim_meta_lead_acknowledgement(bigint,bigint,bigint)
  to execution_dispatch_worker;

-- Rollback: revoke the two new RPC grants before removing the new functions.
-- Do not drop the table after any claim: preserve the durable send history.
-- No backfill, provider call, approval, adapter grant, login or secret is created.
