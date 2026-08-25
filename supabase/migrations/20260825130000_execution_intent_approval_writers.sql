-- Factory 041 Phase 16B.2b-6f (Part A): trusted per-action approval
-- writers.
--
-- WHY THIS EXISTS: public.execution_intent_approvals (20260825110000...
-- sql) exists as a locked-down, append-only evidence table with no
-- writer -- only a privileged direct-connection actor could insert a
-- row. This migration builds exactly the three narrowly-scoped writers
-- that record a real human decision against a specific execution
-- intent: public.approve_execution_intent(), public.reject_execution_
-- intent(), and public.revoke_execution_intent(). All three are created
-- fully DORMANT -- see "DORMANCY" below.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY these three
-- functions and their REVOKE statements. It does NOT modify public.
-- execution_intent_approvals, public.execution_intents, public.
-- execution_authorisers, public.execution_authorizations, or any other
-- existing migration. It does NOT insert an approval row, does NOT
-- create an execution authorization, does NOT create or modify any
-- capability grant, does NOT change emergency state, and does NOT wire
-- any provider-execution path.
--
-- FUNCTION SIGNATURES -- SEPARATE, SINGLE-PURPOSE, MATCHING THE STOP/
-- RELEASE AND GRANT/REVOKE PRECEDENT: three purpose-built functions
-- rather than one generic decision-parameterised function, for the
-- identical reasoning already established for public.stop_execution()/
-- release_execution() (Phase 16B.2b-5r) and public.grant_execution_
-- controller()/revoke_execution_controller() (Phase 16B.2b-5z-A): a
-- caller-supplied "which decision" parameter would be exactly the kind
-- of caller-influenced control-flow through a security gate this chain
-- has avoided everywhere else. None of the three accepts actor_id,
-- decision, execution_authoriser_grant_id, capability, created_at, or an
-- approval-row id -- every one of those is either hardcoded per-function
-- or derived internally, never caller-supplied.
--
-- AUTHORITY -- execution_authoriser ONLY, RE-VERIFIED VIA ROW LOCK: per
-- the Phase 16B.2b-6b/6c settled policy, approval authority comes ONLY
-- from an active, unrevoked execution_authoriser capability grant --
-- never admin, never execution_controller, and never inferred from one
-- to the other. Each function captures auth.uid() exactly once, performs
-- a cheap pre-lock EXISTS-style fast-fail check, and then -- after
-- acquiring the target execution_intents row lock (see "LOCK ORDERING"
-- below) -- re-resolves and locks the exact active grant row via `FOR
-- SHARE`, matching the identical "re-verify at the point closest to the
-- irreversible action" discipline already established for public.
-- stop_execution()/release_execution()/grant_execution_controller()/
-- revoke_execution_controller().
--
-- LOCK ORDERING -- execution_intents ROW FIRST, THEN THE GRANT ROW, PER
-- THE PHASE 16B.2b-6f PART B DEADLOCK REVIEW: (1) `select id from
-- public.execution_intents where id = p_execution_intent_id for
-- update`; (2) `select id from public.execution_authorisers where
-- user_id = <actor> and capability = 'execution_authoriser' and
-- revoked_at is null for share`; (3) read the latest approval decision
-- for that intent; (4) INSERT one new decision row if the deterministic
-- transition rule requires it. This uses the target execution_intents
-- row itself as the per-intent serialization primitive -- per the
-- Phase 16B.2b-6b settled policy point 11 -- rather than any new,
-- separate mutex table. public.execution_control_lock is not referenced
-- anywhere in this migration: it remains reserved exclusively for
-- emergency STOP/RELEASE serialization (Phase 16B.2b-5p's own explicit
-- scope).
--
-- DEADLOCK ANALYSIS, RESOLVED, NO CONFLICT FOUND: cross-checked against
-- every other writer's own lock ordering in this chain. public.stop_
-- execution()/release_execution() lock (1) execution_control_lock, (2)
-- a public.user_roles row, and (3, RELEASE only) a public.execution_
-- authorisers row with capability = 'execution_controller' -- never
-- public.execution_intents, so no shared lock target with these
-- approval writers exists on that table at all. public.grant_execution_
-- controller()/revoke_execution_controller() lock only a public.
-- user_roles row and mutate a public.execution_authorisers row with
-- capability = 'execution_controller'. Critically, ANY public.
-- execution_authorisers row these approval writers lock always has
-- capability = 'execution_authoriser' -- a structurally DIFFERENT row
-- from the capability = 'execution_controller' rows STOP/RELEASE/grant/
-- revoke ever touch, even for the identical user_id (the two capability
-- values can never occupy the same row, per that table's own closed
-- vocabulary and per-capability partial unique index). PostgreSQL's
-- row-level locking means two transactions locking DIFFERENT rows in
-- the same table never contend, regardless of statement order. No
-- circular-wait condition exists anywhere across these writer classes.
--
-- SELF-SERIALIZING BY CONSTRUCTION -- NO EXCEPTION HANDLING NEEDED,
-- UNLIKE grant_execution_controller(): public.execution_intent_
-- approvals deliberately carries no unique constraint of any kind (per
-- its own Phase 16B.2b-6c authorisation, "historical multiple decisions"
-- are permitted) -- there is no unique index for a concurrent INSERT to
-- collide with in the first place. More fundamentally, because the
-- target execution_intents row lock (step 1 above) is acquired BEFORE
-- reading the latest approval state and held through the eventual
-- INSERT, two concurrent calls against the SAME intent are already
-- fully serialized by that lock alone: the second caller only proceeds
-- once the first has committed, and will then read the FIRST caller's
-- freshly-inserted decision as "latest" before computing its own
-- outcome -- naturally producing a correct 'no_change' where
-- appropriate, with no race window and no exception handler required.
-- None of the three functions below contains an EXCEPTION block of any
-- kind.
--
-- STATE TRANSITIONS, PER THE PHASE 16B.2b-6f AUTHORISATION, IMPLEMENTED
-- EXACTLY AS SPECIFIED (no repository precedent suggested a different
-- rule, so none of these three tables was revisited):
--   APPROVE: no prior decision -> approved; latest = approved ->
--     no_change; latest = rejected -> approved; latest = revoked ->
--     approved.
--   REJECT: no prior decision -> rejected; latest = rejected ->
--     no_change; latest = approved -> rejected; latest = revoked ->
--     rejected.
--   REVOKE: no prior decision -> no_change; latest = approved ->
--     revoked; latest = rejected -> no_change; latest = revoked ->
--     no_change.
-- In every "insert allowed" case, the new row's decision is the literal
-- value fixed by that specific function -- never a caller parameter.
--
-- INPUT CONTRACT: p_reason is OPTIONAL on all three functions (nullable,
-- default null) -- a deliberate divergence from public.stop_execution()/
-- release_execution()'s own mandatory-reason contract, per the Phase
-- 16B.2b-6f authorisation's explicit "null allowed" instruction for
-- these three writers specifically. If supplied, a blank/whitespace-only
-- (post-btrim) value is rejected as 'blocked' rather than silently
-- normalised to null, matching this chain's "reject rather than
-- silently normalise" discipline; bound of 500 characters (checked
-- against the raw value), matching public.stop_execution()/release_
-- execution()'s own established default. p_evidence_reference is
-- likewise optional; if supplied, blank-after-trim is rejected, bounded
-- to 200 characters (raw value), matching public.execution_
-- authorizations_action_id_length_check/idempotency_key_length_check's
-- own established 200-character precedent exactly. Neither field's
-- stored value is trimmed or otherwise canonicalised before INSERT --
-- both are pure narrative fields, stored exactly as supplied, matching
-- every other reason/evidence_reference field in this chain.
--
-- PROVENANCE -- INTERNALLY DERIVED ONLY: actor_id is always the
-- captured auth.uid() value; execution_authoriser_grant_id is always the
-- id of the row locked at step 2 above -- neither is ever accepted as a
-- parameter. created_at uses the column's own DB default
-- (transaction_timestamp()). No UPDATE or DELETE against public.
-- execution_intent_approvals appears anywhere in this migration -- every
-- decision is a new, immutable row.
--
-- RETURN CONTRACT: approve_execution_intent() returns exactly one of
-- 'approved' | 'no_change' | 'blocked' | 'evaluation_failed'; reject_
-- execution_intent() returns 'rejected' | 'no_change' | 'blocked' |
-- 'evaluation_failed'; revoke_execution_intent() returns 'revoked' |
-- 'no_change' | 'blocked' | 'evaluation_failed' -- matching the identical
-- contract shape every writer in this chain uses. Every authority and
-- input-validation rejection collapses to the identical 'blocked',
-- undifferentiated, matching the oracle-avoidance discipline established
-- throughout. 'evaluation_failed' is retained in each vocabulary for
-- that same uniformity even though, per the self-serializing analysis
-- above, no concrete trigger case exists for any of these three
-- functions today.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''` on all
-- three functions, matching every SECURITY DEFINER function in this
-- repository. Every relation reference is fully schema-qualified
-- (public.execution_intents, public.execution_authorisers, public.
-- execution_intent_approvals, auth.uid()).
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement appears here,
-- matching every precedent function in this repository.
--
-- DORMANCY: PostgreSQL grants EXECUTE to PUBLIC by default on every new
-- function, and this project's own default privileges separately grant
-- `authenticated` EXECUTE on every new function owned by `postgres` --
-- both are explicitly revoked below, for ALL THREE functions, alongside
-- an explicit `anon` revoke. No role can call any of these three
-- functions after this migration is applied. `service_role` is not
-- referenced anywhere in this file, matching the unbroken convention
-- already established across every prior function migration in this
-- repository.
--
-- MUTATION SURFACE: the only INSERT of any kind in any of these three
-- function bodies targets public.execution_intent_approvals, and each
-- function contains at most one such INSERT, reached only after every
-- authority, input, lock, and transition-rule check has passed. None of
-- the three ever issues an UPDATE or DELETE against any table. public.
-- execution_intents and public.execution_authorisers are read-and-locked
-- only, never written to, by any of these three functions.
--
-- FAIL-CLOSED ON UNEXPECTED PRE-EXISTENCE: matching the established
-- posture for every security-significant function migration in this
-- specific sub-chain, no `IF NOT EXISTS`/`IF EXISTS` guard applies to
-- CREATE OR REPLACE FUNCTION statements in PostgreSQL in the first
-- place (there is no such clause for functions) -- CREATE OR REPLACE
-- FUNCTION is inherently idempotent by replacement, matching every
-- other function migration in this repository; this note exists only to
-- confirm that no additional guarding is needed or applicable here.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6f authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

-- ---------------------------------------------------------------------
-- A. public.approve_execution_intent()
-- ---------------------------------------------------------------------

create or replace function public.approve_execution_intent(
  p_execution_intent_id bigint,
  p_reason text default null,
  p_evidence_reference text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_has_grant boolean;
  v_locked_intent_id bigint;
  v_locked_grant_id bigint;
  v_latest_decision text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  -- Pre-lock fast-fail only -- NOT the authoritative proof.
  select exists (
    select 1 from public.execution_authorisers ea
    where ea.user_id = v_actor_id
      and ea.capability = 'execution_authoriser'
      and ea.revoked_at is null
  ) into v_has_grant;

  if not v_has_grant then
    return 'blocked';
  end if;

  if p_execution_intent_id is null or p_execution_intent_id <= 0 then
    return 'blocked';
  end if;

  if p_reason is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_reason)) = 0
       or pg_catalog.length(p_reason) > 500
     )
  then
    return 'blocked';
  end if;

  if p_evidence_reference is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_evidence_reference)) = 0
       or pg_catalog.length(p_evidence_reference) > 200
     )
  then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): the per-intent serialization primitive.
  select ei.id into v_locked_intent_id
  from public.execution_intents ei
  where ei.id = p_execution_intent_id
  for update;

  if v_locked_intent_id is null then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (2): the authoritative, row-locked
  -- re-verification of execution_authoriser authority.
  select ea.id into v_locked_grant_id
  from public.execution_authorisers ea
  where ea.user_id = v_actor_id
    and ea.capability = 'execution_authoriser'
    and ea.revoked_at is null
  for share;

  if v_locked_grant_id is null then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (3): latest decision, read only after both locks
  -- are held.
  select eia.decision into v_latest_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = p_execution_intent_id
  order by eia.id desc
  limit 1;

  if v_latest_decision = 'approved' then
    return 'no_change';
  end if;

  -- LOCK ORDERING step (4): exactly one new decision row. decision is
  -- always the literal 'approved' -- never a caller parameter.
  insert into public.execution_intent_approvals (
    execution_intent_id, decision, actor_id,
    execution_authoriser_grant_id, reason, evidence_reference
  ) values (
    p_execution_intent_id, 'approved', v_actor_id,
    v_locked_grant_id, p_reason, p_evidence_reference
  );

  return 'approved';
end;
$$;

revoke all on function public.approve_execution_intent(
  bigint, text, text
) from public;

revoke execute on function public.approve_execution_intent(
  bigint, text, text
) from anon;

revoke execute on function public.approve_execution_intent(
  bigint, text, text
) from authenticated;

-- ---------------------------------------------------------------------
-- B. public.reject_execution_intent()
-- ---------------------------------------------------------------------

create or replace function public.reject_execution_intent(
  p_execution_intent_id bigint,
  p_reason text default null,
  p_evidence_reference text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_has_grant boolean;
  v_locked_intent_id bigint;
  v_locked_grant_id bigint;
  v_latest_decision text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  select exists (
    select 1 from public.execution_authorisers ea
    where ea.user_id = v_actor_id
      and ea.capability = 'execution_authoriser'
      and ea.revoked_at is null
  ) into v_has_grant;

  if not v_has_grant then
    return 'blocked';
  end if;

  if p_execution_intent_id is null or p_execution_intent_id <= 0 then
    return 'blocked';
  end if;

  if p_reason is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_reason)) = 0
       or pg_catalog.length(p_reason) > 500
     )
  then
    return 'blocked';
  end if;

  if p_evidence_reference is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_evidence_reference)) = 0
       or pg_catalog.length(p_evidence_reference) > 200
     )
  then
    return 'blocked';
  end if;

  select ei.id into v_locked_intent_id
  from public.execution_intents ei
  where ei.id = p_execution_intent_id
  for update;

  if v_locked_intent_id is null then
    return 'blocked';
  end if;

  select ea.id into v_locked_grant_id
  from public.execution_authorisers ea
  where ea.user_id = v_actor_id
    and ea.capability = 'execution_authoriser'
    and ea.revoked_at is null
  for share;

  if v_locked_grant_id is null then
    return 'blocked';
  end if;

  select eia.decision into v_latest_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = p_execution_intent_id
  order by eia.id desc
  limit 1;

  if v_latest_decision = 'rejected' then
    return 'no_change';
  end if;

  insert into public.execution_intent_approvals (
    execution_intent_id, decision, actor_id,
    execution_authoriser_grant_id, reason, evidence_reference
  ) values (
    p_execution_intent_id, 'rejected', v_actor_id,
    v_locked_grant_id, p_reason, p_evidence_reference
  );

  return 'rejected';
end;
$$;

revoke all on function public.reject_execution_intent(
  bigint, text, text
) from public;

revoke execute on function public.reject_execution_intent(
  bigint, text, text
) from anon;

revoke execute on function public.reject_execution_intent(
  bigint, text, text
) from authenticated;

-- ---------------------------------------------------------------------
-- C. public.revoke_execution_intent()
-- ---------------------------------------------------------------------

create or replace function public.revoke_execution_intent(
  p_execution_intent_id bigint,
  p_reason text default null,
  p_evidence_reference text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_has_grant boolean;
  v_locked_intent_id bigint;
  v_locked_grant_id bigint;
  v_latest_decision text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  select exists (
    select 1 from public.execution_authorisers ea
    where ea.user_id = v_actor_id
      and ea.capability = 'execution_authoriser'
      and ea.revoked_at is null
  ) into v_has_grant;

  if not v_has_grant then
    return 'blocked';
  end if;

  if p_execution_intent_id is null or p_execution_intent_id <= 0 then
    return 'blocked';
  end if;

  if p_reason is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_reason)) = 0
       or pg_catalog.length(p_reason) > 500
     )
  then
    return 'blocked';
  end if;

  if p_evidence_reference is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_evidence_reference)) = 0
       or pg_catalog.length(p_evidence_reference) > 200
     )
  then
    return 'blocked';
  end if;

  select ei.id into v_locked_intent_id
  from public.execution_intents ei
  where ei.id = p_execution_intent_id
  for update;

  if v_locked_intent_id is null then
    return 'blocked';
  end if;

  select ea.id into v_locked_grant_id
  from public.execution_authorisers ea
  where ea.user_id = v_actor_id
    and ea.capability = 'execution_authoriser'
    and ea.revoked_at is null
  for share;

  if v_locked_grant_id is null then
    return 'blocked';
  end if;

  select eia.decision into v_latest_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = p_execution_intent_id
  order by eia.id desc
  limit 1;

  -- REVOKE only ever applies against a currently-approved latest
  -- decision -- see "STATE TRANSITIONS" above.
  if v_latest_decision is distinct from 'approved' then
    return 'no_change';
  end if;

  insert into public.execution_intent_approvals (
    execution_intent_id, decision, actor_id,
    execution_authoriser_grant_id, reason, evidence_reference
  ) values (
    p_execution_intent_id, 'revoked', v_actor_id,
    v_locked_grant_id, p_reason, p_evidence_reference
  );

  return 'revoked';
end;
$$;

revoke all on function public.revoke_execution_intent(
  bigint, text, text
) from public;

revoke execute on function public.revoke_execution_intent(
  bigint, text, text
) from anon;

revoke execute on function public.revoke_execution_intent(
  bigint, text, text
) from authenticated;

-- ROLLBACK (documented, not executed): all three functions are dormant
-- -- unreachable by any application role, and neither has ever been
-- called (no application role can call them, and this migration itself
-- performs no such call) -- nothing could depend on any of them.
-- drop function if exists public.revoke_execution_intent(bigint, text, text);
-- drop function if exists public.reject_execution_intent(bigint, text, text);
-- drop function if exists public.approve_execution_intent(bigint, text, text);
