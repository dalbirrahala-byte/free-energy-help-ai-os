-- Factory 041 Phase 16B.2b-6h (Part G): checkpoint #3 dispatch
-- preparation writer.
--
-- WHY THIS EXISTS: this is the "3A -- DB PREPARATION GATE" half of
-- checkpoint #3 (the Phase 16B.2b-6h "PART J -- TWO-PART CHECKPOINT #3"
-- design). It answers "may this already-authorized, already-consumed
-- action now be dispatched through this exact approved provider adapter
-- exactly once?" by revalidating every live safety gate under lock, then
-- durably recording one dispatch-attempt identity -- never by performing
-- the provider call itself. NO network call, NO provider SDK usage, and
-- NO reference to any external system appears anywhere in this
-- migration. It remains fully DORMANT after creation -- see "DORMANCY"
-- below.
--
-- ACCEPTING provider_adapter_id FROM THE CALLER IS SAFE, NOT A TRUST
-- SHORTCUT: per the Phase 16B.2b-6h Part G instruction to inspect this
-- explicitly -- p_provider_adapter_id is a REFERENCE the caller supplies
-- (exactly like p_execution_intent_id on every other writer in this
-- chain), never an assertion this function trusts blindly. This function
-- independently re-derives and re-verifies, from the database's own
-- authoritative row, that the referenced adapter exists, is
-- `status = 'approved'`, and that its `channel` column exactly matches
-- the target authorization's own `requested_channel` -- a caller cannot
-- cause an unapproved or wrong-channel adapter to be used merely by
-- passing its id.
--
-- AUTHORITY MODEL -- SETTLED IN PRINCIPLE BY THE LEAD ARCHITECT (Phase
-- 16B.2b-6g hardening review), APPLIED IDENTICALLY HERE: no auth.uid()
-- capture, no admin/execution_authoriser/execution_controller
-- requirement, no new human capability. The intended future caller is
-- trusted backend/service-worker code -- a machine execution-boundary
-- action, not per-action human approval -- exactly the same
-- classification already settled for public.consume_execution_
-- authorization() (20260825150000...sql). DEPLOYED STATE: fully dormant,
-- including service_role -- see "DORMANCY" below. A future,
-- separately-authorised activation phase decides exactly which backend
-- identity/path receives EXECUTE.
--
-- REVALIDATION, GATE BY GATE, MATCHING PART H EXACTLY: (1) authorization
-- exists; (2) authorization_status = 'authorised'; (3) consumed_at IS NOT
-- NULL (must already be consumed -- this writer never consumes); (4) not
-- expired; (5) execution_performed = false (already-performed short-
-- circuits to 'no_change', not 'blocked' -- the work is already
-- genuinely done); (6) selected provider adapter exists; (7) adapter
-- status = 'approved'; (8) adapter channel matches requested_channel;
-- (9) approval still 'approved' (re-read live, exactly mirroring public.
-- consume_execution_authorization()'s own Classification B reasoning --
-- revoke_execution_intent() can retract approval at any time up to
-- actual dispatch); (10) the pinned compliance decision's own continued
-- non-expiry (Classification B, same reasoning as consumption; its
-- decision/policy_version/subject-binding remain Classification A,
-- immutable, not re-read); (11) live destination commitment re-verified;
-- (12) live suppression re-evaluated; (13) checkpoint #3's own emergency-
-- state read, NULL-safe, exactly 'clear'. Every rejection collapses to
-- the identical 'blocked', matching this chain's oracle-avoidance
-- discipline throughout.
--
-- LOCK ORDERING -- EXTENDS THE CONSUMPTION WRITER'S OWN PROVEN PREFIX,
-- PER THE PHASE 16B.2b-6h PART N GLOBAL LOCK REVIEW: (1) the target
-- public.execution_authorizations row, `FOR UPDATE` -- the identical
-- first lock target/mode as public.consume_execution_authorization();
-- (2) the referenced public.execution_intents row, `FOR UPDATE` -- the
-- identical second lock target/mode as consumption, serializing this
-- preparation against a concurrent revoke_execution_intent() call for
-- the same intent, for the identical reason already proven in that
-- migration's own header; (3) the selected public.execution_provider_
-- adapters row, `FOR SHARE` -- a brand-new table no other writer in this
-- chain ever touches, so this step introduces no new cross-writer
-- ordering risk; (4) public.execution_control_lock (id = 1), `FOR
-- SHARE` -- the identical checkpoint used by consumption, held through
-- the final emergency-state read and the dispatch-attempt INSERT below,
-- then released when this transaction ends -- NO provider/network call
-- occurs while this lock, or any lock this function holds, is held. This
-- fixed prefix is byte-for-byte the SAME target/mode/order as public.
-- consume_execution_authorization()'s own first two steps, extended by
-- two additional locks (adapter, then coordination) that no other writer
-- in this chain ever contests -- the full cross-writer deadlock proof
-- already established for consumption (see that migration's own "PART G"
-- header) therefore applies here without modification: no writer locks
-- execution_authorizations/execution_intents in the reverse order this
-- function uses, stop_execution()/release_execution() never touch either
-- table, and Shape A/approval writers never touch execution_
-- authorizations (existing rows) or execution_control_lock at all.
--
-- ONLY ONE EMERGENCY-STATE READ, FOR THE IDENTICAL REASON ALREADY PROVEN
-- FOR CONSUMPTION: the coordination lock genuinely serializes this
-- preparation against a concurrent stop_execution()/release_execution()
-- call (mutually exclusive FOR SHARE/FOR UPDATE on the same row) -- see
-- consumption's own header for the full race proof, which applies
-- identically here since the lock target/mode/position relative to the
-- final read and the mutation is unchanged.
--
-- THE UNAVOIDABLE PHYSICAL-WORLD BOUNDARY, NOT PRETENDED AWAY: this
-- transaction commits, releasing every lock it holds, BEFORE any
-- provider call is ever made -- a database lock cannot be held across
-- network I/O to a third-party provider without creating an
-- unacceptable availability hazard. A STOP admitted in the interval
-- between this transaction committing and the application layer actually
-- invoking the adapter cannot be observed by this function. This is why
-- the Phase 16B.2b-6h "PART J" design requires a SECOND, application-
-- layer immediate-pre-call check (frontend/src/lib/execution-dispatch/
-- checkpointThreeDispatchBoundary.ts, same batch) performed as close as
-- possible to the actual `adapter.execute()` call -- narrowing this gap
-- to the smallest achievable window, never claiming to eliminate it.
--
-- EXACTLY-ONE DISPATCH ATTEMPT, PRE-CHECK PLUS NARROW unique_violation
-- CATCH, MATCHING public.grant_execution_controller()'S OWN ARCHITECT-
-- APPROVED PATTERN EXACTLY (Phase 16B.2b-5z-A-R1): an ordinary SELECT
-- first checks whether a dispatch attempt already exists for this
-- authorization -- if so, returns 'no_change' without attempting any
-- INSERT, handling the overwhelmingly common case (a retried preparation
-- call) cheaply. If two concurrent calls both pass that check before
-- either commits, the SECOND INSERT collides with either of public.
-- execution_dispatch_attempts' own two unique indexes (20260825170000
-- ...sql, same batch) and raises unique_violation -- caught by a NESTED
-- `begin ... insert ... exception when unique_violation then return
-- 'no_change'; end;` sub-block wrapped around the INSERT alone. This
-- function's own OUTER block carries no EXCEPTION clause of any kind --
-- every other statement (every authority/revalidation/lock check
-- preceding the INSERT) is left fully unprotected, exactly as intended.
-- No WHEN OTHERS anywhere in this function: every other PostgreSQL error
-- propagates normally and aborts the calling transaction.
--
-- DISPATCH_IDEMPOTENCY_KEY -- DETERMINISTIC, NEVER CALLER-SUPPLIED:
-- `'feh-dispatch-v1|' || p_execution_authorization_id::text`, computed
-- internally, matching the deterministic-key discipline already
-- established throughout this chain -- see public.execution_dispatch_
-- attempts' own header (20260825170000...sql) for why this key is
-- distinct in purpose from execution_authorizations.idempotency_key.
--
-- RETURN CONTRACT: 'prepared' | 'no_change' | 'blocked' |
-- 'evaluation_failed' -- matching this chain's established four-value
-- shape exactly. 'no_change' covers both "already performed" (gate 5)
-- and "a dispatch attempt already exists" (regardless of that attempt's
-- own current status -- this function does not re-examine or re-report
-- an existing attempt's terminal state, it only reports that preparation
-- itself is not a new action). 'evaluation_failed' is reserved
-- exclusively for the execution_control_lock-row-absent case,
-- structurally unreachable today but defensively handled, matching
-- every prior writer that uses this coordination lock.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY the one
-- function below and its REVOKE statements. It does NOT modify public.
-- execution_authorizations, public.execution_intents, public.execution_
-- intent_approvals, public.compliance_decisions, public.execution_
-- provider_adapters, public.execution_dispatch_attempts, or any other
-- existing migration. It does NOT set execution_performed, execution_
-- performed_at, or execution_reference. It does NOT call any outcome-
-- finalisation writer, stop_execution(), release_execution(), or any
-- provider/network primitive (none exists anywhere in this repository).
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`, every
-- security-relevant built-in explicitly pg_catalog-qualified, every
-- relation and function reference fully schema-qualified.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement, matching every
-- precedent function in this repository.
--
-- DORMANCY -- INCLUDING service_role, MATCHING THE SETTLED CONSUMPTION-
-- WRITER PRECEDENT (Phase 16B.2b-6g): this is a mutating writer whose
-- intended future caller is service-role-equivalent backend code, not a
-- browser session -- leaving service_role unrevoked would therefore not
-- be true dormancy (any existing backend already holding service_role
-- credentials for an unrelated purpose could invoke a live dispatch
-- preparation immediately upon deployment). PUBLIC, anon, authenticated,
-- AND service_role are all explicitly revoked below. Only the owning
-- role (`postgres`) retains its ordinary implicit owner privilege,
-- untouched. Activation is a future, separately-authorised phase.
--
-- MUTATION SURFACE: exactly one INSERT, targeting public.execution_
-- dispatch_attempts only, reached only after every authority,
-- revalidation, and lock check has passed and no attempt already exists.
-- No UPDATE or DELETE against any table appears anywhere in this
-- function. public.execution_authorizations, public.execution_intents,
-- public.execution_intent_approvals, public.compliance_decisions, public.
-- execution_provider_adapters, and public.execution_control_lock are
-- read-and/or-locked only, never written to.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6h authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.prepare_execution_dispatch(
  p_execution_authorization_id bigint,
  p_provider_adapter_id bigint
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_locked_authorization_id bigint;
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
  v_adapter_channel text;
  v_lock_id bigint;
  v_emergency_result text;
  v_existing_attempt_id bigint;
  v_dispatch_idempotency_key text;
begin
  -- Structural preconditions -- rejected before any table lookup.
  if p_execution_authorization_id is null or p_execution_authorization_id <= 0 then
    return 'blocked';
  end if;

  if p_provider_adapter_id is null or p_provider_adapter_id <= 0 then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): the target authorization row -- identical
  -- target/mode as public.consume_execution_authorization()'s own first
  -- step. See "LOCK ORDERING" above.
  select ea.id, ea.authorization_status, ea.expires_at, ea.consumed_at,
         ea.execution_performed, ea.execution_intent_id, ea.contact_id,
         ea.requested_channel, ea.compliance_decision_id
    into v_locked_authorization_id, v_authorization_status, v_expires_at,
         v_consumed_at, v_execution_performed, v_execution_intent_id,
         v_contact_id, v_requested_channel, v_compliance_decision_id
  from public.execution_authorizations ea
  where ea.id = p_execution_authorization_id
  for update;

  if v_locked_authorization_id is null then
    return 'blocked';
  end if;

  if v_authorization_status is distinct from 'authorised' then
    return 'blocked';
  end if;

  if v_expires_at is null or v_expires_at <= pg_catalog.transaction_timestamp() then
    return 'blocked';
  end if;

  if v_consumed_at is null then
    return 'blocked';
  end if;

  if v_execution_performed then
    return 'no_change';
  end if;

  -- LOCK ORDERING step (2): the referenced execution_intents row --
  -- identical target/mode as consumption. See "LOCK ORDERING" above.
  select ei.id into v_locked_intent_id
  from public.execution_intents ei
  where ei.id = v_execution_intent_id
  for update;

  if v_locked_intent_id is null then
    return 'blocked';
  end if;

  -- Approval must still be current -- see "REVALIDATION" above.
  select eia.decision into v_latest_approval_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = v_execution_intent_id
  order by eia.id desc
  limit 1;

  if v_latest_approval_decision is distinct from 'approved' then
    return 'blocked';
  end if;

  -- The pinned compliance decision's own continued non-expiry -- see
  -- "REVALIDATION" above.
  select cd.expires_at, cd.destination_commitment_nonce, cd.destination_commitment
    into v_compliance_expires_at, v_compliance_nonce, v_compliance_commitment
  from public.compliance_decisions cd
  where cd.id = v_compliance_decision_id;

  if v_compliance_expires_at is null
     or v_compliance_expires_at <= pg_catalog.transaction_timestamp()
  then
    return 'blocked';
  end if;

  -- Live destination re-verification.
  v_destination_result := public.verify_destination_commitment(
    v_contact_id, v_requested_channel, v_compliance_nonce, v_compliance_commitment
  );

  if v_destination_result is distinct from 'verified' then
    return 'blocked';
  end if;

  -- Live suppression re-verification.
  v_suppression_result := public.evaluate_suppression_live(v_execution_intent_id);

  if v_suppression_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (3): the selected provider adapter row -- a
  -- brand-new table no other writer touches. See "LOCK ORDERING" above.
  -- p_provider_adapter_id is a reference, never trusted blindly -- see
  -- module header.
  select epa.id, epa.status, epa.channel
    into v_locked_adapter_id, v_adapter_status, v_adapter_channel
  from public.execution_provider_adapters epa
  where epa.id = p_provider_adapter_id
  for share;

  if v_locked_adapter_id is null then
    return 'blocked';
  end if;

  if v_adapter_status is distinct from 'approved' then
    return 'blocked';
  end if;

  if v_adapter_channel is distinct from v_requested_channel then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (4): the coordination lock, held through the
  -- final emergency-state read and the dispatch-attempt INSERT below --
  -- checkpoint #3's own emergency gate. See "LOCK ORDERING" above.
  select ecl.id into v_lock_id
  from public.execution_control_lock ecl
  where ecl.id = 1
  for share;

  if v_lock_id is null then
    return 'evaluation_failed';
  end if;

  -- Exactly one emergency-state read, immediately before the mutation,
  -- protected by the coordination lock held above.
  v_emergency_result := public.evaluate_execution_emergency_stop();

  if v_emergency_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- Pre-check for the common case -- see "EXACTLY-ONE DISPATCH ATTEMPT"
  -- above.
  select eda.id into v_existing_attempt_id
  from public.execution_dispatch_attempts eda
  where eda.execution_authorization_id = p_execution_authorization_id;

  if v_existing_attempt_id is not null then
    return 'no_change';
  end if;

  -- Internally derived, never caller-supplied -- see
  -- "DISPATCH_IDEMPOTENCY_KEY" above.
  v_dispatch_idempotency_key := 'feh-dispatch-v1|' || p_execution_authorization_id::text;

  -- Exactly one INSERT, nested so the unique_violation catch below
  -- covers only this statement -- see "EXACTLY-ONE DISPATCH ATTEMPT"
  -- above.
  begin
    insert into public.execution_dispatch_attempts (
      execution_authorization_id, provider_adapter_id,
      dispatch_idempotency_key, status
    ) values (
      p_execution_authorization_id, v_locked_adapter_id,
      v_dispatch_idempotency_key, 'prepared'
    );
  exception
    when unique_violation then
      return 'no_change';
  end;

  return 'prepared';
end;
$$;

revoke all on function public.prepare_execution_dispatch(
  bigint, bigint
) from public;

revoke execute on function public.prepare_execution_dispatch(
  bigint, bigint
) from anon;

revoke execute on function public.prepare_execution_dispatch(
  bigint, bigint
) from authenticated;

revoke execute on function public.prepare_execution_dispatch(
  bigint, bigint
) from service_role;

-- ROLLBACK (documented, not executed): this function is dormant --
-- unreachable by any role, including service_role, and neither has ever
-- been called -- nothing could depend on it.
-- drop function if exists public.prepare_execution_dispatch(bigint, bigint);
