-- Factory 041 Phase 16B.2b-5i: destination commitment verification
-- primitive.
--
-- WHY THIS EXISTS: the Phase 16B.2b-5h read-path design audit proved that
-- public.derive_destination_commitment() (20260821130000...sql) cannot be
-- used, as-is, to answer "does the LIVE destination for this contact and
-- channel still match a previously-persisted commitment?" -- that
-- function generates a fresh pg_catalog.gen_random_uuid() nonce on every
-- call, by deliberate original design (Phase 16B.2b-1's own stated goal
-- of cross-row unlinkability), and that nonce is hashed into the
-- commitment itself. Two derivations of the identical destination
-- therefore produce two different, uncorrelatable commitment values --
-- direct equality comparison between a fresh derivation and a stored one
-- is structurally impossible, not merely inconvenient. This is a missing
-- primitive relative to the read-path's need, not a defect in the
-- existing, already-deployed function, which continues to do exactly
-- what it was built to do. This migration builds exactly the missing
-- piece: a sibling function that recomputes a commitment using the
-- ALREADY-STORED nonce (public.compliance_decisions.destination_
-- commitment_nonce, 20260822140000...sql) instead of generating a new
-- one, making a genuine equality comparison possible for the first time.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY this one
-- function and its REVOKE statements. It does NOT create a table, add a
-- column, add an index, add an RLS policy, alter public.
-- compliance_decisions, public.execution_authorizations, public.
-- execution_intents, or public.derive_destination_commitment() itself,
-- add a writer, add a trigger, add a provider call, or activate outreach
-- or provider execution. No application/TypeScript file is touched. No
-- existing migration is altered.
--
-- WHY A SEPARATE FUNCTION, NOT A MODIFIED derive_destination_commitment():
-- that function's existing contract (generate-and-return a fresh
-- nonce/commitment pair, used at compliance-evaluation time to establish
-- a NEW commitment) and this function's contract (accept a previously-
-- established nonce and verify a LIVE destination still matches an
-- EXISTING commitment) are different jobs with different callers at
-- different points in the lifecycle. Overloading one function with two
-- incompatible calling conventions (sometimes generate a nonce internally,
-- sometimes accept one from the caller) would make its dormant-privilege
-- posture and its input-trust boundary harder to reason about, not
-- easier. Two small, single-purpose functions, matching this repository's
-- established preference throughout Factory 041 for narrow, one-job
-- primitives over multi-mode ones.
--
-- WHY ACCEPTING p_nonce AS A PARAMETER IS SAFE DESPITE THIS CHAIN'S
-- "DERIVE, NEVER ACCEPT FROM CALLER" DISCIPLINE: every other Factory 041
-- primitive refuses to accept a caller-supplied value for anything
-- security-relevant (organisation_id, policy_version, idempotency_key,
-- execution_authoriser_grant_id) because those values, if caller-forged,
-- could manufacture unearned authority. p_nonce is categorically
-- different: per Phase 16B.2b-1's own design, "the nonce carries no
-- authority or identity of its own... it exists solely to provide
-- cross-row unlinkability" (20260821130000...sql:116-122). A caller
-- supplying an arbitrary nonce here cannot manufacture a false 'verified'
-- result -- the recomputed commitment only matches p_expected_commitment
-- if the SAME nonce, SAME channel, and SAME live destination that
-- originally produced that exact commitment are all present together;
-- supplying a wrong or invented nonce simply produces a different hash,
-- which correctly falls through to 'mismatch', never 'verified'. This
-- migration does not, however, imply that a nonce may safely be accepted
-- from an untrusted, arms-length external caller in general -- the future
-- authorization writer that calls this function is expected to look
-- up p_nonce from the trusted, immutable, already-stored public.
-- compliance_decisions row it is itself validating, never from a raw
-- external request parameter. That trust boundary belongs to the future
-- writer's own design (deferred, not part of this migration), not to
-- this function, which has no way to enforce where its caller's nonce
-- argument originated.
--
-- FUNCTION SIGNATURE AND RETURN SHAPE -- SIMPLER THAN THE EXISTING
-- PRIMITIVE, DELIBERATELY: derive_destination_commitment() returns a
-- table (status, nonce, destination_commitment) because it MANUFACTURES
-- a nonce and commitment the caller does not yet have. This function
-- manufactures nothing -- the caller already holds both the nonce and the
-- expected commitment, and needs only a verdict. It therefore returns a
-- single `text` value, not a table, per the Phase 16B.2b-5i
-- authorisation's own instruction to "return only a status text."
--
-- STATUS VOCABULARY, EXACTLY THREE VALUES, NO FOURTH: 'verified' (exact
-- commitment match against the live destination), 'mismatch' (every
-- structural precondition passed -- valid channel, valid nonce, valid
-- expected-commitment shape, a live, structurally valid destination
-- exists -- but the recomputed commitment differs from
-- p_expected_commitment), or 'blocked' (any structural precondition
-- failed: invalid channel, null nonce, a null or non-32-byte
-- p_expected_commitment, a nonexistent contact, a contact with no
-- populated destination for the requested channel, or a destination that
-- fails the same structural validation derive_destination_commitment()
-- already applies). 'mismatch' is returned ONLY when a genuine live
-- destination was actually compared and found to differ -- never as a
-- catch-all for "something about the input was wrong," which remains
-- 'blocked' throughout, mirroring this chain's established fail-closed
-- convention exactly.
--
-- AUTHORITATIVE DESTINATION MAPPING, IDENTICAL TO
-- derive_destination_commitment(): EMAIL resolves contacts.email; PHONE,
-- WHATSAPP, and SMS all resolve contacts.phone. contacts.direct_dial is
-- never read, matching that same established precedent
-- (resolveExecutionDestination.ts, 20260821130000...sql's own header).
-- p_requested_channel is validated against the closed, exact-case
-- vocabulary ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS') after btrim() only --
-- never case-folded -- identical to every other channel check in this
-- chain.
--
-- STRUCTURAL DESTINATION VALIDATION, BYTE-FOR-BYTE IDENTICAL TO
-- derive_destination_commitment(): the loaded destination is
-- pg_catalog.btrim()'d only (no semantic canonicalisation, no lower(),
-- no telephone reformatting -- same reasoning as that function's own
-- header: a cosmetically different destination is intentionally treated
-- as a different destination). EMAIL destinations are rejected above 254
-- characters or failing the identical
-- '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' pattern; PHONE/
-- WHATSAPP/SMS destinations are rejected above 30 characters or with
-- fewer than 10 digits after stripping non-digit characters via the
-- identical pg_catalog.regexp_replace(..., '[^0-9]', '', 'g') call. No
-- new validation rule is invented; none of the existing rules is relaxed.
--
-- CRYPTOGRAPHIC COMPATIBILITY -- EXACT PAYLOAD REUSE, NO NEW FORMAT: the
-- hashed payload reproduces derive_destination_commitment()'s
-- 'feh-destination-v1' construction exactly, field for field, in the
-- identical order, with the identical 4-byte big-endian length-prefix
-- framing (pg_catalog.int4send(pg_catalog.octet_length(field))) ahead of
-- each field:
--   1. the fixed version-domain tag 'feh-destination-v1';
--   2. the validated, exact-case requested_channel string;
--   3. the SUPPLIED p_nonce (via pg_catalog.uuid_send(p_nonce), its raw
--      16-byte binary form -- NOT a freshly generated one, the one
--      structural difference from the existing primitive, and the entire
--      reason this function exists);
--   4. the validated, trimmed-only, live destination text.
-- All text fields are converted to bytea via
-- pg_catalog.convert_to(..., 'UTF8'), identically. The hash function is
-- pg_catalog.sha256(bytea) -- the same native, non-pgcrypto primitive,
-- with no double-hashing and no alternate algorithm introduced anywhere.
-- Given the same nonce, channel, and destination that originally produced
-- a stored commitment, this construction is bit-for-bit reproducible; any
-- divergence in the live destination changes the resulting hash via
-- SHA-256's avalanche property, which is exactly the property this
-- function relies on to distinguish 'verified' from 'mismatch'.
--
-- p_expected_commitment SHAPE REQUIREMENT: must be non-null and exactly
-- 32 bytes (pg_catalog.octet_length(p_expected_commitment) = 32) --
-- SHA-256's fixed output length, matching the identical structural
-- requirement already enforced at the database level by public.
-- compliance_decisions_destination_commitment_length_check
-- (20260822140000...sql). A caller supplying a null or wrong-length value
-- is rejected as 'blocked' before any comparison is attempted -- this is
-- an input-shape precondition, not a verdict about destination identity.
--
-- COMPARISON -- ORDINARY BYTEA EQUALITY, CONSTANT-TIME LIMITATION
-- DOCUMENTED, NOT SILENTLY ASSUMED AWAY: PostgreSQL's core distribution
-- provides no repository-established constant-time bytea comparison
-- primitive -- no pgcrypto extension is enabled anywhere in this schema
-- (confirmed by every prior function in this chain, most recently
-- derive_destination_commitment()'s own header), and no `pg_catalog`
-- constant-time comparison function exists. This function therefore uses
-- ordinary bytea equality (`=`), which is a short-circuiting,
-- non-constant-time byte comparison. This is a genuine, acknowledged
-- limitation: in principle it could permit a timing side-channel that
-- leaks information about how many leading bytes of a guessed commitment
-- matched a real one. It is assessed as currently NON-EXPLOITABLE, not
-- because the limitation is unreal, but because of this function's own
-- dormancy: EXECUTE is revoked from PUBLIC, anon, and authenticated below
-- (see "DORMANCY" below), so no application-reachable caller -- let alone
-- an external attacker capable of measuring response-time deltas across
-- repeated guesses -- can invoke this function at all today. If this
-- function is ever activated for a genuinely external or
-- attacker-influenced calling path in a future phase, this timing
-- consideration must be re-examined at that time (for example, by
-- comparing SHA-256 digests of both sides rather than the raw values
-- directly, which does not eliminate timing variance but meaningfully
-- reduces its exploitability, or by sourcing a true constant-time
-- primitive if one becomes available) -- it is not solved by, and must
-- not be assumed solved by, this migration.
--
-- INFORMATION-ORACLE POSTURE, MATCHING derive_destination_commitment()
-- EXACTLY: the "contact does not exist," "contact exists but the
-- requested channel's destination field is null," and "destination fails
-- structural validation" cases are not distinguished from one another
-- internally -- all three naturally produce either a NULL v_raw_
-- destination or a failed validation check and fall through to the
-- identical 'blocked' result, for the identical reason
-- derive_destination_commitment() already established: p_contact_id is a
-- small, sequential bigint identity, and a differentiated reason would
-- let a caller holding EXECUTE enumerate which contact_id values exist
-- and which have a populated, well-formed destination for a given
-- channel. 'mismatch' is only ever reached after every one of those
-- structural checks has already passed, so it reveals nothing about
-- contact existence or destination shape -- only that a specific,
-- already-known-valid destination no longer matches a specific,
-- already-supplied expected commitment.
--
-- RAW DESTINATION NEVER RETURNED, LOGGED, OR PERSISTED: this function's
-- only output is one of the three status strings. The loaded, validated
-- destination exists only in local plpgsql variables for the duration of
-- this single invocation and is never included in any return value,
-- RAISE statement, or written to any table.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`, matching
-- every SECURITY DEFINER function in this repository. Every built-in call
-- security-relevant to this function's logic is explicitly pg_catalog-
-- qualified (pg_catalog.btrim, pg_catalog.length, pg_catalog.
-- regexp_replace, pg_catalog.octet_length, pg_catalog.convert_to,
-- pg_catalog.uuid_send, pg_catalog.int4send, pg_catalog.sha256), matching
-- derive_destination_commitment()'s own explicit-qualification style
-- exactly. public.contacts is fully schema-qualified.
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement appears here,
-- matching every precedent function in this repository -- ownership is
-- implicit (whoever applies this migration, `postgres`, under this
-- project's standard convention).
--
-- DORMANT BY DESIGN: PostgreSQL grants EXECUTE to PUBLIC by default on
-- every new function, and this project's own default privileges
-- separately grant `authenticated` EXECUTE on every new function owned by
-- `postgres` (established 20260810110000_harden_function_execute_
-- privileges.sql, reconfirmed for every dormant function in this chain
-- since) -- both are explicitly revoked below, alongside an explicit
-- `anon` revoke. No role can call this function after this migration is
-- applied. `service_role` is not referenced anywhere in this file,
-- matching the unbroken convention already established across every
-- prior function migration in this repository -- no repository precedent
-- requires a service-role privilege change here, and none is made.
--
-- MUTATION SURFACE: none. This function performs exactly one read
-- (against public.contacts) and zero writes of any kind -- no INSERT,
-- UPDATE, DELETE, or TRUNCATE appears anywhere in its body. Calling it
-- leaves no trace of the call in the database.
--
-- p_contact_id INPUT HARDENING, PER THE PHASE 16B.2b-5i-R1 ARCHITECT
-- CORRECTION: a null or non-positive p_contact_id is now rejected as
-- 'blocked' BEFORE any table lookup is attempted, rather than being
-- allowed to reach the public.contacts SELECT and simply match zero rows
-- there. public.contacts.id is `generated always as identity`, so no real
-- contact row could ever have a null or non-positive id -- this is a pure
-- input-shape guard, not a new differentiated existence check, and
-- collapses to the identical undifferentiated 'blocked' result as every
-- other structural rejection in this function, preserving the exact same
-- oracle-avoidance posture already established above.
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
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-5i authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.verify_destination_commitment(
  p_contact_id bigint,
  p_requested_channel text,
  p_nonce uuid,
  p_expected_commitment bytea
)
returns text
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
  v_payload bytea;
  v_recomputed bytea;
begin
  -- p_nonce must be the caller's already-stored nonce -- never generated
  -- here, never optional. A null nonce cannot possibly reproduce any
  -- real commitment.
  if p_nonce is null then
    return 'blocked';
  end if;

  -- p_expected_commitment shape precondition -- SHA-256's fixed output
  -- length, mirroring compliance_decisions_destination_commitment_
  -- length_check (20260822140000...sql). Checked before any comparison
  -- is attempted.
  if p_expected_commitment is null
     or pg_catalog.octet_length(p_expected_commitment) <> 32
  then
    return 'blocked';
  end if;

  -- requested_channel: closed, exact-case allow-list, identical to
  -- derive_destination_commitment(). Never case-folded or otherwise
  -- corrected.
  v_requested_channel := pg_catalog.btrim(p_requested_channel);
  if v_requested_channel is null
     or v_requested_channel not in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')
  then
    return 'blocked';
  end if;

  -- p_contact_id structural precondition -- rejected before any table
  -- lookup is attempted, per the Phase 16B.2b-5i-R1 hardening. public.
  -- contacts.id is `generated always as identity`, so no real contact can
  -- ever have a null or non-positive id -- this is a pure input-shape
  -- guard, not a differentiated existence check, and collapses to the
  -- same undifferentiated 'blocked' result as every other structural
  -- rejection in this function. See this migration's header for the full
  -- oracle-avoidance rationale already established for
  -- derive_destination_commitment().
  if p_contact_id is null or p_contact_id <= 0 then
    return 'blocked';
  end if;

  -- Authoritative destination load: contact_id is the sole lookup key,
  -- never a caller-supplied destination. A nonexistent contact and a
  -- contact whose relevant field is null are deliberately not
  -- distinguished here -- see the information-oracle note in this
  -- migration's header. Only email and phone are ever read; direct_dial
  -- is never read.
  select c.email, c.phone
    into v_email, v_phone
  from public.contacts c
  where c.id = p_contact_id;

  v_raw_destination := case v_requested_channel
    when 'EMAIL' then v_email
    else v_phone -- PHONE, WHATSAPP, and SMS all resolve contacts.phone
  end;

  if v_raw_destination is null then
    return 'blocked';
  end if;

  -- Exact representation, trimmed only -- no further canonicalisation.
  -- Identical to derive_destination_commitment().
  v_destination := pg_catalog.btrim(v_raw_destination);

  if pg_catalog.length(v_destination) = 0 then
    return 'blocked';
  end if;

  -- Structural validation, byte-for-byte identical to
  -- derive_destination_commitment(). No new rule invented, none relaxed.
  if v_requested_channel = 'EMAIL' then
    if pg_catalog.length(v_destination) > 254
       or v_destination !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    then
      return 'blocked';
    end if;
  else
    if pg_catalog.length(v_destination) > 30
       or pg_catalog.length(pg_catalog.regexp_replace(v_destination, '[^0-9]', '', 'g')) < 10
    then
      return 'blocked';
    end if;
  end if;

  -- Deterministic recomputation using the SUPPLIED stored nonce -- the
  -- one structural difference from derive_destination_commitment(),
  -- which generates a fresh nonce internally. Identical framing
  -- otherwise: see this migration's header for the full construction
  -- rationale.
  v_payload :=
    pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to('feh-destination-v1', 'UTF8')))
      || pg_catalog.convert_to('feh-destination-v1', 'UTF8')
    || pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to(v_requested_channel, 'UTF8')))
      || pg_catalog.convert_to(v_requested_channel, 'UTF8')
    || pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.uuid_send(p_nonce)))
      || pg_catalog.uuid_send(p_nonce)
    || pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to(v_destination, 'UTF8')))
      || pg_catalog.convert_to(v_destination, 'UTF8');

  v_recomputed := pg_catalog.sha256(v_payload);

  -- Ordinary bytea equality -- see "COMPARISON" in this migration's
  -- header for the documented constant-time limitation and why it is
  -- currently non-exploitable given this function's dormancy.
  if v_recomputed = p_expected_commitment then
    return 'verified';
  end if;

  return 'mismatch';
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
revoke all on function public.verify_destination_commitment(
  bigint, text, uuid, bytea
) from public;

revoke execute on function public.verify_destination_commitment(
  bigint, text, uuid, bytea
) from anon;

revoke execute on function public.verify_destination_commitment(
  bigint, text, uuid, bytea
) from authenticated;

-- ROLLBACK (documented, not executed): since this function is dormant --
-- unreachable by any application role, and performs no writes -- nothing
-- could depend on it.
-- drop function if exists public.verify_destination_commitment(
--   bigint, text, uuid, bytea
-- );
