-- Extend the existing owner/MFA workflow to a separately provisioned, exact
-- Meta enquiry. Installation itself changes no grants, adapter state or STOP.
-- Historical consumed authority and succeeded attempts remain immutable.
create or replace function public.prepare_ack_preview_owner_test()
returns text language plpgsql volatile security definer set search_path='' as $$
declare c public.ack_preview_owner_test_control%rowtype; v_actor uuid:=auth.uid();
  v_org bigint; v_contact bigint; v_intent record; v_lead record; v_adapter bigint; v_evidence text;
  v_existing public.leads%rowtype; v_queue public.lead_acknowledgements%rowtype; v_mobile text;
  v_action text; v_source text;
begin
  if not public.ack_preview_owner_can_approve() then return 'blocked'; end if;
  select * into c from public.ack_preview_owner_test_control where singleton for update;
  if not public.ack_preview_owner_can_approve() or c.phase<>'setup' then return 'blocked'; end if;
  if public.evaluate_execution_emergency_stop() is distinct from 'stopped' then return 'blocked'; end if;
  v_evidence:='ack-owner-test:'||c.case_id::text;
  if c.lead_id is null then
    -- Preserve the original, first-ever synthetic test guard.
    if exists(select 1 from public.execution_provider_adapters)
      or exists(select 1 from public.execution_authorizations)
      or exists(select 1 from public.lead_acknowledgements) then return 'blocked'; end if;
    select * into v_lead from public.ingest_google_lead_with_acknowledgement(
      '402325113451','24096131756','feh_owner_test_'||c.case_id::text,pg_catalog.statement_timestamp(),
      'FEH owner-controlled staging SMS test','Owner test',c.allowed_phone,null);
    if v_lead.outcome is distinct from 'accepted' then raise exception 'owner_test_prepare_failed'; end if;
    c.lead_id:=v_lead.lead_id;
    v_action:='google_ads:feh-callback-ack-v1:feh_owner_test_'||c.case_id::text;
    v_source:='authenticated_owner_synthetic_intake';
  else
    -- A separately bootstrapped case may approve ONE already received Meta
    -- lead. No historical approval, reservation or attempt is reset/reused.
    select * into v_existing from public.leads where id=c.lead_id for update;
    select * into v_queue from public.lead_acknowledgements where lead_id=c.lead_id for update;
    v_mobile:=pg_catalog.regexp_replace(pg_catalog.btrim(v_existing.telephone),'[ ()-]','','g');
    if v_mobile ~ '^07[1-57-9][0-9]{8}$' then v_mobile:='+44'||pg_catalog.substr(v_mobile,2);
    elsif v_mobile ~ '^00447[1-57-9][0-9]{8}$' then v_mobile:='+'||pg_catalog.substr(v_mobile,3); end if;
    if v_existing.id is null or v_existing.organisation_id is not null
      or v_existing.provider is distinct from 'meta' or v_existing.lead_source is distinct from 'meta_ads'
      or v_mobile is distinct from c.allowed_phone or v_queue.lead_id is null
      or v_queue.provider is distinct from 'meta' or v_queue.page_id is distinct from '100693684801233'
      or v_queue.form_id is distinct from '1788543365401126'
      or v_queue.external_lead_id is distinct from v_existing.external_lead_id
      or v_queue.provider_created_at is distinct from v_existing.provider_created_at
      or v_queue.provider_created_at < pg_catalog.statement_timestamp()-interval '24 hours'
      or v_queue.provider_created_at > pg_catalog.statement_timestamp()+interval '5 minutes'
      or v_queue.status is distinct from 'awaiting_authority'
      or v_queue.execution_authorization_id is not null or v_queue.claimed_at is not null
      or exists(select 1 from public.execution_authorizations where consumed_at is null)
      or exists(select 1 from public.execution_dispatch_attempts da where da.status<>'succeeded')
      or exists(select 1 from public.lead_acknowledgements where lead_id<>c.lead_id and status<>'claimed')
      or exists(select 1 from public.execution_provider_adapters where status<>'disabled'
        or adapter_key<>'TELNYX_FEH_CALLBACK_ACK_V1' or channel<>'SMS'
        or approved_by is distinct from v_actor or approved_at is null)
      then return 'blocked'; end if;
    v_action:='meta:feh-callback-ack-v1:'||v_queue.external_lead_id;
    if exists(select 1 from public.execution_intents where action_id=v_action) then return 'blocked'; end if;
    v_source:='authenticated_owner_existing_meta_enquiry';
  end if;
  insert into public.organisations(legal_name) values('FEH owner-controlled staging SMS test') returning id into v_org;
  insert into public.contacts(organisation_id,phone) values(v_org,c.allowed_phone) returning id into v_contact;
  update public.leads set organisation_id=v_org where id=c.lead_id and organisation_id is null;
  if not found then raise exception 'owner_test_prepare_failed'; end if;
  select * into v_intent from public.create_execution_intent(v_contact,'SMS',v_action);
  if v_intent.status is distinct from 'created' then raise exception 'owner_test_prepare_failed'; end if;
  -- This evidence is consent to ONE own-number test, not customer marketing.
  insert into public.compliance_decisions(evaluated_at,organisation_id,contact_id,requested_channel,
    policy_version,decision,identity_tier,consent_status,consent_source,legal_basis,contactability_status,
    has_email,has_telephone,has_domain,destination_commitment_nonce,destination_commitment,expires_at,execution_intent_id)
    select pg_catalog.statement_timestamp(),v_org,v_contact,'SMS','FEH_CONTACT_PERMISSION_V1','eligible',
      'deterministic','consented',v_evidence,'consented','contactable',false,true,false,
      nonce,destination_commitment,least(c.expires_at,pg_catalog.statement_timestamp()+interval '15 minutes'),v_intent.execution_intent_id
      from public.derive_destination_commitment(v_contact,'SMS');
  if public.approve_execution_intent(v_intent.execution_intent_id,'feh-callback-ack-v1',v_evidence) is distinct from 'approved'
    then raise exception 'owner_test_prepare_failed'; end if;
  -- Keep original adapter approval attribution; record this case's fresh
  -- activation separately in the immutable audit log below.
  select id into v_adapter from public.execution_provider_adapters
    where adapter_key='TELNYX_FEH_CALLBACK_ACK_V1' and channel='SMS' for update;
  if v_adapter is null then
    insert into public.execution_provider_adapters(adapter_key,channel,status,approved_by,approved_at)
      values('TELNYX_FEH_CALLBACK_ACK_V1','SMS','approved',v_actor,pg_catalog.statement_timestamp()) returning id into v_adapter;
  else
    update public.execution_provider_adapters set status='approved' where id=v_adapter and status='disabled'
      and approved_by=v_actor and approved_at is not null;
    if not found then raise exception 'owner_test_prepare_failed'; end if;
  end if;
  update public.ack_preview_owner_test_control set phase='prepared',lead_id=c.lead_id,
    intent_id=v_intent.execution_intent_id,adapter_id=v_adapter,prepared_at=pg_catalog.statement_timestamp() where singleton;
  insert into public.audit_log(actor_id,actor_role,action,entity_type,entity_id,correlation_id,result,metadata)
    values(v_actor,'admin','ack_owner_test_approved','lead',c.lead_id::text,c.case_id,'success',
      pg_catalog.jsonb_build_object('scope','single_owner_test','source',v_source,'adapter_id',v_adapter,
        'template_version','feh-callback-ack-v1','approval_reference',c.approval_reference,'execution_allowed',false));
  return 'prepared';
end;
$$;

create or replace function public.begin_ack_preview_owner_test()
returns table(status text,lead_id bigint,authorization_id bigint,provider_adapter_id bigint)
language plpgsql volatile security definer set search_path='' as $$
declare c public.ack_preview_owner_test_control%rowtype; v_result text; v_authorization bigint;
begin
  status:='blocked';
  if not public.ack_preview_owner_can_approve() then return next; return; end if;
  select * into c from public.ack_preview_owner_test_control where singleton for update;
  if not public.ack_preview_owner_can_approve() or c.phase<>'prepared'
    or c.prepared_at<=pg_catalog.statement_timestamp()-interval '15 minutes'
    or public.evaluate_execution_emergency_stop()<>'stopped'
    or exists(select 1 from public.execution_authorizations where consumed_at is null)
    or exists(select 1 from public.execution_dispatch_attempts da where da.status<>'succeeded')
    or (select count(*) from public.execution_provider_adapters p where p.status='approved')<>1
    or not exists(select 1 from public.execution_provider_adapters p where p.id=c.adapter_id
      and p.status='approved' and p.adapter_key='TELNYX_FEH_CALLBACK_ACK_V1' and p.channel='SMS'
      and p.approved_by=c.operator_id and p.approved_at is not null)
    or not exists(select 1 from public.lead_acknowledgements q where q.lead_id=c.lead_id
      and q.status='awaiting_authority' and q.execution_authorization_id is null and q.claimed_at is null)
    or exists(select 1 from public.lead_acknowledgements q where q.lead_id<>c.lead_id and q.status<>'claimed') then return next; return; end if;
  v_result:=public.release_execution('Single owner staging SMS test','ack-owner-test:'||c.case_id::text);
  if v_result is distinct from 'released' then raise exception 'owner_test_begin_failed'; end if;
  v_result:=public.create_execution_authorization(c.intent_id);
  if v_result is distinct from 'authorised' then raise exception 'owner_test_begin_failed'; end if;
  select a.id into v_authorization from public.execution_authorizations a where a.execution_intent_id=c.intent_id;
  if v_authorization is null then raise exception 'owner_test_begin_failed'; end if;
  update public.ack_preview_owner_test_control set phase='running',started_at=pg_catalog.statement_timestamp(),
    authorization_id=v_authorization where singleton;
  status:='started';lead_id:=c.lead_id;authorization_id:=v_authorization;provider_adapter_id:=c.adapter_id;
  return next;
end;
$$;


revoke all on function public.prepare_ack_preview_owner_test(),public.begin_ack_preview_owner_test()
  from public,anon,service_role,external_lead_ingestor,execution_dispatch_worker;
grant execute on function public.prepare_ack_preview_owner_test(),public.begin_ack_preview_owner_test() to authenticated;
-- Recovery: keep STOP enabled, close any active case with the existing cleanup
-- RPC, and restore the prior function definitions. Never reset used authority.
