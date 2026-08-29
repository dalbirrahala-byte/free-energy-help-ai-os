-- Factory 041 Phase 16B.2b-5z-A: execution-controller grant management.
--
-- WHY THIS EXISTS: the Phase 16B.2b-5y activation-readiness preflight
-- identified the missing minimum primitive on the safest path toward
-- eventual emergency-control activation: no trusted writer of any kind
-- exists anywhere in this schema to grant or revoke the 'execution_
-- controller' capability public.execution_authorisers has carried since
-- Phase 16B.2b-5o widened its capability vocabulary. This migration
-- builds exactly that pair -- public.grant_execution_controller() and
-- public.revoke_execution_controller() -- the naming and shape this
-- table's own original Phase 16B.2a header already anticipated ("A
-- dedicated grant_execution_authoriser()/revoke_execution_authoriser()
-- SECURITY DEFINER writer pair... is explicitly deferred to a future,
-- separately-approved phase," 20260821120000...sql:47-53), applied here
-- to the sibling capability. Both functions are created fully DORMANT --
-- see "DORMANCY" below -- creating this migration does not create any
-- execution_controller grant, and no application-reachable path can
-- invoke either function after this migration is applied.
--
-- PRECONSTRUCTION INSPECTION, RE-CONFIRMED IMMEDIATELY BEFORE WRITING
-- THIS FILE: public.execution_authorisers (20260821120000...sql, as
-- amended by 20260822190000...sql) has id (bigint identity, surrogate
-- PK), user_id (uuid not null, fk auth.users, on delete cascade),
-- capability (closed to 'execution_authoriser'/'execution_controller'),
-- granted_by (uuid not null, fk auth.users, on delete restrict),
-- granted_at (timestamptz not null default transaction_timestamp()),
-- revoked_at (nullable timestamptz), revoked_by (nullable uuid, fk
-- auth.users, on delete set null), and the partial unique index
-- execution_authorisers_active_grant_idx `(user_id, capability) where
-- revoked_at is null` -- guaranteeing at most one active grant per
-- (user, capability) pair, structurally, independent of any application
-- logic. No schema change is required for this migration -- the existing
-- table and index already fully support both writers exactly as
-- designed in the Phase 16B.2b-5z preflight.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY these two
-- functions and their REVOKE statements. It does NOT alter public.
-- execution_authorisers, its columns, constraints, or index. It does
-- NOT create an execution_controller grant row or any other data, does
-- NOT touch public.execution_authoriser rows in any way, does NOT
-- mutate public.user_roles, does NOT create a trigger, does NOT change
-- any RLS policy, does NOT change emergency state, does NOT create a
-- STOP/RELEASE event, and does NOT wire any kill-switch checkpoint. No
-- existing migration is altered.
--
-- FUNCTION SIGNATURES -- SEPARATE, SINGLE-PURPOSE, MATCHING THE STOP/
-- RELEASE PRECEDENT: `grant_execution_controller(p_user_id uuid)` and
-- `revoke_execution_controller(p_user_id uuid)` -- two purpose-built
-- functions rather than one generic capability-parameterised mutation
-- function, for the identical reasoning already established for public.
-- stop_execution()/release_execution() (Phase 16B.2b-5r): a caller-
-- supplied "which capability" or "which direction" parameter would be
-- exactly the kind of caller-influenced control-flow through a security
-- gate this chain has avoided everywhere else. p_user_id uuid matches
-- public.execution_authorisers.user_id's own column type exactly, and
-- is the only established identity type for this purpose anywhere in
-- this schema -- no raw PII (email, name) is accepted as an alternative
-- lookup key.
--
-- ADMIN AUTHORITY -- PRE-LOCK FAST-FAIL PLUS POST-LOCK ROW-LOCKED
-- RE-VERIFICATION, MATCHING THE PHASE 16B.2b-5r-R1 PRECEDENT EXACTLY:
-- both functions capture auth.uid() exactly once, check it non-null,
-- perform a cheap pre-lock EXISTS-style admin check as a fast-fail
-- optimisation only, and then -- immediately before the mutating
-- statement -- perform the authoritative check via a direct row-select
-- against public.user_roles' own primary key, `FOR SHARE`, exactly
-- mirroring public.stop_execution()/release_execution()'s own admin-row
-- locking pattern. This is applied here for the identical reason: an
-- ordinary SELECT does not itself keep the authority row from being
-- concurrently UPDATEd by some other transaction between the check and
-- the mutation, and `FOR SHARE` blocks exactly that without requiring
-- this function to modify the row itself. The marginal benefit here is
-- smaller than for release_execution() specifically (neither grant nor
-- revoke involves an equivalent lock-acquisition wait window), but
-- applying the identical discipline uniformly across every admin-gated
-- writer in this chain is a deliberate, low-cost consistency choice, not
-- an oversight.
--
-- TARGET EXISTENCE PRE-CHECKED, NEVER A RAW FK EXCEPTION: public.
-- execution_authorisers.user_id references auth.users(id) on delete
-- cascade -- an invalid, nonexistent p_user_id is explicitly checked for
-- existence in auth.users before grant_execution_controller() attempts
-- its INSERT, matching public.create_execution_intent()'s own identical
-- precedent for source_id (20260822110000...sql, "SOURCE_ID -- EXISTENCE
-- PRE-CHECKED, NEVER A RAW FK EXCEPTION"). Without this, a bad p_user_id
-- would instead surface as an uncaught foreign-key-violation exception --
-- a different, inconsistent failure mode from every other rejection in
-- this function. revoke_execution_controller() needs no equivalent
-- pre-check: its sole mutating statement is an UPDATE filtered by
-- `user_id = p_user_id`, which simply matches zero rows for a
-- nonexistent user -- an FK violation cannot occur on an UPDATE that
-- does not change user_id.
--
-- GRANT ALGORITHM -- PRE-CHECK FOR THE COMMON CASE, NARROW unique_
-- violation CATCH NESTED AROUND THE INSERT ONLY, PER THE PHASE
-- 16B.2b-5z-A-R1 ARCHITECT CORRECTION: grant_execution_controller()
-- first checks, via an ordinary SELECT, whether the target already
-- holds an active execution_controller grant -- if so, returns
-- 'no_change' without attempting any INSERT, handling the overwhelmingly
-- common case cleanly and cheaply. If two concurrent calls both pass
-- that check before either commits, the SECOND INSERT collides with
-- public.execution_authorisers_active_grant_idx and raises unique_
-- violation -- this migration catches EXACTLY that one, specific,
-- anticipated PostgreSQL error condition via a NESTED `begin ... insert
-- ... exception when unique_violation then return 'no_change'; end;`
-- sub-block wrapped around the INSERT alone -- an earlier draft attached
-- this handler to the function's own outer block instead, which the
-- Phase 16B.2b-5z-A-R1 architect correction identified as unacceptably
-- broad (it would have silently absorbed a unique_violation raised by
-- ANY statement in the function, not just the INSERT, even though no
-- other statement in this function can plausibly raise one today).
-- grant_execution_controller()'s own OUTER block carries no EXCEPTION
-- clause of any kind -- every other statement in this function (every
-- auth/admin/target/lock check preceding the INSERT) is left fully
-- unprotected, exactly as intended. This remains a deliberate, narrow,
-- architect-approved exception to this chain's own "no exception
-- handler" convention (restated most recently in public.evaluate_
-- suppression_live()'s and public.stop_execution()/release_execution()'s
-- own migration headers) -- not a broad WHEN OTHERS, and not a
-- general-purpose safety net. Every other PostgreSQL error this function
-- could encounter -- a foreign-key violation, a permission error, an
-- undefined-object error, a schema error, or any other unanticipated
-- failure, from this statement or any other -- is NOT caught anywhere in
-- this function and propagates normally, aborting the calling
-- transaction, exactly matching this chain's established DATABASE ERROR
-- BEHAVIOUR discipline for every failure mode except this one, single,
-- explicitly-approved exception.
--
-- REVOKE ALGORITHM -- ATOMIC UPDATE...WHERE...RETURNING, NO LOCK OR
-- EXCEPTION HANDLING NEEDED: revoke_execution_controller() performs
-- exactly one UPDATE, filtered by `user_id = p_user_id and capability =
-- 'execution_controller' and revoked_at is null`, setting `revoked_at =
-- transaction_timestamp(), revoked_by = <internally-derived actor>`,
-- with `RETURNING id`. This is the identical "exactly-once-claim" atomic
-- pattern already established elsewhere in this chain -- inherently
-- race-free against a concurrent revoke of the same grant (only one of
-- two concurrent UPDATEs can ever match a row still satisfying `revoked_
-- at is null`) and against a concurrent grant (an UPDATE that matches
-- zero rows because no active grant existed yet simply returns zero rows
-- updated, correctly resolving to 'no_change', with no ambiguous
-- intermediate state ever visible to either transaction). No additional
-- lock or exception handler is needed for this operation.
--
-- CONCURRENCY, RESTATED FROM THE PHASE 16B.2b-5z PREFLIGHT: double-grant
-- is handled by the pre-check plus the narrow unique_violation catch
-- above; double-revoke and grant-vs-revoke are both handled by the
-- atomic UPDATE...WHERE...RETURNING pattern alone, requiring no
-- additional locking. No dedicated new lock table is introduced, and
-- public.execution_control_lock -- which exists exclusively to serialize
-- emergency-state STOP/RELEASE mutations -- is not referenced anywhere
-- in this migration, per the Phase 16B.2b-5z authorisation's explicit
-- instruction that it must never silently become a generic application
-- mutex.
--
-- PROVENANCE -- INTERNALLY DERIVED ONLY, NEVER ACCEPTED FROM THE CALLER:
-- granted_by and revoked_by are always the captured auth.uid() value --
-- neither function has a parameter for either. granted_at/revoked_at are
-- always DB-derived (`transaction_timestamp()`/column DEFAULT), never
-- caller-supplied. capability is never a caller parameter on either
-- function -- grant_execution_controller() always inserts exactly
-- 'execution_controller'; revoke_execution_controller() always filters
-- on exactly 'execution_controller'. Neither function ever reads,
-- checks, writes, or infers anything about an 'execution_authoriser'
-- row -- the two capabilities remain completely independent, matching
-- the Phase 16B.2b-5o security invariant exactly. Revoked rows are never
-- deleted (UPDATE only) -- full history is preserved. A new grant issued
-- after a prior revoke always INSERTs a brand new row; no previously
-- revoked row is ever resurrected, updated, or reused.
--
-- RETURN CONTRACT: grant_execution_controller() returns exactly one of
-- 'granted' | 'no_change' | 'blocked' | 'evaluation_failed';
-- revoke_execution_controller() returns exactly one of 'revoked' |
-- 'no_change' | 'blocked' | 'evaluation_failed' -- matching public.
-- stop_execution()/release_execution()'s identical contract shape for
-- consistency across every Factory 041 writer. 'evaluation_failed' is
-- retained in both vocabularies for that same uniformity even though no
-- concrete trigger case exists for this specific writer pair (neither
-- function depends on any external lock table or calls any other
-- evaluated-state function) -- reserved purely as the same defensive
-- placeholder every other writer in this chain carries. It is never used
-- as an input-validation catch-all, which remains 'blocked' throughout,
-- undifferentiated: unauthenticated caller, non-admin caller, null
-- target, and nonexistent target (grant only) all return the identical
-- 'blocked' string, matching the oracle-avoidance discipline already
-- established for every prior writer in this chain.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''` on both
-- functions, matching every SECURITY DEFINER function in this
-- repository. Every relation reference is fully schema-qualified
-- (public.execution_authorisers, public.user_roles, auth.users,
-- auth.uid()).
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement appears here,
-- matching every precedent function in this repository -- ownership is
-- implicit (whoever applies this migration, `postgres`, under this
-- project's standard convention).
--
-- DORMANCY: PostgreSQL grants EXECUTE to PUBLIC by default on every new
-- function, and this project's own default privileges separately grant
-- `authenticated` EXECUTE on every new function owned by `postgres` --
-- both are explicitly revoked below, for BOTH functions, alongside an
-- explicit `anon` revoke. No role can call either function after this
-- migration is applied. The Phase 16B.2b-5z-A authorisation explicitly
-- confirms creating these FUNCTIONS is authorised while creating an
-- actual execution_controller GRANT ROW is not -- dormancy is what
-- structurally guarantees this migration cannot itself create one, in
-- addition to the fact that no INSERT/UPDATE statement of any kind
-- appears anywhere in this migration file outside the two function
-- bodies, neither of which is ever called by this migration. `service_
-- role` is not referenced anywhere in this file, matching the unbroken
-- convention already established across every prior function migration
-- in this repository.
--
-- MUTATION SURFACE: grant_execution_controller() contains exactly one
-- INSERT, targeting public.execution_authorisers only, reached only
-- after every authority, input, and existence check has passed and no
-- active grant already exists. revoke_execution_controller() contains
-- exactly one UPDATE, targeting the same table only, reached only after
-- every authority and input check has passed. Neither function ever
-- issues a DELETE against any table. public.user_roles is read-and-
-- locked only (FOR SHARE), never written to, by either function.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun. Every
-- REVOKE is safe to rerun (revoking an unheld privilege is a no-op in
-- PostgreSQL).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-5z-A authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

-- ---------------------------------------------------------------------
-- A. public.grant_execution_controller() -- admin-only, creates exactly
--    one new active execution_controller grant row.
-- ---------------------------------------------------------------------

create or replace function public.grant_execution_controller(
  p_user_id uuid
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_target_exists boolean;
  v_locked_admin_id uuid;
  v_has_active_grant boolean;
begin
  -- Captured exactly once. Never accepted from the caller.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  -- Pre-lock fast-fail only -- NOT the authoritative proof. See
  -- "ADMIN AUTHORITY" above.
  select exists (
    select 1 from public.user_roles ur
    where ur.id = v_actor_id and ur.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return 'blocked';
  end if;

  -- p_user_id: required.
  if p_user_id is null then
    return 'blocked';
  end if;

  -- Target existence pre-checked, never a raw FK exception -- see
  -- "TARGET EXISTENCE PRE-CHECKED" above.
  select exists (
    select 1 from auth.users au where au.id = p_user_id
  ) into v_target_exists;

  if not v_target_exists then
    return 'blocked';
  end if;

  -- The authoritative, row-locked re-verification of admin authority --
  -- a genuine direct row-select against user_roles' own primary key,
  -- FOR SHARE, never an EXISTS wrapper. See "ADMIN AUTHORITY" above.
  select ur.id into v_locked_admin_id
  from public.user_roles ur
  where ur.id = v_actor_id and ur.role = 'admin'
  for share;

  if v_locked_admin_id is null then
    return 'blocked';
  end if;

  -- Pre-check for the common case -- see "GRANT ALGORITHM" above.
  select exists (
    select 1 from public.execution_authorisers ea
    where ea.user_id = p_user_id
      and ea.capability = 'execution_controller'
      and ea.revoked_at is null
  ) into v_has_active_grant;

  if v_has_active_grant then
    return 'no_change';
  end if;

  -- Exactly one new grant row. capability is never a caller parameter --
  -- always the literal 'execution_controller'. granted_by is always the
  -- internally-derived actor -- never accepted from the caller. The
  -- unique_violation catch below is nested around this INSERT only --
  -- NOT attached to the outer function block -- per the Phase
  -- 16B.2b-5z-A-R1 architect correction: the outer block itself carries
  -- no EXCEPTION clause of any kind, so every other statement in this
  -- function (the auth/admin/target/lock checks above) is left fully
  -- unprotected, exactly as intended -- only this one, specific,
  -- anticipated PostgreSQL error condition arising from this one,
  -- specific statement is ever caught. No WHEN OTHERS anywhere in this
  -- function or this file: every other error (foreign-key violations,
  -- permission errors, undefined objects, schema errors, or any other
  -- unanticipated failure, from this statement or any other) propagates
  -- normally.
  begin
    insert into public.execution_authorisers (
      user_id, capability, granted_by
    ) values (
      p_user_id, 'execution_controller', v_actor_id
    );
  exception
    when unique_violation then
      return 'no_change';
  end;

  return 'granted';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` -- revoked here too, explicitly. `anon` is revoked
-- explicitly as well. All three revokes are required for this function
-- to be genuinely dormant; none replaces another.
revoke all on function public.grant_execution_controller(
  uuid
) from public;

revoke execute on function public.grant_execution_controller(
  uuid
) from anon;

revoke execute on function public.grant_execution_controller(
  uuid
) from authenticated;

-- ---------------------------------------------------------------------
-- B. public.revoke_execution_controller() -- admin-only, revokes exactly
--    one active execution_controller grant row.
-- ---------------------------------------------------------------------

create or replace function public.revoke_execution_controller(
  p_user_id uuid
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_is_admin boolean;
  v_locked_admin_id uuid;
  v_revoked_id bigint;
begin
  -- Captured exactly once. Never accepted from the caller.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  -- Pre-lock fast-fail only -- NOT the authoritative proof. See
  -- "ADMIN AUTHORITY" above.
  select exists (
    select 1 from public.user_roles ur
    where ur.id = v_actor_id and ur.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return 'blocked';
  end if;

  -- p_user_id: required.
  if p_user_id is null then
    return 'blocked';
  end if;

  -- The authoritative, row-locked re-verification of admin authority --
  -- see "ADMIN AUTHORITY" above. No target-existence pre-check is
  -- needed here -- see "TARGET EXISTENCE PRE-CHECKED" above.
  select ur.id into v_locked_admin_id
  from public.user_roles ur
  where ur.id = v_actor_id and ur.role = 'admin'
  for share;

  if v_locked_admin_id is null then
    return 'blocked';
  end if;

  -- Exactly one atomic UPDATE...WHERE...RETURNING -- see "REVOKE
  -- ALGORITHM" above. revoked_by is always the internally-derived
  -- actor -- never accepted from the caller. Never a DELETE.
  update public.execution_authorisers
  set revoked_at = transaction_timestamp(),
      revoked_by = v_actor_id
  where user_id = p_user_id
    and capability = 'execution_controller'
    and revoked_at is null
  returning id into v_revoked_id;

  if v_revoked_id is null then
    return 'no_change';
  end if;

  return 'revoked';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` -- revoked here too, explicitly. `anon` is revoked
-- explicitly as well. All three revokes are required for this function
-- to be genuinely dormant; none replaces another.
revoke all on function public.revoke_execution_controller(
  uuid
) from public;

revoke execute on function public.revoke_execution_controller(
  uuid
) from anon;

revoke execute on function public.revoke_execution_controller(
  uuid
) from authenticated;

-- ROLLBACK (documented, not executed): since both functions are dormant
-- -- unreachable by any application role, and neither has ever been
-- called (no application role can call them, and this migration itself
-- performs no such call) -- nothing could depend on either.
-- drop function if exists public.revoke_execution_controller(uuid);
-- drop function if exists public.grant_execution_controller(uuid);
