-- Factory 041 Phase 16B.2b-5m: execution emergency-stop (kill-switch)
-- foundation.
--
-- WHY THIS EXISTS: no future Shape A create_execution_authorization()
-- writer, its future atomic consumption counterpart, or any future
-- provider-execution boundary can honestly claim to respect a master
-- stop unless a database-native, fail-closed, provider-neutral control
-- exists that those SQL writers can check from inside their own trusted
-- transaction -- independent of any frontend/UI state, independent of
-- any individual provider's own state, and impossible for an ordinary
-- application role to bypass. This migration builds exactly that
-- foundation: one narrowly-scoped, append-only, fully locked-down
-- control-event table, and one dormant SQL read primitive that resolves
-- "is execution currently stopped?" from it. It does NOT build a writer,
-- an admin UI, or any actual wiring into authorization creation,
-- consumption, or provider execution -- those remain separate, later,
-- independently-gated phases.
--
-- PREFLIGHT -- REPOSITORY-WIDE SEARCH, FRESH, NOT FROM MEMORY: a
-- case-insensitive search across the entire repository for "emergency",
-- "kill switch"/"kill_switch", "execution stop"/"execution_stop",
-- "feature flag"/"feature_flag", "system control", "runtime control",
-- "pause", "disabled", "enabled", "outreach stop", and "provider stop"
-- found no existing database-native emergency-stop, kill-switch, or
-- execution-control table or function anywhere in this repository. The
-- one materially relevant hit, frontend/src/lib/shared/featureFlags.ts
-- (readBooleanFlag()), was inspected directly: it is a pure
-- process.env(...) reader used by the intelligence/AI-workforce modules
-- for ordinary feature toggling -- not database-backed, not
-- authoritative from the database's own perspective, and structurally
-- unreachable from inside a PostgreSQL SECURITY DEFINER transaction. It
-- answers an entirely different question ("is this Node-side feature
-- flag on for this deployment") than the one this migration exists to
-- answer ("has FEH's own trusted database recorded an active execution
-- stop"), and duplicates nothing this migration builds. public.
-- audit_log (20260805100200_audit_log.sql) was also inspected: it is a
-- generic, any-authenticated-user-may-insert-as-themselves append-only
-- log, not a source of truth for any control state and not gated to a
-- specific authority -- unsuitable as the primary provenance record for
-- a security-critical stop/release decision, per the same reasoning that
-- has led every prior security-relevant fact in this Factory 041 chain
-- (execution intents, authoriser grants, compliance decisions) to its
-- own dedicated, tightly-locked-down table rather than a shared generic
-- log. No equivalent trusted primitive already exists. Construction
-- proceeds.
--
-- SCOPE, DELIBERATELY NARROW, FOUNDATION ONLY: this migration creates
-- ONLY one new table, its constraints and indexes, RLS enablement with
-- zero policies, explicit REVOKE statements, one new dormant read
-- function, and that function's own REVOKE statements. It does NOT
-- create a writer, a mutation/admin function, a trigger, an RLS policy
-- granting any ordinary role write access, or any frontend/UI surface.
-- It does NOT modify public.create_execution_authorization(), any
-- authorization-consumption schema, public.evaluate_suppression_live(),
-- public.verify_destination_commitment(), public.compliance_decisions,
-- public.execution_intents, or any other existing migration. It adds no
-- provider call, no AI Voice/WhatsApp/SMS/email/social-media execution
-- path, and activates nothing.
--
-- RECOMMENDED CONTROL MODEL -- OPTION B, APPEND-ONLY EVENT HISTORY, NOT
-- A MUTABLE SINGLETON: a mutable singleton (Option A -- one row with a
-- `stopped boolean` column, updated in place) was evaluated and
-- rejected. Every security-relevant provenance table built in this
-- Factory 041 chain so far (public.execution_intents, public.
-- execution_authorisers, public.compliance_decisions) follows the same
-- explicit, repeatedly-stated convention: "immutable rows, revision via
-- a NEW row, never mutate an existing row's meaning" -- a mutable
-- singleton would be the one exception to that convention in this entire
-- chain, and would directly conflict with this phase's own explicit
-- auditability requirement (proving WHO stopped execution, WHEN, WHO
-- released it, WHEN, and WHY) -- an UPDATE-in-place design can only ever
-- show the CURRENT state, never the history that produced it, unless
-- paired with a second history table anyway, at which point the
-- singleton is redundant. public.execution_control_events is therefore
-- append-only, exactly mirroring public.execution_authorisers' own
-- "insert-and-revoke-via-a-new-row, never mutate meaning in place"
-- pattern: current state is always "whichever event has the highest id."
--
-- ORDERING AUTHORITY -- id DESC, PER THE PHASE 16B.2b-5l-R1 ARCHITECT
-- CLARIFICATION: the Phase 16B.2b-5l-R1 ordering clarification
-- established, for compliance-decision selection, that `id DESC` is the
-- authoritative FEH evidence-sequence ordering -- "higher id = later
-- persisted evidence sequence" -- without describing it as necessarily
-- equivalent to created_at ordering or guaranteed physical commit
-- chronology. The identical principle applies here: the read primitive
-- below determines current control state by selecting the single event
-- with the highest id, not by evaluated_at, created_at, or any other
-- writer-influenced timestamp. A created_at index is still included
-- below for chronological audit browsing, but it is descriptive only --
-- never the mechanism this table's own "current state" question is
-- answered by.
--
-- DEFAULT / ABSENCE SEMANTICS -- ABSENCE OF ANY CONTROL RECORD MEANS
-- STOPPED, DELIBERATELY FAIL-CLOSED: per the Phase 16B.2b-5m
-- authorisation's own explicit preference ("prefer fail-closed unless
-- there is a compelling established reason otherwise"), a database with
-- zero rows in public.execution_control_events -- true of every
-- environment immediately after this migration is applied, since this
-- migration is schema-only and inserts nothing -- is treated identically
-- to an ACTIVE stop, not as "nothing has ever stopped execution, so
-- execution is fine." This is a deliberate inversion of the ordinary
-- intuition that "no stop event recorded" should mean "not stopped," and
-- is called out explicitly rather than left implicit: it means this
-- system's DEFAULT state, before any human has ever touched this table,
-- is "cannot execute" -- a future writer/administrative bootstrap action
-- will need to insert one deliberate first RELEASE event before any
-- execution can occur for the first time. This is consistent, not an
-- exception, with every other gate already built in this Factory 041
-- chain: an execution_authoriser grant must affirmatively exist before
-- authorisation is possible; eligible compliance evidence must
-- affirmatively exist; a destination commitment must affirmatively
-- verify. "No record proving execution is safe" is treated the same way
-- here as everywhere else in this chain -- as unproven, and therefore
-- unsafe -- never as an implicit permission.
--
-- CONTROL SCOPE -- GLOBAL ONLY, DELIBERATELY, PER THE "SMALLEST SAFE
-- FOUNDATION" INSTRUCTION: this table carries no organisation_id,
-- channel, provider, or campaign_id dimension. No repository evidence
-- anywhere establishes a need for a scoped stop today (no provider
-- integration exists yet at all, and no per-organisation or per-channel
-- stop concept has been requested or evidenced anywhere in this
-- repository) -- adding those dimensions now would be exactly the kind
-- of complexity this phase's own authorisation warns against building
-- "merely because it might be useful later." A scoped model, if FEH ever
-- needs one, is a natural, additive future evolution (e.g. a nullable
-- `scope_channel` column, defaulting to "applies globally when null,"
-- matching the identical nullable-scope-column convention already used
-- by public.suppression_records) -- not attempted here.
--
-- PROVENANCE MODEL: id (bigint identity, immutable row identity, matching
-- every other table in this chain); created_at (timestamptz, `default
-- transaction_timestamp()`, DB-derived, matching every other table's own
-- convention -- descriptive/audit-browsing only, never the ordering
-- authority, see above); event_type (closed to 'STOP'/'RELEASE', the
-- smallest vocabulary that expresses this table's one job); actor_id
-- (uuid, NOT NULL, FK to auth.users, ON DELETE RESTRICT -- see
-- "ACTOR_ID PROTECTED PROVENANCE" below); reason (nullable free text, no
-- closed taxonomy invented -- no evidenced set of stop/release reasons
-- exists anywhere in this repository to close this vocabulary against,
-- and inventing one now would be exactly the kind of unproven policy
-- this chain refuses to build ahead of evidence); evidence_reference
-- (nullable text, a pointer to an external ticket/incident, matching
-- public.suppression_records.evidence_reference's identical precedent
-- exactly). No superseded-event pointer column is included: unlike
-- public.execution_intents' own supersedes_execution_intent_id (which
-- disambiguates between many independent, parallel proposed actions),
-- every row in this table already shares one single global timeline --
-- "the latest event" is already unambiguous via id DESC alone, and a
-- pointer column here would be redundant, not informative.
--
-- ACTOR_ID -- PROTECTED PROVENANCE, NOT NULL, ON DELETE RESTRICT: an
-- emergency stop or release with no recorded human actor would defeat
-- the entire auditability purpose of this table -- matching public.
-- execution_authorisers.granted_by's identical "who established this
-- authority record" treatment (NOT NULL, ON DELETE RESTRICT,
-- 20260821120000...sql:152-176) rather than public.execution_
-- authorizations.actor_id's older, disposable-metadata SET NULL
-- treatment. Deleting an auth.users row that has ever issued a stop or
-- release event will fail while this table still references it, forcing
-- a deliberate future offboarding/anonymisation decision rather than
-- silently losing who took a security-critical action.
--
-- FUTURE ACTOR-AUTHORITY MODEL -- DELIBERATELY UNDECIDED, NOT GRANTED:
-- who should eventually be permitted to insert a STOP or RELEASE event
-- (every existing authenticated non-read_only user via public.
-- user_can_write(), only 'admin', a new dedicated capability analogous
-- to execution_authorisers' own 'execution_authoriser', or something
-- else) is explicitly NOT decided in this phase, matching the identical
-- "flag as an open policy question rather than invent one" discipline
-- already applied throughout this chain. No writer exists anywhere in
-- this migration -- there is nothing for any actor-authority decision to
-- gate yet. PUBLIC, anon, and authenticated obtain no mutation ability
-- of any kind merely because this table's schema now exists.
--
-- READ/EVALUATION CONTRACT -- public.evaluate_execution_emergency_stop(),
-- STATUS VOCABULARY REUSED FROM PRECEDENT, NOT INVENTED: this migration
-- also builds one dormant SQL read primitive, per the Phase 16B.2b-5m
-- authorisation's own explicit allowance ("one dormant read/evaluation
-- primitive if genuinely necessary"). Its status vocabulary -- 'clear' |
-- 'stopped' | 'evaluation_failed' -- is not a fresh invention: it
-- reuses, field-for-field, the identical three-state shape already
-- established by public.evaluate_suppression_live() ('clear' |
-- 'suppressed' | 'evaluation_failed', 20260822170000...sql) for the
-- identical reason -- a boolean-shaped safety check that must never
-- collapse "uncertain" into either positive state. This is the smaller,
-- safer, repository-consistent contract the authorisation asked for, not
-- a new one invented to match the authorisation's own illustrative
-- example. No parameter of any kind is needed or accepted: per "CONTROL
-- SCOPE" above, this is a pure global-state read with nothing to derive
-- from a caller.
--
-- FAIL-CLOSED CASES, ALL COLLAPSING TO 'evaluation_failed': the single
-- structural case this function can anticipate and check for explicitly
-- is an event_type value outside the closed ('STOP','RELEASE')
-- vocabulary on the latest row -- structurally unreachable in practice,
-- since execution_control_events_event_type_check enforces this at the
-- database level regardless of which role wrote the row, but
-- re-validated defensively anyway, matching this chain's consistent
-- "structural precondition, not a live risk" treatment of comparable
-- already-enforced invariants elsewhere (public.evaluate_suppression_
-- live()'s identical defensive re-validation of public.execution_
-- intents.requested_channel). Zero rows existing at all resolves to
-- 'stopped', not 'evaluation_failed' -- see "DEFAULT / ABSENCE
-- SEMANTICS" above; this is a normal, anticipated, well-defined outcome,
-- not an error condition.
--
-- DATABASE ERROR BEHAVIOUR -- GENUINE POSTGRESQL ERRORS ARE NOT
-- SWALLOWED, MATCHING THE PHASE 16B.2b-5l-R1 PRECEDENT EXACTLY: this
-- function contains no BEGIN ... EXCEPTION WHEN OTHERS THEN ... block.
-- An unanticipated PostgreSQL execution failure is allowed to propagate
-- and abort the surrounding trusted transaction, rather than being
-- caught and converted into a manufactured 'evaluation_failed' return
-- value -- for the identical reason already documented in public.
-- evaluate_suppression_live()'s own migration header: swallowing such an
-- exception would require an internal SAVEPOINT to keep the outer
-- transaction alive, risking a real database-level problem being
-- silently presented as an ordinary, benign structural rejection. A
-- genuine PostgreSQL execution failure aborting the transaction is
-- itself fail-closed -- no authorization can possibly be created or
-- consumed inside an aborted transaction -- simply by a more forceful
-- mechanism than a returned status string.
--
-- CONCURRENCY (READ SIDE) -- ORDINARY TRANSACTION SNAPSHOT IS SUFFICIENT
-- FOR THIS FOUNDATION PHASE, NO LOCKING BUILT: the race the Phase
-- 16B.2b-5m authorisation asks about -- a writer checks emergency state,
-- an administrator concurrently activates a stop, the writer then
-- proceeds -- is the identical class of bounded, single-statement-
-- snapshot race already analysed and accepted for compliance-decision
-- "latest row" selection in the Phase 16B.2b-5k preflight. "Highest id
-- is authoritative" (see "ORDERING AUTHORITY" above) is a rule about
-- WHICH ROW GOVERNS once visible in a reader's snapshot -- it is not, and
-- must not be read as, a claim that PostgreSQL identity/sequence
-- allocation order is guaranteed to equal transaction commit order; two
-- concurrent transactions can be allocated ids in one order while
-- committing in a different order, and this migration makes no claim
-- about which of the two "actually happened first" in wall-clock or
-- commit-chronology terms -- only about which row this table's own
-- selection rule treats as current once both are visible. Three reasons
-- this foundation does not warrant heavier machinery (row locking,
-- advisory locking, or SERIALIZABLE isolation) now: (1) this table is
-- insert-only and never write-write-conflicts with itself -- the risk
-- analysed here is a READ-freshness question, not a write-consistency
-- anomaly SERIALIZABLE isolation exists to prevent; (2) the identical
-- residual-window risk exists, unavoidably, at the boundary BETWEEN
-- separate transactions (e.g. between authorization creation and later
-- consumption) regardless of what isolation level either individual
-- transaction uses -- no per-transaction locking strategy can close a
-- gap that spans two separate transactions; this chain's own
-- already-established answer to exactly that shape of problem is to
-- RE-CHECK at every subsequent boundary (creation, atomic consumption
-- claim, and, if a future pre-dispatch step exists, immediately before
-- dispatch) rather than to make any single check unbeatable; (3) no
-- writer exists anywhere yet that would actually exercise this race --
-- building SERIALIZABLE-isolation or advisory-lock machinery now, before
-- the writer it would protect exists, would be exactly the kind of
-- speculative complexity this phase's own authorisation warns against.
-- This is a deferral, not a rejection: a stronger mechanism can be added
-- additively later if a future phase's real writer construction
-- demonstrates this window matters in practice.
--
-- CONCURRENCY (WRITE SIDE) -- MUTATION SERIALIZATION IS NOT SOLVED HERE,
-- EXPLICITLY DEFERRED TO THE FUTURE WRITER PHASE: this migration builds
-- no writer of any kind (see "FUTURE ACTOR-AUTHORITY MODEL" above), so
-- the question of how two concurrent STOP/RELEASE mutations -- e.g. two
-- administrators acting at nearly the same moment -- should be
-- serialized relative to one another is not, and cannot yet be, answered
-- by this foundation. Do NOT read this migration as having already
-- solved that question merely because "highest id wins" is a well-
-- defined rule for READING current state: a well-defined reading rule
-- says nothing about whether the id-allocation order two concurrent
-- INSERTs happen to receive reliably reflects the order their issuing
-- administrators actually intended or acted in. The future trusted
-- STOP/RELEASE writer phase MUST explicitly settle serialization of
-- concurrent control mutations before that writer is ever activated --
-- candidate mechanisms that future phase may evaluate include row
-- locking, advisory locking, or serializing all control mutations
-- through one single trusted SECURITY DEFINER primitive that itself
-- enforces ordering -- none of which is implemented, chosen, or implied
-- by this migration.
--
-- AUDITABILITY -- APPEND-ONLY HISTORY, NEVER ERASED: because this table
-- is insert-only (no UPDATE or DELETE path exists anywhere in this
-- migration, and RLS/privilege posture below denies both to every
-- application role), FEH can always later reconstruct exactly who
-- stopped execution, when, who released it, when, and why (via `reason`/
-- `evidence_reference`) for the table's entire history -- not merely the
-- current state. This is the direct benefit of the Option B model
-- chosen above over a mutable singleton.
--
-- ORACLE / DATA-MINIMISATION: this function's only output is one of
-- three status strings -- it never returns a matched event's id, actor,
-- reason, or evidence_reference. No parameter of any kind exists for it
-- to leak information about, since it accepts none.
--
-- SECURITY DEFINER -- REQUIRED BY THE ESTABLISHED DATABASE MODEL,
-- MATCHING EVERY PRIOR TRUSTED-READ PRIMITIVE IN THIS CHAIN: `set
-- search_path to ''`; every security-relevant built-in call is
-- explicitly pg_catalog-qualified; public.execution_control_events is
-- fully schema-qualified.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement appears here,
-- matching every precedent function in this repository -- ownership is
-- implicit (whoever applies this migration, `postgres`, under this
-- project's standard convention).
--
-- DORMANT BY DESIGN: PostgreSQL grants EXECUTE to PUBLIC by default on
-- every new function, and this project's own default privileges
-- separately grant `authenticated` EXECUTE on every new function owned
-- by `postgres` -- both are explicitly revoked below, alongside an
-- explicit `anon` revoke. No role can call this function after this
-- migration is applied. `service_role` is not referenced anywhere in
-- this file, matching the unbroken convention already established
-- across every prior function migration in this repository.
--
-- PRIVILEGE POSTURE -- TABLE: matching every foundation table in this
-- Factory 041 chain exactly, and deliberately NOT matching public.
-- audit_log's more permissive "any authenticated user may insert as
-- themselves" model, given this table's materially higher security
-- criticality. RLS is enabled with zero policies -- default-deny for
-- every row, every role, every direction. Table privileges are
-- additionally revoked explicitly from anon and authenticated, the same
-- defence-in-depth reasoning already applied to every other foundation
-- table in this chain. service_role and the table owner are untouched.
--
-- SAFE / IDEMPOTENT: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
-- EXISTS, and CREATE OR REPLACE FUNCTION are all safe to rerun. Every
-- REVOKE is safe to rerun.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-5m authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create table if not exists public.execution_control_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default transaction_timestamp(),

  event_type text not null
    check (event_type in ('STOP', 'RELEASE')),

  actor_id uuid not null
    references auth.users (id) on delete restrict,

  reason text,
  evidence_reference text
);

-- Chronological/audit browsing only -- see "ORDERING AUTHORITY" above
-- for why this is NOT the mechanism current state is determined by.
create index if not exists execution_control_events_created_at_idx
  on public.execution_control_events (created_at desc);

create index if not exists execution_control_events_actor_id_idx
  on public.execution_control_events (actor_id);

-- RLS enabled, zero policies -- see "PRIVILEGE POSTURE" above.
alter table public.execution_control_events enable row level security;

-- Explicit second layer -- see "PRIVILEGE POSTURE" above.
revoke all on public.execution_control_events from anon;
revoke all on public.execution_control_events from authenticated;

-- ---------------------------------------------------------------------
-- Dormant read primitive -- see "READ/EVALUATION CONTRACT" above.
-- ---------------------------------------------------------------------

create or replace function public.evaluate_execution_emergency_stop()
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_latest_event_type text;
begin
  select ece.event_type
    into v_latest_event_type
  from public.execution_control_events ece
  order by ece.id desc
  limit 1;

  -- Zero rows -- see "DEFAULT / ABSENCE SEMANTICS" above: treated as an
  -- active stop, not as "nothing has ever stopped execution."
  if v_latest_event_type is null then
    return 'stopped';
  end if;

  -- Structurally unreachable given execution_control_events_event_
  -- type_check, re-validated defensively anyway -- see "FAIL-CLOSED
  -- CASES" above.
  if v_latest_event_type not in ('STOP', 'RELEASE') then
    return 'evaluation_failed';
  end if;

  if v_latest_event_type = 'STOP' then
    return 'stopped';
  end if;

  return 'clear';
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` -- revoked here too, explicitly. `anon` is revoked
-- explicitly as well, restating the project-wide default already closed
-- by 20260810110000, so this migration's own privilege state is
-- self-evidently complete on its own. All three revokes are required for
-- this function to be genuinely dormant; none replaces another.
revoke all on function public.evaluate_execution_emergency_stop()
  from public;

revoke execute on function public.evaluate_execution_emergency_stop()
  from anon;

revoke execute on function public.evaluate_execution_emergency_stop()
  from authenticated;

-- ROLLBACK (documented, not executed): the table is newly created and
-- empty by construction (this migration inserts no data), and the
-- function is dormant -- unreachable by any application role, and
-- performs no writes -- so nothing could depend on either.
-- drop function if exists public.evaluate_execution_emergency_stop();
-- drop index if exists public.execution_control_events_actor_id_idx;
-- drop index if exists public.execution_control_events_created_at_idx;
-- drop table if exists public.execution_control_events;
