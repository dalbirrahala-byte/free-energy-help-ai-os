-- Factory 041 Phase 16B.2b-6g: atomic execution-authorization consumption
-- writer, plus kill-switch checkpoint #2.
--
-- WHY THIS EXISTS: Shape A (public.create_execution_authorization(bigint),
-- 20260825140000...sql) creates evidence that dispatch MAY occur -- it
-- never dispatches anything, and nothing anywhere in this repository ever
-- claims that evidence for exactly one downstream execution attempt. This
-- migration builds exactly that missing primitive: an atomic, single-
-- purpose writer that marks one specific, still-valid authorization as
-- claimed, enforcing "at most one dispatch attempt per authorization,"
-- fail-closed on expiry, staleness, or emergency stop. It does NOT
-- dispatch anything itself -- see "CONSUMPTION IS NOT EXECUTION" below.
-- It remains fully DORMANT after creation -- see "DORMANCY" below -- no
-- authorization can actually be consumed through any application-
-- reachable path after this migration is applied.
--
-- PART A -- LIVE CONSUMPTION-SCHEMA AUDIT, PERFORMED FRESH, NOT ASSUMED
-- FROM AN OLDER COMMENT: the Phase 16B.2b-6g authorisation explicitly
-- flagged that an earlier migration's comment
-- (20260822120000_execution_authorization_identity_linkage.sql:21) states
-- "CONSUMED_AT DELIBERATELY NOT ADDED" and warned not to assume the
-- column already exists on that basis. Live catalog introspection
-- (information_schema.columns, re-run immediately before writing this
-- file) shows that comment describes a decision made AT THAT PARTICULAR
-- PHASE only -- a LATER, separate migration
-- (20260822130000_execution_authorization_consumption_primitive.sql,
-- Phase 16B.2b-5c) already added exactly one column,
-- `consumed_at timestamptz`, nullable, no default, schema-only, and it is
-- confirmed live and deployed today. The live shape of every column this
-- writer touches was independently re-confirmed the same way, not
-- inferred from any migration file: `execution_authorizations.id`
-- (bigint, not null, PK), `authorization_status` (text, not null),
-- `expires_at` (timestamptz, nullable), `consumed_at` (timestamptz,
-- nullable, no default -- exactly the "unconsumed = NULL, consumed =
-- NOT NULL" invariant this phase's authorisation asked for), `execution_
-- intent_id` (bigint, not null), `contact_id` (bigint, nullable),
-- `requested_channel` (text, not null), `compliance_decision_id` (bigint,
-- not null), `execution_authoriser_grant_id` (bigint, not null),
-- `approval_decision_id` (bigint, not null), `execution_performed`
-- (boolean, not null, default false), `execution_performed_at`
-- (timestamptz, nullable), `execution_reference` (text, nullable). No
-- claim/lease-token column, no execution-claim-state column, and no
-- `consumed_by` column of any kind exist -- see "PART D" and "AUTHORITY
-- MODEL" below for why none of these gaps requires a new migration.
--
-- PART D -- SCHEMA DECISION: NO MIGRATION REQUIRED. The live audit above
-- shows public.execution_authorizations already carries the exact minimal
-- shape this phase's own preferred model asked for -- `consumed_at
-- timestamptz null`, unconsumed/consumed distinguished purely by NULL vs
-- NOT NULL, no default, DB-derived time only. No index exists on
-- consumed_at, and none is added here: the writer below looks up its
-- target exclusively by `id` (the existing primary key), never by
-- consumed_at, so no query justifies one. No `consumed_by`/`claimed_by`
-- column is added -- see "AUTHORITY MODEL" below: this writer's design
-- has no real repository-backed identity to persist there, so adding one
-- would be exactly the "speculative" schema Part D warns against. This
-- migration therefore contains ZERO DDL -- it creates only the one
-- function below and its REVOKE statements, per Part L's own instruction
-- to skip the prerequisite migration entirely when the live schema is
-- already sufficient, rather than manufacturing one for its own sake.
--
-- PART B -- CONSUMPTION IS NOT EXECUTION, RESTATED PRECISELY: a
-- successful call to this writer means exactly one fact -- "this specific,
-- still-valid execution authorization has been atomically claimed exactly
-- once for a downstream execution attempt." It does NOT mean the
-- provider action itself happened. This writer never sets `execution_
-- performed`, never sets `execution_performed_at`, never sets `execution_
-- reference`, never calls any telephony/email/SMS/WhatsApp provider, and
-- contains no network call of any kind -- those three columns are read
-- nowhere and written nowhere in this migration; they remain reserved for
-- a future, separately-authorised checkpoint #3 dispatch writer -- see
-- "PART K" below.
--
-- PART C -- AUTHORITY MODEL, A DELIBERATE JUDGMENT CALL, DOCUMENTED IN
-- FULL PER THIS PHASE'S OWN "resolve and document" instruction: every
-- mutating writer built in this chain to date (approve/reject/revoke_
-- execution_intent, create_execution_authorization, stop_execution,
-- release_execution, grant/revoke_execution_controller) captures auth.
-- uid() and requires it non-null, then re-verifies a specific human
-- capability (admin role, execution_authoriser grant, or execution_
-- controller grant) via a row-locked lookup. That pattern exists because
-- every one of those functions is reachable, once activated, by a human
-- acting through the application with a Supabase Auth session (anon/
-- authenticated + a JWT carrying a real `sub` claim auth.uid() can read).
-- This phase's own authorisation explicitly frames consumption
-- differently: "a machine execution-boundary action, not per-action human
-- approval" -- and a genuine backend/service caller (a queue worker or
-- dispatch process invoking Postgres directly with the service_role key,
-- never through a browser session) typically carries NO JWT `sub` claim
-- at all, meaning auth.uid() would read NULL for exactly the caller class
-- this function is meant to serve. Requiring auth.uid() IS NOT NULL, or
-- inventing a NEW execution_authorisers capability value (e.g. an
-- 'execution_consumer' capability) to gate this function, would both mean
-- manufacturing a NEW schema/authority concept this chain's own
-- architecture does not currently prove is needed -- exactly the
-- condition this phase's authorisation says to STOP for. Both were
-- considered and rejected in favour of the one design that IS already
-- fully derivable from existing, unbroken, repository-wide convention:
-- every single function migration in this chain, including this one's own
-- direct precedent (grant/revoke_execution_controller,
-- stop_execution/release_execution, create_execution_authorization,
-- evaluate_suppression_live, verify_destination_commitment, evaluate_
-- execution_emergency_stop), explicitly states "`service_role` is not
-- referenced anywhere in this file, matching the unbroken convention
-- already established" -- meaning `service_role` has ALWAYS implicitly
-- retained EXECUTE on every function in this schema, by deliberate,
-- repeatedly-reaffirmed choice, never once revoked anywhere. This
-- writer performs NO auth.uid() capture and NO internal capability
-- lookup of any kind -- no new human capability is introduced, and none
-- is required, because the INTENDED FUTURE caller is machine
-- service-boundary code (a trusted backend/dispatch worker), never a
-- browser-originated human session -- exactly the same reasoning that
-- already justifies the no-internal-actor-check posture on this chain's
-- own read-only primitives (evaluate_suppression_live, verify_
-- destination_commitment, evaluate_execution_emergency_stop), the
-- difference being those never mutate, while this writer does, which is
-- exactly why "machine execution boundary" rather than "human per-action
-- approval" is the correct classification Part C asked for.
--
-- DEPLOYED AUTHORITY GATE -- CORRECTED PER THE LEAD ARCHITECT'S POST-
-- CONSTRUCTION HARDENING REVIEW: the first draft of this migration
-- reasoned that leaving `service_role` unrevoked (matching every prior
-- function in this chain) was sufficient dormancy, since `service_role`
-- is never reachable from a browser session. The architect correction
-- identified a real gap in that reasoning: unlike every prior writer in
-- this chain, this function MUTATES state on the security-critical path
-- closest to actual execution, and this project's own infrastructure may
-- already have backend code holding `service_role` credentials for
-- entirely unrelated purposes -- leaving `service_role` EXECUTE unrevoked
-- would mean ANY such existing backend could invoke a live claim
-- immediately upon this migration's deployment, with no further action
-- required. Deployment and activation must be genuinely separate acts.
-- This migration therefore adds an explicit `revoke execute ... from
-- service_role` below, alongside the pre-existing PUBLIC/anon/
-- authenticated revokes -- see "DORMANCY" below. DEPLOYED STATE: fully
-- dormant, including `service_role` -- no role of any kind can invoke
-- this function once this migration is applied. ACTIVATION requires a
-- future, separately-authorised phase that explicitly `GRANT EXECUTE ...
-- TO service_role` on this exact signature, expected once (a) provider
-- dispatch/checkpoint #3 is ready, (b) the specific backend worker
-- identity/path is established, and (c) end-to-end execution tests are
-- separately approved -- not before. Owner (`postgres`) privileges are
-- untouched, matching PostgreSQL's own ownership semantics and every
-- prior migration in this repository -- this migration does not attempt
-- to revoke or redesign ownership.
--
-- PART F -- REVALIDATION CLASSIFICATION, GATE BY GATE, EACH JUSTIFIED
-- RATHER THAN ASSUMED:
--   A (immutable provenance, safe to trust from the authorization row,
--   NOT re-read):
--     - execution_intent_id, contact_id, requested_channel, action_id,
--       organisation_id: all copied onto the authorization row at Shape A
--       creation time from an immutable public.execution_intents row (no
--       UPDATE path exists anywhere against that table) -- re-reading
--       execution_intents for identity purposes would reproduce facts
--       that cannot have changed.
--     - execution_authoriser_grant_id / the creating grant's validity:
--       this fact describes whether the HUMAN who created the
--       authorization was authorised to do so AT THAT MOMENT -- already
--       verified, row-locked, at Shape A creation time. A later, unrelated
--       revocation of that human's general execution_authoriser
--       capability is an administrative fact about their standing, not an
--       affirmative retraction of THIS specific authorization -- the
--       mechanism that DOES retract a specific authorization's legitimacy
--       is approval revocation (classified B below), which this writer
--       DOES re-check. Treating a later, general capability revocation as
--       automatically invalidating every authorization that human ever
--       created would be a materially stronger cascading-revocation
--       policy this chain has never adopted anywhere (compare: revoke_
--       execution_controller() does not retroactively unwind past STOP/
--       RELEASE events) -- not decided here, and not silently assumed.
--     - compliance_decisions.decision / policy_version / subject-binding
--       on the SPECIFIC, already-pinned compliance_decision_id row: that
--       table is immutable and append-only (no UPDATE/DELETE path exists
--       anywhere against it, confirmed at its own foundation migration,
--       20260822140000...sql) -- once a specific row was verified
--       'eligible' with a matching policy_version and subject binding at
--       Shape A creation time, that SAME row can never change those
--       values. Re-checking them again here would re-verify a fact that
--       is structurally incapable of having changed.
--     - Contact/organisation continued existence: guaranteed by the
--       existing `on delete restrict` foreign keys already enforced by
--       the database itself, independent of any live check this writer
--       could perform.
--   B (must be re-read live at consumption, and IS re-read below):
--     - Authorization expiry (`expires_at > transaction_timestamp()`):
--       the entire reason a TTL exists -- explicitly required by Part E.
--     - Authorization not already consumed (`consumed_at IS NULL`): the
--       core exactly-once claim gate itself.
--     - Approval current state: unlike the creating grant's validity
--       above, revoke_execution_intent() (20260825130000...sql) exists
--       SPECIFICALLY so a human can retract approval for one exact intent
--       at any time, including after an authorization already exists for
--       it and before it is dispatched. If consumption never re-checked
--       this, revoke_execution_intent() would be silently powerless
--       against any authorization already created within its 15-minute
--       window -- a genuine safety gap, not a theoretical one. This
--       writer re-reads the latest public.execution_intent_approvals
--       decision for the authorization's own execution_intent_id and
--       requires it still be 'approved'.
--     - The pinned compliance_decision_id row's continued non-expiry
--       (`expires_at > transaction_timestamp()`, re-read on that SAME
--       immutable row): the only part of that row's meaning that changes
--       over time is whether the fixed `expires_at` value it was written
--       with remains in the future -- a genuine freshness fact, distinct
--       from the immutable decision/policy_version/binding fields
--       classified A above.
--     - Live destination commitment: public.contacts is an ordinary,
--       mutable table -- a contact's email/telephone can change between
--       authorization creation and consumption. Re-verified live via
--       public.verify_destination_commitment(), reusing the authorization
--       row's own contact_id/requested_channel and the pinned compliance
--       decision's own nonce/commitment -- never re-derived or
--       caller-supplied.
--     - Live suppression: explicitly required by Part F's own initial
--       expectation and by this chain's own established "suppression is
--       always independently, separately revalidated live, never trusted
--       from a cached compliance_decisions verdict" philosophy (Shape A's
--       own header, "LIVE SUPPRESSION"). Re-verified via public.evaluate_
--       suppression_live(), anchored to the same immutable execution_
--       intent_id.
--     - Emergency state: kill-switch checkpoint #2, see "PART G" below.
--   C (deferred to a future provider-dispatch checkpoint #3, NOT built
--   here): whether the provider adapter itself is approved/healthy;
--   whether execution_performed is still false at the moment of dispatch
--   (a second, later exactly-once gate on the SAME row, using the SAME
--   UPDATE...WHERE...RETURNING pattern this writer establishes); the
--   actual send/dial/deliver attempt and its outcome recording. See
--   "PART K" below.
--
-- PART G -- KILL-SWITCH CHECKPOINT #2 AND THE STOP-RACE, PROVEN, NOT
-- ASSUMED: Shape A could not safely use public.execution_control_lock
-- (reusing it there would make ordinary authorization creation contend
-- for the same mutex STOP/RELEASE depend on for responsiveness) --
-- consumption is different: it sits materially closer to an actual
-- execution attempt, and MUST have a genuine serialization relationship
-- with STOP, not merely Shape A's own "narrow the snapshot window with a
-- second unlocked read" mitigation. This writer therefore acquires
-- `public.execution_control_lock` (id = 1) `FOR SHARE` immediately before
-- its single emergency-state read, held through the atomic consumed_at
-- UPDATE, and released only when the transaction ends. Race proven:
-- public.stop_execution()/release_execution() (20260822220000...sql)
-- both acquire that SAME row `FOR UPDATE` as their unconditional first
-- database interaction, before any other lock, read, or INSERT. `FOR
-- SHARE` and `FOR UPDATE` on the identical row are mutually exclusive in
-- PostgreSQL (a writer cannot proceed while any reader holds a share
-- lock, and a reader cannot acquire a share lock while a writer holds an
-- exclusive one) -- so whichever transaction (this writer's claim, or a
-- concurrent STOP/RELEASE) reaches that row first, the other genuinely
-- WAITS until the first commits or aborts; no interleaving of "STOP takes
-- effect" and "claim reads emergency state" can ever occur. Concretely:
-- if a STOP is already in flight holding `FOR UPDATE` when this writer
-- reaches its own lock acquisition, this writer blocks until STOP
-- commits, then correctly reads 'stopped' and returns 'blocked' -- the
-- claim is refused, exactly as required. If this writer's `FOR SHARE`
-- acquisition happens first, a concurrent STOP attempting `FOR UPDATE`
-- on the same row blocks until this writer's transaction resolves --
-- STOP cannot "cut in" mid-claim; it takes effect strictly before or
-- strictly after, never during. Two concurrent claims of DIFFERENT
-- authorizations both taking `FOR SHARE` on this same coordination row do
-- NOT block each other (`FOR SHARE` is compatible with `FOR SHARE`), so
-- this design costs contention only against genuine STOP/RELEASE
-- transitions, never against ordinary concurrent consumption. Because
-- this lock genuinely closes the race rather than merely narrowing a
-- window, exactly ONE emergency-state read is needed -- positioned
-- immediately after acquiring the lock and immediately before the
-- mutation, with nothing else executed in between -- unlike Shape A's own
-- two-read mitigation, which was the best available option in the
-- ABSENCE of a shared mutex with STOP/RELEASE. `evaluation_failed` is
-- returned if the lock row itself is absent (structurally unreachable
-- given execution_control_lock's own PRIMARY KEY + CHECK(id = 1)
-- singleton proof, Phase 16B.2b-5p-R1, but defensively handled, matching
-- stop_execution()/release_execution()'s own identical treatment).
--
-- PART G -- LOCK ORDERING AND DEADLOCK ANALYSIS AGAINST EVERY EXISTING
-- WRITER: this writer's fixed lock sequence is (1) the target public.
-- execution_authorizations row, by id, `FOR UPDATE`; (2) the referenced
-- public.execution_intents row, by the locked authorization's own
-- execution_intent_id, `FOR UPDATE` -- the identical lock target/mode
-- already used as lock-ordering step (1) by public.approve_execution_
-- intent()/reject_execution_intent()/revoke_execution_intent() and by
-- public.create_execution_authorization() (both 20260825...sql, same
-- prior batch) -- acquired here specifically so a concurrent revoke_
-- execution_intent() call for the SAME intent cannot interleave between
-- this writer's approval re-check and its eventual commit (see "PART F"
-- above); (3) `public.execution_control_lock` (id = 1) `FOR SHARE`, see
-- "PART G" above. No other lock is acquired anywhere in this function.
-- Checked against every writer that exists today:
--   - stop_execution()/release_execution(): lock ONLY execution_control_
--     lock (FOR UPDATE, first) then public.user_roles (FOR SHARE) and,
--     RELEASE only, an execution_authorisers row filtered on capability =
--     'execution_controller'. Neither ever locks execution_authorizations
--     or execution_intents. This writer therefore never holds a resource
--     STOP/RELEASE also needs beyond execution_control_lock itself, and
--     STOP/RELEASE never hold a resource this writer needs beyond that
--     same lock -- ordinary single-resource contention (whichever
--     transaction arrives first proceeds, the other waits), never a
--     cycle. See "PART G" above for the full proof.
--   - approve_execution_intent()/reject_execution_intent()/revoke_
--     execution_intent(): lock execution_intents (FOR UPDATE) then an
--     execution_authorisers row filtered on capability =
--     'execution_authoriser'. Neither ever touches execution_
--     authorizations or execution_control_lock. This writer's own
--     execution_intents lock (step 2) is the SAME target/mode as their
--     own step (1) -- ordinary single-resource contention on that one
--     table, not a cycle, since neither side ever also waits on this
--     writer's OTHER resources (execution_authorizations, execution_
--     control_lock).
--   - create_execution_authorization(): locks execution_intents (FOR
--     UPDATE) then an execution_authorisers row (FOR SHARE); its own
--     INSERT targets a brand-new execution_authorizations row, never an
--     existing one -- it never locks or waits on any EXISTING execution_
--     authorizations row, so it can never be waiting on the row THIS
--     writer holds. No cycle.
--   - grant_execution_controller()/revoke_execution_controller(): lock
--     only public.user_roles (FOR SHARE) and mutate execution_
--     authorisers directly. No overlap with any resource this writer
--     touches at all.
--   No existing writer locks execution_authorizations and execution_
--   intents in the REVERSE order this writer uses -- the only ordering
--   risk that could actually invert. FUTURE WRITER COMPATIBILITY, FLAGGED
--   EXPLICITLY, matching this chain's own established practice (most
--   recently stop_execution()/release_execution()'s own header): any
--   future writer that locks BOTH execution_authorizations and execution_
--   intents, or that acquires execution_control_lock in any mode, MUST be
--   reviewed against this fixed ordering before it is built. This
--   migration guarantees deadlock-freedom against every writer that
--   exists today, not against one that does not yet exist.
--
-- PART H -- EXACTLY-ONCE CONCURRENCY, PROVEN: the target row is locked
-- `FOR UPDATE` as this writer's very first database interaction (lock-
-- ordering step 1) and remains locked for the remainder of the
-- transaction. `consumed_at IS NULL` is checked once, under that lock,
-- before any revalidation work begins -- a second, concurrent call
-- attempting to consume the SAME authorization blocks on that same `FOR
-- UPDATE` acquisition until the first transaction commits or aborts, then
-- re-evaluates its own `consumed_at IS NULL` check against the
-- POST-conflict row version (PostgreSQL's EvalPlanQual behaviour under
-- READ COMMITTED) and correctly observes `consumed_at` already populated,
-- returning 'no_change' rather than racing the mutation. The final
-- mutation itself is `update ... where id = <locked id> and consumed_at
-- is null returning id` -- structurally redundant with the lock already
-- held (no other transaction could have changed consumed_at while this
-- one holds the row lock), but retained anyway as a defence-in-depth
-- belt-and-suspenders matching this phase's own "the database, not
-- application convention, must prevent double claim" instruction: if
-- `RETURNING` produces no row for any reason, this writer returns
-- 'no_change' rather than silently reporting success. Two simultaneous
-- claims of the SAME authorization: only one can hold the row lock at a
-- time; the second always observes `consumed_at is not null` and returns
-- 'no_change'. Claim after expiry: the `expires_at` check happens before
-- any lock beyond the target row itself is acquired, and is re-evaluated
-- against `transaction_timestamp()`, a single stable per-transaction
-- clock reading -- an authorization that expired between creation and
-- this call is refused. Claim racing STOP: see "PART G" above. Claim
-- racing approval revoke: see "PART F"/"PART G" above (the execution_
-- intents lock serializes this). Claim racing execution_authoriser
-- revocation: not re-checked, by the deliberate, documented Classification
-- A choice in "PART F" above -- not a race this writer is designed to
-- detect. Claim racing suppression creation: public.evaluate_suppression_
-- live() is called live, inside this transaction, after the intent lock
-- is held -- a suppression record created and committed before this
-- writer's own suppression check executes is correctly observed; one
-- committed concurrently with, or after, this writer's own transaction
-- is a genuine same-instant race no design can observe before it exists,
-- identical in kind to the same limitation already documented for Shape A
-- itself. Claim racing a contact destination change: covered by the live
-- destination re-verification in "PART F" above, executed fresh inside
-- this transaction.
--
-- PART I -- RETURN CONTRACT: 'consumed' | 'no_change' | 'blocked' |
-- 'evaluation_failed', matching this chain's established four-value
-- shape. Every authority-irrelevant structural/staleness/revalidation
-- rejection (not found, wrong status, expired, approval no longer
-- 'approved', compliance evidence expired, destination mismatch, active
-- suppression, emergency state not clear) collapses to the identical
-- 'blocked', undifferentiated -- a caller cannot distinguish which check
-- failed, matching the oracle-avoidance discipline established throughout
-- this chain. 'no_change' is reserved exclusively for "already consumed"
-- (both the up-front check and the defensive post-UPDATE check), mirroring
-- STOP/RELEASE/grant/revoke_execution_controller's own use of 'no_change'
-- for "the requested transition was already true." 'evaluation_failed' is
-- reserved exclusively for the execution_control_lock-row-absent case,
-- structurally unreachable today but defensively handled, matching
-- stop_execution()/release_execution()'s identical precedent. No `WHEN
-- OTHERS` anywhere in this function: every other PostgreSQL error (a
-- foreign-key violation, a permission error, an undefined-object error,
-- or any other unanticipated failure) propagates normally and aborts the
-- calling transaction, matching this chain's unbroken DATABASE ERROR
-- BEHAVIOUR discipline. No exception handler of any kind appears anywhere
-- in this function -- there is no unique constraint this writer's own
-- UPDATE could ever collide with (unlike Shape A's INSERT), so none is
-- needed.
--
-- PART K -- CHECKPOINT #3 CONTRACT, FOR A FUTURE PHASE, NOT BUILT HERE:
-- immediately before any real provider invocation, a future dispatch
-- writer must verify, at minimum: (1) the target authorization's
-- `consumed_at` is not null (claimed by THIS exact writer, not merely
-- 'authorised'); (2) the claim being acted on belongs to the exact
-- authorization about to be dispatched (an id match, never inferred);
-- (3) the authorization is not stale relative to whatever maximum
-- claim-to-dispatch latency policy a future phase sets (a new, separately
-- -authorised policy question -- no such window is decided or implied by
-- this migration); (4) emergency state is 'clear' at the moment of
-- dispatch, live, via public.evaluate_execution_emergency_stop(), almost
-- certainly needing its own execution_control_lock FOR SHARE-protected
-- checkpoint #3, by the identical reasoning as checkpoint #2 above;
-- (5) live suppression is still 'clear' if the dispatch gap can be
-- material; (6) the intended provider adapter is itself approved/enabled
-- -- a concept this schema does not yet have any representation for;
-- (7) `execution_performed` is still `false` at the exact moment of
-- dispatch, claimed atomically via the SAME `UPDATE ... WHERE ... AND
-- execution_performed = false RETURNING id` pattern this writer
-- establishes for `consumed_at`, immediately before setting it to `true`
-- together with `execution_performed_at` and `execution_reference`; (8)
-- the destination is still correctly bound -- almost certainly requiring
-- yet another live public.verify_destination_commitment() call,
-- immediately adjacent to the actual provider call, not trusted from this
-- writer's own earlier check. This migration adds no schema, no
-- function, and no policy toward any of this -- it is recorded here
-- purely as the contract a future, separately-scoped and separately-
-- authorised phase must satisfy.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY the one
-- function below and its REVOKE statements. It does NOT modify public.
-- execution_authorizations, public.execution_intents, public.execution_
-- intent_approvals, public.compliance_decisions, public.execution_
-- authorisers, public.execution_control_lock, public.execution_control_
-- events, or any other existing migration. It does NOT set execution_
-- performed, execution_performed_at, or execution_reference. It does NOT
-- call stop_execution(), release_execution(), or any provider/network
-- primitive (none exists anywhere in this repository).
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`, every
-- security-relevant built-in explicitly pg_catalog-qualified (pg_catalog.
-- transaction_timestamp), every relation and function reference fully
-- schema-qualified (public.execution_authorizations, public.execution_
-- intents, public.execution_intent_approvals, public.compliance_
-- decisions, public.execution_control_lock, public.verify_destination_
-- commitment(), public.evaluate_suppression_live(), public.evaluate_
-- execution_emergency_stop()).
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement, matching every
-- precedent function in this repository.
--
-- DORMANCY -- TRUE DORMANCY, INCLUDING service_role, PER THE LEAD
-- ARCHITECT'S HARDENING REVIEW: PostgreSQL grants EXECUTE to PUBLIC by
-- default on every new function, and this project's own default
-- privileges separately grant `authenticated` EXECUTE on every new
-- function owned by `postgres` -- both are explicitly revoked below,
-- alongside an explicit `anon` revoke, matching every prior function in
-- this repository. UNLIKE every prior function in this repository,
-- `service_role` is ALSO explicitly revoked below -- see "DEPLOYED
-- AUTHORITY GATE" above for why this one, single writer departs from the
-- chain's otherwise-unbroken "service_role is never referenced" pattern:
-- this is the first mutating writer in this chain whose intended future
-- caller class IS service_role-equivalent backend code rather than a
-- human browser session, so leaving service_role unrevoked here would
-- not be dormancy at all -- any existing backend already holding
-- service_role credentials, for any unrelated purpose, could invoke a
-- live claim immediately upon deployment. No role of any kind -- PUBLIC,
-- anon, authenticated, or service_role -- can call this function after
-- this migration is applied. Only the owning role (`postgres`) retains
-- the ordinary implicit owner privilege PostgreSQL always grants,
-- untouched by this migration, matching PostgreSQL's own ownership
-- semantics -- no attempt is made here to revoke or redesign ownership.
-- Activation -- a future, separately-authorised `GRANT EXECUTE ... TO
-- service_role` on this exact signature -- remains entirely out of scope
-- for this migration.
--
-- MUTATION SURFACE: exactly one UPDATE, targeting public.execution_
-- authorizations only, setting consumed_at alone, reached only after
-- every structural, staleness, and revalidation check has passed. No
-- INSERT or DELETE against any table appears anywhere in this function.
-- public.execution_intents, public.execution_intent_approvals, public.
-- compliance_decisions, and public.execution_control_lock are read-and/
-- or-locked only, never written to.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6g authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.consume_execution_authorization(
  p_execution_authorization_id bigint
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
  v_lock_id bigint;
  v_emergency_result text;
  v_claimed_id bigint;
begin
  -- Structural precondition -- rejected before any table lookup.
  if p_execution_authorization_id is null or p_execution_authorization_id <= 0 then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): the target authorization row, locked first --
  -- see "PART G -- LOCK ORDERING" above.
  select ea.id, ea.authorization_status, ea.expires_at, ea.consumed_at,
         ea.execution_intent_id, ea.contact_id, ea.requested_channel,
         ea.compliance_decision_id
    into v_locked_authorization_id, v_authorization_status, v_expires_at,
         v_consumed_at, v_execution_intent_id, v_contact_id,
         v_requested_channel, v_compliance_decision_id
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

  if v_consumed_at is not null then
    return 'no_change';
  end if;

  -- LOCK ORDERING step (2): the referenced execution_intents row --
  -- serializes this claim against a concurrent approval-writer call for
  -- the same intent -- see "PART F"/"PART G" above.
  select ei.id into v_locked_intent_id
  from public.execution_intents ei
  where ei.id = v_execution_intent_id
  for update;

  if v_locked_intent_id is null then
    return 'blocked';
  end if;

  -- Approval must still be current -- Classification B, see "PART F"
  -- above.
  select eia.decision into v_latest_approval_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = v_execution_intent_id
  order by eia.id desc
  limit 1;

  if v_latest_approval_decision is distinct from 'approved' then
    return 'blocked';
  end if;

  -- The pinned compliance decision's own continued non-expiry --
  -- Classification B; its decision/policy_version/subject-binding are
  -- Classification A and are not re-read here -- see "PART F" above.
  select cd.expires_at, cd.destination_commitment_nonce, cd.destination_commitment
    into v_compliance_expires_at, v_compliance_nonce, v_compliance_commitment
  from public.compliance_decisions cd
  where cd.id = v_compliance_decision_id;

  if v_compliance_expires_at is null
     or v_compliance_expires_at <= pg_catalog.transaction_timestamp()
  then
    return 'blocked';
  end if;

  -- Live destination re-verification -- Classification B, see "PART F"
  -- above.
  v_destination_result := public.verify_destination_commitment(
    v_contact_id, v_requested_channel, v_compliance_nonce, v_compliance_commitment
  );

  if v_destination_result is distinct from 'verified' then
    return 'blocked';
  end if;

  -- Live suppression re-verification -- Classification B, see "PART F"
  -- above.
  v_suppression_result := public.evaluate_suppression_live(v_execution_intent_id);

  if v_suppression_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (3): the coordination lock, held through the
  -- final emergency-state read and the mutation below -- kill-switch
  -- checkpoint #2, see "PART G" above.
  select ecl.id into v_lock_id
  from public.execution_control_lock ecl
  where ecl.id = 1
  for share;

  if v_lock_id is null then
    return 'evaluation_failed';
  end if;

  -- Exactly one emergency-state read, immediately before the mutation,
  -- protected by the coordination lock held above -- see "PART G" above
  -- for why a second read (as Shape A uses) is unnecessary here.
  v_emergency_result := public.evaluate_execution_emergency_stop();

  if v_emergency_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- Atomic claim. Structurally redundant with the row lock already held
  -- since step (1) -- retained as defence-in-depth, see "PART H" above.
  update public.execution_authorizations
  set consumed_at = pg_catalog.transaction_timestamp()
  where id = v_locked_authorization_id
    and consumed_at is null
  returning id into v_claimed_id;

  if v_claimed_id is null then
    return 'no_change';
  end if;

  return 'consumed';
end;
$$;

revoke all on function public.consume_execution_authorization(
  bigint
) from public;

revoke execute on function public.consume_execution_authorization(
  bigint
) from anon;

revoke execute on function public.consume_execution_authorization(
  bigint
) from authenticated;

-- TRUE DORMANCY CORRECTION, PER THE LEAD ARCHITECT'S HARDENING REVIEW:
-- unlike every prior writer in this repository, service_role is
-- explicitly revoked here too -- see "DEPLOYED AUTHORITY GATE" and
-- "DORMANCY" above. This is what structurally guarantees deployment and
-- activation are genuinely separate acts: no backend already holding
-- service_role credentials for any unrelated purpose can invoke this
-- function until a future, separately-authorised migration explicitly
-- re-grants it.
revoke execute on function public.consume_execution_authorization(
  bigint
) from service_role;

-- ROLLBACK (documented, not executed): this function is dormant --
-- unreachable by any role, including service_role, and neither has ever
-- been called (no role can call it, and this migration itself performs
-- no such call) -- nothing could depend on it.
-- drop function if exists public.consume_execution_authorization(bigint);
