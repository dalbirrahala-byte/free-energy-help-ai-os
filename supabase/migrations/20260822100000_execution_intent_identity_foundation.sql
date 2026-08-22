-- Factory 041 Phase 16B.2b-3: execution intent identity foundation.
--
-- WHY THIS EXISTS: the Phase 16B.2b-2 architecture preflight (and its
-- Phase 16B.2b-2 correction gate) established that Factory 041's existing
-- `action_id` (public.execution_authorizations, and the dormant
-- public.create_execution_authorization() RPC, 20260821110000) is
-- caller-supplied free text with no real production producer and no
-- referential backing -- it cannot serve as a trustworthy identity for
-- "the one specific proposed controlled action FEH intends to attempt."
-- This migration builds exactly that missing identity, as a standalone,
-- schema-only, fully locked-down foundation: one row = one recipient +
-- one channel + one proposed action, created before any human review,
-- any compliance evaluation, or any authorization decision ever happens.
--
-- PERSISTENCE OF AN INTENT IS NOT AUTHORITY: this is the single most
-- important property of this table, and it is enforced by omission, not
-- by comment alone. There is no approval column, no authorization
-- column, no compliance-verdict column, no destination-commitment
-- column, no content-commitment column, no provider/execution-outcome
-- column, and no kill-switch-state column anywhere in this table. A row
-- existing here proves only that FEH proposed to do something -- never
-- that it may, or that anyone reviewed or approved it.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY this one
-- table, its CHECK constraints, its indexes, RLS enablement with zero
-- policies, and two REVOKE statements. It does NOT create a writer
-- function, does NOT modify public.create_execution_authorization(),
-- public.execution_authorizations, public.execution_authorisers,
-- public.derive_destination_commitment(), any Phase 11 destination-
-- resolution code, or any application/TypeScript file. No existing
-- migration is altered.
--
-- CONTACT/ORGANISATION IDENTITY -- CORRECTED PER THE PHASE 16B.2b-2
-- ARCHITECT CORRECTION GATE: an earlier draft proposed `contact_id
-- bigint not null ... on delete set null`, which the architect correctly
-- identified as internally inconsistent -- a NOT NULL column cannot be
-- the target of an ON DELETE SET NULL action without producing a NOT
-- NULL constraint violation at the exact moment that action would fire,
-- which would not degrade gracefully; it would simply block the
-- deletion with a confusing error instead of a clean, intentional one.
-- Both `contact_id` and `organisation_id` are therefore `not null ...
-- on delete restrict` below, matching the architect's explicit
-- preference and matching the strongest existing precedent already in
-- this exact schema: public.contacts.organisation_id itself is `bigint
-- not null references public.organisations (id) on delete restrict`
-- (20260818100000_organisation_identity_foundation.sql:250). That same
-- fact is also this migration's legacy-data/compatibility proof: because
-- every live public.contacts row is already guaranteed (by that
-- existing NOT NULL + RESTRICT constraint) to carry a valid,
-- non-dangling organisation_id, deriving execution_intents.
-- organisation_id as NOT NULL introduces zero legacy-data risk -- no
-- contact row today, or reachable in the future under the existing
-- schema's own constraints, could produce a null or broken organisation
-- link.
--
-- GDPR/RETENTION CONSEQUENCE OF ON DELETE RESTRICT, STATED PLAINLY, NOT
-- ASSUMED AWAY: a contact can never be deleted while any
-- execution_intents row references it -- including a very old,
-- superseded, never-approved, never-executed intent. A future
-- right-to-erasure workflow will need a deliberate procedure to handle
-- intent history before a contact can be hard-deleted. This is not a
-- new category of obstacle this migration introduces -- it is the exact
-- same discipline public.contacts.organisation_id already imposes on
-- organisation deletion today, applied consistently to intent
-- provenance rather than left inconsistent with it.
--
-- ORGANISATION_ID IS NOT CALLER-DERIVED: there is no writer for this
-- table yet (see "NO WRITER IN THIS PHASE" below). When a future writer
-- is built, organisation_id must be derived internally from the
-- writer's own trusted read of the selected contact_id's row -- never
-- accepted as a caller parameter -- matching the identical discipline
-- already established for every other security-relevant derived value
-- in this Factory 041 chain (idempotency_key, policy_version,
-- execution_authoriser_grant_id, the destination itself in
-- derive_destination_commitment). This migration does not implement
-- that derivation (there is no writer to implement it in), but the
-- column shape (NOT NULL, no default, FK-backed) is designed
-- specifically so that future derivation is the only coherent way to
-- populate it.
--
-- ACTION_ID IS NOT NULL, CANONICAL, PER THE PHASE 16B.2b-3 REMEDIATION
-- GATE: an execution intent is defined as "one specific proposed
-- controlled action, to one specific contact, through one specific
-- channel" -- action_id cannot be blank, since a blank label cannot
-- represent a definite action. It remains explicitly NOT the intent's
-- identity (public.execution_intents.id is the sole immutable identity,
-- see the header above) and carries no FK, no uniqueness, and no
-- taxonomy of its own -- it is a descriptive/lookup label only,
-- unchanged in kind from its existing role on public.
-- execution_authorizations. Its two constraints below mirror that
-- table's own established action_id constraints exactly:
-- execution_authorizations_action_id_length_check (char_length(btrim(
-- action_id)) between 1 and 200, 20260820100000_execution_authorization_
-- foundation.sql) and execution_authorizations_action_id_canonical_check
-- (the stored value already equals its own trimmed form, same
-- migration) -- not a new invention, a direct mirror.
--
-- ACTOR PROVENANCE, CORRECTED PER THE PHASE 16B.2b-3 REMEDIATION GATE:
-- an earlier draft permitted created_by_actor_type = 'system' together
-- with a populated created_by_actor_id, which is semantically ambiguous
-- -- FEH currently has no system-actor registry, so a 'system'-attributed
-- intent carrying a human auth.users id does not clearly mean "this
-- human configured the system that acted" or anything else well-defined.
-- The single CHECK constraint below now enforces an exact biconditional
-- instead of the previous one-directional rule: 'human' if and only if
-- created_by_actor_id is populated; 'system' if and only if it is null.
-- No system-actor table is introduced, the actor vocabulary is not
-- expanded beyond ('human', 'system'), and no broader actor framework is
-- built -- identifiable AI/workflow/system actors, if FEH ever needs to
-- distinguish one automated initiator from another, remain a candidate
-- for their own separately-reviewed model in a future phase; this
-- migration does not anticipate or partially build toward that shape.
--
-- ORGANISATION/CONTACT CONSISTENCY -- A FUTURE WRITER INVARIANT, NOT A
-- SCHEMA-ENFORCED ONE, DOCUMENTED EXPLICITLY: this schema does NOT
-- independently prove that execution_intents.organisation_id equals the
-- organisation_id currently on the referenced contacts row -- there is
-- no trigger enforcing this, and public.contacts is not modified by this
-- migration to add one. That invariant must be established by the
-- future controlled INSERT writer (see "NO WRITER IN THIS PHASE"
-- below), which must accept contact_id as a lookup key, load
-- organisation_id from public.contacts internally, and never accept
-- organisation_id as a caller parameter -- exactly the same "derive,
-- never accept" discipline already documented above under "ORGANISATION_
-- ID IS NOT CALLER-DERIVED." Because no application role can currently
-- insert an execution_intents row at all (see "PRIVILEGE POSTURE"
-- below), this is a documented future-writer obligation, not a
-- presently-exploitable application vulnerability -- there is, today,
-- no path by which organisation_id and contact_id could ever be written
-- inconsistently by anything other than a privileged direct-connection
-- actor choosing to do so deliberately.
--
-- ACTION_CLASS DEFERRED, PER THE PHASE 16B.2b-2 CORRECTION GATE: a
-- repository-wide search for any existing action/action-class
-- vocabulary (action_class, ActionClass, actionType, action_type,
-- ActionCategory, RecommendedAction) found no repository-backed
-- taxonomy matching the Factory 041 retrospective's speculative
-- categories (inbound service, routine service, human outbound,
-- automated follow-up, AI marketing, high-risk automated) -- the one
-- near-hit, deriveNextRecommendedAction in frontend/src/lib/renewals/
-- case-engine.ts, belongs to an entirely unrelated domain (renewal-case
-- workflow recommendations). No action_class column is included in this
-- migration. Adding one later, once a real vocabulary exists, is a
-- small, additive, separately-reviewed ALTER TABLE -- not attempted
-- here.
--
-- DUPLICATE INTENTS ARE PERMITTED, DELIBERATELY: no UNIQUE or
-- deduplication constraint of any kind exists on this table. Two
-- structurally identical execution intents (same contact_id,
-- requested_channel, and action_id) may coexist. Execution-intent
-- identity is not idempotency -- that remains a separate, narrower
-- concern belonging to execution_authorizations' own existing
-- idempotency_key mechanism, which governs "has this specific
-- authorization already been granted," not "has this action already
-- been proposed." Deduplication/requeue policy, if FEH ever wants one,
-- belongs to a future controlled producer's own application-layer
-- logic, not a database invariant on this foundation table. No
-- repository precedent (public.tasks, public.activities, or any other
-- table) enforces uniqueness on a comparable "proposed action" concept,
-- confirming this is not a departure from existing convention.
--
-- SUPERSEDES POINTER IS INFORMATIONAL ONLY, NOT SECURITY-LOAD-BEARING:
-- supersedes_execution_intent_id exists purely for audit-narrative
-- value (so a human reviewing history can see that one intent replaced
-- another). The actual security guarantee -- that a human approval of
-- one execution intent can never authorise a different, later-changed
-- one -- comes entirely from every material change producing a brand
-- new, immutable row with its own unconnected id (see "IMMUTABILITY"
-- below), never from this pointer being set correctly. A future
-- producer may create an entirely unrelated new intent without ever
-- populating this column, and that remains safe.
--
-- CREATED_BY_ACTOR MODEL, DELIBERATELY MINIMAL: created_by_actor_type
-- (closed to 'human' or 'system') plus created_by_actor_id (nullable,
-- FK to auth.users) is a simple two-column split, not a full actor-
-- abstraction framework -- no broader actor model exists anywhere in
-- this repository to build on, and inventing one without evidence is
-- out of scope.
--
-- CREATED_BY_ACTOR_ID FK ACTION -- CORRECTED PER A SECOND PHASE
-- 16B.2b-3 REMEDIATION PASS: this column was originally `on delete set
-- null`, reasoning that it was mere audit metadata (matching public.
-- execution_authorizations.actor_id's own `on delete set null`
-- precedent, 20260820100000...sql:150). That reasoning did not account
-- for its interaction with execution_intents_actor_provenance_check
-- (below), which requires created_by_actor_id to be NOT NULL exactly
-- when created_by_actor_type = 'human'. For an existing human-created
-- row, `on delete set null` firing on the referenced auth.users row's
-- deletion would attempt to write actor_type = 'human' together with
-- actor_id = NULL into the same row -- a state the CHECK constraint
-- itself forbids. This is not a graceful degradation; it is a
-- constraint violation at the exact moment the FK action fires, the
-- same class of internally-inconsistent lifecycle interaction already
-- corrected once before in this migration for contact_id (see
-- "CONTACT/ORGANISATION IDENTITY" above). created_by_actor_id is
-- therefore `on delete restrict`: created_by_actor_id identifies the
-- exact human who created the intent -- this is provenance, not
-- disposable secondary metadata, and silently nulling it would both
-- conflict with the approved truth table and destroy creator identity
-- without visible failure. RESTRICT instead makes deleting that
-- auth.users row fail visibly while any human-created intent still
-- references it, exactly mirroring execution_authorisers.granted_by's
-- own reasoning for the identical class of "protects an active
-- provenance fact" column (20260821120000...sql:152-176) -- this
-- column is reclassified from execution_authorizations.actor_id's
-- disposable-metadata treatment to execution_authorisers.granted_by's
-- protected-provenance treatment. Future staff-offboarding or
-- anonymisation, if ever needed, remains a separate, deliberate,
-- future-designed procedure -- not solved by this migration, and not
-- silently enabled by weakening this FK back to SET NULL.
--
-- NO EQUIVALENT LIFECYCLE CONTRADICTION ELSEWHERE IN THIS MIGRATION,
-- RE-CHECKED EXPLICITLY: organisation_id (not null, on delete restrict)
-- and contact_id (not null, on delete restrict) both pair NOT NULL with
-- RESTRICT, the only combination of the two that cannot produce this
-- class of conflict (RESTRICT never attempts to write anything into the
-- referencing row; it simply blocks the referenced row's deletion
-- outright). source_id (nullable, on delete set null) and
-- supersedes_execution_intent_id (nullable, on delete set null) both
-- pair a NULLABLE column with SET NULL -- the only combination of the
-- two that is always safe, since writing NULL into an already-nullable
-- column can never violate a NOT NULL constraint, and neither column is
-- referenced by any CHECK constraint that would forbid it being null
-- under any other column's value. No other NOT NULL column in this
-- table carries a foreign key at all (requested_channel, action_id,
-- created_by_actor_type are NOT NULL but are not FKs, so no delete
-- action applies to them).
--
-- IMMUTABILITY -- DB-LEVEL PRIVILEGE/RLS REVOCATION ALONE IS SUFFICIENT
-- FOR THIS PHASE, NO TRIGGER IS INTRODUCED: RLS is enabled with zero
-- policies, and table privileges are additionally revoked explicitly
-- from anon and authenticated below -- see "PRIVILEGE POSTURE" for why
-- the explicit revoke is required even though no GRANT for this table
-- appears anywhere in this repository's migration history. Together,
-- this means NO application-facing role -- not anon, not authenticated
-- -- can SELECT, INSERT, UPDATE, or DELETE any row in this table at
-- all, from any direction, today. The "immutability" question is
-- therefore moot at the privilege layer until a writer exists: nothing
-- can mutate what nothing can touch. Once a future controlled writer is
-- built, immutability becomes that writer's own design responsibility
-- (it should only ever INSERT new rows, never issue UPDATE/DELETE
-- against an existing row's meaning) -- the identical discipline already
-- used for execution_authorisers' own future writer (insert-and-revoke-
-- via-a-new-row, never mutate meaning in place). No BEFORE UPDATE/
-- BEFORE DELETE trigger is introduced now, since there is no writer yet
-- for one to guard against, and adding one preemptively would be
-- defending against a component that does not exist -- not "an
-- elaborate immutability framework" this phase's authorisation
-- explicitly cautions against.
--
-- NO WRITER IN THIS PHASE: no function exists anywhere to insert a row
-- into this table. Creating an execution intent is not possible through
-- any application-reachable path after this migration is applied --
-- only a privileged direct-connection actor could write a row today,
-- exactly mirroring how public.execution_authorisers' own bootstrap gap
-- was documented (20260821120000...sql). A dedicated, independently
-- reviewed, itself-dormant-at-creation writer function is explicitly
-- deferred to a future, separately-approved phase.
--
-- PRIVILEGE POSTURE: PostgreSQL's platform-wide default-privilege rule
-- for the public schema (never issued by any migration in this repo,
-- confirmed separately for public.execution_authorizations by
-- 20260821100000's own header and for public.execution_authorisers by
-- 20260821120000's own header) grants full table privileges to anon,
-- authenticated, and service_role automatically at CREATE TABLE time.
-- This migration explicitly revokes all such privileges from anon and
-- authenticated as a second, independent layer beyond RLS -- the exact
-- same defence-in-depth reasoning already applied to
-- public.execution_authorizations (20260821100000) and
-- public.execution_authorisers (20260821120000). service_role and the
-- table owner (postgres) are untouched, matching every prior
-- migration's convention in this repository.
--
-- SAFE / IDEMPOTENT: CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT
-- EXISTS are both safe to rerun. REVOKE of a privilege a role does not
-- hold is a no-op in PostgreSQL.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only,
-- per the Phase 16B.2b-3 authorisation. Must NOT be run against
-- Supabase, staged, committed, or pushed until a separate, explicit
-- authorisation is given.

create table if not exists public.execution_intents (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default transaction_timestamp(),

  organisation_id bigint not null
    references public.organisations (id) on delete restrict,
  contact_id bigint not null
    references public.contacts (id) on delete restrict,
  requested_channel text not null
    check (requested_channel in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')),
  action_id text not null,
  source_id bigint
    references public.source_registry (id) on delete set null,
  campaign_id text,

  supersedes_execution_intent_id bigint
    references public.execution_intents (id) on delete set null,

  created_by_actor_type text not null
    check (created_by_actor_type in ('human', 'system')),
  created_by_actor_id uuid
    references auth.users (id) on delete restrict,

  -- Mirrors execution_authorizations_action_id_length_check exactly
  -- (20260820100000_execution_authorization_foundation.sql).
  constraint execution_intents_action_id_length_check
    check (char_length(btrim(action_id)) > 0 and char_length(btrim(action_id)) <= 200),
  -- Mirrors execution_authorizations_action_id_canonical_check exactly
  -- (same migration).
  constraint execution_intents_action_id_canonical_check
    check (action_id = btrim(action_id)),

  -- Exact biconditional truth table required by the Phase 16B.2b-3
  -- remediation gate: 'human' iff created_by_actor_id is populated;
  -- 'system' iff it is null. Replaces the earlier one-directional check.
  constraint execution_intents_actor_provenance_check
    check ((created_by_actor_type = 'human') = (created_by_actor_id is not null))
);

-- "Show all intents for this contact," and the eventual join target for
-- future approval/authorization rows referencing execution_intent_id.
create index if not exists execution_intents_contact_id_idx
  on public.execution_intents (contact_id);

-- Matches execution_authorizations_organisation_id_idx's own established
-- precedent of indexing both the contact and organisation paths
-- independently, rather than relying solely on the contact_id index.
create index if not exists execution_intents_organisation_id_idx
  on public.execution_intents (organisation_id);

-- Matches execution_authorizations_source_id_idx's identical partial-
-- index precedent (20260820100000...sql).
create index if not exists execution_intents_source_id_idx
  on public.execution_intents (source_id)
  where source_id is not null;

-- Supports a future campaign-level bulk-approval join (many
-- execution_intents rows sharing one campaign_id, reviewed together).
create index if not exists execution_intents_campaign_id_idx
  on public.execution_intents (campaign_id)
  where campaign_id is not null;

-- Matches execution_authorizations_created_at_idx's identical precedent
-- for chronological/audit browsing.
create index if not exists execution_intents_created_at_idx
  on public.execution_intents (created_at desc);

-- RLS enabled, zero policies -- see "IMMUTABILITY" above. Default-deny
-- for every row, for every role subject to RLS, in every direction
-- (SELECT/INSERT/UPDATE/DELETE alike).
alter table public.execution_intents enable row level security;

-- Explicit second layer -- see "PRIVILEGE POSTURE" above. Removes
-- whatever this table would otherwise inherit from Supabase's
-- platform-wide public-schema default privileges.
revoke all on public.execution_intents from anon;
revoke all on public.execution_intents from authenticated;

-- ROLLBACK (documented, not executed): since no writer, RLS policy, or
-- application code depends on this table, nothing could reference it,
-- other than a future row's own supersedes_execution_intent_id
-- self-reference, which ON DELETE SET NULL already handles safely.
-- drop table if exists public.execution_intents;
