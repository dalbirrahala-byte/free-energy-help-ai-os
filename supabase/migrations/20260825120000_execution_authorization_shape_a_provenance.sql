-- Factory 041 Phase 16B.2b-6f (Part D): Shape A provenance prerequisite.
--
-- WHY THIS EXISTS: the Phase 16B.2b-6f consolidated-batch schema-
-- sufficiency review found that public.execution_authorizations has a
-- dedicated FK column for every other piece of evidence a future Shape A
-- writer relies upon (execution_intent_id, compliance_decision_id,
-- execution_authoriser_grant_id) except one -- there is no column
-- referencing public.execution_intent_approvals (20260825110000...sql).
-- Storing that provenance only inside the evidence jsonb blob would be
-- inconsistent with this chain's own repeatedly-stated preference for
-- explicit typed FK columns over a generic JSON blob wherever one can
-- safely represent the evidence shape (first stated at public.
-- compliance_decisions' own construction, 20260822140000...sql). This
-- migration adds exactly that one column, its index, and separately
-- tightens execution_authoriser_grant_id to NOT NULL now that its own
-- mandatoriness has been settled -- see "EXECUTION_AUTHORISER_GRANT_ID"
-- below. It does not create a writer, does not activate anything, and
-- does not touch any other table.
--
-- SCOPE, DELIBERATELY NARROW: this migration performs exactly one ALTER
-- TABLE ADD COLUMN, one CREATE INDEX for that new column, one ALTER
-- TABLE ALTER COLUMN SET NOT NULL, and one CREATE INDEX closing a
-- historical gap on the column being tightened. Nothing else. It does
-- NOT create create_execution_authorization() or any other writer, does
-- NOT insert any data, does NOT modify public.execution_intent_
-- approvals, public.execution_authorisers, public.execution_intents, or
-- any other existing migration.
--
-- APPROVAL_DECISION_ID -- NOT NULL, ON DELETE RESTRICT, THE EXACT
-- DECISION ROW RELIED UPON: `approval_decision_id bigint not null
-- references public.execution_intent_approvals (id) on delete
-- restrict`. NOT NULL is safe and correct here, not merely convenient:
-- public.execution_authorizations is confirmed empty at every checkpoint
-- throughout this chain (most recently re-verified live in Phase
-- 16B.2b-5v/5x-R1/6e), so this ALTER is self-verifying at apply time --
-- it would fail outright if any row existed and lacked this value,
-- exactly the same structural safety net already relied upon for
-- execution_intent_id and compliance_decision_id's own NOT NULL
-- additions. NOT NULL is also the SETTLED, correct choice on policy
-- grounds, not merely a schema-safety convenience: the Phase 16B.2b-6b/
-- 6c preflights settled that EVERY execution intent requires per-action
-- human approval in v1, with no approval_not_required path -- meaning
-- every authorization Shape A could ever successfully create will
-- always have a real, approved decision row to reference. `on delete
-- restrict` matches every other provenance-protecting FK in this chain.
--
-- EXECUTION_AUTHORISER_GRANT_ID -- TIGHTENED TO NOT NULL, PER ALREADY-
-- SETTLED POLICY, NOT A NEW DECISION: this column was deliberately left
-- nullable at its own introduction (20260822120000...sql) specifically
-- because "whether EVERY successful execution authorization must always
-- trace back to an active execution_authoriser grant... has not been
-- decided or proven anywhere in this repository's approved
-- architecture" at that time. That question was subsequently and
-- explicitly settled in the Phase 16B.2b-5l "ARCHITECTURE
-- CLARIFICATIONS TO CARRY FORWARD": "execution_authoriser_grant_id
-- policy is SETTLED. Every future live-executable authorization MUST
-- reference a valid execution_authoriser grant." This migration merely
-- brings the schema in line with that already-settled policy -- it does
-- not invent a new one. Safe for the identical self-verifying-empty-
-- table reason as approval_decision_id above. An index is added for
-- this column at the same time, closing a historical gap: 20260822120000
-- ...sql's own header explicitly noted "execution_authoriser_grant_id
-- was NOT given its own index in that migration, but the two Factory
-- 041 provenance-FK additions since... both were -- the more recent,
-- now-dominant convention." Since this migration already touches this
-- exact column, adding its index now is a direct, non-speculative
-- extension of the change already being made here, not an unrelated
-- addition.
--
-- INDEXES -- PLAIN, MATCHING ESTABLISHED PRECEDENT: both new indexes are
-- plain (non-partial, since both referenced columns are now NOT NULL),
-- matching public.execution_authorizations_execution_intent_id_idx's
-- and .compliance_decision_id_idx's own identical shape
-- (20260822120000/20260822160000...sql).
--
-- FAIL-CLOSED ON UNEXPECTED PRE-EXISTENCE: this table is part of the
-- trusted execution-authorization evidence chain -- matching the
-- established posture for every security-significant schema change in
-- this specific sub-chain (Phase 16B.2b-5o-R1/5p-R1/5q-R1/6c-R1), no
-- `IF NOT EXISTS`/`IF EXISTS` guard is used on the ADD COLUMN or CREATE
-- INDEX statements below. If any of these three names is unexpectedly
-- already taken, PostgreSQL aborts loudly rather than silently building
-- on an unverified object.
--
-- SECURITY: no RLS change, no privilege change, no writer, no trigger.
-- Phase 16A's mutation lockdown on public.execution_authorizations
-- (three dropped RLS policies, four revoked table privileges for anon/
-- authenticated) is completely untouched -- adding columns and indexes
-- to a table does not, by itself, grant any role any new privilege.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only, per
-- the Phase 16B.2b-6f authorisation. Must NOT be run against Supabase,
-- staged, committed, or pushed until a separate, explicit authorisation
-- is given.

alter table public.execution_authorizations
  add column approval_decision_id bigint not null
    references public.execution_intent_approvals (id) on delete restrict;

create index execution_authorizations_approval_decision_id_idx
  on public.execution_authorizations (approval_decision_id);

alter table public.execution_authorizations
  alter column execution_authoriser_grant_id set not null;

create index execution_authorizations_execution_authoriser_grant_id_idx
  on public.execution_authorizations (execution_authoriser_grant_id);

-- ROLLBACK (documented, not executed): the table is evidenced empty at
-- every prior checkpoint in this chain, and no writer, RLS policy, or
-- application code references either change yet, so reverting would
-- lose no data and break nothing.
-- alter table public.execution_authorizations alter column execution_authoriser_grant_id drop not null;
-- drop index if exists public.execution_authorizations_execution_authoriser_grant_id_idx;
-- drop index if exists public.execution_authorizations_approval_decision_id_idx;
-- alter table public.execution_authorizations drop column if exists approval_decision_id;
