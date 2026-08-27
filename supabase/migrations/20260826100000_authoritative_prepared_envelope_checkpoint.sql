-- Factory 041: authoritative one-time prepared envelope + strengthened
-- checkpoint #3. DORMANT SOURCE ONLY: no runtime identity or provider is
-- activated by this migration.

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
  execution_performed := false;
  return next;
end;
$$;

revoke all on function public.prepare_execution_dispatch(bigint, bigint) from public;
revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from anon;
revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from authenticated;
revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from service_role;
grant execute on function public.prepare_execution_dispatch(bigint, bigint) to execution_dispatch_worker;

drop function public.evaluate_execution_precall_readiness(bigint);

create function public.evaluate_execution_precall_readiness(
  p_execution_dispatch_attempt_id bigint,
  p_execution_authorization_id bigint,
  p_expected_provider_adapter_id bigint,
  p_expected_adapter_key text
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_attempt_authorization_id bigint;
  v_attempt_status text;
  v_attempt_adapter_id bigint;
  v_authorization_status text;
  v_expires_at timestamptz;
  v_consumed_at timestamptz;
  v_execution_performed boolean;
  v_execution_intent_id bigint;
  v_contact_id bigint;
  v_requested_channel text;
  v_compliance_decision_id bigint;
  v_adapter_id bigint;
  v_adapter_status text;
  v_adapter_key text;
  v_adapter_channel text;
  v_latest_approval_decision text;
  v_compliance_expires_at timestamptz;
  v_compliance_nonce uuid;
  v_compliance_commitment bytea;
begin
  if p_execution_dispatch_attempt_id is null or p_execution_dispatch_attempt_id <= 0
     or p_execution_authorization_id is null or p_execution_authorization_id <= 0
     or p_expected_provider_adapter_id is null or p_expected_provider_adapter_id <= 0
     or p_expected_adapter_key is null
     or pg_catalog.length(pg_catalog.btrim(p_expected_adapter_key)) = 0
     or pg_catalog.length(p_expected_adapter_key) > 100
     or p_expected_adapter_key <> pg_catalog.btrim(p_expected_adapter_key) then
    return 'evaluation_failed';
  end if;

  select eda.execution_authorization_id, eda.status, eda.provider_adapter_id,
         ea.authorization_status, ea.expires_at, ea.consumed_at,
         ea.execution_performed, ea.execution_intent_id, ea.contact_id,
         ea.requested_channel, ea.compliance_decision_id,
         epa.id, epa.status, epa.adapter_key, epa.channel
    into v_attempt_authorization_id, v_attempt_status, v_attempt_adapter_id,
         v_authorization_status, v_expires_at, v_consumed_at,
         v_execution_performed, v_execution_intent_id, v_contact_id,
         v_requested_channel, v_compliance_decision_id,
         v_adapter_id, v_adapter_status, v_adapter_key, v_adapter_channel
  from public.execution_dispatch_attempts eda
  join public.execution_authorizations ea on ea.id = eda.execution_authorization_id
  join public.execution_provider_adapters epa on epa.id = eda.provider_adapter_id
  where eda.id = p_execution_dispatch_attempt_id;

  if v_attempt_authorization_id is null
     or v_attempt_authorization_id <> p_execution_authorization_id
     or v_attempt_status is distinct from 'prepared'
     or v_authorization_status is distinct from 'authorised'
     or v_expires_at is null or v_expires_at <= pg_catalog.transaction_timestamp()
     or v_consumed_at is null or v_execution_performed is distinct from false
     or v_attempt_adapter_id <> p_expected_provider_adapter_id
     or v_adapter_id <> v_attempt_adapter_id
     or v_adapter_status is distinct from 'approved'
     or v_adapter_key is distinct from p_expected_adapter_key
     or v_adapter_channel is distinct from v_requested_channel then
    return 'blocked';
  end if;

  select eia.decision into v_latest_approval_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = v_execution_intent_id
  order by eia.id desc limit 1;
  if v_latest_approval_decision is distinct from 'approved' then return 'blocked'; end if;

  select cd.expires_at, cd.destination_commitment_nonce, cd.destination_commitment
    into v_compliance_expires_at, v_compliance_nonce, v_compliance_commitment
  from public.compliance_decisions cd where cd.id = v_compliance_decision_id;
  if v_compliance_expires_at is null
     or v_compliance_expires_at <= pg_catalog.transaction_timestamp() then return 'blocked'; end if;
  if public.verify_destination_commitment(
       v_contact_id, v_requested_channel, v_compliance_nonce, v_compliance_commitment
     ) is distinct from 'verified' then return 'blocked'; end if;
  if public.evaluate_suppression_live(v_execution_intent_id) is distinct from 'clear'
    then return 'blocked'; end if;
  if public.evaluate_execution_emergency_stop() is distinct from 'clear'
    then return 'blocked'; end if;
  return 'clear';
end;
$$;

revoke all on function public.evaluate_execution_precall_readiness(bigint, bigint, bigint, text) from public;
revoke execute on function public.evaluate_execution_precall_readiness(bigint, bigint, bigint, text) from anon;
revoke execute on function public.evaluate_execution_precall_readiness(bigint, bigint, bigint, text) from authenticated;
revoke execute on function public.evaluate_execution_precall_readiness(bigint, bigint, bigint, text) from service_role;
grant execute on function public.evaluate_execution_precall_readiness(bigint, bigint, bigint, text) to execution_dispatch_worker;

-- Rollback requires restoring the two prior function definitions and their
-- exact grants in one controlled migration. No table/schema change occurs.
