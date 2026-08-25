-- Factory 041 Phase 16B.2b-6h (Part E): durable dispatch-attempt
-- provenance.
--
-- WHY THIS EXISTS: authorization, consumption, dispatch-attempt
-- creation, provider invocation, and provider outcome are five distinct
-- facts -- see the Phase 16B.2b-6h authorisation's own "CORE CHECKPOINT
-- #3 PRINCIPLE." A consumed authorization may eventually cause AT MOST
-- ONE provider call; this migration builds the crash-safe, retry-safe
-- record of that one durable attempt identity, independent of whether
-- the provider call has happened yet or how it turns out. It creates
-- schema ONLY -- no writer exists anywhere yet to insert or update a row,
-- and this migration inserts none.
--
-- ONE DURABLE ATTEMPT IDENTITY, NOT A SUCCESS RECORD: a row existing here
-- means "the database has committed to attempting exactly one provider
-- dispatch for this authorization" -- it does NOT mean the provider was
-- ever actually called, let alone that it succeeded. `status = 'prepared'`
-- is the row's initial and only non-terminal state; `execution_performed`
-- on public.execution_authorizations is set true ONLY by a future,
-- confirmed-success outcome writer (20260825190000...sql, same batch),
-- never by this table's own existence.
--
-- LIFECYCLE TABLE, NOT APPEND-ONLY -- A DELIBERATE DEPARTURE FROM THIS
-- CHAIN'S DOMINANT CONVENTION, EXPLAINED: every prior evidence table in
-- this chain (execution_intent_approvals, compliance_decisions) is
-- immutable/append-only -- a new fact always means a new row. This table
-- is different by design: because `dispatch_idempotency_key` is a
-- deterministic, 1:1 function of `execution_authorization_id` (see
-- below), at most one row can EVER exist for a given authorization --
-- there is no "new row" a later outcome could be recorded into. The SAME
-- row's `status` therefore transitions via UPDATE as the provider outcome
-- becomes known (`prepared` -> `succeeded`/`failed`/`indeterminate`),
-- exactly matching this table's own purpose: one durable identity, whose
-- terminal state is discovered over time, not a sequence of independent
-- events.
--
-- DISPATCH_IDEMPOTENCY_KEY -- DETERMINISTIC, SERVER-DERIVED, NEVER
-- CALLER-SUPPLIED: the future prepare-dispatch writer computes exactly
-- `'feh-dispatch-v1|' || execution_authorization_id`, reusing the
-- identical "deterministic key reusing a unique index" discipline already
-- established for execution_authorizations.idempotency_key
-- (`'feh-exec-auth-v2|' || execution_intent_id`, 20260825140000...sql).
-- This is DIFFERENT from, and serves a different purpose than,
-- execution_authorizations.idempotency_key -- that key gives "at most one
-- authorization per execution intent"; this key gives "at most one
-- logical dispatch attempt per authorization." Both the UNIQUE index on
-- this column (below) and a SEPARATE, independent UNIQUE index directly
-- on execution_authorization_id are added -- structurally redundant with
-- each other today (since the key is a deterministic function of the id),
-- but deliberately so: the direct authorization_id uniqueness constraint
-- protects the "one authorization, one attempt" invariant even if a
-- future change ever altered the key-derivation formula without
-- preserving that 1:1 property, matching this chain's general preference
-- for structural, not merely conventional, guarantees.
--
-- FOREIGN KEYS -- ON DELETE RESTRICT, MATCHING THIS CHAIN'S PROVENANCE-
-- PROTECTING PRECEDENT: `execution_authorization_id` and
-- `provider_adapter_id` are both `not null ... on delete restrict`,
-- identical treatment to every other provenance-bearing FK added in this
-- chain since execution_intents' own settled precedent -- an
-- authorization or an adapter can never be hard-deleted while a dispatch
-- attempt still references it.
--
-- STATE MACHINE -- CLOSED, MINIMAL VOCABULARY: `'prepared'` |
-- `'succeeded'` | `'failed'` | `'indeterminate'`, per the Phase
-- 16B.2b-6h Part F instruction. No additional state is added.
-- `prepared`: the DB has authorised this exact provider attempt; no
-- provider outcome is yet known. `succeeded`: the provider confirmed
-- success and execution_performed has been finalised (atomically, in the
-- same transaction as this row's own transition -- see the future
-- outcome-writer migration). `failed`: the provider definitively
-- rejected/failed and did NOT perform the action -- execution_performed
-- is never set true on this path. `indeterminate`: the provider outcome
-- could not be safely proven (timeout/network ambiguity) --
-- execution_performed is never set true on this path either, and no
-- second logical attempt may ever be created for the same authorization
-- (structurally prevented by the uniqueness constraints above); a future
-- reconciliation process resolves an `indeterminate` row by calling the
-- SAME outcome-finalisation writers again on this SAME row, transitioning
-- it to `succeeded` or `failed` once the true outcome becomes provable --
-- see the outcome-writer migration's own header for exactly how.
--
-- COHERENCE CHECKS, MINIMAL, NOT SPECULATIVE: `completed_at` is null
-- exactly when `status = 'prepared'`, and populated for every terminal
-- state -- enforced by CHECK, not left to writer discipline alone.
-- `failure_code` may be populated only for `'failed'`/`'indeterminate'`,
-- never for `'prepared'`/`'succeeded'` -- also enforced by CHECK.
-- `provider_reference` carries no such restriction: a provider may
-- legitimately return a reference value even on a failed or ambiguous
-- attempt (useful for support/reconciliation), so no CHECK narrows which
-- states may carry one -- this is a deliberate choice not to encode a
-- constraint the Phase 16B.2b-6h authorisation never actually requested.
--
-- LENGTH BOUNDS: `dispatch_idempotency_key` (200 chars),
-- `provider_reference` (200 chars), and `failure_code` (100 chars) all
-- use CHECK constraints matching this chain's existing 200-character
-- reference-field precedent (execution_authorizations.idempotency_key,
-- stop_execution()/release_execution()'s own evidence_reference bound) --
-- `failure_code` uses a narrower 100-character bound, matching this
-- chain's shorter "kind/key" identifier precedent (adapter_key on
-- execution_provider_adapters, same batch) since a failure code is
-- expected to be a short symbolic token, not a narrative string.
--
-- NO ROW INSERTED, NO WRITER YET: this migration contains no INSERT
-- statement and creates no function. RLS is enabled with zero policies,
-- and table privileges are explicitly revoked from anon/authenticated --
-- matching every other foundation table in this chain.
--
-- FAIL-CLOSED ON UNEXPECTED PRE-EXISTENCE: no `IF NOT EXISTS`/`IF
-- EXISTS` guard is used below, matching the established posture for
-- every security-significant schema object in this specific sub-chain.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6h authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create table public.execution_dispatch_attempts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default transaction_timestamp(),

  execution_authorization_id bigint not null
    references public.execution_authorizations (id) on delete restrict,
  provider_adapter_id bigint not null
    references public.execution_provider_adapters (id) on delete restrict,

  dispatch_idempotency_key text not null
    check (char_length(btrim(dispatch_idempotency_key)) > 0 and char_length(dispatch_idempotency_key) <= 200)
    check (dispatch_idempotency_key = btrim(dispatch_idempotency_key)),

  status text not null
    check (status in ('prepared', 'succeeded', 'failed', 'indeterminate')),

  provider_reference text
    check (provider_reference is null or char_length(provider_reference) <= 200),
  failure_code text
    check (failure_code is null or char_length(failure_code) <= 100),
  completed_at timestamptz,

  constraint execution_dispatch_attempts_completed_at_coherence_check
    check (
      (status = 'prepared' and completed_at is null)
      or (status <> 'prepared' and completed_at is not null)
    ),
  constraint execution_dispatch_attempts_failure_code_scope_check
    check (
      failure_code is null
      or status in ('failed', 'indeterminate')
    )
);

-- One authorization, at most one logical dispatch attempt, ever --
-- structural, independent of the idempotency-key derivation below. See
-- "DISPATCH_IDEMPOTENCY_KEY" above.
create unique index execution_dispatch_attempts_execution_authorization_id_idx
  on public.execution_dispatch_attempts (execution_authorization_id);

-- Deterministic, server-derived key uniqueness -- see
-- "DISPATCH_IDEMPOTENCY_KEY" above.
create unique index execution_dispatch_attempts_dispatch_idempotency_key_idx
  on public.execution_dispatch_attempts (dispatch_idempotency_key);

-- Matches execution_authorizations_authorization_status_idx's own
-- established precedent of indexing a status/lifecycle column
-- independently.
create index execution_dispatch_attempts_status_idx
  on public.execution_dispatch_attempts (status);

-- Supports a future prepare-dispatch writer's own adapter-side lookup
-- pattern ("which attempts used this adapter").
create index execution_dispatch_attempts_provider_adapter_id_idx
  on public.execution_dispatch_attempts (provider_adapter_id);

-- RLS enabled, zero policies -- see the header above.
alter table public.execution_dispatch_attempts enable row level security;

-- Explicit second layer, matching every other foundation table in this
-- chain.
revoke all on public.execution_dispatch_attempts from anon;
revoke all on public.execution_dispatch_attempts from authenticated;

-- ROLLBACK (documented, not executed): no writer, RLS policy, or
-- application code depends on this table, and it is inserted into
-- nowhere in this migration, so nothing could reference it.
-- drop table if exists public.execution_dispatch_attempts;
