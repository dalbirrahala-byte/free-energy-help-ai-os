-- Factory 041 Phase 16B.2b-6i (Part I): checkpoint #3 immediate-precall
-- combined readiness evaluator.
--
-- WHY THIS EXISTS: the Phase 16B.2b-6h "PART J" design left the
-- application-layer immediate-precall gate
-- (frontend/src/lib/execution-dispatch/checkpointThreeDispatchBoundary.ts)
-- checking ONLY emergency state, with live suppression deliberately
-- deferred as an open policy question ("evaluated and deferred... if
-- practical/required"). The Phase 16B.2b-6i activation-readiness
-- authorisation explicitly revisits this and settles it: emergency state
-- and live suppression are now BOTH re-checked at the immediate-precall
-- boundary, through exactly ONE round trip, via this single new
-- function -- resolving the tension between "suppression should be
-- fresh at the last possible moment" and "do not add a second network
-- round trip that itself widens the risk window" by making one call do
-- both jobs server-side.
--
-- READ-ONLY, NOT A SERIALIZATION PRIMITIVE: unlike public.prepare_
-- execution_dispatch(), this function takes NO row lock of any kind --
-- no `FOR UPDATE`, no `FOR SHARE`, no `execution_control_lock`. It is
-- advisory, last-moment information for the application boundary,
-- exactly as close to the real provider call as the application layer
-- can get it -- it does NOT, and cannot, serialize against a concurrent
-- STOP the way public.prepare_execution_dispatch()'s own execution_
-- control_lock-protected check does; that genuine mutex-based
-- serialization already happened, moments earlier, inside preparation
-- itself. This function narrows the residual physical-world gap between
-- preparation and the provider call as far as a single read can, without
-- pretending to close it -- see checkpointThreeDispatchBoundary.ts's own
-- header for the honest statement of that permanent boundary.
--
-- WHY ONE FUNCTION, NOT TWO SEPARATE RPC CALLS FROM THE APPLICATION:
-- calling public.evaluate_execution_emergency_stop() and public.
-- evaluate_suppression_live() as two separate round trips from the
-- application layer would add real wall-clock latency between "last
-- verified clear" and "provider invoked" -- widening, not narrowing, the
-- exact window this checkpoint exists to minimise. Composing both checks
-- inside a single SECURITY DEFINER function collapses that to one round
-- trip while still genuinely re-evaluating both signals live, inside the
-- same transaction, at the same instant.
--
-- p_execution_authorization_id, NOT p_execution_intent_id: the
-- application boundary holds a `PreparedExecutionDispatchEnvelope`
-- (produced by public.prepare_execution_dispatch()), which carries
-- `executionAuthorizationId` -- not the underlying intent id directly.
-- This function derives `execution_intent_id` internally from the
-- authorization row, matching this chain's unbroken "derive, never
-- accept from the caller" discipline for every authority-adjacent value.
--
-- ORACLE-AVOIDANCE, RESTATED: a caller cannot distinguish "suppressed"
-- from "emergency stopped" from an authorization that no longer exists --
-- every non-'clear' outcome collapses to 'blocked', matching this
-- chain's dominant convention. Structural failures (missing/invalid
-- input, authorization or intent not found) return 'evaluation_failed'
-- instead, matching public.evaluate_suppression_live()'s own identical
-- vocabulary split for the identical reason.
--
-- NO NEW AUTHORITY, NO NEW MUTATION SURFACE: this function performs
-- exactly one read against public.execution_authorizations and delegates
-- to the two already-deployed, already-dormant read-only evaluators
-- (public.evaluate_suppression_live(), public.evaluate_execution_
-- emergency_stop()) -- it contains zero INSERT/UPDATE/DELETE statements
-- of any kind and does not itself decide or record anything. It does NOT
-- replace public.prepare_execution_dispatch()'s own revalidation, does
-- NOT consume or claim anything, and does NOT authorise a provider call
-- -- it only reports whether the two specific live-changeable facts this
-- chain has identified as needing last-moment freshness (suppression,
-- emergency state) still hold, at the instant of the call.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`, every
-- relation and function reference fully schema-qualified.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement, matching every
-- precedent function in this repository.
--
-- DORMANCY -- INCLUDING service_role, MATCHING THIS CHAIN'S SETTLED
-- POSTURE FOR EVERY CHECKPOINT #2/#3 PRIMITIVE: although this function
-- is read-only, it reveals live suppression/emergency signal, which this
-- phase treats as belonging to the same trusted execution boundary as
-- every mutating writer in this chain rather than as a general-purpose
-- public evaluator -- PUBLIC, anon, authenticated, AND service_role are
-- all explicitly revoked below. Only the owning role (`postgres`)
-- retains its ordinary implicit owner privilege, untouched. A future,
-- separately-authorised activation phase grants EXECUTE only to the
-- exact trusted backend identity this chain's other writers will also be
-- activated for.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6i authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.evaluate_execution_precall_readiness(
  p_execution_authorization_id bigint
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_execution_intent_id bigint;
  v_suppression_result text;
  v_emergency_result text;
begin
  if p_execution_authorization_id is null or p_execution_authorization_id <= 0 then
    return 'evaluation_failed';
  end if;

  -- Plain read, no lock -- this function is advisory, not a
  -- serialization primitive. See module header.
  select ea.execution_intent_id into v_execution_intent_id
  from public.execution_authorizations ea
  where ea.id = p_execution_authorization_id;

  if v_execution_intent_id is null then
    return 'evaluation_failed';
  end if;

  v_suppression_result := public.evaluate_suppression_live(v_execution_intent_id);

  if v_suppression_result is distinct from 'clear' then
    return 'blocked';
  end if;

  v_emergency_result := public.evaluate_execution_emergency_stop();

  if v_emergency_result is distinct from 'clear' then
    return 'blocked';
  end if;

  return 'clear';
end;
$$;

revoke all on function public.evaluate_execution_precall_readiness(
  bigint
) from public;

revoke execute on function public.evaluate_execution_precall_readiness(
  bigint
) from anon;

revoke execute on function public.evaluate_execution_precall_readiness(
  bigint
) from authenticated;

revoke execute on function public.evaluate_execution_precall_readiness(
  bigint
) from service_role;

-- ROLLBACK (documented, not executed): this function is dormant --
-- unreachable by any role, including service_role, and has never been
-- called -- nothing could depend on it.
-- drop function if exists public.evaluate_execution_precall_readiness(bigint);
