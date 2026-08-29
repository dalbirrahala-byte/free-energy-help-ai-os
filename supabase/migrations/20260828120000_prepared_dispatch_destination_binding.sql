-- Factory 041 destination-binding hardening (forward migration).
-- Replaces only the dormant authoritative preparation RPC contract so a
-- successful prepared row carries the exact internally loaded destination
-- whose commitment was verified. No destination argument is introduced and
-- every non-prepared row retains NULL envelope fields.

drop function public.prepare_execution_dispatch(bigint, bigint);

create function public.prepare_execution_dispatch(
  p_execution_authorization_id bigint,
  p_provider_adapter_id bigint
)
returns table (
  preparation_status text,
  execution_authorization_id bigint,
  execution_dispatch_attempt_id bigint,
  dispatch_idempotency_key text,
  provider_adapter_id bigint,
  provider_adapter_key text,
  channel text,
  destination text,
  execution_performed boolean
)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_authorization_status text;
  v_expires_at timestamptz;
  v_consumed_at timestamptz;
  v_execution_performed boolean;
  v_execution_intent_id bigint;
  v_contact_id bigint;
  v_requested_channel text;
  v_compliance_decision_id bigint;
  v_locked_intent_id bigint;
  v_latest_approval_decision text;
  v_compliance_expires_at timestamptz;
  v_compliance_nonce uuid;
  v_compliance_commitment bytea;
  v_destination_result text;
  v_authoritative_destination text;
  v_suppression_result text;
  v_locked_adapter_id bigint;
  v_adapter_status text;
  v_adapter_key text;
  v_adapter_channel text;
  v_lock_id bigint;
  v_emergency_result text;
  v_existing_attempt_id bigint;
  v_dispatch_key text;
  v_inserted_attempt_id bigint;
begin
  -- Output columns default NULL. Only the successful INSERT path below
  -- assigns envelope values; every other path returns status + NULLs.
  if p_execution_authorization_id is null or p_execution_authorization_id <= 0
     or p_provider_adapter_id is null or p_provider_adapter_id <= 0 then
    preparation_status := 'blocked'; return next; return;
  end if;

  select ea.authorization_status, ea.expires_at, ea.consumed_at,
         ea.execution_performed, ea.execution_intent_id, ea.contact_id,
         ea.requested_channel, ea.compliance_decision_id
    into v_authorization_status, v_expires_at, v_consumed_at,
         v_execution_performed, v_execution_intent_id, v_contact_id,
         v_requested_channel, v_compliance_decision_id
  from public.execution_authorizations ea
  where ea.id = p_execution_authorization_id
  for update;

  if not found then
    preparation_status := 'blocked'; return next; return;
  end if;

  -- The authorization row lock serializes all preparation attempts for this
  -- authorization. An already-durable attempt is deliberately stranded for
  -- reconciliation: it can never reacquire a dispatchable envelope.
  select eda.id into v_existing_attempt_id
  from public.execution_dispatch_attempts eda
  where eda.execution_authorization_id = p_execution_authorization_id;
  if v_existing_attempt_id is not null then
    preparation_status := 'no_change'; return next; return;
  end if;

  if v_authorization_status is distinct from 'authorised'
     or v_expires_at is null or v_expires_at <= pg_catalog.transaction_timestamp()
     or v_consumed_at is null then
    preparation_status := 'blocked'; return next; return;
  end if;
  if v_execution_performed is null then
    preparation_status := 'blocked'; return next; return;
  end if;
  if v_execution_performed then
    preparation_status := 'no_change'; return next; return;
  end if;

  select ei.id into v_locked_intent_id
  from public.execution_intents ei
  where ei.id = v_execution_intent_id
  for update;
  if v_locked_intent_id is null then
    preparation_status := 'blocked'; return next; return;
  end if;

  select eia.decision into v_latest_approval_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = v_execution_intent_id
  order by eia.id desc limit 1;
  if v_latest_approval_decision is distinct from 'approved' then
    preparation_status := 'blocked'; return next; return;
  end if;

  select cd.expires_at, cd.destination_commitment_nonce, cd.destination_commitment
    into v_compliance_expires_at, v_compliance_nonce, v_compliance_commitment
  from public.compliance_decisions cd where cd.id = v_compliance_decision_id;
  if v_compliance_expires_at is null
     or v_compliance_expires_at <= pg_catalog.transaction_timestamp() then
    preparation_status := 'blocked'; return next; return;
  end if;

  -- Load the exact authoritative destination from the same contact/channel
  -- state the verifier reads, with a row lock preventing concurrent change. It is never accepted as an RPC argument.
  select case v_requested_channel
           when 'EMAIL' then c.email
           else c.phone
         end
    into v_authoritative_destination
  from public.contacts c
  where c.id = v_contact_id
  for share;
  v_authoritative_destination := pg_catalog.btrim(v_authoritative_destination);
  if v_authoritative_destination is null
     or pg_catalog.length(v_authoritative_destination) = 0
     or (v_requested_channel = 'EMAIL' and (
       pg_catalog.length(v_authoritative_destination) > 254
       or v_authoritative_destination !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     ))
     or (v_requested_channel <> 'EMAIL' and (
       pg_catalog.length(v_authoritative_destination) > 30
       or pg_catalog.length(pg_catalog.regexp_replace(v_authoritative_destination, '[^0-9]', '', 'g')) < 10
     )) then
    preparation_status := 'blocked'; return next; return;
  end if;

  v_destination_result := public.verify_destination_commitment(
    v_contact_id, v_requested_channel, v_compliance_nonce, v_compliance_commitment
  );
  if v_destination_result is distinct from 'verified' then
    preparation_status := 'blocked'; return next; return;
  end if;

  v_suppression_result := public.evaluate_suppression_live(v_execution_intent_id);
  if v_suppression_result is distinct from 'clear' then
    preparation_status := 'blocked'; return next; return;
  end if;

  select epa.id, epa.status, epa.adapter_key, epa.channel
    into v_locked_adapter_id, v_adapter_status, v_adapter_key, v_adapter_channel
  from public.execution_provider_adapters epa
  where epa.id = p_provider_adapter_id
  for share;
  if v_locked_adapter_id is null or v_adapter_status is distinct from 'approved'
     or v_adapter_key is null or pg_catalog.length(pg_catalog.btrim(v_adapter_key)) = 0
     or v_adapter_channel is distinct from v_requested_channel then
    preparation_status := 'blocked'; return next; return;
  end if;

  select ecl.id into v_lock_id from public.execution_control_lock ecl
  where ecl.id = 1 for share;
  if v_lock_id is null then
    preparation_status := 'evaluation_failed'; return next; return;
  end if;
  v_emergency_result := public.evaluate_execution_emergency_stop();
  if v_emergency_result is distinct from 'clear' then
    preparation_status := 'blocked'; return next; return;
  end if;

  v_dispatch_key := 'feh-dispatch-v1|' || p_execution_authorization_id::text;
  begin
    insert into public.execution_dispatch_attempts (
      execution_authorization_id, provider_adapter_id,
      dispatch_idempotency_key, status
    ) values (
      p_execution_authorization_id, v_locked_adapter_id,
      v_dispatch_key, 'prepared'
    ) returning id into v_inserted_attempt_id;
  exception when unique_violation then
    preparation_status := 'no_change'; return next; return;
  end;

  preparation_status := 'prepared';
  execution_authorization_id := p_execution_authorization_id;
  execution_dispatch_attempt_id := v_inserted_attempt_id;
  dispatch_idempotency_key := v_dispatch_key;
  provider_adapter_id := v_locked_adapter_id;
  provider_adapter_key := v_adapter_key;
  channel := v_adapter_channel;
  destination := v_authoritative_destination;
  execution_performed := false;
  return next;
end;
$$;

revoke all on function public.prepare_execution_dispatch(bigint, bigint) from public;
revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from anon;
revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from authenticated;
revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from service_role;
grant execute on function public.prepare_execution_dispatch(bigint, bigint) to execution_dispatch_worker;
