-- Factory 041 Phase 16B.1: dormant controlled execution-authorization
-- creation boundary.
--
-- WHY THIS EXISTS: Phase 16A closed direct application-role INSERT/
-- UPDATE/DELETE/TRUNCATE on public.execution_authorizations. That leaves
-- the table with no write path at all -- by design, per the Phase 16A
-- migration's own header ("this migration establishes ONLY the
-- database-enforced mutation boundary"). The Phase 16B architecture
-- preflight (read-only, documented separately, not part of this
-- migration) examined what a future controlled-creation path would need
-- to prove before it could safely re-open that boundary, and found that
-- three classes of evidence this function would need to trust have NO
-- persisted, independently-verifiable source anywhere in this schema:
--   - human approval (no approvals table exists at all);
--   - compliance/contact-permission decision (only suppression is
--     genuinely database-backed; consent, legal basis, identity
--     confidence and contactability are all currently caller-asserted,
--     with no persisted record to check them against);
--   - actor-to-organisation authority (this schema has no per-user
--     organisation-membership concept anywhere -- public.user_roles is a
--     single global role, not scoped to any organisation).
--
-- SHAPE B, NOT SHAPE A: the architect's Phase 16B.1 decision was to
-- create this function as Shape B -- a function that establishes the
-- hardened SECURITY DEFINER interface and boundary now, but which
-- currently CANNOT insert a row, rather than Shape A (a complete
-- creation path gated only by withheld EXECUTE). Shape A was explicitly
-- prohibited unless every authority-producing field could be proven
-- independently of the three missing-provenance classes above; it
-- cannot be, so Shape A was not built. This function contains NO
-- `insert into public.execution_authorizations` statement anywhere --
-- creation is not merely unauthorised by grant, it is structurally
-- absent from this version's source code. Every syntactically valid
-- call to this function returns outcome 'rejected' (malformed input) or
-- 'blocked' (structurally valid input, but creation is withheld pending
-- provenance) -- there is no 'created' outcome anywhere in this version.
--
-- DORMANT BY DESIGN (matching the public.ingest_external_lead()
-- precedent, 20260813110000_ingest_external_lead_function.sql):
-- PostgreSQL grants EXECUTE to PUBLIC by default on every new function,
-- and this project's own default privileges separately grant
-- `authenticated` EXECUTE on every new function owned by `postgres` --
-- both are explicitly revoked below, alongside an explicit `anon`
-- revoke (already closed project-wide by
-- 20260810110000_harden_function_execute_privileges.sql, restated here
-- explicitly per the Phase 16B.1 authorisation so this migration's own
-- privilege state is self-evidently complete without depending on an
-- earlier migration's effect). No role can call this function after
-- this migration is applied. Remaining genuinely dormant -- not merely
-- unwired -- is verified by EXECUTE privilege absence, not by the
-- absence of an application caller.
--
-- WHAT THIS FUNCTION DOES VALIDATE (real, already-persisted facts, safe
-- to check now because none of them grants authority on their own):
--   - action_id is structurally usable (non-blank once trimmed, within
--     the same 200-character bound as the
--     execution_authorizations_action_id_length_check constraint);
--   - requested_channel is one of the table's own allowed values
--     (mirrors execution_authorizations_requested_channel_check);
--   - contact_id refers to a real, existing public.contacts row, and
--     that row's organisation_id is read from it (contacts.organisation_id
--     is NOT NULL and foreign-keyed to public.organisations, so this is a
--     genuine database fact, not a caller assertion).
--
-- WHAT THIS FUNCTION DOES NOT AND CANNOT DO: derive organisation_id from
-- a valid contact_id proves only that the contact belongs to that
-- organisation -- it does NOT prove the calling actor (auth.uid()) has
-- any authority over that organisation. No such actor-to-organisation
-- provenance model exists anywhere in this schema (see above), and this
-- function does not claim to have solved that gap -- auth.uid() is
-- captured below purely to establish the mechanism a future version will
-- use, never to authorise anything by itself.
--
-- CALLER-SUPPLIED PARAMETERS ARE LOOKUP KEYS ONLY, NEVER AUTHORITY: the
-- signature below deliberately has NO parameter for authorization_status,
-- human_approval_state, outreach_eligibility_status, expires_at,
-- policy_version, idempotency_key, actor_id, or organisation_id -- every
-- one of those is either derived internally or has no value at all in
-- this dormant version. A caller can supply only: action_id, contact_id,
-- requested_channel, and the two purely descriptive tags source_id /
-- campaign_id -- none of which alone can manufacture an authorised
-- outcome, since no outcome this function returns is ever 'created'.
--
-- EXPIRY: computed internally as transaction_timestamp() + interval '15
-- minutes' -- never caller-supplied. transaction_timestamp() (equivalent
-- to now()) is used rather than clock_timestamp() or statement_timestamp()
-- because a single, stable value for the whole transaction is the
-- correct semantic for "when this transaction decided the authorization
-- window starts" -- matching this table's own created_at/updated_at
-- default of now(). This value is computed and returned nowhere in this
-- version (there is no row to attach it to) -- it exists here only to
-- prove and document the exact future derivation, per the Phase 16B.1
-- authorisation.
--
-- POLICY VERSION: fixed constant
-- 'feh-execution-authorization-policy@0.1.0-factory041b' -- deliberately
-- distinct from Phase 6's existing in-code DEFAULT_POLICY_VERSION
-- ('feh-execution-authorization-policy@0.1.0-factory041', see
-- evaluateExecutionAuthorization.ts) so that a future row created by
-- THIS database-enforced path is always distinguishable in an audit from
-- a row that could only ever have come from the now-privilege-denied
-- Phase 7 application-layer writer. Not a configurable/environment value
-- -- a literal SQL constant, matching this migration's fixed-TTL
-- treatment of expiry.
--
-- IDEMPOTENCY KEY: derived internally, never caller-supplied, as
-- md5('feh-exec-auth-v1|' || action_id || '|' || contact_id || '|' ||
-- requested_channel). md5() is a PostgreSQL core built-in (no extension
-- dependency, unlike pgcrypto's digest()/encode()), always produces a
-- fixed 32-character lowercase-hex string containing no whitespace --
-- comfortably within the execution_authorizations_idempotency_key_length_check
-- bound (<=200 chars) and always already in the canonical (btrim-equal)
-- form required by execution_authorizations_idempotency_key_canonical_check,
-- so it would need no further normalisation before insertion. The
-- existing unique index (execution_authorizations_idempotency_key_idx,
-- on btrim(idempotency_key)) is untouched by this migration and remains
-- the sole future concurrency-safe protection against a duplicate row,
-- exactly as it already is for the dormant Phase 7 writer. This value is
-- computed here to prove the derivation is deterministic and
-- schema-compatible -- it is not stored or returned to the caller in
-- this version, since there is no row for it to identify.
--
-- SUPPRESSION: this function deliberately does NOT query
-- public.suppression_records. Doing so here, in a function whose only
-- possible outcomes are 'rejected'/'blocked', would risk implying that a
-- future 'not suppressed' result is being folded into a compliance
-- verdict -- it is not, and must not be. Suppression re-verification (if
-- ever added to this boundary) is explicitly deferred to the future,
-- separately-authorised activation phase, alongside the human-approval
-- and compliance-decision persistence this function still lacks
-- entirely.
--
-- SCOPE: exactly one new function and its REVOKE statements. No table,
-- column, index, or RLS policy is created, dropped, or altered. Phase
-- 16A's mutation lockdown (three dropped RLS policies, four revoked
-- table privileges for anon/authenticated) is untouched here -- this
-- migration does not restore INSERT, UPDATE, DELETE, or TRUNCATE, and
-- does not recreate any mutation RLS policy. No other function is
-- altered. No role is created. No service-role credential, environment
-- variable, or secret is read or required anywhere in this function.
--
-- SAFE / IDEMPOTENT: CREATE OR REPLACE FUNCTION is safe to rerun. Every
-- REVOKE is safe to rerun (revoking an unheld privilege is a no-op in
-- PostgreSQL).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only,
-- per the Phase 16B.1 authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.create_execution_authorization(
  p_action_id text,
  p_contact_id bigint,
  p_requested_channel text,
  p_source_id bigint default null,
  p_campaign_id text default null
)
returns table (
  outcome text,
  reason text
)
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_action_id text;
  v_requested_channel text;
  v_organisation_id bigint;
  v_expires_at timestamptz;
  v_policy_version text;
  v_idempotency_key text;
  v_reason text;
begin
  v_reason := null;

  -- Captured only to establish the trusted-identity mechanism a future
  -- version will use -- never itself treated as sufficient authority
  -- over any organisation (see header: no actor-to-organisation
  -- provenance model exists yet).
  v_actor_id := auth.uid();

  -- action_id: structural validity only, mirroring
  -- execution_authorizations_action_id_length_check.
  v_action_id := nullif(btrim(p_action_id), '');
  if v_reason is null and (v_action_id is null or length(v_action_id) > 200) then
    v_reason := 'invalid_action_id';
  end if;

  -- requested_channel: closed allow-list, mirroring
  -- execution_authorizations_requested_channel_check.
  v_requested_channel := btrim(p_requested_channel);
  if v_reason is null and (v_requested_channel is null or v_requested_channel not in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')) then
    v_reason := 'invalid_requested_channel';
  end if;

  -- contact_id: must resolve to a real public.contacts row. Its
  -- organisation_id is read as a genuine database fact (contacts.organisation_id
  -- is NOT NULL and foreign-keyed) -- this proves the contact/organisation
  -- link, not that the caller has authority over that organisation.
  if v_reason is null then
    select c.organisation_id into v_organisation_id
    from public.contacts c
    where c.id = p_contact_id;

    if v_organisation_id is null then
      v_reason := 'invalid_contact_id';
    end if;
  end if;

  if v_reason is not null then
    return query select 'rejected'::text, v_reason;
    return;
  end if;

  -- Authoritative expiry, policy version and idempotency key -- computed
  -- here, never caller-supplied, purely to prove and document the exact
  -- derivation this function will use once activation is authorised.
  -- None of these three values is written or returned anywhere below --
  -- there is no row in this version for them to attach to.
  v_expires_at := transaction_timestamp() + interval '15 minutes';
  v_policy_version := 'feh-execution-authorization-policy@0.1.0-factory041b';
  v_idempotency_key := md5(
    'feh-exec-auth-v1|' || v_action_id || '|' || p_contact_id::text || '|' || v_requested_channel
  );

  -- DORMANT BY DESIGN -- see migration header. Every structurally valid
  -- input reaches this point and is unconditionally blocked: human
  -- approval, compliance/contact-permission decision, and
  -- actor-to-organisation authority all remain unverifiable against any
  -- persisted record. No INSERT statement exists anywhere in this
  -- function -- creation is not merely unauthorised by grant, it is
  -- structurally absent from this version.
  return query select
    'blocked'::text,
    'Execution authorization creation is blocked pending architect-approved persisted provenance for human approval, compliance/contact-permission decision, and actor-to-organisation authority. This function establishes the validated interface only and contains no INSERT path in this version.'::text;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on every new function --
-- revoked here. This project's default privileges separately,
-- automatically grant `authenticated` EXECUTE on every new function
-- owned by `postgres` (confirmed live for an earlier function in
-- 20260810110000_harden_function_execute_privileges.sql and again for
-- 20260813110000_ingest_external_lead_function.sql) -- revoked here too,
-- explicitly. `anon`'s equivalent default was already closed
-- project-wide by 20260810110000, and is restated here explicitly per
-- the Phase 16B.1 authorisation, so this migration's own privilege state
-- is self-evidently complete on its own. All three revokes are required
-- for this function to be genuinely dormant; none replaces another.
revoke all on function public.create_execution_authorization(
  text, bigint, text, bigint, text
) from public;

revoke execute on function public.create_execution_authorization(
  text, bigint, text, bigint, text
) from anon;

revoke execute on function public.create_execution_authorization(
  text, bigint, text, bigint, text
) from authenticated;

-- ROLLBACK (documented, not executed): since this function is dormant --
-- unreachable by any application role -- nothing could depend on it.
-- drop function if exists public.create_execution_authorization(
--   text, bigint, text, bigint, text
-- );
