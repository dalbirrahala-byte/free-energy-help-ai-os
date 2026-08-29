-- Factory 041 Phase 16B.2b-6c: per-action human-approval evidence
-- foundation.
--
-- WHY THIS EXISTS: the Phase 16B.2b-6a Shape A construction preflight
-- identified a genuine gap -- execution_authoriser capability ("may this
-- human authorise execution generally") and per-action human approval
-- ("was THIS specific proposed action reviewed and approved") are
-- distinct authorities, and no persisted record of the latter exists
-- anywhere in this schema. The Phase 16B.2b-6b preflight settled the
-- policy: EVERY execution intent requires per-action human approval in
-- v1 -- there is no `approval_not_required` path, and no trusted policy
-- source exists anywhere in this repository that could ever assert one
-- (action_class/taxonomy was explicitly deferred at public.execution_
-- intents' own construction, 20260822100000...sql, for lack of
-- repository-backed evidence). This migration builds exactly the
-- immutable evidence table that future approval writers -- and,
-- eventually, the Shape A execution-authorization writer -- will read
-- from. It creates no writer, no approval row, and activates nothing.
--
-- PRECEDENT INSPECTED, RE-CONFIRMED IMMEDIATELY BEFORE WRITING THIS
-- FILE: a repository-wide search for any existing approval/review/
-- workflow-decision mechanism found none suitable for reuse. public.
-- tasks (20250601000000_baseline_leads_tasks_activities.sql) is a
-- generic, loosely-typed CRM task table -- free-text `status`, no
-- reviewer/approver column, no FK to any execution-provenance concept,
-- no closed vocabulary, ordinary CRM-grade RLS -- none of the security
-- guarantees this decision requires. public.audit_log
-- (20260805100200...sql) is a generic, any-authenticated-user-writable
-- append-only log -- not a decision record, and already rejected as a
-- precedent for exactly this class of table earlier in this chain
-- (Phase 16B.2b-5m, identical reasoning). No dedicated approval/review/
-- workflow-decision table exists anywhere else. Nothing here duplicates
-- an existing primitive.
--
-- SCOPE, DELIBERATELY NARROW, SCHEMA ONLY: this migration creates ONLY
-- one new table, its constraints and indexes, RLS enablement with zero
-- policies, and explicit REVOKE statements. It does NOT create
-- approve_execution_intent()/reject_execution_intent() or any other
-- writer function, does NOT insert any approval row, does NOT create an
-- execution_authorization, does NOT create or modify any execution_
-- authoriser or execution_controller grant, does NOT create an
-- emergency-control event, does NOT call STOP or RELEASE, does NOT wire
-- any provider-execution path, and does NOT modify public.execution_
-- intents, public.execution_authorisers, public.execution_
-- authorizations, or any other existing migration.
--
-- APPEND-ONLY MODEL, MATCHING THIS CHAIN'S UNBROKEN CONVENTION: this
-- table represents immutable decision history -- matching public.
-- execution_authorisers' own "insert-and-revoke-via-a-new-row, never
-- mutate meaning in place" pattern and public.execution_control_events'
-- identical append-only design. A later decision (a rejection after an
-- earlier approval, or a revocation of an earlier approval) is always a
-- NEW row, never an UPDATE of an existing one. No mutable "current
-- approval state" column exists anywhere on this table, by design --
-- per the Phase 16B.2b-6c authorisation's own explicit prohibition. The
-- latest trusted decision for a given execution_intent_id -- the row
-- with the highest id, per the identical "id DESC is the authoritative
-- FEH persisted-decision sequence" principle already established for
-- public.execution_control_events (Phase 16B.2b-5m-R1) and public.
-- compliance_decisions (Phase 16B.2b-5l-R1) -- is what will eventually
-- define current approval state for that intent. This migration does
-- not implement that read logic; it only establishes the table shape
-- that makes it possible.
--
-- EXECUTION_INTENT_ID -- NOT NULL, ON DELETE RESTRICT, THE SOLE SUBJECT
-- BINDING: matching the Phase 16B.2b-6b preflight's own settled
-- reasoning -- public.execution_intents is already, by its own
-- foundational design, the immutable atomic unit of "one recipient + one
-- channel + one proposed action" (20260822100000...sql), with no UPDATE
-- path of any kind. Binding approval to execution_intent_id alone is
-- therefore both the narrowest possible binding and fully sufficient:
-- nothing about the action a given intent row represents can ever change
-- after creation, so no broader binding (intent + action/channel) could
-- add any additional protection against approval being reused for a
-- materially different action. `on delete restrict` matches every other
-- provenance-protecting FK in this chain -- an approval decision, once
-- recorded against an intent, must never become orphaned by that
-- intent's deletion (though public.execution_intents itself has no
-- DELETE path anywhere in this schema either, so this is defensive
-- correctness matching established convention, not an active
-- operational concern).
--
-- DECISION -- CLOSED, THREE VALUES, NO "not_required": `check (decision
-- in ('approved', 'rejected', 'revoked'))`. Per the Phase 16B.2b-6b/6c
-- settled policy, this table never represents "approval was not
-- required" -- that is not a decision anyone makes about a specific
-- intent, it would be a POLICY FACT about a class of action, and no
-- trusted source for that fact exists anywhere in this repository. Since
-- no row in this table can ever assert it, Shape A (a future,
-- separately-gated writer) cannot derive `human_approval_state =
-- 'not_required'` from this table, structurally -- exactly the Phase
-- 16B.2b-6b instruction that "Shape A must never write human_approval_
-- state = 'not_required'" is enforced, in part, by this table simply
-- having no vocabulary value that could ever produce it.
--
-- ACTOR_ID -- NOT NULL, ON DELETE RESTRICT, PROTECTED PROVENANCE: matches
-- public.execution_authorisers.granted_by's and public.execution_
-- intents.created_by_actor_id's identical treatment -- an approval,
-- rejection, or revocation decision with no recorded human actor would
-- defeat the entire evidentiary purpose of this table. Deleting an
-- auth.users row that has ever recorded a decision here will fail while
-- this table still references it, forcing a deliberate future
-- offboarding/anonymisation decision rather than silently losing who
-- made a security-significant judgement call.
--
-- EXECUTION_AUTHORISER_GRANT_ID -- NOT NULL, ON DELETE RESTRICT, THE
-- EXACT GRANT INCARNATION, NEVER INFERRED: per the Phase 16B.2b-6b/6c
-- settled policy, approval authority comes from an active public.
-- execution_authorisers grant with capability = 'execution_authoriser'
-- -- NOT admin, NOT execution_controller, and never automatically mapped
-- from either. This column is NOT optional for a valid decision row (`not
-- null`, unlike public.execution_authorizations.execution_authoriser_
-- grant_id's own deliberately nullable treatment, 20260822120000...sql,
-- where the underlying "does every authorization always require a
-- grant" question was, at that time, still open) -- the Phase 16B.2b-6b/
-- 6c preflight has now settled, specifically for approval decisions,
-- that this provenance is mandatory, not optional. This column references
-- the SPECIFIC grant row relied upon -- "the exact grant incarnation
-- that established authority at the relevant time," matching the
-- identical discipline execution_authorisers.id was originally added
-- for (20260821120000...sql's own Phase 16B.2a remediation) -- never
-- a caller-supplied capability string, and never inferred from actor_id
-- alone. `on delete restrict` matches every other grant-reference FK in
-- this chain.
--
-- NO CAPABILITY FIELD, NO ADMIN/EXECUTION_CONTROLLER MAPPING: this table
-- has no `capability` column of its own and no logic of any kind (there
-- is no logic here at all -- this is a schema-only migration) that could
-- ever infer execution_authoriser status from admin role or execution_
-- controller capability. The execution_authoriser_grant_id FK, by
-- construction, can only ever reference a row in public.execution_
-- authorisers -- and that table's own capability column remains closed
-- to exactly ('execution_authoriser', 'execution_controller'), with the
-- Phase 16B.2b-5o security invariant (no inference between the two)
-- fully intact and untouched by this migration.
--
-- REASON / EVIDENCE_REFERENCE -- OPTIONAL, MATCHING ESTABLISHED
-- PRECEDENT: both nullable text, no length bound or canonicalisation
-- imposed at the schema level, matching public.execution_control_events.
-- reason/evidence_reference's identical shape (20260822180000...sql) and
-- public.suppression_records.reason/notes' own "just store what's given"
-- treatment. Any stricter validation (required, bounded length) is a
-- future writer-level responsibility, not encoded here, matching this
-- chain's own "writer enforces stricter than the bare schema" pattern
-- used throughout.
--
-- DELIBERATELY EXCLUDED, PER THE PHASE 16B.2b-6c AUTHORISATION'S OWN
-- EXPLICIT PROHIBITION: no expires_at column -- approval has no
-- independent TTL in v1; it remains current according to the latest
-- trusted decision for the immutable intent it references, per the
-- Phase 16B.2b-6b/6c settled policy (Shape A's own separately-approved
-- 15-minute authorization TTL is an entirely different value, on an
-- entirely different table, governing an entirely different fact). No
-- approval_not_required representation of any kind (see "DECISION"
-- above). No action_class or policy-taxonomy column -- that remains the
-- same deferred, evidence-less future primitive already declined at
-- public.execution_intents' own construction. No mutable current-state
-- column -- see "APPEND-ONLY MODEL" above. No generic capability field --
-- see "NO CAPABILITY FIELD" above.
--
-- INDEXES -- LATEST-DECISION LOOKUP, PLUS GRANT PROVENANCE, MATCHING
-- ESTABLISHED PRECEDENT: `execution_intent_approvals_intent_id_idx` on
-- `(execution_intent_id, id desc)` -- a composite index whose column
-- order and DESC direction on id directly support the query shape a
-- future reader will use ("the latest decision for this intent"): `...
-- WHERE execution_intent_id = ? ORDER BY id DESC LIMIT 1`, matching the
-- same intent behind public.execution_control_events_created_at_idx's
-- own descending-order precedent, but composite here (execution_
-- intent_id first) since lookups are always scoped to one intent, unlike
-- execution_control_events' single global timeline. A second, plain
-- index on `execution_authoriser_grant_id` supports the provenance
-- lookup direction ("which approval decisions relied on this grant"),
-- matching the established convention of every other grant-reference FK
-- in this chain receiving its own index (public.execution_authorizations.
-- execution_intent_id_idx and .compliance_decision_id_idx, both
-- 20260822120000/20260822160000...sql). No unique or partial-unique
-- index of any kind is added -- per the Phase 16B.2b-6c authorisation's
-- own explicit instruction not to invent uniqueness preventing
-- historical multiple decisions; an intent may legitimately accumulate
-- any number of decision rows over its history (approve, later revoke,
-- later re-approve, and so on), each with its own permanent id.
--
-- CONCURRENCY -- DOCUMENTED FOR FUTURE WRITERS ONLY, NOT IMPLEMENTED
-- HERE: per the Phase 16B.2b-6c authorisation, this schema-only
-- migration does not create any writer, and therefore cannot itself
-- serialize concurrent decision creation. Any future approval writer
-- (approve_execution_intent()/reject_execution_intent(), not part of
-- this migration) MUST serialize decision creation per execution intent
-- by locking the referenced `public.execution_intents` row (`select ...
-- from public.execution_intents where id = p_execution_intent_id for
-- update` or an equivalent share/update lock, exact mode to be settled
-- when that writer is actually designed) BEFORE reading the current
-- (latest) approval state and inserting a new decision row -- this
-- prevents an uncontrolled approve-vs-reject race from producing an
-- ambiguous "latest row" outcome, using the target intent row itself as
-- the per-intent serialization primitive rather than any new, separate
-- mutex table. The future Shape A execution-authorization writer, when
-- it resolves approval evidence for that same intent, should use a
-- COMPATIBLE locking strategy against the SAME `execution_intents` row
-- -- so that approval-state mutation cannot race authorization creation
-- for the same intent -- rather than any additional lock target. No new
-- mutex table is created here, or anywhere in this design: public.
-- execution_control_lock remains reserved exclusively for emergency
-- STOP/RELEASE serialization (Phase 16B.2b-5p's own explicit scope), and
-- is not referenced, extended, or implied by this migration in any way.
--
-- RLS / PRIVILEGES -- MATCHING THE MOST RECENT, HIGH-SECURITY FACTORY
-- 041 CONVENTION, NOT THE OLDER, MORE PERMISSIVE ONE: every foundation
-- table built in this chain since public.execution_intents
-- (20260822100000...sql) -- execution_intents itself, execution_
-- authorisers, compliance_decisions, execution_control_events, execution_
-- control_lock -- uses RLS enabled with ZERO policies (full default-deny
-- for every row, every role, every direction, including SELECT for
-- authenticated) plus explicit `revoke all ... from anon/authenticated`
-- as a second layer. This is deliberately NOT public.suppression_
-- records' or public.audit_log's older, more permissive convention
-- (direct authenticated SELECT/INSERT access) -- those predate this
-- chain's high-security foundation pattern and are the wrong precedent
-- to follow for a security-significant approval-evidence table.
-- SELECT ACCESSIBILITY, REPORTED EXPLICITLY PER THE PHASE 16B.2b-6c
-- INSTRUCTION: precedent here is NOT ambiguous -- every one of the five
-- tables just named uses zero policies, with no SELECT policy of any
-- kind for authenticated, and any future read access is instead exposed
-- through a narrow SECURITY DEFINER reader function (matching public.
-- evaluate_execution_emergency_stop()'s and public.evaluate_suppression_
-- live()'s own pattern for their respective locked-down tables). This
-- migration follows that same convention exactly: RLS enabled, zero
-- policies, no SELECT policy of any kind, explicit REVOKE ALL from anon
-- and authenticated. This creates no browser/application mutation
-- surface of any kind -- no application role can SELECT, INSERT, UPDATE,
-- or DELETE any row in this table through any path this migration
-- creates.
--
-- FAIL-CLOSED ON UNEXPECTED PRE-EXISTENCE, PER THE PHASE 16B.2b-6c-R1
-- ARCHITECT CORRECTION: an earlier draft used CREATE TABLE IF NOT EXISTS
-- and CREATE INDEX IF NOT EXISTS throughout, reasoning that this table
-- was an ordinary additive evidence table -- unlike public.execution_
-- control_lock's own CREATE TABLE, which establishes a structural
-- singleton security BOUNDARY -- and so did not need the fail-loud
-- treatment already applied to the Phase 16B.2b-5o-R1/5p-R1/5q-R1
-- corrections. The architect correction identified that this table is
-- nonetheless part of the trusted execution-authorization EVIDENCE
-- chain: it is security-significant in its own right, not merely
-- incidental schema, and if it or either of its expected indexes
-- unexpectedly already existed -- a naming collision, a partially
-- applied prior attempt, or any other form of drift -- `IF NOT EXISTS`
-- would silently accept whatever that existing object's structure
-- happened to be, without ever proving it actually matches the shape
-- this migration expects. This migration must instead PROVE its assumed
-- starting state is real by letting PostgreSQL abort loudly ("relation
-- ... already exists") if any of the three names below is already
-- taken, rather than quietly building on top of an unverified object --
-- the identical fail-closed-on-schema-drift reasoning already applied to
-- the capability CHECK constraint replacement in Phase 16B.2b-5o-R1, the
-- coordination-lock table in Phase 16B.2b-5p-R1, and the controller-
-- grant provenance column in Phase 16B.2b-5q-R1. This migration is
-- expected to run at most once per environment, like every other
-- migration in this repository -- the difference here is that a
-- genuinely abnormal rerun now fails loudly instead of being silently
-- absorbed.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6c authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create table public.execution_intent_approvals (
  id bigint generated always as identity primary key,

  created_at timestamptz not null
    default transaction_timestamp(),

  execution_intent_id bigint not null
    references public.execution_intents (id)
    on delete restrict,

  decision text not null
    check (decision in ('approved', 'rejected', 'revoked')),

  actor_id uuid not null
    references auth.users (id)
    on delete restrict,

  execution_authoriser_grant_id bigint not null
    references public.execution_authorisers (id)
    on delete restrict,

  reason text,
  evidence_reference text
);

-- Supports "the latest decision for this intent" -- see "INDEXES" above.
create index execution_intent_approvals_intent_id_idx
  on public.execution_intent_approvals (execution_intent_id, id desc);

-- Provenance lookup direction: which approval decisions relied on a
-- given execution_authoriser grant -- see "INDEXES" above.
create index execution_intent_approvals_grant_id_idx
  on public.execution_intent_approvals (execution_authoriser_grant_id);

-- RLS enabled, zero policies -- see "RLS / PRIVILEGES" above.
alter table public.execution_intent_approvals enable row level security;

-- Explicit second layer -- see "RLS / PRIVILEGES" above.
revoke all on public.execution_intent_approvals from anon;
revoke all on public.execution_intent_approvals from authenticated;

-- ROLLBACK (documented, not executed): since no writer, RLS policy, or
-- application code depends on this table, nothing could reference it.
-- drop index if exists public.execution_intent_approvals_grant_id_idx;
-- drop index if exists public.execution_intent_approvals_intent_id_idx;
-- drop table if exists public.execution_intent_approvals;
