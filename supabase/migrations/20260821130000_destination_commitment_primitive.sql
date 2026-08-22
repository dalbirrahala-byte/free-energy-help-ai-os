-- Factory 041 Phase 16B.2b-1: destination commitment derivation primitive.
--
-- WHY THIS EXISTS: the Phase 16B.2b-0/0a/0b/0c architecture preflights
-- established that a future human-approval record must be able to prove
-- "the destination used at execution is the same destination that existed
-- when the human approved," without storing raw contact PII on the
-- approval record itself. This migration builds exactly one small, inert
-- primitive toward that goal: a SECURITY DEFINER function that internally
-- loads a contact's authoritative destination for a given channel,
-- validates it, and returns an opaque (nonce, commitment) pair -- never
-- the destination itself, never anything resembling approval, authority,
-- or execution.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY this one
-- function and its REVOKE statements. It does NOT create an
-- execution_approvals table, an execution_intent_id concept, an
-- execution-intent fingerprint, a Phase 11 modification, or any writer
-- that persists a commitment anywhere. Those are each separate, later,
-- independently-authorised phases per the Phase 16B.2b-0c architecture
-- decision. public.create_execution_authorization() (20260821110000) is
-- not read, referenced, or modified anywhere in this file, and remains
-- exactly as dormant as before this migration.
--
-- THIS PRIMITIVE CREATES NO STATE: it performs exactly one read (against
-- public.contacts) and zero writes of any kind -- no INSERT, UPDATE,
-- DELETE, or TRUNCATE appears anywhere in this function. Calling it twice
-- with identical input produces two DIFFERENT results (different nonce,
-- different commitment) and leaves no trace of either call in the
-- database -- it is a pure cryptographic derivation, not a persistence
-- operation. Nothing about calling this function creates an approval,
-- an authorization, an execution, a provider request, or any authority
-- state.
--
-- PARAMETER TYPE CORRECTION (reported per the Phase 16B.2b-0c fail-closed
-- instruction, not silently applied): the Phase 16B.2b-1 authorisation
-- specified `p_contact_id uuid`. public.contacts.id is `bigint generated
-- always as identity` (20260818100000_organisation_identity_foundation.
-- sql:249), and every existing function in this chain that accepts a
-- contact identifier uses the same type
-- (public.create_execution_authorization's own `p_contact_id bigint`,
-- 20260821110000...sql:153). A `uuid` parameter compared against a
-- `bigint` column has no implicit cast in PostgreSQL and would raise
-- "operator does not exist: bigint = uuid" on every invocation -- this is
-- not a style preference, it is a type error that would make the
-- function entirely non-functional against the actual schema. This
-- migration therefore uses `p_contact_id bigint`, matching
-- public.contacts.id and every existing precedent function exactly.
--
-- INPUTS, CLOSED SURFACE: the function accepts exactly two parameters --
-- p_contact_id (a lookup key) and p_requested_channel (a lookup key). No
-- other parameter exists. Specifically absent, and deliberately never
-- accepted from any caller: the destination itself, an email or
-- telephone value, a nonce, a commitment, an organisation_id, an actor
-- identity, any approval/authorization state, an execution_intent_id, a
-- policy version, a fingerprint, or any provider-adapter data. Every one
-- of those is either irrelevant to this primitive's one job or must be
-- internally derived, never caller-supplied, per the same discipline
-- already established for every other security-relevant value in this
-- Factory 041 chain (idempotency_key, policy_version,
-- execution_authoriser_grant_id).
--
-- CHANNEL MAPPING, PER ESTABLISHED PRECEDENT: reuses exactly the mapping
-- already shipped in frontend/src/lib/execution-dispatch/
-- resolveExecutionDestination.ts:49-57 and the same channel vocabulary
-- already enforced by execution_authorizations_requested_channel_check
-- (20260820100000...sql:193-194) and public.create_execution_
-- authorization (20260821110000...sql:194-197): EMAIL resolves
-- contacts.email; PHONE, WHATSAPP, and SMS all resolve contacts.phone
-- (there is no separate WhatsApp/SMS destination column in this schema,
-- confirmed by that same TypeScript module's own header). contacts.
-- direct_dial is deliberately not read, matching that same precedent's
-- own stated reason (avoiding a second candidate telephone column).
--
-- NO CASE-FOLDING OF requested_channel, PER PRECEDENT: p_requested_
-- channel is trimmed (btrim) and matched EXACTLY against the closed
-- uppercase vocabulary -- never uppercased or otherwise case-normalised.
-- This mirrors public.create_execution_authorization's own identical
-- validation (20260821110000...sql:194-197) exactly; a caller supplying
-- lowercase "email" is rejected, not silently corrected, matching the
-- already-approved canonical contract for this field everywhere else in
-- this schema.
--
-- DESTINATION REPRESENTATION -- EXACT, TRIMMED ONLY, NO SEMANTIC
-- CANONICALISATION: per the Phase 16B.2b-0c architecture decision, this
-- function applies btrim() to the loaded destination and nothing else --
-- no lower(), no regexp-based formatting removal, no telephone
-- country-code conversion, no Unicode semantic normalisation, no
-- provider-specific email-alias handling (+tags, dot-insensitivity). This
-- is a deliberate correction of an earlier Phase 16B.2b-0a draft, which
-- had proposed semantic canonicalisation before the architect's own
-- Phase 16B.2b-0c question established that FEH's already-accepted
-- policy ("any destination change requires re-approval") makes such
-- tolerance actively undesirable, not merely unnecessary: if the trimmed
-- representation differs after a later edit -- even a purely cosmetic
-- reformatting -- that is intentionally treated as a new destination,
-- correctly requiring a fresh commitment (and, in a future consuming
-- phase, fresh human re-approval) rather than being silently forgiven.
--
-- VALIDATION -- NARROWEST SAFE, MIRRORED FROM EXISTING PRECEDENT ONLY:
-- this function does not invent new email/telephone validation rules. It
-- reuses the exact structural shape already established in two
-- independent places in this repository: the TypeScript EMAIL_SHAPE_
-- PATTERN and telephone digit-count rule in resolveExecutionDestination.
-- ts:113-116,184-194 (MAX_EMAIL_LENGTH 254, MAX_TELEPHONE_LENGTH 30,
-- MIN_TELEPHONE_DIGITS 10), and the equivalent SQL-side pattern already
-- shipped in public.ingest_external_lead (20260813110000...sql:159-164,
-- 168-173) for the identical class of check. No broader validation
-- (mailbox existence, deliverability, carrier lookup, etc.) is attempted
-- or claimed.
--
-- NONCE, DATABASE-GENERATED ONLY: gen_random_uuid() (native to PostgreSQL
-- since v13, no extension required, already used elsewhere in this
-- schema for public.ingest_external_lead's audit correlation_id,
-- 20260813110000...sql:186,239) is called internally, exactly once per
-- invocation. The caller has no parameter through which to influence,
-- select, or reuse a nonce. The nonce carries no authority or identity of
-- its own -- per the Phase 16B.2b-0c correction, it exists solely to
-- provide cross-row unlinkability for a future persisted commitment
-- (two different derivations of the same real destination produce
-- different, uncorrelatable commitment values), never to prove intent
-- identity or replay safety, which remain the responsibility of a future,
-- separately-authorised execution-intent fingerprint.
--
-- CRYPTOGRAPHIC CONSTRUCTION: pg_catalog.sha256(bytea) -- PostgreSQL's
-- native SHA-256 (confirmed present in this project's live PostgreSQL
-- 17.6 by the architect's own read-only capability check; no pgcrypto
-- extension is enabled, referenced, or required anywhere in this file).
-- Explicitly NOT used: md5() (suitable only for the lower-stakes,
-- non-security-critical idempotency-key role it already plays elsewhere
-- in this schema, per 20260821110000...sql:108-110's own reasoning -- not
-- for a value this preflight sequence has established is
-- security-relevant), extensions.digest(), and public.digest(). The
-- hashed payload is built from four fields in a fixed order, each
-- length-prefixed with a 4-byte big-endian integer
-- (pg_catalog.int4send(pg_catalog.octet_length(field))) rather than
-- joined with any delimiter -- this removes any possibility of field-
-- boundary ambiguity regardless of what bytes a destination value
-- happens to contain, matching the "prefer length-prefixed framing over
-- delimiters" decision from the Phase 16B.2b-0b preflight:
--   1. a fixed version-domain tag, 'feh-destination-v1' -- embedded
--      inside the hashed bytes (not appended outside them), so a future
--      v2 construction occupies a structurally disjoint hash space and
--      can never collide with a v1 commitment;
--   2. the validated, exact-case requested_channel string -- this is
--      what makes EMAIL, PHONE, WHATSAPP, and SMS commitments for the
--      identical destination text structurally distinguishable, closing
--      the specific replay path identified in the Phase 16B.2b-0a
--      preflight (PHONE/WHATSAPP/SMS all read contacts.phone);
--   3. the freshly generated nonce, as its raw 16-byte binary form
--      (pg_catalog.uuid_send(...), not its text representation);
--   4. the validated, trimmed-only destination text.
-- All text fields are converted to bytea via pg_catalog.convert_to(...,
-- 'UTF8') -- an explicit, encoding-unambiguous conversion, rather than a
-- bare ::bytea cast whose behaviour is more sensitive to server
-- configuration.
--
-- OUTPUT, MINIMAL AND OPAQUE: on success, returns exactly the nonce and
-- the 32-byte commitment -- nothing else. The raw destination is never
-- returned, logged, or persisted anywhere by this function.
--
-- INFORMATION-ORACLE POSTURE (Phase 16B.2b-1 authorisation, Section L):
-- unlike every other SECURITY DEFINER function in this repository's
-- Factory 041 chain (which return a differentiated coded `reason` on
-- rejection, e.g. 'invalid_contact_id', 'invalid_action_id'), this
-- function deliberately returns NO reason at all on failure -- only a
-- bare 'blocked' status. This is a considered departure, not an
-- oversight: p_contact_id is a small, sequential bigint identity, and a
-- differentiated reason (nonexistent contact vs. contact-exists-but-no-
-- email vs. malformed-destination) would let a future caller holding
-- EXECUTE enumerate which contact_id values exist and which have a
-- populated, well-formed destination for a given channel -- a real
-- contact-database enumeration oracle this function's own subject matter
-- (destinations) makes more sensitive than, say, an arbitrary caller-
-- chosen action_id ever was in the precedent functions. The SQL below
-- achieves this by construction, not by post-hoc response-shaping: the
-- "contact does not exist" and "contact exists but this channel's
-- destination field is null" cases are not even distinguished
-- internally -- both naturally produce a NULL destination value and fall
-- through to the exact same single check and the exact same 'blocked'
-- result, mirroring the same null-check-after-SELECT idiom already used
-- in public.create_execution_authorization (20260821110000...sql:203-
-- 211) for the equivalent lookup.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION (Section J): `set search_path to
-- ''`, matching every SECURITY DEFINER function in this repository.
-- Per this phase's explicit authorisation to prefer pg_catalog
-- qualification "where security-relevant and practical," every built-in
-- call in this function's cryptographic path is explicitly schema-
-- qualified (pg_catalog.sha256, pg_catalog.gen_random_uuid,
-- pg_catalog.int4send, pg_catalog.uuid_send, pg_catalog.convert_to,
-- pg_catalog.octet_length, pg_catalog.btrim, pg_catalog.length,
-- pg_catalog.regexp_replace) -- a stricter, more explicit style than
-- prior functions in this repository (which relied on pg_catalog's
-- always-implicit search-path visibility for the same built-ins),
-- adopted here specifically because this task's own authorisation calls
-- it out, not because the implicit-visibility precedent was found to be
-- unsafe. public.contacts is fully schema-qualified as in every other
-- function in this chain.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement appears here,
-- matching every precedent function in this repository -- ownership is
-- implicit (whoever applies this migration, `postgres` under this
-- project's standard convention), exactly as for every other function in
-- this chain.
--
-- DORMANT BY DESIGN: PostgreSQL grants EXECUTE to PUBLIC by default on
-- every new function, and this project's own default privileges
-- separately grant `authenticated` EXECUTE on every new function owned
-- by `postgres` (established in 20260810110000_harden_function_execute_
-- privileges.sql and reconfirmed for every subsequent dormant function in
-- this chain) -- both are explicitly revoked below, alongside an explicit
-- `anon` revoke. No role can call this function after this migration is
-- applied. `service_role` is not referenced anywhere in this file:
-- inspected precedent across every prior function migration in this
-- repository (20260810110000, 20260812130000, 20260813110000,
-- 20260814100000, 20260821110000, 20260821120000) confirms none of them
-- ever grants or revokes EXECUTE for `service_role` on any function --
-- it is consistently left untouched, outside the ordinary-application
-- trust boundary these migrations address. This migration follows that
-- same unbroken convention rather than introducing a new one.
--
-- SCOPE, RESTATED: exactly one new function and its three REVOKE
-- statements. No table, column, index, RLS policy, role, or existing
-- function is created, dropped, or altered. No application/TypeScript
-- file is touched. No extension is created, altered, or referenced.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun. Every
-- REVOKE is safe to rerun (revoking an unheld privilege is a no-op in
-- PostgreSQL).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-1 authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.derive_destination_commitment(
  p_contact_id bigint,
  p_requested_channel text
)
returns table (
  status text,
  nonce uuid,
  destination_commitment bytea
)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_requested_channel text;
  v_email text;
  v_phone text;
  v_raw_destination text;
  v_destination text;
  v_nonce uuid;
  v_payload bytea;
begin
  -- requested_channel: closed, exact-case allow-list, mirroring
  -- public.create_execution_authorization's identical validation. Never
  -- case-folded or otherwise corrected.
  v_requested_channel := pg_catalog.btrim(p_requested_channel);
  if v_requested_channel is null
     or v_requested_channel not in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')
  then
    return query select 'blocked'::text, null::uuid, null::bytea;
    return;
  end if;

  -- Authoritative destination load: contact_id is the sole lookup key,
  -- never a caller-supplied destination. A nonexistent contact and a
  -- contact whose relevant field is null are deliberately not
  -- distinguished here -- see the information-oracle note in this
  -- migration's header. Only email and phone are ever read; direct_dial
  -- is never read, matching resolveExecutionDestination.ts's own
  -- established precedent.
  select c.email, c.phone
    into v_email, v_phone
  from public.contacts c
  where c.id = p_contact_id;

  v_raw_destination := case v_requested_channel
    when 'EMAIL' then v_email
    else v_phone -- PHONE, WHATSAPP, and SMS all resolve contacts.phone
  end;

  if v_raw_destination is null then
    return query select 'blocked'::text, null::uuid, null::bytea;
    return;
  end if;

  -- Exact representation, trimmed only -- no further canonicalisation.
  -- See this migration's header for why semantic canonicalisation is
  -- deliberately absent.
  v_destination := pg_catalog.btrim(v_raw_destination);

  if pg_catalog.length(v_destination) = 0 then
    return query select 'blocked'::text, null::uuid, null::bytea;
    return;
  end if;

  -- Structural validation only, mirrored from existing, already-shipped
  -- precedent (resolveExecutionDestination.ts / ingest_external_lead) --
  -- no new validation rule is invented here.
  if v_requested_channel = 'EMAIL' then
    if pg_catalog.length(v_destination) > 254
       or v_destination !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    then
      return query select 'blocked'::text, null::uuid, null::bytea;
      return;
    end if;
  else
    if pg_catalog.length(v_destination) > 30
       or pg_catalog.length(pg_catalog.regexp_replace(v_destination, '[^0-9]', '', 'g')) < 10
    then
      return query select 'blocked'::text, null::uuid, null::bytea;
      return;
    end if;
  end if;

  -- Database-generated nonce -- never caller-influenced. Fresh on every
  -- successful invocation.
  v_nonce := pg_catalog.gen_random_uuid();

  -- Unambiguous, length-prefixed, version- and channel-separated
  -- framing. See this migration's header for the full construction
  -- rationale.
  v_payload :=
    pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to('feh-destination-v1', 'UTF8')))
      || pg_catalog.convert_to('feh-destination-v1', 'UTF8')
    || pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to(v_requested_channel, 'UTF8')))
      || pg_catalog.convert_to(v_requested_channel, 'UTF8')
    || pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.uuid_send(v_nonce)))
      || pg_catalog.uuid_send(v_nonce)
    || pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to(v_destination, 'UTF8')))
      || pg_catalog.convert_to(v_destination, 'UTF8');

  return query select
    'derived'::text,
    v_nonce,
    pg_catalog.sha256(v_payload);
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
revoke all on function public.derive_destination_commitment(
  bigint, text
) from public;

revoke execute on function public.derive_destination_commitment(
  bigint, text
) from anon;

revoke execute on function public.derive_destination_commitment(
  bigint, text
) from authenticated;

-- ROLLBACK (documented, not executed): since this function is dormant --
-- unreachable by any application role, and performs no writes -- nothing
-- could depend on it.
-- drop function if exists public.derive_destination_commitment(
--   bigint, text
-- );
