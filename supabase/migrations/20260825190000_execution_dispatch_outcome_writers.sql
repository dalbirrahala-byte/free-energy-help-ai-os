-- Factory 041 Phase 16B.2b-6h (Part L): dispatch-outcome finalisation
-- writers.
--
-- WHY THIS EXISTS: a prepared dispatch attempt (public.execution_
-- dispatch_attempts, 20260825170000...sql) records only that the
-- database authorised exactly one provider attempt -- it says nothing
-- about whether the provider was ever called or what happened. This
-- migration builds the three single-purpose writers that record a
-- provider's outcome once it is known, and -- for success only -- the
-- SAME transaction that finalises execution_performed = true. No
-- provider/network call appears anywhere in this migration; these
-- writers only PERSIST an outcome the application layer has already
-- obtained from a real provider call made outside any database
-- transaction.
--
-- THREE SEPARATE FUNCTIONS, NOT ONE WITH A DIRECTION PARAMETER: matching
-- this chain's unbroken discipline (stop_execution()/release_execution(),
-- approve_execution_intent()/reject_execution_intent()/revoke_execution_
-- intent()) -- a caller-supplied "which outcome" parameter would be
-- exactly the kind of caller-influenced control-flow through a security
-- gate this chain has avoided everywhere else. None of the three accepts
-- authorization fields, adapter identity, provider identity, timestamps,
-- or emergency state as parameters -- only the target attempt id and (for
-- success/failure/indeterminate respectively) the minimal provider-
-- supplied outcome data itself.
--
-- CRITICAL INVARIANT, RESTATED: execution_performed transitions false ->
-- true in exactly one place in this entire schema -- inside public.
-- complete_execution_dispatch_success() below, and ONLY there. Neither
-- complete_execution_dispatch_failure() nor complete_execution_dispatch_
-- indeterminate() ever references execution_performed, execution_
-- performed_at, or execution_reference in any way.
--
-- PROVIDER-SUPPLIED TEXT IS DATA, NEVER AUTHORITY: p_provider_reference
-- and p_failure_code originate from a real provider's response and are
-- bounded/validated exactly like every other free-text provenance field
-- in this chain (non-blank after trim if supplied, bounded length,
-- matching public.execution_dispatch_attempts' own CHECK bounds -- 200
-- chars for provider_reference, 100 for failure_code) -- never trimmed
-- before storage (a narrative/reference value, not a canonical lookup
-- key, matching public.stop_execution()'s own evidence_reference
-- treatment). Neither value ever influences which branch executes,
-- which row is targeted, or whether the outcome is treated as success --
-- that is determined exclusively by WHICH function the trusted caller
-- invokes. No API token, authorization header, credential, or secret of
-- any kind is ever an intended value for either column -- this migration
-- does not, and cannot, prevent a misbehaving caller from passing one,
-- but persists only what it is given, exactly as every prior reference
-- field in this chain already does.
--
-- SUCCESS PATH -- ONE ATOMIC TRANSACTION: complete_execution_dispatch_
-- success() locks the target public.execution_dispatch_attempts row `FOR
-- UPDATE`, requires its status be `'prepared'` or `'indeterminate'` (see
-- "RECONCILIATION" below) -- any other current status (already
-- `'succeeded'`, or `'failed'`) returns 'no_change' without mutating
-- anything -- then, in the SAME transaction, locks the referenced public.
-- execution_authorizations row `FOR UPDATE` and requires `execution_
-- performed = false` before setting it true, together with `execution_
-- performed_at` (DB-derived `transaction_timestamp()`, never caller-
-- supplied) and `execution_reference` (the validated p_provider_
-- reference). Both the attempt UPDATE and the authorization UPDATE
-- additionally repeat their own guard condition in their WHERE clause
-- (`status = ...`/`execution_performed = false`) as defence-in-depth,
-- structurally redundant with the row locks already held, matching the
-- identical belt-and-suspenders pattern already used in public.consume_
-- execution_authorization()'s own final UPDATE.
--
-- FAILURE PATH -- NO execution_performed MUTATION, EVER: complete_
-- execution_dispatch_failure() locks and updates ONLY the public.
-- execution_dispatch_attempts row (status = 'failed', failure_code,
-- completed_at) -- it never reads, locks, or writes public.execution_
-- authorizations at all. A definitive provider failure means the
-- provider did NOT perform the action -- there is nothing on the
-- authorization row for this writer to finalise.
--
-- INDETERMINATE PATH -- NO SECOND LOGICAM ATTEMPT, NO execution_performed
-- MUTATION: complete_execution_dispatch_indeterminate() is reachable
-- ONLY from `status = 'prepared'` (not from `'indeterminate'` itself, nor
-- from either terminal state) -- an attempt can become ambiguous only
-- once, from its initial prepared state; a network timeout on an
-- ALREADY-indeterminate attempt does not create a new logical event, it
-- simply leaves the row exactly as it is (returns 'no_change'). This
-- writer likewise never touches public.execution_authorizations.
--
-- RECONCILIATION -- HOW AN INDETERMINATE OUTCOME IS LATER RESOLVED, PER
-- THE PHASE 16B.2b-6h PART L INSTRUCTION TO DETERMINE THIS WITHOUT
-- BUILDING PROVIDER-SPECIFIC RECONCILIATION LOGIC: complete_execution_
-- dispatch_success() and complete_execution_dispatch_failure() both
-- accept `'indeterminate'` as a valid PRIOR status, alongside `'prepared'`
-- -- this is the entire reconciliation mechanism this phase builds. A
-- future, separately-authorised reconciliation process that queries the
-- provider out-of-band ("did that call actually happen?") calls the
-- SAME two writers again, on the SAME attempt id, once it has obtained a
-- definitive answer -- no new schema, no new function, and no provider-
-- specific logic is needed for that later phase; this migration merely
-- ensures the door is not welded shut. complete_execution_dispatch_
-- indeterminate() itself remains reachable only from `'prepared'`,
-- exactly once, per the reasoning above.
--
-- AUTHORITY MODEL -- IDENTICAL TO CONSUMPTION AND PREPARATION: no auth.
-- uid() capture, no human capability requirement -- a machine execution-
-- boundary action, the trusted backend/service worker that just made (or
-- learned the outcome of) the actual provider call. DEPLOYED STATE:
-- fully dormant, including service_role -- see "DORMANCY" below.
--
-- LOCK ORDERING -- AVOIDS execution_control_lock ENTIRELY, PER THE PHASE
-- 16B.2b-6h PART N INSTRUCTION ("Outcome finalization should avoid
-- execution_control_lock unless necessary"): none of these three
-- functions reads or reasons about emergency state at all -- by the time
-- an outcome is being finalised, the provider call has already
-- happened (or definitively not happened); STOP cannot retroactively
-- undo a real-world event, so re-checking the kill-switch here would
-- protect nothing. Each function's own lock order is: (1) the target
-- public.execution_dispatch_attempts row, `FOR UPDATE`; (2) -- success
-- only -- the referenced public.execution_authorizations row, `FOR
-- UPDATE`. public.execution_dispatch_attempts is a brand-new table no
-- other writer in this chain ever locks, so step (1) introduces no
-- cross-writer ordering risk. Step (2)'s target row was already locked
-- and released by the ORIGINAL, already-committed public.prepare_
-- execution_dispatch() call that created this exact attempt row -- by
-- the time any outcome-finalisation call can run, that preparation
-- transaction has necessarily already committed (a dispatch-attempt row
-- cannot be visible to, or reachable by id from, any other transaction
-- until its creating INSERT has committed), so there is no possibility
-- of this function's own execution_authorizations lock colliding with a
-- STILL-OPEN preparation transaction for the SAME row. No cycle exists
-- against public.prepare_execution_dispatch(), public.consume_execution_
-- authorization(), public.create_execution_authorization(), the approval
-- writers, stop_execution()/release_execution(), or grant/revoke_
-- execution_controller() -- none of those functions ever locks or waits
-- on public.execution_dispatch_attempts.
--
-- execution_performed EXACTLY-ONCE, PROVEN: the authorization row is
-- locked `FOR UPDATE` before its own `execution_performed = false` guard
-- is checked, and the eventual UPDATE repeats that same guard in its
-- WHERE clause. A concurrent second call to complete_execution_dispatch_
-- success() for the SAME attempt blocks on the SAME dispatch_attempts row
-- lock (step 1) until the first transaction commits or aborts, then
-- re-observes the post-conflict `status` (no longer `'prepared'`/
-- `'indeterminate'`) and returns 'no_change' before ever reaching the
-- authorization row at all -- the false -> true transition can happen at
-- most once, structurally, not merely by convention.
--
-- NO WHEN OTHERS ANYWHERE: none of these three functions contains an
-- exception handler of any kind -- there is no unique constraint any of
-- their UPDATE statements could ever collide with (unlike public.
-- prepare_execution_dispatch()'s INSERT). Every unanticipated PostgreSQL
-- error propagates normally and aborts the calling transaction.
--
-- RETURN CONTRACT: each function returns exactly one of 'succeeded'/
-- 'failed'/'indeterminate' (its own named outcome) | 'no_change' |
-- 'blocked' | 'evaluation_failed', matching this chain's established
-- four-shape return contract. 'blocked' covers structural/input
-- rejection (missing attempt, malformed reference/code); 'no_change'
-- covers "already in a state this call cannot advance from";
-- 'evaluation_failed' is retained for defensive-placeholder consistency
-- with every other writer in this chain, even though no concrete trigger
-- case exists for these three specific functions (none depends on any
-- external lock table or calls any evaluated-state function).
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY the three
-- functions below and their REVOKE statements. It does NOT modify public.
-- execution_dispatch_attempts, public.execution_authorizations, public.
-- execution_provider_adapters, or any other existing migration. It does
-- NOT call public.prepare_execution_dispatch(), any provider/network
-- primitive (none exists anywhere in this repository), stop_execution(),
-- or release_execution().
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`, every
-- security-relevant built-in explicitly pg_catalog-qualified, every
-- relation reference fully schema-qualified.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement, matching every
-- precedent function in this repository.
--
-- DORMANCY -- INCLUDING service_role, MATCHING THE SETTLED CONSUMPTION/
-- PREPARATION-WRITER PRECEDENT: all three functions are mutating writers
-- whose intended future caller is service-role-equivalent backend code.
-- PUBLIC, anon, authenticated, AND service_role are all explicitly
-- revoked below, for all three functions. Only the owning role
-- (`postgres`) retains its ordinary implicit owner privilege, untouched.
-- Future activation separately grants only the exact signature(s)
-- actually needed.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6h authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

-- ---------------------------------------------------------------------
-- A. public.complete_execution_dispatch_success() -- the ONLY place
--    execution_performed ever transitions false -> true.
-- ---------------------------------------------------------------------

create or replace function public.complete_execution_dispatch_success(
  p_execution_dispatch_attempt_id bigint,
  p_provider_reference text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_locked_attempt_id bigint;
  v_attempt_status text;
  v_execution_authorization_id bigint;
  v_locked_authorization_id bigint;
  v_execution_performed boolean;
begin
  if p_execution_dispatch_attempt_id is null or p_execution_dispatch_attempt_id <= 0 then
    return 'blocked';
  end if;

  if p_provider_reference is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_provider_reference)) = 0
       or pg_catalog.length(p_provider_reference) > 200
     )
  then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): the target dispatch-attempt row -- see
  -- "LOCK ORDERING" above.
  select eda.id, eda.status, eda.execution_authorization_id
    into v_locked_attempt_id, v_attempt_status, v_execution_authorization_id
  from public.execution_dispatch_attempts eda
  where eda.id = p_execution_dispatch_attempt_id
  for update;

  if v_locked_attempt_id is null then
    return 'blocked';
  end if;

  -- Reachable from 'prepared' or 'indeterminate' only -- see
  -- "RECONCILIATION" above.
  if v_attempt_status not in ('prepared', 'indeterminate') then
    return 'no_change';
  end if;

  -- LOCK ORDERING step (2): the referenced authorization row -- see
  -- "LOCK ORDERING" and "execution_performed EXACTLY-ONCE" above.
  select ea.id, ea.execution_performed
    into v_locked_authorization_id, v_execution_performed
  from public.execution_authorizations ea
  where ea.id = v_execution_authorization_id
  for update;

  if v_locked_authorization_id is null then
    return 'blocked';
  end if;

  if v_execution_performed then
    return 'no_change';
  end if;

  update public.execution_dispatch_attempts
  set status = 'succeeded',
      provider_reference = p_provider_reference,
      completed_at = pg_catalog.transaction_timestamp()
  where id = v_locked_attempt_id
    and status in ('prepared', 'indeterminate');

  -- The ONLY statement anywhere in this schema that may set
  -- execution_performed = true. Guard repeated in the WHERE clause as
  -- defence-in-depth, structurally redundant with the row lock already
  -- held.
  update public.execution_authorizations
  set execution_performed = true,
      execution_performed_at = pg_catalog.transaction_timestamp(),
      execution_reference = p_provider_reference
  where id = v_locked_authorization_id
    and execution_performed = false;

  return 'succeeded';
end;
$$;

revoke all on function public.complete_execution_dispatch_success(
  bigint, text
) from public;

revoke execute on function public.complete_execution_dispatch_success(
  bigint, text
) from anon;

revoke execute on function public.complete_execution_dispatch_success(
  bigint, text
) from authenticated;

revoke execute on function public.complete_execution_dispatch_success(
  bigint, text
) from service_role;

-- ---------------------------------------------------------------------
-- B. public.complete_execution_dispatch_failure() -- never touches
--    execution_performed.
-- ---------------------------------------------------------------------

create or replace function public.complete_execution_dispatch_failure(
  p_execution_dispatch_attempt_id bigint,
  p_failure_code text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_locked_attempt_id bigint;
  v_attempt_status text;
begin
  if p_execution_dispatch_attempt_id is null or p_execution_dispatch_attempt_id <= 0 then
    return 'blocked';
  end if;

  if p_failure_code is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_failure_code)) = 0
       or pg_catalog.length(p_failure_code) > 100
     )
  then
    return 'blocked';
  end if;

  select eda.id, eda.status
    into v_locked_attempt_id, v_attempt_status
  from public.execution_dispatch_attempts eda
  where eda.id = p_execution_dispatch_attempt_id
  for update;

  if v_locked_attempt_id is null then
    return 'blocked';
  end if;

  -- Reachable from 'prepared' or 'indeterminate' only -- see
  -- "RECONCILIATION" above.
  if v_attempt_status not in ('prepared', 'indeterminate') then
    return 'no_change';
  end if;

  update public.execution_dispatch_attempts
  set status = 'failed',
      failure_code = p_failure_code,
      completed_at = pg_catalog.transaction_timestamp()
  where id = v_locked_attempt_id
    and status in ('prepared', 'indeterminate');

  return 'failed';
end;
$$;

revoke all on function public.complete_execution_dispatch_failure(
  bigint, text
) from public;

revoke execute on function public.complete_execution_dispatch_failure(
  bigint, text
) from anon;

revoke execute on function public.complete_execution_dispatch_failure(
  bigint, text
) from authenticated;

revoke execute on function public.complete_execution_dispatch_failure(
  bigint, text
) from service_role;

-- ---------------------------------------------------------------------
-- C. public.complete_execution_dispatch_indeterminate() -- reachable
--    only from 'prepared', never touches execution_performed, never
--    creates a second logical attempt.
-- ---------------------------------------------------------------------

create or replace function public.complete_execution_dispatch_indeterminate(
  p_execution_dispatch_attempt_id bigint,
  p_failure_code text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_locked_attempt_id bigint;
  v_attempt_status text;
begin
  if p_execution_dispatch_attempt_id is null or p_execution_dispatch_attempt_id <= 0 then
    return 'blocked';
  end if;

  if p_failure_code is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_failure_code)) = 0
       or pg_catalog.length(p_failure_code) > 100
     )
  then
    return 'blocked';
  end if;

  select eda.id, eda.status
    into v_locked_attempt_id, v_attempt_status
  from public.execution_dispatch_attempts eda
  where eda.id = p_execution_dispatch_attempt_id
  for update;

  if v_locked_attempt_id is null then
    return 'blocked';
  end if;

  -- Reachable from 'prepared' ONLY -- an attempt becomes ambiguous at
  -- most once; a repeat timeout on an already-indeterminate attempt is a
  -- no-op, never a second logical event -- see "INDETERMINATE PATH"
  -- above.
  if v_attempt_status <> 'prepared' then
    return 'no_change';
  end if;

  update public.execution_dispatch_attempts
  set status = 'indeterminate',
      failure_code = p_failure_code,
      completed_at = pg_catalog.transaction_timestamp()
  where id = v_locked_attempt_id
    and status = 'prepared';

  return 'indeterminate';
end;
$$;

revoke all on function public.complete_execution_dispatch_indeterminate(
  bigint, text
) from public;

revoke execute on function public.complete_execution_dispatch_indeterminate(
  bigint, text
) from anon;

revoke execute on function public.complete_execution_dispatch_indeterminate(
  bigint, text
) from authenticated;

revoke execute on function public.complete_execution_dispatch_indeterminate(
  bigint, text
) from service_role;

-- ROLLBACK (documented, not executed): all three functions are dormant
-- -- unreachable by any role, including service_role, and none has ever
-- been called -- nothing could depend on any of them.
-- drop function if exists public.complete_execution_dispatch_indeterminate(bigint, text);
-- drop function if exists public.complete_execution_dispatch_failure(bigint, text);
-- drop function if exists public.complete_execution_dispatch_success(bigint, text);
