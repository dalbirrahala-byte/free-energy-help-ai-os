-- Factory 041 Phase 16B.2a: execution-authoriser capability provenance
-- foundation.
--
-- WHY THIS EXISTS: Phase 16B.1 (20260821110000_execution_authorization_
-- controlled_creation.sql) established that public.create_execution_
-- authorization() cannot safely create a row because, among other gaps,
-- no persisted record proves a given human holds authority to authorise
-- execution. This migration closes exactly that one gap and no other --
-- it persists WHO currently holds the narrowly-defined capability to
-- authorise execution, WHO granted it, WHEN, and (if applicable) WHO
-- revoked it and WHEN. It does not itself grant, check, or consume that
-- capability anywhere -- see "NO WRITER IN THIS PHASE" below.
--
-- WHY GLOBAL CAPABILITY, NOT ORGANISATION MEMBERSHIP: an earlier draft of
-- this phase (superseded) proposed an organisation-scoped
-- organisation_members table. The Phase 16B.2a architect clarification
-- gate investigated public.organisations directly and found it documents
-- itself as "canonical FEH business identity" (20260818100000_
-- organisation_identity_foundation.sql:186) -- i.e. organisations are
-- FEH's own customers/prospects, not separate tenants of this CRM. FEH is
-- a single-tenant internal system: ADR-008 (frontend/src/lib/auth/
-- roles.ts:6-9) states explicitly "organisation-wide authenticated
-- access... no multi-tenancy," and every existing RLS SELECT policy on an
-- organisation-scoped table is unconditionally `using (true)` for any
-- authenticated user -- there is no precedent anywhere in this schema for
-- restricting a human to a subset of organisations. Introducing
-- organisation-scoped membership here would not close a gap consistently
-- with the rest of the architecture; it would be the one exception no
-- other read or write path respects. The capability persisted below is
-- therefore deliberately global (per-user, not per-user-per-organisation)
-- -- it answers only "may this human authorise execution at all," never
-- "for which organisation."
--
-- PERSISTENCE ALONE IS NOT AUTHORITY: the existence of a row in this
-- table, even a live/unrevoked one, does not itself authorise anything.
-- public.create_execution_authorization() does not read this table in
-- this phase (it still contains no INSERT path at all, per Phase 16B.1),
-- and no other function reads it either. This migration is schema only.
--
-- NO WRITER IN THIS PHASE: no function exists anywhere to insert, update,
-- or "revoke" a row in this table. Granting or revoking the
-- 'execution_authoriser' capability is not possible through any
-- application-reachable path after this migration is applied -- only a
-- privileged direct-connection actor (e.g. the Supabase SQL editor under
-- a service-role/postgres session) could write a row today, exactly
-- mirroring how public.user_roles' own first admin row must be bootstrapped
-- (20260805100000_user_roles.sql:59-65). A dedicated grant_execution_
-- authoriser()/revoke_execution_authoriser() SECURITY DEFINER writer pair,
-- each independently reviewed and each itself created dormant (EXECUTE
-- revoked from PUBLIC/anon/authenticated at creation, matching the
-- 20260821110000 precedent), is explicitly deferred to a future,
-- separately-approved phase. Building it is NOT authorised by this
-- migration.
--
-- NO APPLICATION ACCESS: RLS is enabled with zero policies (full
-- default-deny for every role subject to RLS, including authenticated),
-- and table privileges are additionally revoked explicitly from anon and
-- authenticated below -- see "PRIVILEGE POSTURE" for why the explicit
-- revoke is required even though no GRANT for this table appears anywhere
-- in this repository's migration history.
--
-- create_execution_authorization REMAINS DORMANT: this migration does not
-- touch public.create_execution_authorization(), public.
-- execution_authorizations, or any privilege/grant established by
-- 20260821100000 or 20260821110000. EXECUTE on the Phase 16B.1 function
-- remains revoked from PUBLIC, anon, and authenticated exactly as it was
-- before this migration.
--
-- SCHEMA SHAPE -- STABLE GRANT IDENTITY (Phase 16B.2a remediation): the
-- first local draft of this migration omitted a surrogate id, reasoning
-- that (user_id, capability) plus the partial unique index already
-- covered the one invariant that mattered (at most one ACTIVE grant at a
-- time). The architect remediation gate correctly identified this as
-- insufficient: a user may legitimately grant -> revoke -> re-grant the
-- same capability over time, producing multiple historical rows that
-- share the same (user_id, capability) pair with different granted_at/
-- revoked_at values -- and a future execution-approval provenance record
-- must be able to name the EXACT grant incarnation that established
-- authority at the relevant time, not merely "some grant of this
-- capability to this user, at approximately this time." Binding security
-- provenance to a timestamp tuple (user_id, capability, granted_at)
-- instead of an immutable id would be materially worse: granted_at has
-- microsecond resolution but is not guaranteed distinct if a future
-- writer ever processes concurrent grants in the same transaction, and
-- more importantly a timestamp is not a stable foreign-key target in the
-- same sense a generated identity column is -- it invites exactly the
-- class of "is this the same fact or merely a coincidentally similar one"
-- ambiguity an immutable primary key exists to remove. `id` is therefore
-- added as the sole stable, immutable, non-caller-derived identifier for
-- one grant record. It identifies the row only -- it confers no
-- authority by itself, matching every other id-primary-keyed table in
-- this schema (e.g. public.organisations, public.contacts,
-- public.execution_authorizations), and it exists specifically so a
-- future execution_approvals-style table (Phase 16B.2, not part of this
-- migration) can carry a granting_execution_authoriser_id-style FK
-- pointing at the exact row, rather than reconstructing "which grant"
-- from a timestamp comparison.
--
-- IDENTITY COLUMN TYPE -- GENERATED ALWAYS, NOT GENERATED BY DEFAULT: the
-- architect's stated preference was `generated by default as identity`.
-- Repository evidence does not support that choice here and a materially
-- better, already-dominant convention exists: every table created since
-- 20250727180000_customers_and_sites.sql -- including every Factory 041
-- table, e.g. 20260820100000_execution_authorization_foundation.sql:133
-- and 20260818100000_organisation_identity_foundation.sql:190,249,326,475
-- -- uses `generated always as identity primary key`. Only the oldest
-- surviving migration in this repository (20250601000000_baseline_leads_
-- tasks_activities.sql) uses `generated by default`, predating the
-- `always` convention this repo settled on. Beyond precedent, `always` is
-- also the objectively correct choice against this migration's own stated
-- requirement that the id "must never be caller-derived": `GENERATED
-- ALWAYS AS IDENTITY` refuses any INSERT that supplies an explicit id
-- value at all (an `OVERRIDING SYSTEM VALUE` clause would be required to
-- force one through, and nothing in this migration or any future writer
-- authorised so far does that); `GENERATED BY DEFAULT AS IDENTITY`, by
-- contrast, silently accepts a caller-supplied id on ordinary INSERT,
-- which is precisely the property this column must not have. `always` is
-- used below; reported here per the fail-closed instruction to surface
-- this before, not instead of, applying it.
--
-- REVOCATION INTEGRITY -- TWO CANDIDATE CHECKS, ONE IMPLEMENTED: the
-- natural pairing "revoked_at IS NULL <=> revoked_by IS NULL" splits into
-- two implications.
--   (a) revoked_at IS NULL => revoked_by IS NULL: implemented below
--       (execution_authorisers_active_grant_revoked_by_null_check). This
--       direction has no interaction with either column's FK lifecycle --
--       it constrains two columns on the same row with no cross-row or
--       cross-table trigger, so it is unconditionally safe.
--   (b) revoked_at IS NOT NULL => revoked_by IS NOT NULL: deliberately
--       NOT implemented as a CHECK constraint. revoked_by references
--       auth.users(id) ON DELETE SET NULL (per this phase's authorised
--       column spec). If the admin recorded in revoked_by is later
--       deleted from auth.users, Postgres performs that SET NULL as part
--       of the same statement that deletes the referencing auth.users
--       row -- at that moment revoked_at on this row is unchanged (still
--       NOT NULL) while revoked_by has just become NULL. A hard CHECK
--       enforcing (b) would then fail during that UPDATE, which aborts
--       the entire deleting transaction -- in effect, ANY admin who has
--       ever revoked ANY grant would become permanently undeletable from
--       auth.users, an unbounded and surprising lifecycle side effect
--       this migration should not silently introduce. (a) alone already
--       prevents the one state this table must never allow -- a row that
--       looks revoked-by-someone while still reading as an active grant
--       (revoked_at IS NULL with revoked_by populated) -- while (b)'s
--       narrower "a revoked row should record who revoked it" property is
--       better guaranteed by construction in the future revoke-writer
--       function (which can simply never insert/update a row with
--       revoked_at set and revoked_by null in the first place) than by a
--       table-level CHECK with this FK side effect. Flagged for architect
--       awareness, not silently decided.
--
-- GRANTED_BY ON DELETE RESTRICT -- REASSESSED, RETAINED (Phase 16B.2a
-- remediation): the architect asked whether an auth.users row that has
-- ever granted this capability becoming undeletable while a referencing
-- grant record exists is (A) intentional/appropriate, (B) unnecessarily
-- restrictive, or (C) requires a later identity-retention design first.
-- Verdict: (A) -- RESTRICT is retained unchanged. This column exists
-- specifically to answer "who established this authority record," which
-- is the one fact this table cannot afford to lose or silently null out
-- -- unlike revoked_by (secondary metadata about an already-terminated
-- grant, where SET NULL was the architect's own explicit original
-- column spec and is not revisited here), granted_by is the primary
-- provenance fact for a row that may still be an ACTIVE, currently-relied-
-- upon authority grant. Allowing it to silently become NULL on the
-- grantor's account deletion (the SET NULL alternative) would let an
-- active grant's record of who authorised it quietly disappear -- the
-- opposite of what a security-provenance table exists to guarantee.
-- RESTRICT instead makes the tension impossible to miss: deleting that
-- auth.users row simply fails while any grant row references it,
-- forcing a deliberate decision at that time (e.g. revoke/close out the
-- grant rows first, or design an explicit offboarding/anonymisation path)
-- rather than allowing silent provenance loss. This mirrors an existing
-- precedent in this schema, public.contacts.organisation_id ... on
-- delete restrict (20260818100000_organisation_identity_foundation.
-- sql:250), used there for the same reason -- protecting a business
-- record's core identity link from silent loss. No FK action is changed.
--
-- REVOKED_AT NOT BEFORE GRANTED_AT: implemented
--   (execution_authorisers_revoked_at_not_before_granted_at_check).
--   granted_at is a database-derived default (transaction_timestamp() at
--   INSERT time, never caller-supplied by any future writer's design --
--   see the identical reasoning already applied to expiry in
--   20260821110000:84-93), and this check only compares two columns on
--   the same row with no FK/cascade interaction, so it is unconditionally
--   safe to enforce now, independent of whether a writer exists yet.
--
-- PRIVILEGE POSTURE: RLS is enabled with zero policies -- for any role
-- subject to RLS (anon, authenticated; not the table owner or a
-- superuser), this alone already default-denies every row for SELECT,
-- INSERT, UPDATE, and DELETE, regardless of the underlying table-level
-- grant. This migration nonetheless ALSO explicitly revokes all table
-- privileges from anon and authenticated, as a second, independent layer
-- -- the exact same defence-in-depth reasoning already applied to
-- public.execution_authorizations in 20260821100000_execution_
-- authorization_mutation_lockdown.sql ("removing only the RLS policies
-- would leave RLS's default-deny behaviour as the sole protection;
-- removing the GRANT too means even a hypothetical future RLS policy
-- added by mistake could not, on its own, reopen this boundary"). The
-- explicit revoke is required even though no GRANT for this specific
-- table appears anywhere in this repository's own migration history,
-- because Supabase's platform-wide default-privilege rule for the public
-- schema (never issued by any migration in this repo, confirmed
-- separately for public.execution_authorizations by 20260821100000's own
-- header) grants full table privileges to anon/authenticated/service_role
-- automatically at CREATE TABLE time. service_role and the table owner
-- (postgres) are untouched -- outside the ordinary-application trust
-- boundary this migration addresses, matching every prior migration's
-- convention in this repository.
--
-- SCOPE: exactly one new table (seven columns: id, user_id, capability,
-- granted_by, granted_at, revoked_at, revoked_by), its CHECK constraints,
-- its one partial unique index, RLS enablement with zero policies, and
-- two REVOKE statements. No function, role, RLS policy, or other table is
-- created, dropped, or altered. No existing migration, table, function,
-- or grant is modified. No application/TypeScript file is touched.
--
-- SAFE / IDEMPOTENT: CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT
-- EXISTS are both safe to rerun. REVOKE of a privilege a role does not
-- hold is a no-op in PostgreSQL.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2a authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create table if not exists public.execution_authorisers (
  id bigint generated always as identity primary key,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  capability text not null
    check (capability in ('execution_authoriser')),
  granted_by uuid not null
    references auth.users (id) on delete restrict,
  granted_at timestamptz not null default transaction_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid
    references auth.users (id) on delete set null,

  constraint execution_authorisers_active_grant_revoked_by_null_check
    check (revoked_at is not null or revoked_by is null),
  constraint execution_authorisers_revoked_at_not_before_granted_at_check
    check (revoked_at is null or revoked_at >= granted_at)
);

-- At most one ACTIVE (unrevoked) grant of a given capability per user --
-- the load-bearing invariant this table exists to guarantee at the
-- (user_id, capability) level. This is distinct from and complementary to
-- `id`: `id` identifies one specific grant row immutably forever (active
-- or historical); this index instead governs which single row, if any,
-- is allowed to be the currently-active one for a given user/capability
-- pair. Revoked rows (revoked_at is not null) are intentionally excluded
-- from this index, so a user may accumulate any number of historical
-- grant/revoke rows over time, each with its own permanent id; only ever
-- one of them may be active at once.
create unique index if not exists execution_authorisers_active_grant_idx
  on public.execution_authorisers (user_id, capability)
  where revoked_at is null;

-- RLS enabled, zero policies -- see "PRIVILEGE POSTURE" above. Default-
-- deny for every row, for every role subject to RLS.
alter table public.execution_authorisers enable row level security;

-- Explicit second layer -- see "PRIVILEGE POSTURE" above. Removes
-- whatever this table would otherwise inherit from Supabase's
-- platform-wide public-schema default privileges.
revoke all on public.execution_authorisers from anon;
revoke all on public.execution_authorisers from authenticated;

-- ROLLBACK (documented, not executed): since no writer, RLS policy, or
-- application code depends on this table, nothing could reference it.
-- drop table if exists public.execution_authorisers;
