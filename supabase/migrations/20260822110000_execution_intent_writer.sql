-- Factory 041 Phase 16B.2b-4: dormant execution-intent writer.
--
-- WHY THIS EXISTS: 20260822100000_execution_intent_identity_foundation.sql
-- built public.execution_intents fully locked down, with no writer
-- anywhere -- only a privileged direct-connection actor could insert a
-- row. This migration builds exactly that missing, narrowly-scoped
-- writer: a SECURITY DEFINER function that lets an authenticated human
-- holding the existing records:write-equivalent permission propose
-- exactly one execution intent. It is a proposal primitive only.
--
-- PERSISTENCE OF AN INTENT IS NOT AUTHORITY, RESTATED HERE: this
-- function does not approve, determine compliance, authorize, dispatch,
-- contact a provider, contact a customer, create a destination
-- commitment, create a content commitment, create an execution outcome,
-- write to audit_log, modify an existing execution intent, or create a
-- system-generated intent. It performs exactly one INSERT against
-- exactly one table.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY this one
-- function and its REVOKE statements. It does NOT modify public.
-- execution_intents, public.create_execution_authorization(), public.
-- execution_authorizations, public.execution_authorisers, public.
-- derive_destination_commitment(), public.user_can_write(), any Phase
-- 11 destination-resolution code, or any application/TypeScript file.
-- No existing migration is altered.
--
-- CALLER INPUT SURFACE, CLOSED: exactly five parameters --
-- p_contact_id, p_requested_channel, p_action_id (all required),
-- p_source_id, p_campaign_id (both optional, default null). No
-- parameter exists for organisation_id, created_by_actor_type,
-- created_by_actor_id, execution_intent_id, approval, authorization,
-- compliance, destination, destination commitment, content commitment,
-- provider, supersedes_execution_intent_id, an idempotency key, a
-- system-actor claim, or any execution state. Every one of those is
-- either irrelevant to this function's one job or, where relevant, must
-- be internally derived -- never caller-supplied -- per the identical
-- discipline already established for every other security-relevant
-- value in this Factory 041 chain.
--
-- HUMAN-ONLY, BY CONSTRUCTION, NOT BY CONVENTION: there is no actor_type
-- parameter anywhere in this signature. Every row this function creates
-- carries the literal 'human', and created_by_actor_id is always
-- auth.uid(), captured exactly once, never accepted from the caller. A
-- caller cannot supply another user's UUID because no parameter exists
-- for one. System-generated intent creation remains entirely absent
-- from this function -- deferred to a separate, independently reviewed
-- future writer, per the Phase 16B.2b-4 architecture preflight's
-- explicit decision to avoid a vague 'system' path any ordinary
-- authenticated caller with EXECUTE could otherwise abuse.
--
-- RBAC -- REUSES THE EXISTING, VERIFIED public.user_can_write(),
-- INVENTS NOTHING NEW: public.user_can_write() (first established
-- 20260805100100_enable_rls.sql:29-38, restated identically across
-- seven migrations since, most recently 20260820100000...sql:114-123)
-- is `language sql, stable` -- SECURITY INVOKER, not SECURITY DEFINER --
-- with no explicit search_path of its own, but every reference inside
-- its own body (public.user_roles, auth.uid()) is already fully
-- schema-qualified, so it cannot be affected by whatever ambient
-- search_path is in effect wherever it is called from. Calling it from
-- inside this SECURITY DEFINER function's body is safe: auth.uid() is a
-- session-scoped JWT-claim read, not a role-privilege check, so it
-- keeps returning the original authenticated human's id regardless of
-- the current role being elevated to this function's owner; and
-- although that owner-level elevation bypasses public.user_roles' own
-- RLS (table owners always bypass RLS, independent of any function's
-- own security label), the query's own `where ur.id = auth.uid()`
-- clause already narrows to exactly the correct single row regardless
-- of how many rows are technically visible. Proven role matrix: admin,
-- manager, operations, and consultant all satisfy `role <> 'read_only'`
-- and are permitted; read_only, and any caller with no public.
-- user_roles row at all, are denied. execution_authoriser capability is
-- deliberately NOT required anywhere in this function -- permission to
-- PROPOSE an action and permission to APPROVE one remain structurally
-- separate concerns in this architecture, and no evidence supports
-- conflating them here.
--
-- ACTION_ID -- REJECT NONCANONICAL INPUT, NEVER SILENTLY REWRITE IT:
-- this function does not call btrim() on p_action_id and insert the
-- result. It requires the caller-supplied value to ALREADY equal its
-- own trimmed form, be non-blank, and be at most 200 characters --
-- mirroring execution_intents_action_id_length_check and
-- execution_intents_action_id_canonical_check
-- (20260822100000...sql:306-313) exactly, re-validated defensively here
-- for a clean coded rejection rather than a raw constraint-violation
-- error. A value that fails any of these checks is rejected outright,
-- never trimmed-and-accepted. action_id remains, as it has throughout
-- this Factory 041 chain, a descriptive lookup label carrying no
-- authority and no FK -- never reinterpreted as this table's identity,
-- which remains solely execution_intents.id.
--
-- REQUESTED_CHANNEL -- REJECT NONCANONICAL INPUT, DELIBERATELY STRICTER
-- THAN THE EXISTING create_execution_authorization PRECEDENT: that
-- function (20260821110000...sql:194-197) trims p_requested_channel
-- before matching it against the closed vocabulary, tolerating
-- surrounding whitespace. This function does not -- it accepts only an
-- exact, already-canonical match against ('PHONE', 'EMAIL', 'WHATSAPP',
-- 'SMS'), with no trim and no case-fold. This is a deliberate, noted
-- divergence from that older function's specific leniency, applying the
-- same "reject rather than silently normalise" principle established
-- above for action_id, consistently, to this newer function -- not an
-- oversight, and not a claim that it reproduces create_execution_
-- authorization's exact behaviour.
--
-- SOURCE_ID -- EXISTENCE PRE-CHECKED, NEVER A RAW FK EXCEPTION: an
-- invalid, non-null p_source_id is explicitly checked for existence in
-- public.source_registry before the insert is attempted. Without this,
-- a bad source_id would instead surface as an uncaught foreign-key-
-- violation exception -- a different, inconsistent failure mode from
-- every other rejection in this function, and one whose error structure
-- could itself leak information. This is a single, narrow, targeted
-- pre-check, not a broad exception handler -- genuine, unanticipated
-- database/system errors elsewhere in this function are never caught
-- and continue to propagate normally.
--
-- CAMPAIGN_ID -- INERT, UNTOUCHED: p_campaign_id is passed through
-- exactly as supplied -- no trim, no validation, no canonicalisation,
-- no FK (none exists, matching this repository's established
-- attribution-tag convention for this field). It cannot manufacture
-- authority.
--
-- ORGANISATION DERIVATION -- SINGLE STATEMENT, NO SEPARATE READ:
-- organisation_id is never a caller parameter. It is selected directly
-- from the matching public.contacts row inside the same INSERT ...
-- SELECT statement that creates the intent -- not read into a variable
-- first and inserted afterward -- eliminating any window in which the
-- contact's organisation could be reassigned between a read and a
-- write. public.contacts.organisation_id is itself `not null` with its
-- own `on delete restrict` FK (20260818100000_organisation_identity_
-- foundation.sql:250), so any row this SELECT actually matches already
-- carries a guaranteed-valid organisation_id. A p_contact_id matching no
-- row causes the SELECT to return zero rows, so the INSERT inserts zero
-- rows -- no exception, the same generic blocked contract as every
-- other rejection. No explicit row lock (FOR UPDATE/FOR SHARE) is used
-- anywhere in this function: ordinary PostgreSQL foreign-key constraint
-- enforcement and single-statement read/write atomicity are sufficient
-- for every race this design was checked against (concurrent contact
-- deletion, concurrent organisation deletion, concurrent organisation
-- reassignment) -- construction here found no concrete correctness
-- requirement for one.
--
-- DUPLICATE INTENTS REMAIN PERMITTED: this function contains no
-- uniqueness or deduplication logic of any kind, matching public.
-- execution_intents' own deliberate design (20260822100000...sql).
-- Calling this function twice with identical arguments creates two
-- independent rows. Intent-creation idempotency is explicitly not the
-- same concern as public.execution_authorizations' own idempotency_key
-- mechanism, which remains entirely unaffected by this function.
--
-- FAILURE CONTRACT -- GENERIC, UNDIFFERENTIATED, NO INFORMATION ORACLE:
-- every rejection -- missing authentication, failed RBAC, malformed
-- action_id, malformed channel, a nonexistent source_id, or a
-- nonexistent contact -- returns the identical ('blocked', NULL) row.
-- p_contact_id is a small, sequential bigint identity; a differentiated
-- reason would let a caller holding EXECUTE enumerate which contact_id
-- values exist, matching the identical oracle-avoidance reasoning
-- already applied to public.derive_destination_commitment
-- (20260821130000...sql). Genuinely unexpected database/system errors
-- are not caught anywhere in this function and continue to propagate
-- normally -- there is no broad exception handler here.
--
-- MUTATION SURFACE, EXACTLY ONE STATEMENT: the only INSERT/UPDATE/
-- DELETE of any kind in this entire function targets public.
-- execution_intents, and it is an INSERT only -- no UPDATE, no DELETE,
-- anywhere. public.contacts and public.source_registry are read-only
-- lookups. public.user_roles is read only indirectly, inside public.
-- user_can_write(), which this function calls but never writes to. No
-- audit_log row is written by this function in this phase -- that
-- integration is explicitly deferred, not rejected, per the Phase
-- 16B.2b-4 architect correction gate.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`,
-- matching every SECURITY DEFINER function in this repository. Every
-- built-in call is explicitly pg_catalog-qualified (pg_catalog.btrim,
-- pg_catalog.char_length); every relation/function reference is fully
-- schema-qualified (public.contacts, public.execution_intents, public.
-- source_registry, public.user_can_write(), auth.uid()) -- including
-- the call to public.user_can_write() itself, never invoked
-- unqualified.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement appears here,
-- matching every precedent function in this repository -- ownership is
-- implicit (whoever applies this migration, `postgres`, under this
-- project's standard convention).
--
-- DORMANT BY DESIGN: PostgreSQL grants EXECUTE to PUBLIC by default on
-- every new function, and this project's own default privileges
-- separately grant `authenticated` EXECUTE on every new function owned
-- by `postgres` (established 20260810110000_harden_function_execute_
-- privileges.sql, reconfirmed for every dormant function in this chain
-- since) -- both are explicitly revoked below, alongside an explicit
-- `anon` revoke. No role can call this function after this migration is
-- applied. The internal auth.uid()-null check and the public.
-- user_can_write() gate are both fully present now, while the function
-- remains dormant -- a future activation gate needs only to grant
-- EXECUTE to `authenticated`, not rewrite any security logic. `service_
-- role` is not referenced anywhere in this file, matching the unbroken
-- convention already established across every prior function migration
-- in this repository.
--
-- SCOPE, RESTATED: exactly one new function and its three REVOKE
-- statements. No table, column, index, RLS policy, role, or existing
-- function is created, dropped, or altered. No application/TypeScript
-- file is touched.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun. Every
-- REVOKE is safe to rerun (revoking an unheld privilege is a no-op in
-- PostgreSQL).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only,
-- per the Phase 16B.2b-4 authorisation. Must NOT be run against
-- Supabase, staged, committed, or pushed until a separate, explicit
-- authorisation is given.

create or replace function public.create_execution_intent(
  p_contact_id bigint,
  p_requested_channel text,
  p_action_id text,
  p_source_id bigint default null,
  p_campaign_id text default null
)
returns table (
  status text,
  execution_intent_id bigint
)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_new_id bigint;
begin
  -- Captured exactly once. Never accepted from the caller. See
  -- "HUMAN-ONLY, BY CONSTRUCTION" above.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return query select 'blocked'::text, null::bigint;
    return;
  end if;

  -- Reuses the existing, verified records:write-equivalent gate.
  -- execution_authoriser capability is deliberately NOT checked here --
  -- proposing an action is not approving one. See "RBAC" above.
  if not public.user_can_write() then
    return query select 'blocked'::text, null::bigint;
    return;
  end if;

  -- requested_channel: exact canonical match only -- no trim, no
  -- case-fold. See "REQUESTED_CHANNEL" above.
  if p_requested_channel is null
     or p_requested_channel not in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')
  then
    return query select 'blocked'::text, null::bigint;
    return;
  end if;

  -- action_id: exact canonical match only -- non-null, already trimmed,
  -- non-blank, <=200 characters. See "ACTION_ID" above.
  if p_action_id is null
     or p_action_id <> pg_catalog.btrim(p_action_id)
     or pg_catalog.char_length(p_action_id) = 0
     or pg_catalog.char_length(p_action_id) > 200
  then
    return query select 'blocked'::text, null::bigint;
    return;
  end if;

  -- source_id: existence pre-checked so an invalid reference fails via
  -- the same generic contract, never an uncaught FK violation. See
  -- "SOURCE_ID" above.
  if p_source_id is not null
     and not exists (
       select 1 from public.source_registry sr where sr.id = p_source_id
     )
  then
    return query select 'blocked'::text, null::bigint;
    return;
  end if;

  -- Single statement: organisation_id is selected directly from the
  -- matching contacts row at the exact instant of insert -- never read
  -- into a variable first. Zero matching rows (nonexistent contact)
  -- inserts zero rows. See "ORGANISATION DERIVATION" above.
  insert into public.execution_intents (
    organisation_id,
    contact_id,
    requested_channel,
    action_id,
    source_id,
    campaign_id,
    created_by_actor_type,
    created_by_actor_id
  )
  select
    c.organisation_id,
    c.id,
    p_requested_channel,
    p_action_id,
    p_source_id,
    p_campaign_id,
    'human',
    v_actor_id
  from public.contacts c
  where c.id = p_contact_id
  returning id into v_new_id;

  if v_new_id is null then
    return query select 'blocked'::text, null::bigint;
    return;
  end if;

  return query select 'created'::text, v_new_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` -- revoked here too, explicitly. `anon` is
-- revoked explicitly as well, restating the project-wide default
-- already closed by 20260810110000, so this migration's own privilege
-- state is self-evidently complete on its own. All three revokes are
-- required for this function to be genuinely dormant; none replaces
-- another.
revoke all on function public.create_execution_intent(
  bigint, text, text, bigint, text
) from public;

revoke execute on function public.create_execution_intent(
  bigint, text, text, bigint, text
) from anon;

revoke execute on function public.create_execution_intent(
  bigint, text, text, bigint, text
) from authenticated;

-- ROLLBACK (documented, not executed): since this function is dormant --
-- unreachable by any application role -- nothing could depend on it.
-- drop function if exists public.create_execution_intent(
--   bigint, text, text, bigint, text
-- );
