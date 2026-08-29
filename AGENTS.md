# Free Energy Help CRM — Persistent Development Operating Framework

This file is the canonical repository-wide operating policy for ChatGPT Work, Codex, Claude, and other implementation agents working on Free Energy Help (FEH) CRM / AI Energy Sales OS.

## 1. Authority hierarchy

Apply authority in this order:

1. Platform/system safety and access controls.
2. The human owner’s current explicit instructions and approval gates.
3. Lead Architect decisions governing architecture, security invariants, phase boundaries, schemas, and capability design.
4. This repository-wide framework.
5. Directory-specific `AGENTS.md` rules, which may specialize but must not weaken higher-level security or approval rules.
6. Autonomous Work engineering judgment inside an approved task.
7. Implementation-agent recommendations and tool defaults.

No subordinate agent may silently override a higher authority. When instructions materially conflict, stop and report the exact conflict. Technical access is not authorization.

## 2. Mandatory pre-work synchronization gate

Before any repository modification:

1. Read the applicable `AGENTS.md` instruction chain.
2. Inspect the current Git branch and HEAD.
3. Inspect `git status`.
4. Classify existing modified and untracked files without deleting, overwriting, staging, or cleaning them.
5. Inspect the existing implementation relevant to the task.
6. Inspect relevant recent history when needed to understand provenance or avoid duplication.
7. Reconcile the requested work with the existing architecture before constructing anything.

Do not recreate completed work. Do not overwrite another agent’s work because it is unfamiliar. Preserve unrelated dirty-tree changes. If existing work materially conflicts with the requested architecture, stop and report the conflict.

## 3. Default autonomous engineering authority

Within an already-approved implementation scope, Work may autonomously:

- Inspect and search repository files, Git history, refs, status, and diffs.
- Inspect non-secret configuration and migration source without applying it.
- Create or edit files reasonably inside the approved scope.
- Create or improve focused tests.
- Run focused tests, relevant regression tests, typecheck, targeted lint, and safe local builds when warranted.
- Diagnose failures and correct narrow defects introduced within the task.
- Correct syntax, formatting, import, fixture, straightforward type, and narrow validation defects.
- Rerun affected validation after correction.
- Batch logically related inspection and implementation work.
- Return one consolidated evidence-based report.

Do not ask the human to copy files that are directly inspectable or to relay routine test results. Batch questions when a genuine decision is required.

Authorization to inspect does not authorize implementation. Authorization to implement does not authorize staging, committing, pushing, merging, deploying, migration execution, database mutation, credential access, provider activation, or external communication unless the current task explicitly grants it.

## 4. Code construction is not capability activation

Treat these as separate controlled states:

1. Design.
2. Local code or migration construction.
3. Local validation.
4. Commit.
5. Push.
6. Review and merge.
7. Credential/configuration provisioning.
8. Capability activation.
9. Production deployment or remote migration.
10. Post-deployment verification.

Approval for one state never implies approval for a later state. Dormant adapters, interfaces, mocks, migrations, and execution envelopes do not grant authority to activate them. A migration committed to Git is not deployed.

## 5. Actions that always require explicit human-owner approval

Unless a later Lead Architect policy specifically delegates them, require approval for:

- Production or externally reachable deployment.
- Supabase `db push`, remote migration execution, or production database mutation.
- Destructive database operations or live schema repair.
- Creation, grant, revocation, or weakening of authority.
- Activation of execution routes or real provider dispatch.
- Real phone, SMS, WhatsApp, or email execution.
- Provisioning, reading, exposing, or using provider/production credentials.
- Production environment-variable changes.
- Emergency STOP or RELEASE operations.
- Processing real customer data in a materially new way.
- Changes to GDPR, consent, retention, compliance, or security policy.
- Bypassing suppression, approval, compliance, or authorization controls.
- Force push, destructive reset/clean, branch deletion, or shared-history rewriting.
- Irreversible external-system actions, purchases, or paid resource provisioning.
- Material expansion beyond the approved task scope.

## 6. Evidence before invention

Before adding a table, column, migration, state, permission model, adapter abstraction, execution envelope, validator, capability name, or database primitive, search the repository and relevant history first. Inspect authoritative live state only when the task depends on it and access is explicitly authorized.

Prefer existing types, envelopes, validators, and vocabulary over duplicates. Comments and old reports are supporting evidence, not substitutes for authoritative current state.

## 7. Factory 041 permanent security invariants

Factory 041 is fail-closed. Preserve all of these invariants:

1. **Authorization provenance:** execution authority comes from persisted, attributable evidence, never caller assertion.
2. **Approval provenance:** required human/policy approval is persisted and traceable; unknown approval blocks execution.
3. **Pinned decisions:** security-critical intent, policy, adapter, and approval decisions remain immutable or verifiably pinned where required.
4. **Destination commitment:** executed destination matches the authorized contact, channel, and committed/resolved provenance; no cross-contact or cross-channel substitution.
5. **Compliance and suppression:** permission, compliance, and live suppression are authoritative; commercial value cannot override them.
6. **Freshness:** authorization expiry is checked against persisted evidence, including the final boundary close to execution.
7. **Atomic consumption:** authorization consumption remains atomic and serialized through approved primitives.
8. **Exactly-once semantics:** durable attempt identity and idempotency prevent uncontrolled duplicate real-world actions.
9. **Emergency STOP:** STOP fails closed; RELEASE is separately authorized and attributable.
10. **Control-lock serialization:** emergency and execution-control transitions respect the established coordination lock.
11. **Provider-neutral dispatch:** provider-specific details do not escape the approved provider-neutral result boundary.
12. **Prepared execution dispatch:** a durable prepared attempt precedes provider invocation and is not proof of execution.
13. **Provider-adapter approval:** persisted adapter approval is verified; matching strings or caller-created objects are not authority.
14. **Immediate pre-execution checks:** suppression and emergency state are checked immediately adjacent to provider invocation through checkpoint #3.
15. **Outcome finalization:** success, definitive failure, and indeterminate outcomes use their dedicated controlled finalization paths.
16. **Indeterminate outcomes:** timeout, thrown transport error, malformed response, or ambiguous provider state remains indeterminate.
17. **No blind retry:** never blindly retry an ambiguous provider CREATE operation.
18. **Boundary separation:** authorization, consumption, dispatch preparation, provider invocation, and finalization must not collapse into an uncontrolled step.

Unknown, null, ambiguous, or unverified security state must never be promoted to success or authorization.

## 8. Fail-closed engineering rules

- Unknown is not approved.
- Null is not clear.
- Missing provenance is not acceptable.
- Missing authorization is not implicit authorization.
- Timeout is not definitive failure.
- Transport error is not permission to retry.
- Ambiguous provider response is not confirmed failure.
- No-op acceptance is not provider success.
- Opportunity score is not contact permission.
- Identity confidence is not consent.

Block, return `evaluation_failed`, or return `indeterminate` according to the established contract.

## 9. Provider and network boundary

Dormant development may construct provider adapters, transport interfaces, mocks, fake transports, fixtures, response classifiers, idempotency logic, execution envelopes, and webhook parsing contracts.

It must not implicitly add or activate real HTTP calls, provider SDK wiring, API-key usage, credential access, live dispatch, provider mutation, provider registration, or execution grants. A real transport requires separate architecture review, server-only enforcement, credential approval, observability/redaction review, retry/idempotency review, and explicit activation authorization.

## 10. Secrets and local configuration

Never commit, print unnecessarily, copy into source, place in fixtures, expose in logs, or include in prompts when avoidable:

- API keys, private keys, passwords, cookies, and tokens.
- Supabase service-role or database credentials.
- Telnyx, email, OAuth, GitHub, Vercel, or other provider credentials.
- Production environment values.

When inspecting potential secret-bearing files, report key names and risk without displaying values. Redact credential-bearing URLs and headers. `process.env` access and credential wiring must be explicit, server-only, and separately reviewed.

Local files such as `.claude/settings.local.json` remain local and untracked unless team sharing is explicitly approved. Unknown untracked files must never be deleted automatically. A dirty tree must be classified, not cleaned by default.

## 11. UK GDPR and data protection

Apply data minimisation, purpose limitation, lawful-processing awareness, provenance, least privilege, suppression and contact-permission enforcement, retention awareness, and auditability.

Protect personal/contact data, MPAN/MPRN identifiers, energy-contract and supplier information, consent/suppression evidence, and execution history. Prefer synthetic fixtures. Do not copy real customer data into tests, prompts, screenshots, or logs unless explicitly required, minimized, and authorized.

Opportunity score never grants contact permission. Identity confidence never proves consent. Commercial value never overrides suppression or compliance. A resolved identity does not authorize outreach. Materially new personal-data processing requires human/legal review.

## 12. Git operating model

Read-only Git inspection is autonomous. Staging, controlled commits, and normal pushes require explicit authorization in the current task.

When authorized:

- Stage only exact approved files.
- Inspect the complete staged diff.
- Exclude unrelated files, secrets, and local tooling.
- Create a narrow, reviewable, attributable, validated commit.
- Push normally only to the configured upstream; push does not authorize merge, PR creation, or deployment.

Never force push, destructively reset/clean, delete branches, rewrite shared history, silently switch branches, or commit unrelated/local files without explicit approval.

## 13. Database migration discipline

Treat reading, constructing, validating, committing, pushing, dry-running, deploying, and verifying a migration as separate states.

Before remote deployment require migration review, expected pre/post-state, drift assessment, dry-run or equivalent validation, explicit deployment authorization, recovery consideration, and post-deployment verification. Never infer deployment from source control. Never access Supabase merely because local Supabase files exist.

## 14. Smart testing hierarchy

Choose validation proportionate to risk:

1. Smallest focused test or structural check.
2. Relevant module/suite tests.
3. Typecheck when applicable.
4. Targeted lint when applicable.
5. Broader regression tests when warranted.
6. Production build when warranted by routing, bundling, framework, dependency, or release risk.

Security-boundary changes require appropriately broad regression testing. Do not repeatedly run expensive validation without new evidence. Record tooling failures separately from product failures; a hanging lint command is not automatically a code failure.

## 15. Self-correction and stop conditions

Automatically correct narrow defects introduced within the approved scope, including syntax, formatting, imports, fixtures, straightforward types, and narrow test regressions. Rerun relevant validation.

Stop and escalate when:

- Architecture is genuinely ambiguous or evidence conflicts.
- A security boundary would weaken or materially change.
- Production data or real provider execution could be affected.
- Credentials, destructive action, or materially expanded scope is required.
- GDPR/legal interpretation materially changes behavior.
- Unknown migration/live-schema state makes action unsafe.
- Another subsystem/file outside authorized scope must change.
- A failure cannot be safely classified.

Do not stop merely for a correctable fixture, formatting, import, type, or narrow validation defect inside scope.

## 16. Agent collaboration

The Lead Architect owns architecture and invariants within the human-owner hierarchy. Implementation agents own bounded investigation, construction, testing, and narrow self-correction.

Inspect current repository state before continuing any phase. Do not duplicate completed work because another agent created it. Delegation must be bounded and independently verifiable; the primary agent remains responsible for integration and validation. Handoffs must identify files, tests, commit hashes, migration/deployment state, and genuine remaining gaps. Avoid conversational relay loops when direct inspection is available.

## 17. Reporting standard

For significant work, return one consolidated report:

1. Executive verdict.
2. Scope completed.
3. Files changed.
4. Architectural decisions.
5. Security/compliance impact.
6. Tests and validation.
7. Git state.
8. Database/deployment state.
9. Warnings/tooling limitations.
10. Remaining genuine gaps.
11. Recommended next action.

Every implementation report must include a **Completion Evidence Block** containing:

- Scope completed.
- Files created, modified, and deleted.
- Tests executed and exact results.
- Typecheck result where applicable.
- Lint result where applicable.
- Build result where applicable.
- Final Git status.
- Commit status.
- Push status.
- Deployment/migration status.
- External systems accessed or mutated.
- Credentials accessed: yes/no.
- Production/customer data touched: yes/no.
- Remaining architectural/security risks.
- Recommended next gate.
