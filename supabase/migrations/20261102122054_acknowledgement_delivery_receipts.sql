-- Dormant receipt evidence only. Installation does not activate a callback route.
-- No existing durable provider callback store was present. Reuse Factory041's
-- attempt/authorization/claim and destination commitment; never rewrite them.
-- No caller role is granted access. A reviewed signature-verifying gateway and
-- profile binding are required before a dedicated writer can be provisioned.
create table public.acknowledgement_delivery_receipts (
  provider_event_id uuid primary key,
  received_at timestamptz not null default transaction_timestamp(),
  occurred_at timestamptz not null,
  execution_dispatch_attempt_id bigint not null references public.execution_dispatch_attempts(id) on delete restrict,
  provider_message_id uuid not null,
  messaging_profile_id uuid not null,
  event_type text not null check(event_type in ('message.sent','message.finalized')),
  delivery_status text not null,
  check ((event_type='message.sent' and delivery_status='sent') or
    (event_type='message.finalized' and delivery_status in
      ('delivered','delivery_failed','sending_failed','delivery_unconfirmed','expired')))
);
create index acknowledgement_delivery_receipts_attempt_idx
  on public.acknowledgement_delivery_receipts(execution_dispatch_attempt_id,occurred_at);
alter table public.acknowledgement_delivery_receipts enable row level security;
revoke all on public.acknowledgement_delivery_receipts from public,anon,authenticated,service_role;

create function public.record_acknowledgement_delivery_receipt(
  p_event_id uuid,p_message_id uuid,p_profile_id uuid,p_occurred_at timestamptz,
  p_event_type text,p_delivery_status text,p_from text,p_to text
) returns text language plpgsql volatile security definer set search_path to '' as $$
declare
  v_attempts bigint[];
  v_attempt_id bigint;
  v_receipt public.acknowledgement_delivery_receipts%rowtype;
begin
  if p_event_id is null or p_message_id is null or p_profile_id is null or
    p_occurred_at is null or not pg_catalog.isfinite(p_occurred_at) or
    p_occurred_at > pg_catalog.transaction_timestamp()+interval '5 minutes' or
    p_from is distinct from '+447427851020' or p_to is null or
    p_to !~ '^\+447[1-57-9][0-9]{8}$' or p_event_type is null or p_delivery_status is null or
    not ((p_event_type='message.sent' and p_delivery_status='sent') or
      (p_event_type='message.finalized' and p_delivery_status in
        ('delivered','delivery_failed','sending_failed','delivery_unconfirmed','expired'))) then
    return 'rejected';
  end if;
  -- A receipt can arrive after STOP, grant revocation or expiry. Those controls
  -- prevent NEW execution, not preservation of evidence about an existing send.
  -- An unknown/ambiguous provider identity never falls back to a phone-only match.
  select pg_catalog.array_agg(a.id) into v_attempts
    from public.execution_dispatch_attempts a
    join public.execution_provider_adapters pa on pa.id=a.provider_adapter_id
    join public.execution_authorizations au on au.id=a.execution_authorization_id
    join public.lead_acknowledgements q on q.execution_authorization_id=au.id
    join public.contacts c on c.id=au.contact_id
    join public.compliance_decisions cd on cd.id=au.compliance_decision_id
    where a.provider_reference=p_message_id::text and a.status in ('succeeded','indeterminate')
      and a.created_at<=p_occurred_at+interval '5 minutes'
      and pa.adapter_key='TELNYX_FEH_CALLBACK_ACK_V1' and pa.channel='SMS'
      and au.consumed_at is not null and au.requested_channel='SMS'
      and q.status='claimed' and c.organisation_id=au.organisation_id
      and pg_catalog.btrim(c.phone)=p_to and cd.contact_id=au.contact_id
      and cd.organisation_id=au.organisation_id and cd.requested_channel='SMS'
      and cd.execution_intent_id=au.execution_intent_id
      and public.verify_destination_commitment(au.contact_id,'SMS',
        cd.destination_commitment_nonce,cd.destination_commitment)='verified';
  if pg_catalog.cardinality(v_attempts) is distinct from 1 then return 'unmatched'; end if;
  v_attempt_id:=v_attempts[1];
  insert into public.acknowledgement_delivery_receipts(provider_event_id,occurred_at,
    execution_dispatch_attempt_id,provider_message_id,messaging_profile_id,event_type,delivery_status)
  values(p_event_id,p_occurred_at,v_attempt_id,p_message_id,p_profile_id,p_event_type,p_delivery_status)
  on conflict(provider_event_id) do nothing;
  if not found then
    select * into v_receipt from public.acknowledgement_delivery_receipts where provider_event_id=p_event_id;
    if v_receipt.execution_dispatch_attempt_id is not distinct from v_attempt_id and
      v_receipt.provider_message_id is not distinct from p_message_id and
      v_receipt.messaging_profile_id is not distinct from p_profile_id and
      v_receipt.occurred_at is not distinct from p_occurred_at and
      v_receipt.event_type is not distinct from p_event_type and
      v_receipt.delivery_status is not distinct from p_delivery_status then return 'duplicate'; end if;
    return 'conflict';
  end if;
  insert into public.audit_log(action,entity_type,entity_id,correlation_id,result,metadata)
    values('acknowledgement_delivery_received','execution_dispatch_attempt',v_attempt_id::text,
      p_event_id,'success',pg_catalog.jsonb_build_object('provider','telnyx',
        'event_type',p_event_type,'delivery_status',p_delivery_status,'execution_allowed',false));
  return 'recorded';
end;
$$;
revoke all on function public.record_acknowledgement_delivery_receipt(uuid,uuid,uuid,timestamptz,text,text,text,text)
  from public,anon,authenticated,service_role;

-- No current-delivery projection: distinct out-of-order/conflicting events are
-- retained as evidence. They cannot regress an execution result, reset a claim,
-- authorize a retry or prove handset receipt on their own. No raw message text,
-- phone number, provider headers, URLs or signature are stored in this table.
-- Recovery: keep evidence; revoke a future dedicated writer before removing a
-- route. Do not delete receipt/audit history or rewrite completed attempts.
