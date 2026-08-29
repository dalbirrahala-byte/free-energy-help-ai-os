-- Factory 041 Phase 17A: dedicated execution-dispatch worker identity
-- foundation -- privilege boundary only, NOT activation.
--
-- WHY THIS EXISTS: every Factory 041 mutating execution function
-- (consume_execution_authorization, prepare_execution_dispatch, the
-- three outcome-finalisation writers) and the checkpoint #3 precall
-- readiness evaluator are deployed and fully dormant, explicitly
-- revoked from PUBLIC, anon, authenticated, AND service_role (Phase
-- 16B.2b-6g/6h/6i). `service_role` was ruled out as the eventual caller
-- for exactly the reason it was revoked from these functions in the
-- first place: it carries BYPASSRLS and, on Supabase, unrestricted
-- access to every table in this schema -- using it for the dispatch
-- worker would mean a single compromised credential could touch
-- anything in the database, not just the six functions a dispatch
-- worker actually needs. This migration creates the missing, narrowly
-- scoped identity that eventually closes that gap: a group-style
-- PostgreSQL role holding EXECUTE on exactly the six approved functions
-- and nothing else. It creates NO credential, enables NO connection,
-- and activates NOTHING -- see "TWO-LAYER MODEL" and "NOT ACTIVATION"
-- below.
--
-- REQUIRED INVESTIGATION, PERFORMED FRESH BEFORE WRITING THIS FILE, NOT
-- ASSUMED:
--   1. Every Factory 041 migration was inspected. The six target
--      functions (20260825150000/180000/190000/190000/190000/200000
--      ...sql) and the three internal primitives they call
--      (20260821130000/20260822170000/20260822180000...sql) were
--      re-read in full.
--   2. Live ACL re-verified via direct catalog query (pg_proc.proacl),
--      not inferred from migration files alone: all six target
--      functions show `postgres=X/postgres` ONLY -- no PUBLIC, anon,
--      authenticated, or service_role entry on any of them. This
--      confirms "IMPORTANT SECURITY CHECK" (do not rely on absence of
--      an explicit GRANT alone) with direct evidence, not assumption.
--   3. Existing custom-role precedent: exactly one prior custom role
--      exists in this repository, `external_lead_ingestor`
--      (20260813120000_create_external_lead_ingestor_role.sql,
--      Factory 025C). Confirmed LIVE on this exact Supabase project via
--      direct `pg_roles` query before writing this migration --
--      `rolcanlogin=true, rolsuper=false, rolcreatedb=false,
--      rolcreaterole=false, rolinherit=false, rolreplication=false,
--      rolbypassrls=false` -- proving CREATE ROLE is genuinely supported
--      on this Supabase project, not merely assumed to be. That
--      precedent used a single combined LOGIN-role-with-null-password
--      design (inert because it cannot authenticate, not because it
--      lacks privilege) -- a valid but different pattern from the
--      two-layer group-role design this phase's authorisation requests.
--      No `execution_dispatch_worker` or `execution_dispatch_runtime`
--      role existed before this migration.
--   4. execution_authoriser/execution_controller are table-row
--      CAPABILITIES on public.execution_authorisers (an application-
--      level authority model, checked inside SECURITY DEFINER function
--      bodies), not PostgreSQL ROLES -- an entirely different mechanism
--      from what this phase builds. service_role's own privilege
--      assumptions were reconfirmed: it holds BYPASSRLS and, by
--      Supabase's own platform-wide default-privilege behaviour, table
--      access to every table in this schema unless explicitly revoked
--      -- exactly why every checkpoint #2/#3 table and function in this
--      chain now explicitly revokes it.
--   5. Repository-wide search confirms NO current application code
--      constructs a service_role Supabase client or references a
--      service_role credential anywhere in frontend/src, except a
--      single documentation comment (checkpointThreeDispatchBoundary.ts)
--      describing the CURRENT dormancy state. No code path assumes
--      service_role for execution dispatch today.
--   6. Repository-wide search for all six function names outside their
--      own migrations and this same TypeScript boundary module's own
--      doc comments returns nothing.
--   7. Confirmed: zero current production or application callers exist
--      for any of the six functions -- every one remains reachable only
--      by the function owner (`postgres`) today.
--
-- TWO-LAYER MODEL, VIABLE, NOT REJECTED: `execution_dispatch_worker`
-- (this migration) is a NOLOGIN group role -- it represents the exact
-- database CAPABILITY of a dispatch worker, and cannot itself be
-- connected to under any circumstances, independent of any credential
-- question. A future, separately-authorised Phase 17B would create a
-- SEPARATE, LOGIN-capable runtime identity and grant it membership in
-- this role (`grant execution_dispatch_worker to <future_login_role>`)
-- -- standard PostgreSQL group-role/login-role composition, fully
-- supported on this Supabase project (see investigation point 3 above),
-- with the future role's own INHERIT attribute (set at ITS creation,
-- not this migration's concern) determining whether membership grants
-- are automatically available or require SET ROLE. This migration does
-- NOT create that future role -- see "NOT ACTIVATION" below.
--
-- NOT ACTIVATION -- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO: does
-- NOT create a LOGIN-capable role of any kind; does NOT set or reference
-- a password anywhere; does NOT create, read, or reference any
-- credential, secret, or environment variable; does NOT choose or
-- configure a runtime connection topology (direct/session vs.
-- transaction pooler) -- that is explicitly a separate, later, runtime-
-- specific decision this migration does not need to make or assume, per
-- the Phase 17A authorisation's own "IMPORTANT ARCHITECTURAL
-- REQUIREMENT"; does NOT approve or insert a provider adapter row; does
-- NOT touch public.execution_provider_adapters, public.execution_
-- dispatch_attempts, or any other existing table; does NOT invoke any
-- of the six functions, stop_execution(), or release_execution(); and
-- does NOT grant `execution_dispatch_worker` membership to anything, or
-- grant anything TO it beyond the six EXECUTE privileges below.
--
-- MANDATORY ROLE ATTRIBUTES, EACH JUSTIFIED: `NOLOGIN` -- cannot
-- authenticate under any circumstances, independent of credential
-- state; this IS the role's entire safety property, stronger than the
-- external_lead_ingestor precedent's "LOGIN with null password"
-- approach, which depends on password state remaining unset.
-- `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`,
-- `NOBYPASSRLS` -- no elevated capability of any kind, matching the
-- external_lead_ingestor precedent's own identical attribute set.
-- `NOINHERIT` -- this role is never itself a member of any other role
-- (it holds no memberships, here or anywhere else in this migration
-- chain), so INHERIT would have no effect either way; NOINHERIT is
-- chosen as the conservative default matching the "no ambient privilege
-- expansion" philosophy already established by external_lead_ingestor's
-- own identical choice, not because inheritance was evaluated and
-- rejected for a live use case that does not exist. It owns no database
-- object -- it neither creates nor is assigned ownership of anything in
-- this or any migration. No password clause of any kind is used --
-- NOLOGIN alone is a complete, credential-independent guarantee; adding
-- `password null` (as the LOGIN-based ingestor precedent required) would
-- be redundant here, not merely omitted.
--
-- NO TABLE PRIVILEGE OF ANY KIND, STRUCTURALLY GUARANTEED, NOT MERELY
-- POLICY: all six target functions are `security definer`, owned by
-- `postgres` -- per PostgreSQL's own documented SECURITY DEFINER
-- semantics (independently reconfirmed here, matching public.
-- ingest_external_lead's own identical "WHY NO TABLE/SCHEMA/DATABASE
-- GRANT IS NEEDED" reasoning, 20260813130000...sql), each function body
-- executes with the OWNER's privileges, never the caller's -- a caller
-- holding EXECUTE never needs, and is never granted, any privilege on
-- any table those functions read or write. This migration therefore
-- grants NO table SELECT/INSERT/UPDATE/DELETE, NO TRUNCATE, NO sequence
-- privilege, and NO schema CREATE privilege to `execution_dispatch_
-- worker` -- not because these were withheld as a policy choice alone,
-- but because PostgreSQL's own function-execution mechanics make them
-- structurally unnecessary. No schema-level grant is needed either: `
-- USAGE` on schema `public` is already available to every role via
-- PUBLIC's own default ACL entry, confirmed live and unchanged since
-- the identical finding in 20260813130000...sql -- granting it again
-- here would be a redundant no-op.
--
-- FUNCTION ACCESS -- EXACTLY SIX, NO MORE: `EXECUTE` is granted below on
-- exactly public.consume_execution_authorization(bigint), public.
-- prepare_execution_dispatch(bigint, bigint), public.complete_execution_
-- dispatch_success(bigint, text), public.complete_execution_dispatch_
-- failure(bigint, text), public.complete_execution_dispatch_
-- indeterminate(bigint, text), and public.evaluate_execution_precall_
-- readiness(bigint). Per the Phase 17A authorisation's explicit
-- instruction, `execution_dispatch_worker` receives NO grant on public.
-- evaluate_execution_emergency_stop(), public.evaluate_suppression_
-- live(), or public.verify_destination_commitment() -- those remain
-- internal primitives called only from inside the six approved
-- functions' own SECURITY DEFINER bodies, never directly by a caller
-- holding only this role.
--
-- OBSERVATION FOR A FUTURE, SEPARATE ARCHITECT DECISION -- NOT ACTED ON
-- HERE, OUTSIDE THIS PHASE'S SCOPE: live ACL inspection performed for
-- this migration's own investigation found that the three internal
-- primitives named above still carry a `service_role=X/postgres` grant
-- from their original construction (20260821130000/20260822170000/
-- 20260822180000...sql), predating the "true dormancy including
-- service_role" posture first adopted for public.consume_execution_
-- authorization() (Phase 16B.2b-6g) and applied to every function since.
-- This means service_role can, today, already call these three read-
-- only evaluators directly -- a narrower and lower-risk exposure than a
-- mutating writer (no table is written, no authority is exercised,
-- and each evaluator's own oracle-avoidance discipline limits what a
-- caller could learn), but inconsistent with this chain's now-settled
-- policy. This migration does not touch those three functions --
-- revoking a pre-existing grant on functions outside this phase's
-- stated six-function scope would be a scope expansion this
-- authorisation did not request. Recorded here for explicit, separate
-- Lead Architect review.
--
-- SAFE / IDEMPOTENT: role creation is wrapped in a guarded DO block
-- checking pg_roles first, matching the identical pattern already
-- established by 20260813120000_create_external_lead_ingestor_role.sql
-- (PostgreSQL has no native CREATE ROLE IF NOT EXISTS). Every GRANT
-- EXECUTE statement is safe to rerun (granting an already-held privilege
-- is a no-op in PostgreSQL).
--
-- REVERSIBLE BY A LATER CONTROLLED MIGRATION: dropping this role, or
-- revoking any of its six grants, is always safe -- nothing in this
-- migration, or any migration since, references, depends on, or grants
-- membership to `execution_dispatch_worker`. See "ROLLBACK" below.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 17A authorisation. Must NOT be run against Supabase, staged,
-- committed, or pushed until a separate, explicit authorisation is
-- given.

do $$
begin
  if not exists (
    select 1 from pg_roles where rolname = 'execution_dispatch_worker'
  ) then
    create role execution_dispatch_worker
      with
        nologin
        nosuperuser
        nocreatedb
        nocreaterole
        noreplication
        nobypassrls
        noinherit;
  end if;
end
$$;

-- Exactly six EXECUTE grants -- the entire privilege surface of this
-- role. See "FUNCTION ACCESS" above.
grant execute on function public.consume_execution_authorization(
  bigint
) to execution_dispatch_worker;

grant execute on function public.prepare_execution_dispatch(
  bigint, bigint
) to execution_dispatch_worker;

grant execute on function public.complete_execution_dispatch_success(
  bigint, text
) to execution_dispatch_worker;

grant execute on function public.complete_execution_dispatch_failure(
  bigint, text
) to execution_dispatch_worker;

grant execute on function public.complete_execution_dispatch_indeterminate(
  bigint, text
) to execution_dispatch_worker;

grant execute on function public.evaluate_execution_precall_readiness(
  bigint
) to execution_dispatch_worker;

-- ROLLBACK (documented, not executed): this role has no members and no
-- credential -- nothing could depend on it. Revoking any grant, or
-- dropping the role outright, is safe at any time.
-- revoke execute on function public.evaluate_execution_precall_readiness(bigint) from execution_dispatch_worker;
-- revoke execute on function public.complete_execution_dispatch_indeterminate(bigint, text) from execution_dispatch_worker;
-- revoke execute on function public.complete_execution_dispatch_failure(bigint, text) from execution_dispatch_worker;
-- revoke execute on function public.complete_execution_dispatch_success(bigint, text) from execution_dispatch_worker;
-- revoke execute on function public.prepare_execution_dispatch(bigint, bigint) from execution_dispatch_worker;
-- revoke execute on function public.consume_execution_authorization(bigint) from execution_dispatch_worker;
-- drop role if exists execution_dispatch_worker;
