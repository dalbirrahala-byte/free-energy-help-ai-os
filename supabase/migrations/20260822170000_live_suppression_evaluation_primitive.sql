-- Factory 041 Phase 16B.2b-5l: SQL-native live suppression evaluation
-- primitive.
--
-- WHY THIS EXISTS: the Phase 16B.2b-5k read-path preflight established
-- that frontend/src/lib/suppression/evaluateSuppressionWithLookup() --
-- the only existing "is this action currently suppressed?" implementation
-- -- is TypeScript/Node application code, unreachable from inside a
-- PostgreSQL SECURITY DEFINER writer. Every future Shape A
-- create_execution_authorization() writer (and its future atomic
-- consumption counterpart) is, consistent with every other writer built
-- in this Factory 041 chain, a pure SQL function -- it has no mechanism
-- to invoke Node code, and this chain's own established discipline
-- refuses to accept a caller-supplied suppression verdict as an input
-- (that would be exactly the "trust a caller-produced authority fact"
-- anti-pattern this whole engagement exists to close). This migration
-- builds exactly the missing piece: a dormant, read-only SQL primitive
-- that reproduces the existing TypeScript suppression-matching contract
-- faithfully, so a future trusted writer can perform a genuine live
-- suppression check inside its own transaction, never a cached or
-- caller-asserted one.
--
-- SCOPE, DELIBERATELY NARROW: this migration creates ONLY this one
-- function and its REVOKE statements. It does NOT alter public.
-- suppression_records, public.compliance_decisions, public.
-- execution_authorizations, public.execution_intents, public.
-- create_execution_authorization(), public.verify_destination_
-- commitment(), or any other existing function. It does not add a
-- writer, a trigger, an RLS policy, or a provider call, and does not
-- activate authorization creation, consumption, or outreach. No
-- application/TypeScript file is touched. No existing migration is
-- altered.
--
-- PREFLIGHT: frontend/src/lib/suppression/evaluateSuppression.ts and
-- supabase/migrations/20260819110000_suppression_records_foundation.sql
-- were both freshly re-read from disk immediately before this migration
-- was first written, per the Phase 16B.2b-5l authorisation -- not relied
-- upon from memory. A repository-wide grep for any existing suppression
-- evaluation SQL function found none: the only prior SQL artifact
-- touching suppression is the table itself; every mention of
-- "suppression" elsewhere is either a column comment or, in
-- 20260821110000_execution_authorization_controlled_creation.sql, an
-- explicit statement that the dormant Phase 16B.1
-- create_execution_authorization() deliberately does NOT query
-- suppression_records. No naming or object collision exists.
--
-- EXACT TYPESCRIPT CONTRACT EXTRACTED (evaluateSuppression.ts, this
-- session's fresh read):
--   - MATCHING MODEL: a suppression_records row matches when EVERY
--     POPULATED identifying column on that row equals the corresponding
--     evaluation-input field ("AND of populated fields") AND the row is
--     currently active. A row column that is null -- OR that NORMALISES
--     to null, see below -- never narrows the match; this is what makes
--     an organisation-only row apply "regardless of channel" and a
--     channel-less row apply "across every channel."
--   - ACTIVE WINDOW: starts_at <= evaluationTimestamp AND (ends_at IS
--     NULL OR ends_at > evaluationTimestamp). No other scope-specific
--     rule exists -- PERMANENT/TEMPORARY/SOURCE_SPECIFIC/
--     CAMPAIGN_SPECIFIC all use this identical window check.
--   - EMAIL NORMALISATION: lower-cased, trimmed; empty/whitespace-only
--     treated as absent (null).
--   - TELEPHONE NORMALISATION: digits only (non-digit characters
--     stripped); the result is treated as absent (null) unless it has
--     at least 10 digits.
--   - DOMAIN NORMALISATION: lower-cased, trimmed, a leading "www." and
--     any trailing slash(es) stripped; empty result treated as absent.
--   - CRITICAL SUBTLETY, VERIFIED FROM THE ACTUAL matchFields()
--     IMPLEMENTATION (not assumed): normalisation is applied to BOTH the
--     row's value and the input's value before comparison, and a row
--     field that normalises to null is treated EXACTLY the same as a
--     genuinely null row field -- i.e. NOT a required matching
--     condition, even if the raw stored text was non-blank (e.g. a
--     stored telephone value with fewer than 10 digits after stripping
--     non-digits does not narrow the match at all). This migration's SQL
--     reproduces this precisely -- see "MULTI-FIELD MATCHING
--     IMPLEMENTATION" below.
--   - hasAnyIdentifier GATE: if the evaluation input carries literally no
--     identifier at all, the TypeScript module short-circuits to
--     "allowed" without even querying. This primitive's own input always
--     carries at least organisation_id and contact_id (both derived
--     internally, ultimately from the referenced execution_intent -- see
--     "EXECUTION-INTENT-ANCHORED DERIVATION" below), so this specific
--     short-circuit path is structurally unreachable here and needs no
--     separate implementation -- the general query below already
--     produces the identical "no active matching row -> clear" result by
--     a different path.
--   - OUTPUT VOCABULARY: "allowed" | "suppressed" | "evaluation_failed".
--     "evaluation_failed" is the module's single most important property
--     ("A database read failure returns evaluation_failed, never
--     allowed -- an empty/missing result must never be silently treated
--     as evidence that contact is safe").
--   - NO channel normalisation of any kind is applied anywhere in the
--     TypeScript module -- channel is compared via plain string equality
--     against the already-closed ('PHONE','EMAIL','WHATSAPP','SMS')
--     vocabulary.
--
-- EXECUTION-INTENT-ANCHORED DERIVATION -- CORRECTED PER THE PHASE
-- 16B.2b-5l-R1 ARCHITECT CORRECTION: the first local draft of this
-- migration accepted p_contact_id, p_requested_channel, p_source_id, and
-- p_campaign_id directly as parameters, reasoning that source_id/
-- campaign_id were needed for faithful AND-of-populated-fields matching
-- and that neither was raw PII. The architect correction identified a
-- more fundamental problem this reasoning missed: contact_id,
-- requested_channel, source_id, and campaign_id are not independent
-- facts this primitive should be trusted to receive from ANY caller --
-- they are already authoritative, immutable properties of a specific
-- public.execution_intents row (20260822100000...sql), and a trusted
-- security primitive must derive them from that one authoritative source
-- rather than accept up to four separately-supplied values that a caller
-- could, in principle, assemble inconsistently (e.g. a real contact_id
-- paired with a channel or source_id that was never actually proposed
-- for that contact). This migration now accepts exactly one parameter,
-- p_execution_intent_id, and derives every other value -- organisation_
-- id, contact_id, requested_channel, source_id, campaign_id -- from that
-- one immutable row, then further derives email/phone from public.
-- contacts and domain from public.organisations. No parameter of any
-- kind exists for contact_id, requested_channel, source_id, campaign_id,
-- organisation_id, email, telephone, or domain -- a caller cannot supply,
-- and therefore cannot forge or mismatch, any of them.
--
-- IDENTITY CONSISTENCY CHECK -- contacts.organisation_id MUST EQUAL
-- execution_intents.organisation_id: public.execution_intents.
-- organisation_id is itself derived, at intent-creation time, from the
-- SAME contact's organisation_id (public.create_execution_intent(),
-- 20260822110000...sql, "ORGANISATION DERIVATION"). Nothing in this
-- schema forbids a contact's organisation_id from being reassigned by a
-- live UPDATE after that intent was created, so the two values are not
-- guaranteed to remain equal at read time even though they were equal at
-- write time. This function re-verifies that equality explicitly rather
-- than assuming it -- the identical defensive discipline already applied
-- to subject binding in the Phase 16B.2b-5h/5k read-path preflights. A
-- mismatch fails closed to 'evaluation_failed', exactly like every other
-- structural precondition below.
--
-- FAIL-CLOSED CASES, ALL COLLAPSING TO evaluation_failed, NO
-- DIFFERENTIATED REASON: p_execution_intent_id null or <= 0; no matching
-- execution_intents row; no matching contacts row for that intent's
-- contact_id; no matching organisations row for that intent's
-- organisation_id; contacts.organisation_id != execution_intents.
-- organisation_id; requested_channel (loaded from the intent) outside
-- the closed ('PHONE','EMAIL','WHATSAPP','SMS') vocabulary. The last
-- case should be structurally unreachable in practice -- public.
-- execution_intents.requested_channel is itself protected by
-- execution_intents_requested_channel-equivalent CHECK enforcement
-- (20260822100000...sql) that the database enforces regardless of which
-- role wrote the row -- but is re-validated here defensively rather than
-- assumed, matching this chain's consistent "structural precondition,
-- not a live risk" treatment of comparable already-enforced invariants
-- elsewhere (e.g. public.execution_authorizations_compliance_linkage's
-- own NOT NULL self-verification reasoning).
--
-- CHANNEL VALIDATION -- A FAITHFUL EXTENSION OF THE MODULE'S OWN STATED
-- PHILOSOPHY, RESTATED: evaluateSuppression.ts itself performs no
-- RUNTIME channel validation -- TypeScript's compile-time type system is
-- its only protection, which has no equivalent at the SQL boundary.
-- Leaving an unrecognised channel value to simply fail to match every
-- channel-scoped suppression row would be a genuine safety regression
-- relative to the module's own top-priority fail-closed rule. This
-- function validates the intent's own requested_channel against the
-- closed vocabulary and returns 'evaluation_failed' on anything outside
-- it, rather than silently degrading to a weaker, channel-blind match.
--
-- MULTI-FIELD MATCHING IMPLEMENTATION -- LATERAL NORMALISATION, ROW AND
-- INPUT SIDES SYMMETRIC: the query below computes each candidate row's
-- normalised email/telephone/domain via a LATERAL subquery using the
-- identical rules as the input-side normalisation (lower+trim for email;
-- digit-strip with a 10-digit floor for telephone; lower+trim+www-strip+
-- trailing-slash-strip for domain), then compares each populated
-- (non-null-after-normalisation) row field against the corresponding
-- normalised, execution-intent-derived value with `sr_field is null or
-- sr_field = derived_field`. This reproduces the TypeScript
-- matchFields() function's exact behaviour, including the subtlety
-- documented above: a row's telephone value with fewer than 10 digits
-- normalises to null and is therefore NOT a required matching condition,
-- identical to a genuinely blank stored value. organisation_id,
-- contact_id, source_id, and campaign_id require no normalisation (exact
-- equality only, matching the TypeScript module's identical treatment);
-- channel likewise requires no normalisation, matching the module's
-- plain-string-equality treatment of that field.
--
-- ACTIVE WINDOW -- IDENTICAL RULE, DATABASE-NATIVE COMPARISON: `sr.
-- starts_at <= pg_catalog.transaction_timestamp() and (sr.ends_at is
-- null or sr.ends_at > pg_catalog.transaction_timestamp())`, using a
-- single, stable per-transaction timestamp (matching the identical
-- `transaction_timestamp()` convention already used for every other
-- "as of now" comparison in this chain, e.g. compliance_decisions'
-- expires_at freshness check). The TypeScript implementation's defensive
-- Number.isNaN() guards against malformed Date parsing have no SQL
-- equivalent need: starts_at/ends_at are native timestamptz columns,
-- which cannot hold an unparseable value in the first place -- this is
-- not a semantic difference, only a difference in what each language
-- needs to guard against.
--
-- OUTPUT VOCABULARY -- 'clear' | 'suppressed' | 'evaluation_failed',
-- FAITHFUL, NOT INVENTED: renames the TypeScript module's "allowed" to
-- 'clear' -- the Phase 16B.2b-5l authorisation's own suggested surface,
-- confirmed to faithfully represent the existing three-way contract
-- exactly (an active, matching suppression row exists / no such row
-- exists / the evaluation itself could not be trusted), with no fourth
-- state and no narrower or broader meaning than evaluateSuppression.ts's
-- own three statuses.
--
-- DATABASE ERROR BEHAVIOUR -- TWO DISTINCT FAILURE CLASSES, NOT
-- CONFLATED, PER THE PHASE 16B.2b-5l-R1 CORRECTION: this function
-- returns 'evaluation_failed' for every NORMAL structural/input/evidence
-- failure it can anticipate and check for explicitly (see "FAIL-CLOSED
-- CASES" above) -- these are ordinary, expected control-flow paths, not
-- exceptions. It deliberately does NOT wrap its body in an exception
-- handler (no BEGIN ... EXCEPTION WHEN OTHERS THEN ... block anywhere in
-- this function) to catch and convert a genuine, unanticipated
-- PostgreSQL execution failure (e.g. a connection-level error, an
-- out-of-memory condition, a lock-timeout, a catalog corruption) into a
-- manufactured 'evaluation_failed' return value. Swallowing an
-- UNANTICIPATED database exception that way would be actively unsafe:
-- PL/pgSQL's own execution model means the surrounding trusted
-- transaction (the future writer that calls this function) is, by
-- default, already in an aborted state the instant such an exception
-- propagates -- catching it here and returning a normal text value would
-- require an internal SAVEPOINT to keep the outer transaction alive,
-- which risks silently masking a real, serious database-level problem
-- behind an ordinary-looking 'evaluation_failed' result the calling
-- writer could not distinguish from a benign structural rejection. A
-- genuine PostgreSQL execution failure is therefore allowed to propagate
-- and abort the surrounding transaction -- this is itself fail-closed
-- (no authorization can possibly be created or consumed inside an
-- aborted transaction), simply by a different, more forceful mechanism
-- than a returned status string.
--
-- MATCH FIELDS, RESTATED, WHERE POPULATED ON suppression_records:
-- organisation_id, contact_id, normalised email, normalised telephone,
-- normalised domain, source_id, campaign_id, channel -- all eight,
-- unchanged from the first draft's coverage, now sourced entirely from
-- the execution-intent-anchored derivation above rather than from direct
-- caller parameters.
--
-- READ-ONLY, NO MUTATION SURFACE OF ANY KIND: this function performs
-- exactly four reads (public.execution_intents, public.contacts, public.
-- organisations, public.suppression_records) and zero writes -- no
-- INSERT, UPDATE, DELETE, or TRUNCATE appears anywhere in its body. It
-- performs no outreach or provider action of any kind.
--
-- ORACLE / DATA-MINIMISATION: every structural rejection (see
-- "FAIL-CLOSED CASES" above) collapses to the identical undifferentiated
-- 'evaluation_failed' result, matching the oracle-avoidance discipline
-- already established for public.derive_destination_commitment() and
-- public.verify_destination_commitment() -- a caller holding EXECUTE
-- (none does, see "DORMANCY" below) could not distinguish "this intent
-- does not exist" from "this contact's organisation was reassigned"
-- from "this channel is malformed" from an unrelated internal failure.
-- 'suppressed' vs 'clear' is exactly the one bit of information this
-- function exists to reveal -- never which record matched, never its
-- reason, scope, legal_basis, evidence_reference, or notes, none of
-- which appear anywhere in this function's return value. Raw email,
-- telephone, and domain values (both the contact's own and any
-- suppression record's) exist only in local plpgsql variables for the
-- duration of one invocation and are never returned, logged, or
-- persisted.
--
-- SECURITY DEFINER -- REQUIRED BY THE ESTABLISHED DATABASE MODEL: every
-- prior trusted-read primitive in this Factory 041 chain that loads
-- authoritative data from public.contacts (public.derive_destination_
-- commitment(), public.verify_destination_commitment()) uses SECURITY
-- DEFINER, uniformly. This function must remain correct and callable
-- from inside a future SECURITY DEFINER writer regardless of the
-- ultimate calling session's own RLS visibility into public.
-- execution_intents, public.contacts, public.organisations, or public.
-- suppression_records -- following this chain's own unbroken convention
-- is the safer, architecturally consistent choice, not a new elevation
-- invented for this migration. `set search_path to ''` is used
-- identically; every security-relevant built-in call is explicitly
-- pg_catalog-qualified (pg_catalog.btrim, pg_catalog.lower, pg_catalog.
-- length, pg_catalog.regexp_replace, pg_catalog.transaction_timestamp);
-- public.execution_intents, public.contacts, public.organisations, and
-- public.suppression_records are fully schema-qualified.
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
-- the Phase 16B.2b-5l authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.evaluate_suppression_live(
  p_execution_intent_id bigint
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_intent_organisation_id bigint;
  v_intent_contact_id bigint;
  v_intent_requested_channel text;
  v_intent_source_id bigint;
  v_intent_campaign_id text;
  v_contact_organisation_id bigint;
  v_email text;
  v_phone text;
  v_domain text;
  v_email_norm text;
  v_phone_norm text;
  v_domain_norm text;
  v_organisation_exists boolean;
  v_suppressed boolean;
begin
  -- p_execution_intent_id structural precondition -- rejected before any
  -- table lookup, matching public.verify_destination_commitment()'s
  -- identical Phase 16B.2b-5i-R1 hardening.
  if p_execution_intent_id is null or p_execution_intent_id <= 0 then
    return 'evaluation_failed';
  end if;

  -- Authoritative derivation, sole source: public.execution_intents.
  -- organisation_id, contact_id, requested_channel, source_id, and
  -- campaign_id are never accepted from the caller -- see
  -- "EXECUTION-INTENT-ANCHORED DERIVATION" above.
  select ei.organisation_id, ei.contact_id, ei.requested_channel,
         ei.source_id, ei.campaign_id
    into v_intent_organisation_id, v_intent_contact_id,
         v_intent_requested_channel, v_intent_source_id, v_intent_campaign_id
  from public.execution_intents ei
  where ei.id = p_execution_intent_id;

  if v_intent_contact_id is null then
    return 'evaluation_failed';
  end if;

  -- requested_channel: closed allow-list, re-validated defensively even
  -- though public.execution_intents' own CHECK constraint already
  -- guarantees this -- see "FAIL-CLOSED CASES" above.
  if v_intent_requested_channel is null
     or v_intent_requested_channel not in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')
  then
    return 'evaluation_failed';
  end if;

  -- Authoritative contact load. A nonexistent contact is not
  -- distinguished from any other structural failure.
  select c.organisation_id, c.email, c.phone
    into v_contact_organisation_id, v_email, v_phone
  from public.contacts c
  where c.id = v_intent_contact_id;

  if v_contact_organisation_id is null then
    return 'evaluation_failed';
  end if;

  -- Identity consistency: the contact's CURRENT organisation_id must
  -- still equal the organisation_id the execution_intent was created
  -- with -- see "IDENTITY CONSISTENCY CHECK" above.
  if v_contact_organisation_id <> v_intent_organisation_id then
    return 'evaluation_failed';
  end if;

  -- Authoritative organisation domain, looked up via the INTENT's own
  -- organisation_id (now confirmed equal to the contact's own).
  select true, o.domain
    into v_organisation_exists, v_domain
  from public.organisations o
  where o.id = v_intent_organisation_id;

  if v_organisation_exists is null then
    return 'evaluation_failed';
  end if;

  -- Input-side normalisation, byte-for-byte mirroring
  -- evaluateSuppression.ts's normaliseEmail/normaliseTelephone/
  -- normaliseDomain. See this migration's header for the full
  -- field-by-field derivation.
  v_email_norm := pg_catalog.lower(pg_catalog.btrim(v_email));
  if v_email_norm = '' then
    v_email_norm := null;
  end if;

  v_phone_norm := pg_catalog.regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  if pg_catalog.length(v_phone_norm) < 10 then
    v_phone_norm := null;
  end if;

  v_domain_norm := pg_catalog.lower(pg_catalog.btrim(v_domain));
  v_domain_norm := pg_catalog.regexp_replace(v_domain_norm, '^www\.', '');
  v_domain_norm := pg_catalog.regexp_replace(v_domain_norm, '/+$', '');
  if v_domain_norm = '' then
    v_domain_norm := null;
  end if;

  -- AND-of-populated-fields match against every active suppression_
  -- records row, with row-side normalisation computed per candidate via
  -- a LATERAL subquery -- see "MULTI-FIELD MATCHING IMPLEMENTATION"
  -- above for why this precisely reproduces matchFields().
  select exists (
    select 1
    from public.suppression_records sr
    cross join lateral (
      select
        nullif(pg_catalog.lower(pg_catalog.btrim(sr.email)), '') as sr_email_norm,
        nullif(
          case
            when pg_catalog.length(
              pg_catalog.regexp_replace(coalesce(sr.telephone, ''), '[^0-9]', '', 'g')
            ) >= 10
            then pg_catalog.regexp_replace(sr.telephone, '[^0-9]', '', 'g')
            else null
          end,
          ''
        ) as sr_phone_norm,
        nullif(
          pg_catalog.regexp_replace(
            pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(sr.domain)), '^www\.', ''),
            '/+$', ''
          ),
          ''
        ) as sr_domain_norm
    ) norm
    where sr.starts_at <= pg_catalog.transaction_timestamp()
      and (sr.ends_at is null or sr.ends_at > pg_catalog.transaction_timestamp())
      and (sr.organisation_id is null or sr.organisation_id = v_intent_organisation_id)
      and (sr.contact_id is null or sr.contact_id = v_intent_contact_id)
      and (norm.sr_email_norm is null or norm.sr_email_norm = v_email_norm)
      and (norm.sr_phone_norm is null or norm.sr_phone_norm = v_phone_norm)
      and (norm.sr_domain_norm is null or norm.sr_domain_norm = v_domain_norm)
      and (sr.source_id is null or sr.source_id = v_intent_source_id)
      and (sr.campaign_id is null or sr.campaign_id = v_intent_campaign_id)
      and (sr.channel is null or sr.channel = v_intent_requested_channel)
  ) into v_suppressed;

  if v_suppressed then
    return 'suppressed';
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
revoke all on function public.evaluate_suppression_live(
  bigint
) from public;

revoke execute on function public.evaluate_suppression_live(
  bigint
) from anon;

revoke execute on function public.evaluate_suppression_live(
  bigint
) from authenticated;

-- ROLLBACK (documented, not executed): since this function is dormant --
-- unreachable by any application role, and performs no writes -- nothing
-- could depend on it.
-- drop function if exists public.evaluate_suppression_live(
--   bigint
-- );
