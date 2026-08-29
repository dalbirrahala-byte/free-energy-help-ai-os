-- Factory 041 Phase 16B.2b-5g: immutable compliance/contact-permission
-- evidence foundation.
--
-- WHY THIS EXISTS: the Phase 16B.2b-5f preflight established that no
-- table anywhere persists the output of frontend/src/lib/compliance/
-- evaluateContactPermission.ts -- every identity/contactability/consent/
-- legal-basis dimension it evaluates is caller-asserted, computed
-- in-memory, and discarded. Only public.suppression_records is
-- genuinely persisted, and it captures a narrower concept (active
-- suppressions) than the full multi-dimensional decision this module
-- already computes. This migration creates exactly the immutable
-- evidence record needed to close that gap -- schema only, no writer,
-- no evaluation logic, no activation of anything.
--
-- SCOPE, DELIBERATELY NARROW: one new table, its CHECK constraints, its
-- indexes, RLS enablement with zero policies, and explicit REVOKE
-- statements. No writer function, no trigger, no UPDATE/DELETE path, no
-- modification to evaluateContactPermission.ts or any other application
-- file, no modification to any existing migration, no activation of
-- outreach or provider execution.
--
-- CREATED_AT VS EVALUATED_AT -- DELIBERATELY DIFFERENT MEANINGS, PER THE
-- PHASE 16B.2b-5g-R1 ARCHITECT CORRECTION: created_at is when this
-- immutable database row was persisted -- DB-derived, `default
-- transaction_timestamp()`, exactly like every other created_at in this
-- schema. evaluated_at is when the compliance/contact-permission
-- evaluation itself actually occurred -- a fact about the real-world
-- evaluation event, which the row's own insert time cannot be trusted to
-- represent (a writer could, in principle, batch-insert evidence for
-- evaluations that happened moments or seconds earlier). evaluated_at is
-- therefore `NOT NULL` with NO default: the future trusted evaluation
-- writer must supply this value explicitly, the same "no arbitrary
-- default, the future writer must provide it" discipline already applied
-- to expires_at below, for the identical underlying reason -- neither
-- value is a fact about row-creation time, and defaulting either to
-- transaction_timestamp() would silently conflate two genuinely
-- different moments.
--
-- ANCHOR -- CONTACT + REQUESTED CHANNEL, NOT execution_intent_id: per
-- the Phase 16B.2b-5g architect settlement, compliance evidence is
-- fundamentally a fact about a (contact, channel) pair, reusable across
-- multiple compatible execution intents -- forcing a fresh evaluation
-- per intent would recreate exactly the "one-click-per-message" ceremony
-- problem the Factory 041 whole-system retrospective warned against.
-- execution_intent_id is therefore included ONLY as optional
-- traceability (see below), never as the table's security anchor. The
-- future authorization layer performs the strong binding itself, by
-- referencing a specific compliance_decisions row and independently
-- cross-checking that row's own contact_id/requested_channel against
-- its immutable execution intent's contact_id/requested_channel -- not
-- by this table depending on execution_intent_id at all.
--
-- POLICY_VERSION -- FIRST IDENTIFIER, CLOSED: 'FEH_CONTACT_PERMISSION_V1'
-- is the first, immutable semantic policy identifier for this decision
-- domain, per the Phase 16B.2b-5g settlement. A future material policy
-- change mints a new identifier (e.g. 'FEH_CONTACT_PERMISSION_V2') in
-- its own migration -- historical rows' meaning is never silently
-- redefined by widening this CHECK constraint's existing values, only
-- by adding a new one alongside them. No policy_version concept existed
-- anywhere in evaluateContactPermission.ts before this migration -- this
-- is a new addition, not a persisted copy of an existing value.
--
-- VOCABULARY ALIGNMENT, FIELD BY FIELD, RE-VERIFIED AGAINST THE ACTUAL
-- SOURCE FILES IN THIS SAME PHASE (not assumed from memory):
--   - requested_channel: SuppressionChannel (frontend/src/lib/
--     suppression/evaluateSuppression.ts:57) = ContactChannel
--     (evaluateContactPermission.ts:65) = exactly ('PHONE','EMAIL',
--     'WHATSAPP','SMS') -- identical to every other requested_channel
--     vocabulary already deployed in this schema.
--   - decision: ContactPermissionStatus (evaluateContactPermission.
--     ts:110) = exactly ('eligible','blocked','needs_review',
--     'evaluation_failed').
--   - identity_tier: IdentityTier (evaluateContactPermission.ts:72) =
--     MatchTier (frontend/src/lib/identity-resolution/
--     organisationMatching.ts:46, exactly ('deterministic',
--     'high_confidence','ambiguous')) plus 'unresolved' -- four values
--     total. Always populated in the source evidence shape (buildEvidence(),
--     evaluateContactPermission.ts:261-274, defaults via `input.
--     identityTier ?? "unresolved"`) -- never null in this table either.
--   - consent_status / legal_basis: both use ConsentOrLegalBasisValue
--     (evaluateContactPermission.ts:81-88) = exactly ('consented',
--     'legitimate_interest','contractual','regulatory','unknown',
--     'withdrawn','not_permitted') -- seven values, identical vocabulary
--     for both fields per that type's own deliberate reuse. Both remain
--     nullable here, exactly matching ContactPermissionEvidence's own
--     `consentStatus: ConsentOrLegalBasisValue | null` / `legalBasis:
--     ... | null` shape (evaluateContactPermission.ts:141-142) -- a
--     caller supplying nothing at all (null) is preserved as materially
--     different from a caller explicitly resolving to 'unknown'.
--   - contactability_status: ContactabilityStatus
--     (evaluateContactPermission.ts:90) = exactly ('contactable',
--     'not_contactable','unknown'). NOT NULL here: sourced from
--     ContactabilityDecision.status, which deriveContactabilityDecision()
--     (evaluateContactPermission.ts:184-206) always populates with a
--     concrete value -- never from ContactPermissionEvidence, which does
--     NOT carry a contactability field at all (confirmed by direct
--     re-reading of that type's exact members, evaluateContactPermission.
--     ts:132-143).
--
-- IDENTITY_CONFIDENCE RANGE -- PRECEDENT-MATCHED, NOT INVENTED, FLAGGED
-- HONESTLY: evaluateContactPermission.ts's own `identityConfidence:
-- number | null` carries no explicitly documented bound in that module
-- itself. This migration uses `smallint` with a 0-100 range check,
-- matching the already-established, closely-related
-- identity_match_candidates.match_confidence column exactly
-- (20260818100000_organisation_identity_foundation.sql:482,490-491,
-- `smallint`, `check (match_confidence >= 0 and match_confidence <= 100)`)
-- -- the same identity-resolution domain, and IdentityTier is literally
-- MatchTier from that same module. This is a precedent-matched inference,
-- not a directly-confirmed 1:1 source relationship -- reported plainly
-- rather than presented as more certain than it is.
--
-- HAS_EMAIL / HAS_TELEPHONE / HAS_DOMAIN, BUT NOT HAS_ORGANISATION_ID /
-- HAS_CONTACT_ID: ContactPermissionEvidence carries all five "has*"
-- presence flags (evaluateContactPermission.ts:132-137), but
-- organisation_id and contact_id are themselves NOT NULL columns on
-- this table (they are the anchor, not optional attribution) --
-- persisting a redundant boolean that would always read `true` given an
-- already-NOT-NULL column adds nothing and is deliberately omitted.
--
-- OPTIONAL FIELDS CONSIDERED AND EXCLUDED: source_id and campaign_id
-- were evaluated and excluded from this foundation. Both remain, per
-- every prior Factory 041 gate's own established finding, purely
-- attribution tags incapable of affecting eligibility -- and for THIS
-- table specifically, they add no compliance-relevant audit value not
-- already recoverable by joining through the optional
-- execution_intent_id reference (below) to the execution_intents row
-- that already carries them. Including them here would be exactly the
-- unnecessary coupling the Phase 16B.2b-5g authorisation warns against.
-- `reasons` (the existing ContactPermissionReason[] array,
-- non-PII per evaluateContactPermission.ts:129-131) was also evaluated
-- and excluded: it is an inherently variable-length free-text array,
-- not reducible to fixed typed columns, and this migration's own
-- authorisation prefers explicit typed columns over a generic JSON blob
-- wherever one can safely represent the evidence shape -- reasons text
-- is deferred to a later, separately-authorised audit enhancement, not
-- silently dropped from consideration.
--
-- EXECUTION_INTENT_ID -- OPTIONAL TRACEABILITY, NEVER THE ANCHOR: nullable,
-- `on delete set null` -- matching the identical treatment already given
-- to public.execution_intents' own purely-informational
-- supersedes_execution_intent_id and source_id columns
-- (20260822100000...sql), for the same reason: a traceability pointer
-- that is not itself security-load-bearing should never be protected by
-- RESTRICT, which would overstate its importance. Compliance evidence
-- remains fully valid with this column null.
--
-- CONTACT_ID / ORGANISATION_ID -- NOT NULL, ON DELETE RESTRICT: matching
-- public.execution_intents' own most-recently-settled precedent for
-- these exact two columns (after two rounds of architect correction in
-- that table's own construction) rather than public.
-- execution_authorizations' older `on delete set null` convention --
-- compliance evidence is, if anything, an even more direct provenance
-- record than an execution intent, and RESTRICT is the stronger,
-- audit-protecting choice already established as this schema's current
-- direction. The identical GDPR/retention consequence already accepted
-- for execution_intents applies consistently here, not as a new
-- trade-off: a contact cannot be hard-deleted while compliance evidence
-- about them exists, requiring a deliberate future erasure procedure --
-- the same standing fact already documented for execution_intents.
--
-- DESTINATION COMMITMENT -- REUSES derive_destination_commitment()'S OWN
-- TYPES, NO NEW HASHING IMPLEMENTATION: destination_commitment_nonce is
-- `uuid`, destination_commitment is `bytea` -- the exact output types
-- of the already-deployed public.derive_destination_commitment(bigint,
-- text) (20260821130000...sql), reused verbatim, not reinvented. No raw
-- destination value (email/telephone string) is stored anywhere in this
-- table, at any column, under any name.
--
-- THREE DESTINATION-COMMITMENT CONSTRAINTS, THE THIRD ADDED PER THE
-- PHASE 16B.2b-5g-R2 ARCHITECT HARDENING -- THE FIRST TWO ALONE DID NOT
-- CONSTRAIN SHAPE: the original design enforced only that the two
-- commitment columns are both-null or both-populated together, reasoning
-- that a 'blocked' decision (e.g. for suppression) does not need a
-- destination commitment to still be a meaningful record. That reasoning
-- remains correct for 'blocked' / 'needs_review' / 'evaluation_failed'
-- rows, which may legitimately carry no commitment -- but it left a
-- genuine gap for 'eligible' rows specifically: a persisted eligible
-- decision with no destination binding could later be relied upon
-- against a different, or since-changed, destination with nothing to
-- compare against, defeating the entire fresh-destination-revalidation
-- invariant this whole Factory 041 chain has otherwise applied without
-- exception. A second, additional CHECK requires that
-- `decision = 'eligible'` rows specifically carry a non-null commitment
-- pair. Neither of those first two constraints, however, said anything
-- about the SHAPE of a populated destination_commitment value -- a
-- non-null bytea of any length would satisfy both. The already-deployed
-- public.derive_destination_commitment() (20260821130000...sql) hashes
-- with native pg_catalog.sha256(), whose output is defined to be exactly
-- 32 bytes for any input -- this is a property of SHA-256 itself, not a
-- policy choice, and does not change based on what is hashed. A third
-- CHECK therefore requires that when destination_commitment is non-null,
-- octet_length(destination_commitment) = 32 -- catching, at the
-- database's own boundary, any future writer bug that stored a
-- differently-shaped value (truncated, double-hashed, wrong algorithm)
-- instead of trusting application code alone to preserve that invariant.
-- All three constraints compose without conflict: the pair check
-- constrains null-symmetry, the eligible check constrains presence by
-- decision, and the length check constrains the shape of
-- destination_commitment specifically whenever it is present, regardless
-- of which of the first two constraints permitted that presence. No new
-- cryptographic implementation is introduced -- this CHECK only verifies
-- a structural property of the existing, unmodified hash primitive's
-- already-defined output.
--
-- EXPIRES_AT -- NO DEFAULT, DELIBERATELY: per the Phase 16B.2b-5g
-- authorisation, this column is NOT NULL with no DEFAULT value and no
-- universal TTL chosen in this migration. Its value must be supplied
-- explicitly by whichever future trusted evaluation writer inserts a
-- row, computed according to policy this migration does not invent.
-- This is unusual among this schema's other NOT NULL timestamp columns
-- (which mostly default to transaction_timestamp()) precisely because
-- expiry is a policy decision, not a fact about when the row was
-- created -- conflating the two by giving expires_at a convenient
-- default would silently invent that policy.
--
-- EXPIRY-AFTER-EVALUATION, THE MINIMUM TEMPORAL INVARIANT -- ADDED PER
-- THE PHASE 16B.2b-5g-R2 ARCHITECT HARDENING: `expires_at` and
-- `evaluated_at` were each independently required to be supplied
-- explicitly by the future trusted writer (see above), but nothing
-- previously related the two values to each other -- a writer bug (or a
-- caller-supplied `evaluated_at` far in the past, paired with a
-- `expires_at` computed relative to a different, more recent moment)
-- could otherwise persist evidence that is already expired at, or even
-- before, the very moment it claims to have been evaluated, which is
-- incoherent on its face regardless of what TTL policy eventually governs
-- `expires_at`. A CHECK requiring `expires_at > evaluated_at` closes
-- exactly that gap, and only that gap -- it establishes no TTL, no
-- maximum validity window, and no relationship to `created_at` at all;
-- it is the smallest possible temporal coherence guarantee, not a policy
-- decision this migration is not authorised to make.
--
-- WHY EXPIRY IS NEEDED DESPITE LIVE SUPPRESSION REVALIDATION: per the
-- explicit Phase 16B.2b-5g correction, expires_at exists because
-- identity, consent/legal basis, contactability, destination, and
-- policy assumptions can all become stale independently of suppression
-- -- NOT because suppression itself might change (suppression is
-- independently, always, separately revalidated live at authorization
-- creation and at atomic consumption, per this same settlement's point
-- 3, regardless of what this table's own expires_at says).
--
-- IMMUTABILITY: this table is append-only by design -- no UPDATE path,
-- no DELETE path, no trigger, no writer function of any kind exists
-- anywhere in this migration. A new evaluation always means a new row,
-- matching the identical "immutable rows, revision via new row, never
-- mutate an existing row's meaning" convention already established for
-- public.execution_intents, public.execution_authorisers, and public.
-- suppression_records itself (whose own header states "suppression
-- rows are intentionally append-only in spirit... a changed decision is
-- recorded as a NEW row", 20260819110000...sql:173-176) -- this is now
-- the fourth table in this schema following the identical convention,
-- not a new pattern invented here.
--
-- PRIVILEGE POSTURE: matching every foundation table in this Factory
-- 041 chain exactly. PostgreSQL's platform-wide default-privilege rule
-- for the public schema grants full table privileges to anon,
-- authenticated, and service_role automatically at CREATE TABLE time
-- (confirmed repeatedly, most recently for public.execution_intents,
-- 20260822100000...sql). This migration explicitly revokes all such
-- privileges from anon and authenticated. RLS is enabled with zero
-- policies -- default-deny for every row, every role, every direction.
-- No writer exists to grant EXECUTE to, since none is created here.
-- service_role and the table owner are untouched, matching unbroken
-- convention.
--
-- SAFE / IDEMPOTENT: CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT
-- EXISTS are both safe to rerun.
--
-- NOT APPLIED BY THIS FILE'S PRESENCE: created for local review only,
-- per the Phase 16B.2b-5g authorisation. Must NOT be run against
-- Supabase, staged, committed, or pushed until a separate, explicit
-- authorisation is given.

create table if not exists public.compliance_decisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default transaction_timestamp(),
  evaluated_at timestamptz not null,

  organisation_id bigint not null
    references public.organisations (id) on delete restrict,
  contact_id bigint not null
    references public.contacts (id) on delete restrict,
  requested_channel text not null
    check (requested_channel in ('PHONE', 'EMAIL', 'WHATSAPP', 'SMS')),

  policy_version text not null
    check (policy_version in ('FEH_CONTACT_PERMISSION_V1')),
  decision text not null
    check (decision in ('eligible', 'blocked', 'needs_review', 'evaluation_failed')),

  identity_tier text not null
    check (identity_tier in ('deterministic', 'high_confidence', 'ambiguous', 'unresolved')),
  identity_confidence smallint
    check (identity_confidence is null or (identity_confidence >= 0 and identity_confidence <= 100)),

  consent_status text
    check (consent_status is null or consent_status in (
      'consented', 'legitimate_interest', 'contractual', 'regulatory',
      'unknown', 'withdrawn', 'not_permitted'
    )),
  consent_source text,
  legal_basis text
    check (legal_basis is null or legal_basis in (
      'consented', 'legitimate_interest', 'contractual', 'regulatory',
      'unknown', 'withdrawn', 'not_permitted'
    )),

  contactability_status text not null
    check (contactability_status in ('contactable', 'not_contactable', 'unknown')),

  has_email boolean not null,
  has_telephone boolean not null,
  has_domain boolean not null,

  destination_commitment_nonce uuid,
  destination_commitment bytea,

  expires_at timestamptz not null,

  execution_intent_id bigint
    references public.execution_intents (id) on delete set null,

  constraint compliance_decisions_destination_commitment_pair_check
    check ((destination_commitment_nonce is null) = (destination_commitment is null)),
  constraint compliance_decisions_eligible_destination_commitment_check
    check (
      decision <> 'eligible'
      or (
        destination_commitment_nonce is not null
        and destination_commitment is not null
      )
    ),
  constraint compliance_decisions_destination_commitment_length_check
    check (
      destination_commitment is null
      or octet_length(destination_commitment) = 32
    ),
  constraint compliance_decisions_expiry_after_evaluation_check
    check (expires_at > evaluated_at)
);

-- Primary lookup pattern per the Phase 16B.2b-5g settled anchor: "find
-- the current compliance evidence for this contact, on this channel."
create index if not exists compliance_decisions_contact_channel_idx
  on public.compliance_decisions (contact_id, requested_channel);

-- Matches every other foundation table's own established precedent of
-- indexing organisation_id independently, not only via the contact join.
create index if not exists compliance_decisions_organisation_id_idx
  on public.compliance_decisions (organisation_id);

-- Optional traceability lookup direction (execution_intent_id -> its
-- compliance evidence, if any was recorded).
create index if not exists compliance_decisions_execution_intent_id_idx
  on public.compliance_decisions (execution_intent_id)
  where execution_intent_id is not null;

-- Matches execution_authorizations_created_at_idx / execution_intents_
-- created_at_idx's identical precedent for chronological/audit browsing.
create index if not exists compliance_decisions_created_at_idx
  on public.compliance_decisions (created_at desc);

-- RLS enabled, zero policies -- see "PRIVILEGE POSTURE" above.
alter table public.compliance_decisions enable row level security;

-- Explicit second layer -- see "PRIVILEGE POSTURE" above.
revoke all on public.compliance_decisions from anon;
revoke all on public.compliance_decisions from authenticated;

-- ROLLBACK (documented, not executed): no writer, RLS policy, or
-- application code depends on this table, so nothing could reference it.
-- drop table if exists public.compliance_decisions;
