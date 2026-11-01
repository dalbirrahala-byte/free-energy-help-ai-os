-- Missing freshness or STOP evidence must fail closed. No activation.
create or replace function public.begin_ack_preview_owner_test()
returns table(status text,lead_id bigint,authorization_id bigint,provider_adapter_id bigint)
language plpgsql volatile security definer set search_path='' as $$
declare c public.ack_preview_owner_test_control%rowtype; v_result text; v_authorization bigint;
begin
  status:='blocked';
  if not public.ack_preview_owner_can_approve() then return next; return; end if;
  select * into c from public.ack_preview_owner_test_control where singleton for update;
  if not public.ack_preview_owner_can_approve() or c.phase<>'prepared'
    or c.prepared_at is null or c.prepared_at<=pg_catalog.statement_timestamp()-interval '15 minutes'
    or public.evaluate_execution_emergency_stop() is distinct from 'stopped'
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
