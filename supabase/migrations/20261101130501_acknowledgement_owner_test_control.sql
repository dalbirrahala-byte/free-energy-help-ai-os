-- Single-use OWNER TEST ONLY. Installation grants bounded authenticated RPC
-- execution, but creates no operator grants, adapter, enquiry or RELEASE.
-- A privileged, separately approved bootstrap must
-- bind the known owner account and mobile, two existing capability grants, and
-- a short expiry. No browser/worker/service role can provision this record.
create table public.ack_preview_owner_test_control (
  singleton boolean primary key default true check (singleton),
  case_id uuid not null unique default pg_catalog.gen_random_uuid(),
  operator_id uuid not null references auth.users(id) on delete restrict,
  allowed_phone text not null check (allowed_phone ~ '^\+447[1-57-9][0-9]{8}$' and allowed_phone <> '+447427851020'),
  expires_at timestamptz not null check (pg_catalog.isfinite(expires_at)),
  enabled boolean not null default false,
  approval_reference text not null check (pg_catalog.length(pg_catalog.btrim(approval_reference)) between 1 and 200),
  authoriser_grant_id bigint not null references public.execution_authorisers(id) on delete restrict,
  controller_grant_id bigint not null references public.execution_authorisers(id) on delete restrict,
  phase text not null default 'setup' check (phase in ('setup','prepared','running','finished')),
  lead_id bigint references public.leads(id) on delete restrict,
  intent_id bigint references public.execution_intents(id) on delete restrict,
  authorization_id bigint references public.execution_authorizations(id) on delete restrict,
  adapter_id bigint references public.execution_provider_adapters(id) on delete restrict,
  prepared_at timestamptz, started_at timestamptz, finished_at timestamptz
);
alter table public.ack_preview_owner_test_control enable row level security;
revoke all on public.ack_preview_owner_test_control from public, anon, authenticated, service_role,
  external_lead_ingestor, execution_dispatch_worker, feh_ack_preview_ingestor, feh_ack_preview_worker;

-- JWT claims here come from Supabase's verified authenticated request. There is
-- no actor argument and no SET of JWT claims anywhere in application code.
create function public.ack_preview_owner_identity()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(auth.uid() is not null
    and auth.jwt()->>'iss' = 'https://vredwhyphrhsudggrsen.supabase.co/auth/v1'
    and auth.jwt()->>'role' = 'authenticated'
    and exists(select 1 from public.ack_preview_owner_test_control c where c.operator_id=auth.uid()),false);
$$;
create function public.ack_preview_owner_can_approve()
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.ack_preview_owner_identity() and auth.jwt()->>'aal'='aal2'
    and exists(select 1 from public.user_roles u where u.id=auth.uid() and u.role='admin')
    and exists(select 1 from public.ack_preview_owner_test_control c
      join public.execution_authorisers a on a.id=c.authoriser_grant_id and a.user_id=c.operator_id
        and a.capability='execution_authoriser' and a.revoked_at is null
      join public.execution_authorisers g on g.id=c.controller_grant_id and g.user_id=c.operator_id
        and g.capability='execution_controller' and g.revoked_at is null
      where c.enabled and c.expires_at>pg_catalog.statement_timestamp()),false);
$$;

create function public.get_ack_preview_owner_test_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.ack_preview_owner_test_control%rowtype;
begin
  if not public.ack_preview_owner_identity() then return '{"status":"setup_required"}'::jsonb; end if;
  select * into c from public.ack_preview_owner_test_control where singleton;
  return pg_catalog.jsonb_build_object('status',c.phase,'recipient_suffix',pg_catalog.right(c.allowed_phone,4),
    'can_approve',public.ack_preview_owner_can_approve(),'expires_at',c.expires_at,
    'attempt_status',(select a.status from public.execution_dispatch_attempts a where a.execution_authorization_id=c.authorization_id order by a.id desc limit 1),
    'temporary_access_removed',not exists(select 1 from public.execution_authorisers a where a.id in (c.authoriser_grant_id,c.controller_grant_id) and a.revoked_at is null)
      and exists(select 1 from public.user_roles u where u.id=c.operator_id and u.role='read_only'),
    'execution_control',public.evaluate_execution_emergency_stop());
end;
$$;

create function public.prepare_ack_preview_owner_test()
returns text language plpgsql volatile security definer set search_path='' as $$
declare c public.ack_preview_owner_test_control%rowtype; v_actor uuid:=auth.uid();
  v_org bigint; v_contact bigint; v_intent record; v_lead record; v_adapter bigint; v_evidence text;
begin
  if not public.ack_preview_owner_can_approve() then return 'blocked'; end if;
  select * into c from public.ack_preview_owner_test_control where singleton for update;
  if not public.ack_preview_owner_can_approve() or c.phase<>'setup' then return 'blocked'; end if;
  -- The first test is explicit synthetic intake, not evidence of a Google event.
  -- Refuse to mix this activation with any existing real execution state.
  if public.evaluate_execution_emergency_stop()<>'stopped'
    or exists(select 1 from public.execution_provider_adapters)
    or exists(select 1 from public.execution_authorizations)
    or exists(select 1 from public.lead_acknowledgements) then return 'blocked'; end if;
  v_evidence:='ack-owner-test:'||c.case_id::text;
  insert into public.organisations(legal_name) values('FEH owner-controlled staging SMS test') returning id into v_org;
  insert into public.contacts(organisation_id,phone) values(v_org,c.allowed_phone) returning id into v_contact;
  select * into v_lead from public.ingest_google_lead_with_acknowledgement(
    '402325113451','24096131756','feh_owner_test_'||c.case_id::text,pg_catalog.statement_timestamp(),
    'FEH owner-controlled staging SMS test','Owner test',c.allowed_phone,null);
  if v_lead.outcome is distinct from 'accepted' then raise exception 'owner_test_prepare_failed'; end if;
  update public.leads set organisation_id=v_org where id=v_lead.lead_id;
  select * into v_intent from public.create_execution_intent(v_contact,'SMS','google_ads:feh-callback-ack-v1:feh_owner_test_'||c.case_id::text);
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
  insert into public.execution_provider_adapters(adapter_key,channel,status,approved_by,approved_at)
    values('TELNYX_FEH_CALLBACK_ACK_V1','SMS','approved',v_actor,pg_catalog.statement_timestamp()) returning id into v_adapter;
  update public.ack_preview_owner_test_control set phase='prepared',lead_id=v_lead.lead_id,
    intent_id=v_intent.execution_intent_id,adapter_id=v_adapter,prepared_at=pg_catalog.statement_timestamp() where singleton;
  insert into public.audit_log(actor_id,actor_role,action,entity_type,entity_id,correlation_id,result,metadata)
    values(v_actor,'admin','ack_owner_test_approved','lead',v_lead.lead_id::text,c.case_id,'success',
      pg_catalog.jsonb_build_object('scope','single_owner_test','source','authenticated_owner_synthetic_intake',
        'template_version','feh-callback-ack-v1','approval_reference',c.approval_reference,'execution_allowed',false));
  return 'prepared';
end;
$$;

create function public.begin_ack_preview_owner_test()
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
    or exists(select 1 from public.execution_authorizations)
    or (select count(*) from public.execution_provider_adapters p where p.status='approved')<>1
    or (select count(*) from public.lead_acknowledgements)<>1 then return next; return; end if;
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

create function public.finish_ack_preview_owner_test()
returns text language plpgsql volatile security definer set search_path='' as $$
declare c public.ack_preview_owner_test_control%rowtype; v_result text; v_actor uuid:=auth.uid();
begin
  -- Cleanup is still possible after scope expiry or capability revocation.
  if not public.ack_preview_owner_identity() or auth.jwt()->>'aal' is distinct from 'aal2'
    or not exists(select 1 from public.user_roles u where u.id=v_actor and u.role='admin') then return 'blocked'; end if;
  select * into c from public.ack_preview_owner_test_control where singleton for update;
  if c.phase='finished' then return 'finished'; end if;
  v_result:=public.stop_execution('Owner staging SMS test closed','ack-owner-test:'||c.case_id::text);
  if v_result is null or v_result not in ('stopped','no_change') then raise exception 'owner_test_finish_failed'; end if;
  -- Disable rather than delete. Retain every approval, reservation and attempt.
  update public.execution_provider_adapters set status='disabled' where id=c.adapter_id
    and adapter_key='TELNYX_FEH_CALLBACK_ACK_V1' and channel='SMS' and approved_by=v_actor;
  update public.execution_authorisers set revoked_at=pg_catalog.statement_timestamp(),revoked_by=v_actor
    where id in (c.authoriser_grant_id,c.controller_grant_id) and user_id=v_actor and revoked_at is null;
  update public.ack_preview_owner_test_control set phase='finished',enabled=false,finished_at=pg_catalog.statement_timestamp() where singleton;
  insert into public.audit_log(actor_id,actor_role,action,entity_type,entity_id,correlation_id,result,metadata)
    values(v_actor,'admin','ack_owner_test_closed','ack_owner_test',c.case_id::text,c.case_id,'success',
      '{"scope":"single_owner_test","execution_control":"stopped","temporary_grants_revoked":true}'::jsonb);
  -- Bootstrap is restricted to the existing read-only test account, never a
  -- standing administrator. Restore the approved starting role at the end.
  update public.user_roles set role='read_only' where id=v_actor and role='admin';
  return 'finished';
end;
$$;

revoke all on function public.ack_preview_owner_identity(),public.ack_preview_owner_can_approve(),
  public.get_ack_preview_owner_test_status(),public.prepare_ack_preview_owner_test(),
  public.begin_ack_preview_owner_test(),public.finish_ack_preview_owner_test()
  from public, anon, authenticated, service_role, external_lead_ingestor, execution_dispatch_worker;
grant execute on function public.get_ack_preview_owner_test_status(),public.prepare_ack_preview_owner_test(),
  public.begin_ack_preview_owner_test(),public.finish_ack_preview_owner_test() to authenticated;
