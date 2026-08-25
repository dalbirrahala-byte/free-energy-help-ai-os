-- Factory 041 Phase 16B.2b-6h (Part C): approved provider-adapter
-- foundation.
--
-- WHY THIS EXISTS: checkpoint #3 must never accept an arbitrary
-- provider/adapter string from an untrusted caller and treat it as
-- approved. This migration builds the smallest trusted primitive that
-- makes "is this specific provider adapter approved, for this specific
-- channel, right now" a fact the database itself can answer -- not the
-- caller. It creates schema ONLY: no writer exists anywhere to insert,
-- update, or approve a row, and this migration itself inserts none.
-- Deployment of this migration leaves ZERO usable provider adapters.
--
-- REPOSITORY-CODE AUDIT PERFORMED FIRST, PER THE PHASE 16B.2b-6h PART A
-- INSTRUCTION: frontend/src/lib/execution-dispatch/providerAdapter.ts
-- already defines a `ProviderAdapter` interface (`channel`, `kind`,
-- `execute()`) and a static `NO_OP_ADAPTER_REGISTRY` covering all four
-- channels, every entry a deliberately inert no-op (`kind: "no-op"`).
-- This table's `adapter_key` column is designed to correspond to that
-- same `kind` identifier (e.g. `"no-op"`), so a future activation phase
-- can require BOTH a registered code adapter AND an approved DB row to
-- agree before anything is dispatchable -- see PART R of that same
-- authorisation. This migration does not modify any TypeScript file.
--
-- TWO-SIDED APPROVAL, WHY IT MATTERS: a DB row alone could name a code
-- adapter that does not exist (a typo, a retired adapter); a registered
-- code adapter alone says nothing about whether ops has actually
-- approved it for live use. Checkpoint #3's future prepare-dispatch
-- writer (20260825180000...sql, same batch) checks the DB side of this
-- pair; the TypeScript application boundary remains responsible for
-- checking the code-registry side before ever calling `adapter.execute()`
-- -- neither side is trusted alone.
--
-- ADAPTER_KEY UNIQUE PER CHANNEL, NOT GLOBALLY, PER THE PHASE 16B.2b-6h
-- PART C INSTRUCTION: a unique index on (channel, adapter_key), not on
-- adapter_key alone. This allows the same code-adapter identity to be
-- registered once per channel it legitimately serves (mirroring
-- `ProviderAdapter.channel` being a fixed, single-channel property of
-- each adapter instance in the TypeScript registry), while structurally
-- preventing the exact hazard this phase named explicitly: "one PHONE
-- adapter record authorising EMAIL/SMS/WHATSAPP." A lookup always
-- filters on the pair together, and the future prepare-dispatch writer
-- independently re-verifies the resolved row's own `channel` column
-- against the authorization's `requested_channel` as a second, redundant
-- check -- never trusting the unique index alone to enforce the binding
-- at read time.
--
-- STATUS -- CLOSED, MINIMAL, NO SPECULATIVE HEALTH STATE: `'approved'` |
-- `'disabled'`, per the Phase 16B.2b-6h Part C instruction against
-- inventing health-monitoring states in this phase. `'disabled'` exists
-- so a future activation phase can revoke an adapter's usability without
-- deleting its row (preserving dispatch-attempt FK history), by the same
-- "never delete, only supersede" discipline already used for revoked
-- execution_authorisers grants (UPDATE, not DELETE) -- though unlike that
-- table, this phase does not build the writer that would ever transition
-- a row between these two states; that belongs to a future,
-- separately-authorised activation phase.
--
-- APPROVAL PROVENANCE -- COLUMNS ONLY, NO AUTHORITY MODEL DECIDED HERE:
-- `approved_by`/`approved_at` are included as nullable provenance columns
-- per the Phase 16B.2b-6h Part C invitation to consider them "ONLY if
-- repository-backed authority can be correctly established now." No such
-- authority is established now -- there is no existing human capability
-- in this schema that cleanly represents "may approve a live provider
-- adapter," and the Phase 16B.2b-6h Part D instruction explicitly
-- forbids manufacturing a new one merely for this batch. These two
-- columns therefore remain nullable, with no writer anywhere populating
-- them -- a future, separately-authorised activation phase both decides
-- who may approve an adapter and builds whatever writer that requires.
-- `approved_by` is `on delete set null`, matching this chain's
-- "disposable audit metadata, not protected provenance" treatment
-- (public.execution_authorizations.actor_id's own precedent) precisely
-- because no writer or policy currently depends on it.
--
-- NO ROW INSERTED, DEPLOYMENT LEAVES ZERO USABLE ADAPTERS: this
-- migration contains no INSERT statement of any kind. RLS is enabled
-- with zero policies, and table privileges are explicitly revoked from
-- anon/authenticated -- matching every other foundation table in this
-- chain -- so even a SELECT against this table is unreachable by any
-- application role. Population and approval of any adapter row is
-- entirely deferred to a future, separately-authorised phase.
--
-- FAIL-CLOSED ON UNEXPECTED PRE-EXISTENCE: this table is part of the
-- trusted execution-dispatch chain -- matching the established posture
-- for every security-significant schema object in this specific
-- sub-chain, no `IF NOT EXISTS`/`IF EXISTS` guard is used below. If any
-- of these names is unexpectedly already taken, PostgreSQL aborts loudly
-- rather than silently building on an unverified object.
--
-- PRIVILEGE POSTURE: matching every foundation table in this chain.
-- PostgreSQL's platform-wide default-privilege rule grants full table
-- privileges to anon/authenticated/service_role automatically at CREATE
-- TABLE time -- this migration explicitly revokes from anon and
-- authenticated. service_role and the table owner are untouched,
-- matching unbroken convention for TABLES (as opposed to the mutating
-- FUNCTIONS later in this batch, which explicitly revoke from
-- service_role too -- see those migrations' own headers for why that
-- distinction is correct: a bare table grant is not itself an execution
-- boundary the way a SECURITY DEFINER function's EXECUTE privilege is).
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6h authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

create table public.execution_provider_adapters (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default transaction_timestamp(),

  adapter_key text not null
    check (char_length(btrim(adapter_key)) > 0 and char_length(btrim(adapter_key)) <= 100)
    check (adapter_key = btrim(adapter_key)),
  channel text not null
    check (channel in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')),
  status text not null
    check (status in ('approved', 'disabled')),

  approved_by uuid
    references auth.users (id) on delete set null,
  approved_at timestamptz
);

-- Structural pairing: adapter_key is unique per channel, never globally
-- -- see "ADAPTER_KEY UNIQUE PER CHANNEL" above.
create unique index execution_provider_adapters_channel_adapter_key_idx
  on public.execution_provider_adapters (channel, adapter_key);

-- Primary lookup pattern for a future prepare-dispatch writer: "find the
-- approved adapters for this channel."
create index execution_provider_adapters_channel_idx
  on public.execution_provider_adapters (channel);

-- RLS enabled, zero policies -- see "PRIVILEGE POSTURE" above.
alter table public.execution_provider_adapters enable row level security;

-- Explicit second layer -- see "PRIVILEGE POSTURE" above.
revoke all on public.execution_provider_adapters from anon;
revoke all on public.execution_provider_adapters from authenticated;

-- ROLLBACK (documented, not executed): no writer, RLS policy, or
-- application code depends on this table, and it is inserted into
-- nowhere in this migration, so nothing could reference it.
-- drop table if exists public.execution_provider_adapters;
