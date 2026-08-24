-- Factory 041 Phase 16B.2b-5r: trusted emergency stop/release writers.
--
-- WHY THIS EXISTS: every prerequisite this pair of writers depends on is
-- now in place -- public.execution_control_events (append-only history,
-- Phase 16B.2b-5m/5m-R1), public.execution_control_lock (single-row
-- mutex, Phase 16B.2b-5p/5p-R1), public.execution_authorisers widened to
-- accept the 'execution_controller' capability (Phase 16B.2b-5o/5o-R1),
-- execution_control_events.controller_grant_id (Phase 16B.2b-5q/5q-R1),
-- and public.evaluate_execution_emergency_stop() (the read primitive,
-- Phase 16B.2b-5m). This migration builds the two SQL writers that
-- actually admit a STOP or RELEASE event, implementing the asymmetric
-- authority model, serialized mutation, no-op idempotency, and exact
-- actor/grant provenance the Phase 16B.2b-5n preflight settled and the
-- Lead Architect approved. Both functions are created fully DORMANT --
-- see "DORMANCY" below -- no STOP or RELEASE can actually occur through
-- any application-reachable path after this migration is applied.
--
-- PRECONSTRUCTION INSPECTION, FRESH, NOT FROM MEMORY -- ALL PREREQUISITES
-- CONFIRMED MATCHING, NO INCOMPATIBILITY FOUND:
--   1. public.execution_control_events (re-read from 20260822180000...sql
--      as amended by 20260822210000...sql) has exactly: id, created_at,
--      event_type ('STOP'/'RELEASE'), actor_id (uuid not null, fk auth.
--      users, on delete restrict), reason (nullable text), evidence_
--      reference (nullable text), controller_grant_id (nullable bigint,
--      fk public.execution_authorisers(id), on delete restrict).
--   2. public.execution_control_lock (re-read from 20260822200000...sql)
--      has exactly one column, id bigint generated always as identity
--      primary key, constrained check(id = 1), seeded with exactly one
--      row (id = 1) by its own migration's unconditional bootstrap
--      insert.
--   3. public.execution_authorisers (re-read from 20260821120000...sql
--      as amended by 20260822190000...sql) has id (bigint identity,
--      surrogate PK), user_id, capability (now closed to
--      'execution_authoriser'/'execution_controller'), granted_by,
--      granted_at, revoked_at, revoked_by, and the partial unique index
--      `(user_id, capability) where revoked_at is null` -- guaranteeing
--      AT MOST ONE active grant per (user, capability) pair, structurally.
--   4. Admin-role lookup pattern (public.user_roles, 20260805100000...sql):
--      `exists (select 1 from public.user_roles ur where ur.id =
--      auth.uid() and ur.role = 'admin')` -- the same shape already used
--      by that table's own RLS policy, adapted here to check `role =
--      'admin'` specifically (stricter than public.user_can_write()'s
--      `role <> 'read_only'`, since STOP/RELEASE authority is
--      deliberately narrower than ordinary records:write).
--   5. SECURITY DEFINER / search_path convention: every trusted writer in
--      this chain (create_execution_intent, create_execution_
--      authorization, derive_destination_commitment, verify_destination_
--      commitment, evaluate_suppression_live, evaluate_execution_
--      emergency_stop) uses `language plpgsql volatile security definer
--      set search_path to ''`, captures auth.uid() into a variable
--      exactly once, and fully qualifies every pg_catalog built-in and
--      public/auth schema reference. Followed identically below.
--   6. public.evaluate_execution_emergency_stop() (re-read from
--      20260822180000...sql) resolves current state by selecting the
--      highest-id row's event_type: zero rows or event_type = 'STOP' ->
--      'stopped'; event_type = 'RELEASE' -> 'clear'; anything else ->
--      'evaluation_failed'. Both writers below call this function
--      directly (itself SECURITY DEFINER, safe to call from within
--      another SECURITY DEFINER function's body, matching public.
--      create_execution_intent()'s own call to public.user_can_write())
--      rather than duplicating its logic inline.
--   7. Exception/oracle-handling convention: no writer anywhere in this
--      chain uses a broad `EXCEPTION WHEN OTHERS THEN ...` block --
--      every anticipated structural/authority/input failure returns a
--      generic rejection via ordinary control flow, and a genuine,
--      unanticipated PostgreSQL error is left to propagate and abort the
--      calling transaction (most recently and explicitly documented in
--      public.evaluate_suppression_live()'s own "DATABASE ERROR
--      BEHAVIOUR" section). Followed identically below -- neither
--      function contains an exception handler of any kind.
--   8. Current privileges: public.execution_control_events, public.
--      execution_control_lock, and public.execution_authorisers all have
--      RLS enabled with zero policies and explicit `revoke all ... from
--      anon/authenticated`. No GRANT of any kind exists anywhere for any
--      application role on any of these three tables. No prior writer in
--      this repository has ever had EXECUTE granted to `authenticated`
--      -- every single Factory 041 writer/primitive built to date
--      remains fully dormant (create_execution_intent, create_execution_
--      authorization, derive_destination_commitment, verify_destination_
--      commitment, evaluate_suppression_live, evaluate_execution_
--      emergency_stop). No "controlled RPC pattern" admitting
--      authenticated callers through internal role checks exists
--      anywhere in this repository to mirror -- per the Phase
--      16B.2b-5r authorisation's own instruction to inspect first and
--      mirror the safest existing precedent, the safest and only
--      precedented posture is full dormancy, which this migration
--      follows without exception for both new functions.
--
-- All eight prerequisites matched the assumptions this phase's
-- authorisation was written against. No incompatibility was found;
-- construction proceeded.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY the two
-- functions below and their REVOKE statements. It does NOT modify
-- public.execution_control_events, public.execution_control_lock,
-- public.execution_authorisers, public.evaluate_execution_emergency_
-- stop(), or any other existing migration. It does NOT wire emergency
-- checking into authorization creation, atomic consumption, or
-- pre-dispatch. It does NOT create a bootstrap RELEASE event, does NOT
-- create any execution_controller (or execution_authoriser) grant row,
-- and does NOT perform an actual STOP or RELEASE -- both functions
-- remain fully dormant, unreachable by any application role, after this
-- migration is applied.
--
-- AUTHORITY MODEL, IMPLEMENTED EXACTLY AS APPROVED IN PHASE 16B.2b-5n:
-- stop_execution() requires an authenticated caller currently holding
-- the `admin` role -- nothing else. release_execution() requires an
-- authenticated caller currently holding the `admin` role AND an active,
-- unrevoked `execution_controller` grant for that exact caller. Neither
-- function accepts actor_id, controller_grant_id, event_type, or
-- capability as a parameter -- auth.uid() is captured internally exactly
-- once per function; the exact active grant row (if any) is resolved
-- internally via a lookup keyed on that same captured actor id, never
-- accepted or influenced by any caller-supplied value.
--
-- RE-VERIFICATION AFTER LOCK ACQUISITION -- CORRECTED TO GENUINE ROW
-- LOCKING PER THE PHASE 16B.2b-5r-R1 ARCHITECT CORRECTION: the first
-- draft of this migration re-ran the SAME `select exists (select 1 from
-- public.user_roles ur where ...)` shape both before AND after acquiring
-- the coordination lock, reasoning that the post-lock re-run was
-- sufficient re-verification. The architect correction identified a real
-- gap in that reasoning: an ordinary SELECT -- even one re-run after
-- another lock is held -- does not itself keep the AUTHORITY row (the
-- public.user_roles row, or the public.execution_authorisers grant row)
-- from being concurrently UPDATEd by some entirely separate transaction
-- (e.g. a future admin-role-management writer, or a future grant-
-- revocation writer) between that SELECT completing and this function's
-- own transaction eventually committing its INSERT. An EXISTS/aggregate
-- shape is additionally unsuitable for genuine row-locking even if a
-- locking clause were attached to it: PostgreSQL does not reliably
-- propagate a FOR SHARE/FOR UPDATE clause through an EXISTS subquery
-- wrapper in a way that is guaranteed to lock the qualifying underlying
-- row for the remainder of the enclosing transaction -- the safe,
-- unambiguous pattern is a direct row-select against the target table's
-- own primary key, with the locking clause attached directly to that
-- select.
--
-- Both public.user_roles (id uuid primary key references auth.users(id)
-- on delete cascade, role text not null ..., 20260805100000...sql) and
-- public.execution_authorisers (id bigint generated always as identity
-- primary key, ..., 20260821120000...sql) are ordinary tables with real,
-- directly-selectable primary keys -- neither requires any composite-key
-- workaround or aggregate masking to select and lock the exact
-- qualifying row directly. `FOR SHARE` is valid and sufficient for both:
-- it is the correct, minimal locking mode here, since this function does
-- not itself need to modify either row, only to prevent ANY OTHER
-- transaction from modifying (UPDATE) or removing (DELETE) it until this
-- transaction ends -- `FOR SHARE` blocks concurrent UPDATE/DELETE while
-- still permitting other concurrent readers, which is exactly the
-- property required. Both writers below therefore issue a direct `select
-- <pk-or-relevant-column> ... where <qualifying predicate> ... for
-- share` against the target row, capturing whatever value is returned
-- (or NULL if no row qualifies) -- the row is genuinely locked, for the
-- remainder of this transaction, if and only if it satisfies the
-- qualifying predicate at the moment the lock is actually acquired.
-- PostgreSQL's own row-locking semantics under READ COMMITTED further
-- guarantee that if a concurrent UPDATE to the target row is already
-- in-flight when this SELECT ... FOR SHARE attempts to lock it, this
-- statement waits for that other transaction to finish and then
-- re-evaluates its WHERE predicate against the POST-conflict row version
-- (PostgreSQL's "EvalPlanQual" behaviour) -- so even a genuinely raced
-- concurrent authority change is correctly reflected, never silently
-- missed.
--
-- release_execution() performs this authoritative row-locking check for
-- BOTH the admin-role row and the execution_controller grant row, always
-- after the coordination lock and always in that fixed order -- see
-- "LOCK ORDERING" below. stop_execution() performs it only for the
-- admin-role row (STOP requires no capability grant at all). The
-- inexpensive pre-lock EXISTS-style checks that remain in both functions
-- are retained ONLY as a fast-fail optimisation for the common case of
-- an unauthorised caller (avoiding an unnecessary wait on a potentially
-- contended coordination lock) -- they are explicitly NOT the
-- authoritative proof of authority; only the post-lock, row-locked
-- re-verification is.
--
-- LOCK ORDERING -- FIXED, IDENTICAL PREFIX FOR BOTH FUNCTIONS, PER THE
-- PHASE 16B.2b-5r-R1 REQUIREMENT: (1) public.execution_control_lock
-- (id = 1, FOR UPDATE); (2) the caller's qualifying public.user_roles row
-- (FOR SHARE); (3) -- RELEASE only -- the caller's qualifying public.
-- execution_authorisers grant row (FOR SHARE); (4) emergency-state
-- resolution (public.evaluate_execution_emergency_stop()); (5) the
-- event INSERT. stop_execution() and release_execution() share the
-- identical (1)-(2) prefix and never reverse it; release_execution()
-- extends that identical prefix with (3) rather than diverging from it.
-- This shared, fixed ordering is what prevents a lock-order-inversion
-- deadlock between concurrent stop_execution() and release_execution()
-- calls specifically. FUTURE WRITER COMPATIBILITY, FLAGGED EXPLICITLY:
-- any future writer that locks or modifies a public.user_roles row or a
-- public.execution_authorisers grant row (e.g. a future admin-role-
-- management writer, or a future execution_controller grant-revocation
-- writer) MUST be reviewed against this fixed ordering for compatible
-- locking/deadlock behaviour before it is built -- this migration does
-- not, and cannot, guarantee deadlock-freedom against a writer that does
-- not yet exist; it only guarantees internal consistency between
-- stop_execution() and release_execution() themselves.
--
-- SERIALIZATION: both functions execute `select id from public.
-- execution_control_lock where id = 1 for update` as their first
-- database interaction after authority pre-checks and input validation
-- pass, inside the same transaction as every subsequent read of current
-- emergency state and the eventual event INSERT. This blocks a second
-- concurrent stop_execution()/release_execution() call from proceeding
-- past that same statement until the first transaction commits or
-- aborts, guaranteeing the sequence of COMMITTED execution_control_
-- events rows reflects the order the trusted writer actually admitted
-- each mutation -- exactly the guarantee the Phase 16B.2b-5m-R1
-- correction established id-allocation order alone cannot provide, and
-- exactly what the Phase 16B.2b-5p/5p-R1 coordination-lock primitive was
-- built to close.
--
-- LOCK ABSENT OR AMBIGUOUS -- FAIL CLOSED: if `select id from public.
-- execution_control_lock where id = 1 for update` returns no row, both
-- functions return 'evaluation_failed' immediately -- a structural
-- precondition failure, never silently treated as "safe to proceed
-- unlocked." "Ambiguous" (more than one row matching id = 1) is
-- structurally impossible given public.execution_control_lock's own
-- singleton proof (PRIMARY KEY + CHECK(id = 1), Phase 16B.2b-5p-R1) --
-- no runtime handling for that case is needed or added, matching this
-- chain's consistent "structural precondition, not a live risk"
-- treatment of comparable already-enforced invariants elsewhere.
--
-- SOURCE OF TRUTH UNCHANGED: public.execution_control_events remains the
-- sole place emergency state is recorded and read from -- neither
-- function writes anything to public.execution_control_lock beyond
-- acquiring its row lock (no INSERT/UPDATE/DELETE against that table
-- appears anywhere in this migration), and neither function stores any
-- emergency-state meaning on the lock row itself.
--
-- STATE RESOLUTION -- REUSES public.evaluate_execution_emergency_stop()
-- VERBATIM, AFTER THE LOCK: both functions call `public.evaluate_
-- execution_emergency_stop()` as their state-resolution step, and only
-- AFTER the coordination lock is already held -- this reads current
-- state exactly as of the moment mutual exclusion was achieved, matching
-- the "resolve emergency state after lock acquisition" requirement
-- exactly. stop_execution() treats a resolved state of 'stopped' as a
-- no-op (returns 'no_change', inserts nothing) and 'clear' as the
-- state to act on; release_execution() treats 'clear' as a no-op and
-- 'stopped' as the state to act on. Either function receiving
-- 'evaluation_failed' from the read primitive itself (structurally
-- unreachable given execution_control_events' own event_type CHECK
-- constraint, but defensively handled) propagates that same
-- 'evaluation_failed' result rather than proceeding.
--
-- NO-OP IDEMPOTENCY, STATE-DERIVED, NO CALLER-SUPPLIED KEY: matching the
-- Phase 16B.2b-5n preflight's own recommendation exactly -- no
-- idempotency-key parameter exists on either function. Each writer
-- simply checks the freshly-resolved (post-lock) current state and
-- returns 'no_change' without inserting any row if the requested
-- transition would be a no-op (STOP while already stopped; RELEASE while
-- already clear). This avoids polluting the append-only history with
-- unbounded duplicate events from repeated operator retries, at zero
-- cost to correctness -- the coordination lock already guarantees this
-- check sees genuinely current state.
--
-- INPUT CONTRACT -- REJECT, NEVER SILENTLY NORMALISE, MATCHING THIS
-- CHAIN'S DOMINANT WRITER CONVENTION: p_reason is required -- a null or
-- blank/whitespace-only (post-btrim) value is rejected as 'blocked', not
-- silently defaulted or trimmed-and-accepted, mirroring public.
-- create_execution_intent()'s own "reject noncanonical input, never
-- silently rewrite it" discipline for action_id/requested_channel. A
-- bound of 500 characters (checked against the raw, untrimmed value) is
-- enforced -- the Phase 16B.2b-5n preflight's own suggested default,
-- since no more specific repository precedent for a free-text narrative
-- field of this kind was found. p_evidence_reference is optional
-- (nullable, default null); if supplied, a blank/whitespace-only value
-- is likewise rejected as 'blocked' rather than silently normalised to
-- null -- no exact repository precedent exists for this specific
-- optional-field shape, but this is the closest, most consistent
-- application of the same "reject rather than silently normalise"
-- philosophy already dominant throughout this chain. Its bound is 200
-- characters (checked against the raw value), matching public.
-- execution_authorizations_action_id_length_check/idempotency_key_
-- length_check's own established 200-character precedent exactly
-- (20260820100000...sql:176-178). Neither field's stored value is
-- trimmed or otherwise canonicalised before INSERT -- both are pure
-- narrative fields, not identity-bearing lookup keys, so they are stored
-- exactly as supplied, matching public.suppression_records.reason/
-- notes' own "just store what's given" treatment. No taxonomy, no
-- closed vocabulary, and no other business policy is introduced for
-- either field.
--
-- ORACLE / FAILURE CONTRACT -- EVERY AUTHORITY AND INPUT-VALIDATION
-- REJECTION COLLAPSES TO THE IDENTICAL 'blocked': unauthenticated
-- caller, authenticated-but-not-admin caller, missing or revoked
-- execution_controller grant (RELEASE only), and any malformed input
-- (null/blank/overlong reason or evidence_reference) all return the
-- same 'blocked' string -- a caller cannot distinguish which check
-- failed, matching the oracle-avoidance discipline already established
-- for every prior writer in this chain. 'evaluation_failed' is reserved
-- exclusively for the two structurally-defensive cases documented above
-- (lock row absent; the read primitive itself reporting an unreadable
-- state) -- never used as a catch-all for "something about the input was
-- wrong," which remains 'blocked' throughout. Neither function contains
-- an exception handler of any kind -- a genuine, unanticipated
-- PostgreSQL execution failure is left to propagate and abort the
-- calling transaction, exactly matching the "DATABASE ERROR BEHAVIOUR"
-- precedent already established in public.evaluate_suppression_live()'s
-- own migration header.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''` on both
-- functions, matching every SECURITY DEFINER function in this
-- repository. Every built-in call is explicitly pg_catalog-qualified
-- (pg_catalog.btrim, pg_catalog.length); every relation reference is
-- fully schema-qualified (public.execution_control_events, public.
-- execution_control_lock, public.execution_authorisers, public.
-- user_roles, public.evaluate_execution_emergency_stop(), auth.uid()).
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
-- migration is applied -- this is what structurally guarantees this
-- migration cannot perform an actual STOP or RELEASE, independent of
-- and in addition to the fact that no INSERT/UPDATE/DELETE statement of
-- any kind appears anywhere in this migration file itself. `service_
-- role` is not referenced anywhere in this file, matching the unbroken
-- convention already established across every prior function migration
-- in this repository.
--
-- MUTATION SURFACE: the only INSERT of any kind in either function body
-- targets public.execution_control_events, and each function contains
-- at most one such INSERT, reached only after every authority, input,
-- lock, and state-resolution check has passed and the requested
-- transition is not a no-op. Neither function ever issues an UPDATE or
-- DELETE against any table. public.execution_control_lock is read-and-
-- locked only, never written to. public.execution_authorisers and
-- public.user_roles are read-only lookups.
--
-- SAFE / IDEMPOTENT (AS MIGRATIONS, NOT TO BE CONFUSED WITH THE
-- WRITERS' OWN NO-OP-IDEMPOTENCY BEHAVIOUR DESCRIBED ABOVE): CREATE OR
-- REPLACE FUNCTION is safe to rerun. Every REVOKE is safe to rerun
-- (revoking an unheld privilege is a no-op in PostgreSQL).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-5r authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

-- ---------------------------------------------------------------------
-- A. public.stop_execution() -- admin-only, protective, broad authority.
-- ---------------------------------------------------------------------

create or replace function public.stop_execution(
  p_reason text,
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
  v_is_admin boolean;
  v_lock_id bigint;
  v_locked_admin_id uuid;
  v_current_state text;
begin
  -- Captured exactly once. Never accepted from the caller.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  -- Pre-lock fast-fail only -- NOT the authoritative proof. See
  -- "RE-VERIFICATION AFTER LOCK ACQUISITION" above.
  select exists (
    select 1 from public.user_roles ur
    where ur.id = v_actor_id and ur.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return 'blocked';
  end if;

  -- p_reason: required, non-blank once trimmed, bounded. Rejected, never
  -- silently normalised -- see "INPUT CONTRACT" above.
  if p_reason is null
     or pg_catalog.length(pg_catalog.btrim(p_reason)) = 0
     or pg_catalog.length(p_reason) > 500
  then
    return 'blocked';
  end if;

  -- p_evidence_reference: optional; if supplied, non-blank once trimmed,
  -- bounded.
  if p_evidence_reference is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_evidence_reference)) = 0
       or pg_catalog.length(p_evidence_reference) > 200
     )
  then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): coordination lock -- see "SERIALIZATION",
  -- "LOCK ABSENT OR AMBIGUOUS", and "LOCK ORDERING" above. Acquired
  -- before any authoritative authority row lock, any state read, and
  -- the eventual INSERT, inside this same transaction.
  select ecl.id into v_lock_id
  from public.execution_control_lock ecl
  where ecl.id = 1
  for update;

  if v_lock_id is null then
    return 'evaluation_failed';
  end if;

  -- LOCK ORDERING step (2): the authoritative, row-locked re-
  -- verification of admin authority -- a genuine direct row-select
  -- against user_roles' own primary key, FOR SHARE, never an EXISTS
  -- wrapper. See "RE-VERIFICATION AFTER LOCK ACQUISITION" above. This
  -- row remains locked (blocking any concurrent UPDATE/DELETE against
  -- it) for the remainder of this transaction.
  select ur.id into v_locked_admin_id
  from public.user_roles ur
  where ur.id = v_actor_id and ur.role = 'admin'
  for share;

  if v_locked_admin_id is null then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (4): state resolved only after both the
  -- coordination lock and the row-locked admin-authority re-
  -- verification -- see "STATE RESOLUTION" above.
  v_current_state := public.evaluate_execution_emergency_stop();

  if v_current_state = 'stopped' then
    return 'no_change';
  end if;

  if v_current_state <> 'clear' then
    return 'evaluation_failed';
  end if;

  -- LOCK ORDERING step (5): exactly one STOP event. controller_grant_id
  -- is always null for STOP -- see "AUTHORITY MODEL" above.
  insert into public.execution_control_events (
    event_type, actor_id, reason, evidence_reference, controller_grant_id
  ) values (
    'STOP', v_actor_id, p_reason, p_evidence_reference, null
  );

  return 'stopped';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` -- revoked here too, explicitly. `anon` is revoked
-- explicitly as well. All three revokes are required for this function
-- to be genuinely dormant; none replaces another.
revoke all on function public.stop_execution(
  text, text
) from public;

revoke execute on function public.stop_execution(
  text, text
) from anon;

revoke execute on function public.stop_execution(
  text, text
) from authenticated;

-- ---------------------------------------------------------------------
-- B. public.release_execution() -- admin AND active execution_controller
--    grant required, re-enables real-world execution.
-- ---------------------------------------------------------------------

create or replace function public.release_execution(
  p_reason text,
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
  v_is_admin boolean;
  v_grant_id bigint;
  v_lock_id bigint;
  v_locked_admin_id uuid;
  v_locked_grant_id bigint;
  v_current_state text;
begin
  -- Captured exactly once. Never accepted from the caller.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  -- Pre-lock fast-fail checks only -- NOT the authoritative proof. See
  -- "RE-VERIFICATION AFTER LOCK ACQUISITION" above.
  select exists (
    select 1 from public.user_roles ur
    where ur.id = v_actor_id and ur.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return 'blocked';
  end if;

  -- Pre-lock fail-fast: resolve the exact active, unrevoked
  -- execution_controller grant for this exact caller -- never accepted
  -- as a parameter. At most one such row can exist, per execution_
  -- authorisers_active_grant_idx.
  select ea.id into v_grant_id
  from public.execution_authorisers ea
  where ea.user_id = v_actor_id
    and ea.capability = 'execution_controller'
    and ea.revoked_at is null;

  if v_grant_id is null then
    return 'blocked';
  end if;

  -- p_reason: required, non-blank once trimmed, bounded.
  if p_reason is null
     or pg_catalog.length(pg_catalog.btrim(p_reason)) = 0
     or pg_catalog.length(p_reason) > 500
  then
    return 'blocked';
  end if;

  -- p_evidence_reference: optional; if supplied, non-blank once trimmed,
  -- bounded.
  if p_evidence_reference is not null
     and (
       pg_catalog.length(pg_catalog.btrim(p_evidence_reference)) = 0
       or pg_catalog.length(p_evidence_reference) > 200
     )
  then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): coordination lock -- see "SERIALIZATION",
  -- "LOCK ABSENT OR AMBIGUOUS", and "LOCK ORDERING" above.
  select ecl.id into v_lock_id
  from public.execution_control_lock ecl
  where ecl.id = 1
  for update;

  if v_lock_id is null then
    return 'evaluation_failed';
  end if;

  -- LOCK ORDERING step (2): the authoritative, row-locked re-
  -- verification of admin authority -- a genuine direct row-select
  -- against user_roles' own primary key, FOR SHARE, never an EXISTS
  -- wrapper. See "RE-VERIFICATION AFTER LOCK ACQUISITION" above.
  select ur.id into v_locked_admin_id
  from public.user_roles ur
  where ur.id = v_actor_id and ur.role = 'admin'
  for share;

  if v_locked_admin_id is null then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (3), RELEASE only: the authoritative, row-locked
  -- re-verification of the exact active execution_controller grant --
  -- a genuine direct row-select against execution_authorisers' own
  -- primary key, FOR SHARE. The captured id (v_locked_grant_id) is the
  -- SAME row whose active/unrevoked state was just locked -- this is
  -- the value that will be persisted into controller_grant_id below,
  -- never the earlier pre-lock v_grant_id. See "RE-VERIFICATION AFTER
  -- LOCK ACQUISITION" above.
  select ea.id into v_locked_grant_id
  from public.execution_authorisers ea
  where ea.user_id = v_actor_id
    and ea.capability = 'execution_controller'
    and ea.revoked_at is null
  for share;

  if v_locked_grant_id is null then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (4): state resolved only after the coordination
  -- lock and both row-locked authority re-verifications -- see "STATE
  -- RESOLUTION" above.
  v_current_state := public.evaluate_execution_emergency_stop();

  if v_current_state = 'clear' then
    return 'no_change';
  end if;

  if v_current_state <> 'stopped' then
    return 'evaluation_failed';
  end if;

  -- LOCK ORDERING step (5): exactly one RELEASE event.
  -- controller_grant_id is v_locked_grant_id -- the exact row-locked
  -- grant id captured at step (3) above, the same row whose
  -- active/unrevoked state was transactionally relied upon.
  insert into public.execution_control_events (
    event_type, actor_id, reason, evidence_reference, controller_grant_id
  ) values (
    'RELEASE', v_actor_id, p_reason, p_evidence_reference, v_locked_grant_id
  );

  return 'released';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` -- revoked here too, explicitly. `anon` is revoked
-- explicitly as well. All three revokes are required for this function
-- to be genuinely dormant; none replaces another.
revoke all on function public.release_execution(
  text, text
) from public;

revoke execute on function public.release_execution(
  text, text
) from anon;

revoke execute on function public.release_execution(
  text, text
) from authenticated;

-- ROLLBACK (documented, not executed): since both functions are dormant
-- -- unreachable by any application role, and neither has ever been
-- called (no application role can call them, and this migration itself
-- performs no such call) -- nothing could depend on either.
-- drop function if exists public.release_execution(text, text);
-- drop function if exists public.stop_execution(text, text);
