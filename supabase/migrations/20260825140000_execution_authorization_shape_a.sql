-- Factory 041 Phase 16B.2b-6f (Part C): Shape A execution-authorization
-- writer.
--
-- WHY THIS EXISTS: every prerequisite this writer depends on is now in
-- place -- public.execution_intents (identity + writer), public.
-- compliance_decisions, public.verify_destination_commitment(), public.
-- evaluate_suppression_live(), public.evaluate_execution_emergency_
-- stop(), public.execution_authorisers, public.execution_intent_
-- approvals (+ its three writers, same batch), and public.execution_
-- authorizations' own approval_decision_id/execution_authoriser_
-- grant_id provenance columns (20260825120000...sql, same batch). This
-- migration replaces the dormant Shape B stub (20260821110000...sql,
-- zero INSERT statements, every call returns 'rejected'/'blocked') with
-- the real Shape A writer -- the first function in this entire chain
-- capable of actually creating an execution_authorizations row. It
-- remains fully DORMANT after creation -- see "DORMANCY" below -- no
-- authorization can actually be created through any application-
-- reachable path after this migration is applied.
--
-- SHAPE B IS NOW OBSOLETE: the five-parameter Shape B signature
-- (p_action_id, p_contact_id, p_requested_channel, p_source_id,
-- p_campaign_id) accepted every authority-adjacent fact directly from
-- the caller. Shape A accepts exactly one parameter -- p_execution_
-- intent_id -- and derives organisation_id, contact_id, requested_
-- channel, source_id, campaign_id, and action_id internally from the
-- referenced, immutable execution_intents row, per the Phase 16B.2b-5h/
-- 5k/6a design settled across this chain. `CREATE OR REPLACE FUNCTION`
-- on the same name/signature-incompatible parameter list does not
-- silently coexist with the old five-parameter overload -- PostgreSQL
-- treats a different parameter list as a genuinely different function,
-- so this migration creates a new overload rather than replacing Shape
-- B's own five-parameter signature in place. Shape B's own dormant stub
-- is left untouched by this migration (not dropped) -- both signatures
-- coexist, both fully dormant.
--
-- SHAPE A PURPOSE, RESTATED FROM THE PHASE 16B.2b-6a DESIGN: a
-- successful execution authorization represents exactly one fact --
-- "for this specific execution intent, every currently-required gate
-- (approval, compliance, destination, suppression, emergency state) was
-- satisfied at the moment of creation, by a caller holding execution_
-- authoriser capability." It remains categorically separate from the
-- execution intent itself (a proposal, not a decision), from human
-- approval of that specific action (an independent, separately-evidenced
-- gate this function CONSUMES but does not itself constitute), from
-- execution_authoriser capability (system-wide "may this human authorise
-- execution," not evidence about this one action), from execution_
-- controller capability (an entirely unrelated, emergency-control-only
-- concept never referenced anywhere in this function), from emergency
-- state (a system-wide kill-switch this function respects but does not
-- alter), and from provider execution itself (this function creates
-- evidence that dispatch MAY occur -- it never dispatches anything, and
-- no provider-execution code exists anywhere in this repository for it
-- to call).
--
-- AUTHORITY -- execution_authoriser ONLY, RE-VERIFIED VIA ROW LOCK: per
-- the Phase 16B.2b-6a design and the Phase 16B.2b-6f authorisation,
-- identical to public.approve_execution_intent() et al. -- never admin,
-- never execution_controller. Pre-lock fast-fail EXISTS check, then an
-- authoritative `FOR SHARE` row-locked re-verification of the exact
-- active grant, immediately after the target execution_intents row lock
-- is acquired (see "LOCK ORDERING" below) -- the id of that locked row is
-- what gets persisted into execution_authorizations.execution_
-- authoriser_grant_id (now NOT NULL, 20260825120000...sql, matching the
-- Phase 16B.2b-5l settled policy that every live-executable authorization
-- must reference a valid grant).
--
-- LOCK ORDERING -- IDENTICAL PREFIX TO THE APPROVAL WRITERS, PER THE
-- PHASE 16B.2b-6f PART B DEADLOCK REVIEW: (1) `select ... from public.
-- execution_intents where id = p_execution_intent_id for update`; (2)
-- `select id from public.execution_authorisers where user_id = <actor>
-- and capability = 'execution_authoriser' and revoked_at is null for
-- share`; (3) read the latest approval decision for that same intent,
-- require 'approved'; (4) every subsequent live-evaluation gate
-- (compliance, destination, suppression, emergency state); (5) the
-- INSERT. This is the SAME lock target, SAME order, as public.approve_
-- execution_intent()/reject_execution_intent()/revoke_execution_
-- intent() (20260825130000...sql, same batch) -- by design: acquiring
-- the identical execution_intents row lock as its first mutex-relevant
-- action is exactly what "This lock must prevent approval mutation from
-- racing authorization creation" (Phase 16B.2b-6f Part C) means in
-- practice -- a concurrent approval-writer call against the SAME intent
-- must wait for this transaction to finish, and vice versa, with no
-- possibility of an interleaved, inconsistent read of approval state.
-- The full deadlock analysis already performed for the approval writers
-- (20260825130000...sql's own header) applies identically here, since
-- this function's lock ordering is byte-for-byte the same prefix: no
-- circular-wait condition exists against public.stop_execution()/
-- release_execution()/grant_execution_controller()/revoke_execution_
-- controller(), none of which ever locks public.execution_intents, and
-- any public.execution_authorisers row this function locks always has
-- capability = 'execution_authoriser' -- a structurally different row
-- from the capability = 'execution_controller' rows those other writers
-- ever touch.
--
-- KILL-SWITCH CHECKPOINT #1, PER THE PHASE 16B.2b-6a DESIGN: public.
-- evaluate_execution_emergency_stop() is called and required to return
-- 'clear' AFTER every other gate (approval, compliance, destination,
-- suppression) has already passed, and is called a SECOND time
-- immediately before the INSERT -- tightening the residual snapshot
-- window at near-zero cost without acquiring public.execution_
-- control_lock, which remains reserved exclusively for emergency STOP/
-- RELEASE serialization and is not referenced anywhere in this
-- migration (per the Phase 16B.2b-6a design's own explicit reasoning:
-- reusing that lock here would make authorization creation and
-- STOP/RELEASE contend for the same mutex, directly undermining STOP's
-- own responsiveness guarantee).
--
-- APPROVAL CONSUMPTION: the latest public.execution_intent_approvals
-- row for p_execution_intent_id (by id desc, never caller-selected) must
-- have decision = 'approved' -- missing, 'rejected', or 'revoked' (a
-- later revoke superseding an earlier approve) all collapse to
-- 'blocked', matching the Phase 16B.2b-6b/6c settled fail-closed
-- default. The matched row's own id is persisted into execution_
-- authorizations.approval_decision_id (20260825120000...sql) -- the
-- exact decision relied upon, never re-derived or assumed later. human_
-- approval_state is unconditionally set to 'approved' on a successful
-- INSERT -- this function structurally CANNOT write 'not_required':
-- there is no code path, no branch, and no vocabulary value available to
-- it that could ever produce that string, per the Phase 16B.2b-6b
-- settled policy ("Shape A must never write human_approval_state =
-- 'not_required'").
--
-- COMPLIANCE EVIDENCE: the latest public.compliance_decisions row for
-- (contact_id, requested_channel) -- both derived from the locked
-- execution_intents row, never caller-supplied -- selected by `order by
-- id desc limit 1`, per the Phase 16B.2b-5h/5k/5l-R1 settled Option B
-- selection model and "id DESC is the authoritative FEH persisted-
-- evidence sequence" ordering rule. Required: decision = 'eligible';
-- policy_version = 'FEH_CONTACT_PERMISSION_V1' (exact equality, no
-- compatibility layer); expires_at > transaction_timestamp(); and a
-- three-way subject-binding match (organisation_id, contact_id,
-- requested_channel) against the execution_intent -- all three verified
-- independently, never inferred transitively, per the Phase 16B.2b-5h
-- settled reasoning that these two rows are populated at different
-- times and could in principle diverge.
--
-- DESTINATION VERIFICATION: public.verify_destination_commitment(
-- contact_id, requested_channel, <compliance_decision's own stored
-- nonce>, <compliance_decision's own stored commitment>) is called live,
-- re-deriving against the CURRENT contacts row -- required to return
-- 'verified'; both 'mismatch' and 'blocked' fail closed identically.
--
-- LIVE SUPPRESSION: public.evaluate_suppression_live(p_execution_
-- intent_id) is called -- required to return 'clear'; 'suppressed' and
-- 'evaluation_failed' both fail closed identically. Never trusted from
-- any cached or earlier-computed state, including whatever suppression
-- check may have contributed to the referenced compliance_decisions
-- row's own original evaluation.
--
-- IDEMPOTENCY -- DETERMINISTIC, SERVER-DERIVED, REUSING THE EXISTING
-- UNIQUE INDEX: `'feh-exec-auth-v2|' || p_execution_intent_id::text`,
-- per the Phase 16B.2b-6a settled design -- a strict, permanent 1:1
-- mapping between one execution_intent and at most one execution_
-- authorization, ever, reusing execution_authorizations_idempotency_
-- key_idx (20260820100000...sql) with zero schema change. A concurrent
-- duplicate attempt collides on that existing unique index; the
-- resulting unique_violation is caught by a narrow nested `begin ...
-- insert ... exception when unique_violation then return 'duplicate';
-- end;` block wrapped around the INSERT alone -- matching the identical,
-- architect-approved, narrowly-scoped pattern established for public.
-- grant_execution_controller() (Phase 16B.2b-5z-A-R1): the function's
-- own OUTER block carries no EXCEPTION clause of any kind, so every
-- other statement (every authority/approval/compliance/destination/
-- suppression/emergency-state check preceding the INSERT) remains fully
-- unprotected. No WHEN OTHERS anywhere in this function: every other
-- error (foreign-key violations, permission errors, undefined objects,
-- schema errors, or any other unanticipated failure, from this
-- statement or any other) propagates normally. Retrying after an
-- authorization has expired unconsumed requires a genuinely new
-- execution_intent (per public.execution_intents' own "duplicates
-- permitted" design), not a second authorization against the same
-- intent -- this function has no mechanism to produce one.
--
-- POLICY VERSION AND TTL: policy_version is the literal constant
-- 'feh-execution-authorization-policy@1.0.0-shape-a' -- a fresh,
-- explicitly-versioned value distinguishing genuine Shape A output from
-- the dormant Shape B stub's own discarded '...0.1.0-factory041b'
-- placeholder (which was never actually written anywhere, since Shape B
-- never inserts) -- and remains entirely distinct from public.
-- compliance_decisions.policy_version ('FEH_CONTACT_PERMISSION_V1'),
-- governing a different fact on a different table. expires_at =
-- transaction_timestamp() + interval '15 minutes', the exact value
-- separately approved in the Phase 16B.2b-6b authorisation and not
-- revisited here. Both values are DB-derived/literal constants, never
-- caller-supplied, matching every other trusted-time value in this
-- chain.
--
-- OUTREACH_ELIGIBILITY_STATUS -- MAPPED, NOT COPIED: the compliance
-- decision's own 'eligible' value is mapped to 'eligible_for_handoff' on
-- the authorization row -- the two enums use different string literals
-- by design (flagged, not silently conflated, at this vocabulary
-- mismatch's original discovery in the Phase 16B.2b-5h preflight).
--
-- EVIDENCE -- DEDICATED FK COLUMNS PREFERRED OVER JSON DUPLICATION: per
-- the Phase 16B.2b-6f Part C authorisation's own instruction ("If schema
-- already has dedicated FK fields, use them rather than duplicating IDs
-- in JSON unnecessarily"), approval_decision_id, compliance_decision_id,
-- and execution_authoriser_grant_id are all persisted as their own
-- dedicated columns, not duplicated inside the evidence jsonb blob. The
-- evidence column carries only the three coded, non-PII verdicts this
-- function itself computed live (suppression, destination_verification,
-- emergency_state) -- values with no dedicated column of their own,
-- matching this table's own original "expected to hold only statuses/
-- IDs/booleans/policy references" design intent (20260820100000...sql).
--
-- FAIL-CLOSED, RESTATED: any missing or stale evidence, any subject-
-- binding mismatch, any destination mismatch, any active suppression,
-- an unreadable emergency-state evaluator, a revoked authority grant, or
-- an unapproved (missing/rejected/revoked) approval decision all
-- collapse to the identical 'blocked' result -- no authorization is ever
-- created on any of these paths.
--
-- RETURN CONTRACT: 'authorised' | 'duplicate' | 'blocked' |
-- 'evaluation_failed'. Every authority, approval, compliance,
-- destination, suppression, and emergency-state rejection collapses to
-- the identical 'blocked', undifferentiated -- a caller cannot
-- distinguish which specific gate failed, matching the oracle-avoidance
-- discipline established throughout this chain. 'evaluation_failed' is
-- retained for the same defensive-placeholder consistency every writer
-- in this chain carries, even though no concrete trigger case is
-- expected in ordinary operation (every live-evaluated primitive this
-- function calls -- verify_destination_commitment, evaluate_
-- suppression_live, evaluate_execution_emergency_stop -- already
-- collapses its own internal failure modes into its documented status
-- vocabulary, none of which this function re-labels as 'evaluation_
-- failed' rather than 'blocked'; a value outside each primitive's own
-- documented vocabulary is structurally unreachable given those
-- functions' own closed return contracts).
--
-- NULL-SAFETY HARDENING, PER THE LEAD ARCHITECT'S POST-6f HOLD: the
-- initial construction of this function used ordinary `<>` comparisons
-- for the destination/suppression/emergency-state gates. In PostgreSQL,
-- `<>` against a NULL left-hand operand evaluates to NULL, not TRUE --
-- and `IF NULL THEN` does not execute its branch, so a security evaluator
-- unexpectedly returning NULL would have silently passed the gate instead
-- of blocking. All four affected comparisons (destination verification,
-- live suppression, and both emergency-stop checkpoints) are corrected to
-- `IS DISTINCT FROM`, which treats NULL as a genuine mismatch. The
-- pre-existing `v_latest_approval_decision IS DISTINCT FROM 'approved'`
-- check was already correct and is unchanged.
--
-- Every other comparison in this function was separately audited and is
-- NULL-safe without modification, either by an explicit `IS NULL` check
-- preceding it, by deriving from a PostgreSQL-guaranteed-non-NULL boolean
-- (`EXISTS (...)`), or by structural NOT NULL proof from the referenced
-- table's own schema:
--   - v_actor_id, v_locked_intent_id, v_locked_grant_id: each has its own
--     explicit `IS NULL` guard immediately after assignment.
--   - v_has_grant: assigned from `select exists (...)`, which is defined
--     to always return true/false, never NULL.
--   - p_execution_intent_id: `IS NULL OR ... <= 0` -- the IS NULL
--     disjunct makes the overall OR evaluate to TRUE regardless of the
--     second operand when the parameter is NULL (SQL three-valued-logic
--     OR is TRUE whenever either operand is TRUE).
--   - v_compliance_decision, v_compliance_policy_version,
--     v_compliance_expires_at, v_compliance_org_id, v_compliance_
--     contact_id, v_compliance_channel: all read from public.
--     compliance_decisions columns declared `not null` in their owning
--     migration (20260822140000...sql: decision, policy_version,
--     expires_at, organisation_id, contact_id, requested_channel are all
--     `not null`). The preceding `v_compliance_id is null` check (itself
--     safe, since a missing row leaves every selected target NULL via
--     `select ... into`) is the only way this branch can be reached with
--     no row found; once a row IS found, every one of these columns is
--     schema-guaranteed populated, so `<>` against them cannot yield
--     NULL. Left as ordinary `<>` deliberately -- rewriting to
--     `IS DISTINCT FROM` here would be cosmetic, not a fail-closed fix,
--     per this phase's own instruction not to rewrite already-provably-
--     safe conditions.
--   - v_intent_organisation_id, v_intent_contact_id, v_intent_
--     requested_channel: read from public.execution_intents columns
--     declared `not null` in their owning migration (20260822100000
--     ...sql: organisation_id, contact_id, requested_channel are all
--     `not null`), reached only after `v_locked_intent_id is null` has
--     already been checked -- identical reasoning to the compliance
--     columns above.
--
-- SEARCH_PATH AND SCHEMA QUALIFICATION: `set search_path to ''`, every
-- security-relevant built-in explicitly pg_catalog-qualified (pg_
-- catalog.transaction_timestamp, pg_catalog.jsonb_build_object), every
-- relation and function reference fully schema-qualified (public.
-- execution_intents, public.execution_authorisers, public.execution_
-- intent_approvals, public.compliance_decisions, public.execution_
-- authorizations, public.verify_destination_commitment(), public.
-- evaluate_suppression_live(), public.evaluate_execution_emergency_
-- stop(), auth.uid()).
--
-- FUNCTION OWNERSHIP: no ALTER FUNCTION OWNER statement, matching every
-- precedent function in this repository.
--
-- DORMANCY: PostgreSQL grants EXECUTE to PUBLIC by default on every new
-- function, and this project's own default privileges separately grant
-- `authenticated` EXECUTE on every new function owned by `postgres` --
-- both are explicitly revoked below, alongside an explicit `anon`
-- revoke. No role can call this function after this migration is
-- applied. `service_role` is not referenced anywhere in this file,
-- matching the unbroken convention already established across every
-- prior function migration in this repository.
--
-- MUTATION SURFACE: exactly one INSERT, targeting public.execution_
-- authorizations only, reached only after every authority, approval,
-- compliance, destination, suppression, and emergency-state check has
-- passed. No UPDATE or DELETE against any table appears anywhere in this
-- function -- authorization CONSUMPTION (the future atomic claim writer)
-- remains entirely separate, not part of this migration. public.
-- execution_intents, public.execution_authorisers, public.execution_
-- intent_approvals, and public.compliance_decisions are read-and/or-
-- locked only, never written to.
--
-- SCOPE, RESTATED: this migration creates ONLY the one new function
-- overload and its REVOKE statements. It does NOT modify public.
-- execution_intents, public.execution_authorisers, public.execution_
-- intent_approvals, public.compliance_decisions, public.execution_
-- authorizations' own schema (that was 20260825120000...sql, the prior
-- migration in this same batch), public.create_execution_authorization
-- (text, bigint, text, bigint, text) (the dormant Shape B stub, left
-- untouched), or any other existing migration. It does NOT consume or
-- claim an authorization, does NOT wire any provider-dispatch path, and
-- does NOT change emergency state.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6f authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create or replace function public.create_execution_authorization(
  p_execution_intent_id bigint
)
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_actor_id uuid;
  v_has_grant boolean;
  v_locked_intent_id bigint;
  v_intent_organisation_id bigint;
  v_intent_contact_id bigint;
  v_intent_requested_channel text;
  v_intent_source_id bigint;
  v_intent_campaign_id text;
  v_intent_action_id text;
  v_locked_grant_id bigint;
  v_latest_approval_id bigint;
  v_latest_approval_decision text;
  v_compliance_id bigint;
  v_compliance_decision text;
  v_compliance_policy_version text;
  v_compliance_expires_at timestamptz;
  v_compliance_org_id bigint;
  v_compliance_contact_id bigint;
  v_compliance_channel text;
  v_compliance_nonce uuid;
  v_compliance_commitment bytea;
  v_destination_result text;
  v_suppression_result text;
  v_emergency_result text;
  v_idempotency_key text;
  v_policy_version text;
  v_expires_at timestamptz;
begin
  -- Captured exactly once. Never accepted from the caller.
  v_actor_id := auth.uid();
  if v_actor_id is null then
    return 'blocked';
  end if;

  -- Pre-lock fast-fail only -- NOT the authoritative proof.
  select exists (
    select 1 from public.execution_authorisers ea
    where ea.user_id = v_actor_id
      and ea.capability = 'execution_authoriser'
      and ea.revoked_at is null
  ) into v_has_grant;

  if not v_has_grant then
    return 'blocked';
  end if;

  if p_execution_intent_id is null or p_execution_intent_id <= 0 then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (1): the per-intent serialization primitive --
  -- identical lock target/mode as the approval writers. Every intent
  -- field is derived here, directly from the locked row -- never a
  -- caller parameter.
  select ei.id, ei.organisation_id, ei.contact_id, ei.requested_channel,
         ei.source_id, ei.campaign_id, ei.action_id
    into v_locked_intent_id, v_intent_organisation_id, v_intent_contact_id,
         v_intent_requested_channel, v_intent_source_id,
         v_intent_campaign_id, v_intent_action_id
  from public.execution_intents ei
  where ei.id = p_execution_intent_id
  for update;

  if v_locked_intent_id is null then
    return 'blocked';
  end if;

  -- LOCK ORDERING step (2): authoritative, row-locked re-verification
  -- of execution_authoriser authority. The locked row's id is what gets
  -- persisted below -- never the earlier pre-lock check's result.
  select ea.id into v_locked_grant_id
  from public.execution_authorisers ea
  where ea.user_id = v_actor_id
    and ea.capability = 'execution_authoriser'
    and ea.revoked_at is null
  for share;

  if v_locked_grant_id is null then
    return 'blocked';
  end if;

  -- Approval consumption: latest decision for this intent, read only
  -- after both locks are held -- see "APPROVAL CONSUMPTION" above.
  select eia.id, eia.decision
    into v_latest_approval_id, v_latest_approval_decision
  from public.execution_intent_approvals eia
  where eia.execution_intent_id = p_execution_intent_id
  order by eia.id desc
  limit 1;

  if v_latest_approval_decision is distinct from 'approved' then
    return 'blocked';
  end if;

  -- Compliance evidence: latest row for the same (contact_id,
  -- requested_channel), never caller-selected -- see "COMPLIANCE
  -- EVIDENCE" above.
  select cd.id, cd.decision, cd.policy_version, cd.expires_at,
         cd.organisation_id, cd.contact_id, cd.requested_channel,
         cd.destination_commitment_nonce, cd.destination_commitment
    into v_compliance_id, v_compliance_decision, v_compliance_policy_version,
         v_compliance_expires_at, v_compliance_org_id, v_compliance_contact_id,
         v_compliance_channel, v_compliance_nonce, v_compliance_commitment
  from public.compliance_decisions cd
  where cd.contact_id = v_intent_contact_id
    and cd.requested_channel = v_intent_requested_channel
  order by cd.id desc
  limit 1;

  if v_compliance_id is null or v_compliance_decision <> 'eligible' then
    return 'blocked';
  end if;

  if v_compliance_policy_version <> 'FEH_CONTACT_PERMISSION_V1' then
    return 'blocked';
  end if;

  if v_compliance_expires_at <= pg_catalog.transaction_timestamp() then
    return 'blocked';
  end if;

  -- Three-way subject binding, each verified independently -- see
  -- "COMPLIANCE EVIDENCE" above.
  if v_compliance_org_id <> v_intent_organisation_id
     or v_compliance_contact_id <> v_intent_contact_id
     or v_compliance_channel <> v_intent_requested_channel
  then
    return 'blocked';
  end if;

  -- Destination verification, live -- see "DESTINATION VERIFICATION"
  -- above.
  v_destination_result := public.verify_destination_commitment(
    v_intent_contact_id, v_intent_requested_channel,
    v_compliance_nonce, v_compliance_commitment
  );

  if v_destination_result is distinct from 'verified' then
    return 'blocked';
  end if;

  -- Live suppression -- see "LIVE SUPPRESSION" above.
  v_suppression_result := public.evaluate_suppression_live(p_execution_intent_id);

  if v_suppression_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- KILL-SWITCH CHECKPOINT #1 -- see "KILL-SWITCH CHECKPOINT #1" above.
  v_emergency_result := public.evaluate_execution_emergency_stop();

  if v_emergency_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- Re-evaluated a second time, immediately before the INSERT.
  v_emergency_result := public.evaluate_execution_emergency_stop();

  if v_emergency_result is distinct from 'clear' then
    return 'blocked';
  end if;

  -- Internally derived, never caller-supplied -- see "IDEMPOTENCY" and
  -- "POLICY VERSION AND TTL" above.
  v_idempotency_key := 'feh-exec-auth-v2|' || p_execution_intent_id::text;
  v_policy_version := 'feh-execution-authorization-policy@1.0.0-shape-a';
  v_expires_at := pg_catalog.transaction_timestamp() + interval '15 minutes';

  -- Exactly one INSERT, nested so the unique_violation catch below
  -- covers only this statement -- see "IDEMPOTENCY" above.
  begin
    insert into public.execution_authorizations (
      action_id, idempotency_key, requested_channel, authorization_status,
      human_approval_state, policy_version, authorised_at, expires_at,
      actor_id, organisation_id, contact_id, source_id, campaign_id,
      outreach_eligibility_status, execution_intent_id,
      execution_authoriser_grant_id, compliance_decision_id,
      approval_decision_id, evidence
    ) values (
      v_intent_action_id, v_idempotency_key, v_intent_requested_channel,
      'authorised', 'approved', v_policy_version,
      pg_catalog.transaction_timestamp(), v_expires_at, v_actor_id,
      v_intent_organisation_id, v_intent_contact_id, v_intent_source_id,
      v_intent_campaign_id, 'eligible_for_handoff', p_execution_intent_id,
      v_locked_grant_id, v_compliance_id, v_latest_approval_id,
      pg_catalog.jsonb_build_object(
        'suppression', 'clear',
        'destination_verification', 'verified',
        'emergency_state', 'clear'
      )
    );
  exception
    when unique_violation then
      return 'duplicate';
  end;

  return 'authorised';
end;
$$;

revoke all on function public.create_execution_authorization(
  bigint
) from public;

revoke execute on function public.create_execution_authorization(
  bigint
) from anon;

revoke execute on function public.create_execution_authorization(
  bigint
) from authenticated;

-- ROLLBACK (documented, not executed): this function overload is
-- dormant -- unreachable by any application role, and neither has ever
-- been called -- nothing could depend on it. public.execution_
-- authorizations is evidenced empty at every prior checkpoint in this
-- chain, so no data would be lost.
-- drop function if exists public.create_execution_authorization(bigint);
