# Utility Intent Radar — CRM review boundary design

Status: internal design only. No production CRM write, Apollo enrichment, credit use, sequence enrolment, outreach or deployment is authorised.

## Purpose

Define the handoff from a public-web research signal to a human CRM review queue without turning research evidence into contact authority.

## Required review fields

Every admitted research signal should carry these fields into the review projection:

- organisation_name
- claimed_company_number (nullable; claim only until trusted identity binding)
- signal_family and signal_type
- intent_kind
- source_adapter, source_tier, source_url and source_reference
- provenance
- exact_evidence excerpt
- observed_at, published_at, event_at and expires_at
- source_confidence_claim (labelled as a source/caller claim, not verified confidence)
- evidence_basis = INFERENCE
- contactability = AMBER or RED
- identity_status = UNVERIFIED
- duplicate_detected
- compliance_status
- review_status
- next_action
- source_record_key and all deduplication_keys

## Fail-closed review states

READY_FOR_HUMAN_REVIEW means only that a human may inspect the signal. It must not imply CRM persistence, Apollo enrichment, consent, lawful contact, identity verification or outreach permission.

BLOCKED applies when any of the following is true:

1. source/access evidence is excluded;
2. suppression or objection evidence makes contactability RED;
3. a duplicate key matches prior research;
4. the signal is expired;
5. identity/source/claim binding is unresolved.

All review projections keep these capabilities false:

- crmWriteAllowed
- apolloEnrichmentAllowed
- creditsSpendAllowed
- sequenceEnrollmentAllowed
- outreachAllowed
- executionPerformed

## Dedupe

Carry all current radar keys into the human review layer:

- evidenceKey;
- sourceRecordKey;
- source URL key where applicable;
- Intent Radar idempotency key.

A duplicate is not deleted or merged automatically. The reviewer is directed to the existing research record.

## Compliance and Apollo boundary

The public-web signal can explain why a business may deserve research attention. It cannot independently unlock Apollo.

The human reviewer must separately establish:

1. durable company identity;
2. source-to-company and claim binding;
3. lawful contact route and subscriber type;
4. suppression/objection status;
5. purpose limitation and data minimisation;
6. whether Apollo enrichment is justified under the separately reviewed Apollo gate.

Only a later, separately authorised boundary may create a CRM record or request paid enrichment.

## Category coverage

The review schema applies consistently to:

- change of tenancy / new premises;
- contract renewal / expiry;
- out-of-contract / deemed;
- price-shopping / comparison;
- billing or metering problems;
- expansion / equipment / load;
- tenders / procurement.

No category score can override provenance, dedupe or compliance controls.

## Acceptance evidence for a later implementation

A later code phase should include tests proving:

- a STRONG / confidence 100 public-web signal remains review-only;
- a duplicate cannot reach Apollo review;
- a suppressed or objecting record remains RED and blocked;
- an expired signal is blocked;
- forged identity/verification flags do not change UNVERIFIED status;
- the projection cannot write to Supabase and exposes no execution callback.
