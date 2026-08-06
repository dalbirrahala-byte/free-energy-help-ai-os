# Architecture Decision Records — Free Energy Help AI Sales OS

This is the first ADR log for this project. Format: one numbered entry per decision, each with context, the decision itself, and consequences. Append new entries; don't edit or renumber old ones once recorded — if a decision is later reversed, record that as a new entry that references the one it supersedes.

---

## ADR-001: Production namespace for the Enterprise Intelligence Engine

**Date**: Gate 5 (Enterprise Intelligence Engine V1)

**Context**: A Gate 5 architecture assessment found that `frontend/src/lib/decision-engine/` and `frontend/src/components/enterprise-intelligence/` (route: `/enterprise-intelligence`) already existed, predating this initiative, implementing a strikingly similar conceptual shape — decision context, rules, scoring, recommendations, explanations, audit records — but entirely as fabricated demo data (every value labelled `(demo)`, fields literally named `estimatedDemoRevenueImpact`). Building the new, real, evidence-based engine under the same "Enterprise Intelligence" name risked confusing a genuinely deterministic, auditable production system with a demo prototype that shares nothing with it.

**Decision**: The new engine is built under `frontend/src/lib/feh-enterprise-intelligence/` — a distinct, permanent production namespace for the FEH Intelligence Platform. The existing `lib/decision-engine/` and `components/enterprise-intelligence/` are explicitly preserved, untouched, and not renamed, removed, or reused. No file, route, or component from the demo module is modified by this or future gates without a separate decision to do so.

**Consequences**: Two things can reasonably be called "enterprise intelligence" in this codebase — one real (`lib/feh-enterprise-intelligence/`), one a demo prototype (`lib/decision-engine/` + `components/enterprise-intelligence/`). This is documented prominently (this ADR, `docs/ENTERPRISE_INTELLIGENCE_ENGINE.md`, `docs/MASTER_ARCHITECTURE.md`) specifically so the distinction isn't lost. A future gate may choose to retire or rename the demo module, but that is out of scope here and requires its own explicit approval — this ADR does not authorise it.

---

## ADR-002: Evidence-first output contract

**Date**: Gate 5 (Enterprise Intelligence Engine V1)

**Context**: During Gate 5's design discussion, an example "Decision" output was presented (Recommend tender, 96% confidence, citing a specific kWh consumption figure, a supplier's tender-acceptance history, and a customer satisfaction score) as an illustration of a target format. None of those specific facts exist anywhere in this project's schema. Accepting that shape uncritically would have meant building an engine capable of presenting fabricated figures as if they were calculated facts — precisely the failure mode this entire project has worked to avoid in every prior intelligence module (Commercial Energy Intelligence, Renewal Intelligence).

**Decision**: Every Enterprise Intelligence Engine output follows a fixed, non-negotiable shape: **Evidence → Reasoning → Recommendation → Confidence → Missing Data → Provenance**. Confidence is calculated by exactly one rule (`confidence.ts`), derived solely from the ratio of available to total evidence items — never an arbitrary or model-generated number. Any capability lacking genuine evidence for its purpose (commercial opportunity, compliance) returns an honest `insufficient_data`/`not_configured` state rather than an estimate.

**Consequences**: Some capabilities (opportunity, compliance) are permanently placeholders until real data sources exist — this is intentional, not a gap to silently work around later by loosening the evidence requirement. Any future capability that can't point to genuine evidence for its recommendation should not ship a "confident" answer; it should report what's missing, exactly as `opportunityIntelligence` and `complianceEvaluation` do today.

---

## ADR-003: Gate 6 bounded to a real coordination layer, not the full mission brief

**Date**: Gate 6 (AI Workforce Orchestrator V1)

**Context**: The Gate 6 brief described eight AI workers, a full voice platform, marketing automation, sales intelligence, executive forecasting, and event-driven workflow automation across eight subsystems — described as building "the FEH AI Business Operating System" in one gate. The brief's own architecture principles ("continue feature-flag development only," "build only additive functionality," "use honest placeholders rather than fabricated outputs") are, taken literally, incompatible with building that entire scope as a single reviewable, testable increment — most of it depends on data sources, external integrations, or infrastructure (authentication, an event bus, marketing platform connections, a selected voice provider) that don't exist yet.

**Decision**: Gate 6 V1 builds the AI Workforce Orchestrator and Worker Registry as real, tested, additive code, with all eight workers given genuine typed interfaces. Two workers (Commercial Energy Intelligence AI, Renewal Intelligence AI) do real work by wrapping the already-validated Gate 5 Enterprise Intelligence Engine. The other six report `"not_yet_configured"` with a specific, real reason each — never a fabricated capability. The four larger subsystems (Marketing Intelligence, Sales Intelligence, Executive Intelligence, Workflow Automation) are delivered as target architecture documents (`docs/MARKETING_INTELLIGENCE_ENGINE.md`, `docs/SALES_INTELLIGENCE_ENGINE.md`, `docs/EXECUTIVE_INTELLIGENCE.md`, `docs/WORKFLOW_AUTOMATION.md`), not code, in this pass. This bounding was proposed and confirmed with the product owner before any code was written.

**Consequences**: The long-term vision in the Gate 6 brief remains the target — this ADR doesn't reduce the ambition, it sequences it. Every subsequent gate that makes a placeholder worker real should follow the same pattern: real data or integration first, then a thin worker wrapper, never the reverse.

---

## ADR-004: Revenue/pipeline/commission forecasting remains explicitly gated

**Date**: Gate 6 (AI Workforce Orchestrator V1)

**Context**: Gate 6's Executive Intelligence deliverable asks for revenue forecasting, pipeline forecasting, and commission forecasting. ADR-002 already established that this platform never estimates commission, revenue, or pricing for an individual lead or customer. Aggregate, portfolio-level statistical forecasting is arguably a different kind of claim — but treating it as automatically permitted without a conscious decision would risk quietly reopening exactly what ADR-002 closed.

**Decision**: Forecasting stays `"not_yet_configured"` in the `executiveReporting` worker. No revenue, pipeline, or commission figure is produced — individually or in aggregate — until (a) real historical Supabase data exists in sufficient volume, and (b) a separate, explicit decision authorises aggregate forecasting specifically, distinguishing it clearly from the still-forbidden per-customer estimation. This was confirmed as the preferred path (over approving aggregate forecasting immediately) during Gate 6 scoping.

**Consequences**: `docs/EXECUTIVE_INTELLIGENCE.md` documents this rule prominently, first, before any capability table — anyone extending that worker sees the constraint before the wishlist. Every other Executive Intelligence capability also happens to be blocked by a real, unrelated dependency (authentication, audit persistence, other workers not being real yet) — this rule is not the only gate on that worker, but it is the one that must never be quietly loosened by a future implementer trying to "unblock" the worker.

---

## ADR-005: Voice AI stays within the existing Voice Foundation V0 plan for Gate 6

**Date**: Gate 6 (AI Workforce Orchestrator V1)

**Context**: Gate 6 marks Voice AI as "highest priority" and lists call summaries writing directly into CRM, transcripts, sentiment analysis, and quality scoring as requirements. The existing Voice Foundation V0 assessment (approved earlier) deliberately deferred provider selection behind a staged, blind-tested protocol (`docs/VOICE_TEST_PLAN.md`) and flagged that call/transcript persistence needs the authentication and RLS gaps in `docs/MASTER_ARCHITECTURE.md` §8 resolved first. "Highest priority" could be read as authorisation to skip ahead of that plan.

**Decision**: It isn't. The `voice` worker in Gate 6 gets a real, typed interface and honestly reports `"not_yet_configured"`, referencing the existing Voice Foundation documents. No provider is selected, no telephony/STT/LLM/TTS connection is made, and no call or transcript data is written anywhere. "Highest priority" is recorded here as a roadmap signal for sequencing *after* provider blind-testing actually runs, not as permission to bypass it.

**Consequences**: When voice work does proceed, it starts at Stage 1 of `docs/VOICE_TEST_PLAN.md` (synthetic script test) exactly as originally planned — this ADR exists so that decision isn't re-litigated by a future implementer under schedule pressure.

---

## ADR-006: Gate 7A consolidation — canonical domain models, shared utilities, dead code removal

**Date**: Gate 7A (Enterprise Consolidation)

**Context**: By Gate 7, `LeadRecord`/`CustomerRecord`-shaped types and their supporting helper functions (`hasText`, `daysUntil`, `toDateKey`, `formatDateEnGB`, `mostRecentDate`, and the boolean feature-flag reader pattern) had been independently hand-declared 3-5 times each across `lib/intelligence`, `lib/commercial-energy-intelligence`, `lib/feh-enterprise-intelligence`, and `lib/ai-workforce` — each gate having built its own copy rather than reusing a prior one, since no shared foundation existed yet. Separately, `lib/intelligence/` accumulated 13 files (`engine.ts` and speculative `scoring/`, `recommendations/`, `timeline/` modules) written during earlier gate planning that were never wired to any live code path.

**Decision**: A new `lib/shared/` module holds one canonical definition of each duplicated domain type (`CanonicalLead`, `CanonicalCustomer`, `CanonicalActivity`, `CanonicalTask`) and each duplicated helper function, with full test coverage. Every consuming module's own type became a `Pick<>`/`Partial<>` derivation of the canonical type, and every consuming module's own helper function definition was replaced with an import from `lib/shared/`. This is a pure refactor: no scoring, classification, or threshold logic changed anywhere, and no new capability or UI surface was introduced. Separately, the 13 unreachable `lib/intelligence/` files were deleted after confirming — by exhaustive grep across `src/` for every possible import path, and by checking the test-file inventory — that each had zero importers and zero test references. Not every deleted file has a literal 1:1 successor: `confidence.ts`, `engine.ts`, and `recommendations/nextAction.ts` were superseded by `feh-enterprise-intelligence/confidence.ts` and the Gate 5 capability registry; the remaining files (`scoring/opportunity.ts`, `scoring/pipeline.ts`, `scoring/relationship.ts`, `scoring/commission.ts`, `recommendations/supplierRecommendation.ts`, `recommendations/followUp.ts`, `recommendations/automation.ts`, `timeline/events.ts`, `timeline/sentiment.ts`, `timeline/engagement.ts`) were abandoned scaffolding for capabilities that remain correctly, intentionally unbuilt — deleting them removes dead weight, not a working feature.

`lib/renewal-intelligence` (V1) was explicitly excluded from this consolidation and keeps its own independent copies of every helper it duplicates, per the standing rule (restated across every gate since it shipped) that V1 is never modified once proven and shipped — not even for a behaviour-preserving refactor.

**Consequences**: Future gates that need a lead/customer/activity/task shape, a date/text helper, or a boolean feature flag should extend or import from `lib/shared/` rather than re-declaring one locally. `lib/renewal-intelligence` remains the one deliberate exception to that rule, and any future consolidation pass must continue to leave it untouched unless a separate decision specifically authorises changing it.

---

## ADR-007: Gate 7 Production Integration wires the FEH Engine in, not the AI Workforce Orchestrator

**Date**: Gate 7 (Production Integration, RC1)

**Context**: Version 1.0 scope required both "Enterprise Intelligence Engine integration" and "AI Workforce readiness status" on the lead-detail page. The AI Workforce Orchestrator's only two real workers (`commercialEnergyIntelligenceWorker`, `renewalIntelligenceWorker`) are thin wrappers that call the FEH Engine internally (ADR-003) — invoking both the orchestrator and the engine from the same page would compute the same renewal/customer-health result twice for the same lead, on every page view, for no behavioural benefit. That's exactly the kind of duplicated computation Gate 7A had just finished eliminating elsewhere in the codebase.

**Decision**: `/leads/[id]` calls the FEH Engine directly through one new file, `lib/commercial-intelligence/viewModel.ts`, following the same feature-flagged, shadow-first, fallback-on-error pattern already proven safe by the Renewal V1/V2 shadow deployment. The AI Workforce Orchestrator is not called from this page at all — only its two feature-flag values are read and displayed as a readiness status, which is what the Version 1.0 requirement actually asked for. `USE_ENTERPRISE_INTELLIGENCE_ENGINE` and `ENTERPRISE_INTELLIGENCE_SHADOW_MODE` keep their existing safe defaults (`false`/`true`); no new flag was introduced.

**Consequences**: If a future gate genuinely needs the AI Workforce Orchestrator's own request/response contract on a page (e.g. once its placeholder workers become real), that integration should call the orchestrator directly rather than duplicating this page's engine call — but that is a decision for whenever those workers stop being placeholders, not before.

---

## ADR-008: Version 1.0 access model — organisation-wide, not per-user ownership

**Date**: RC1 (Authentication, RBAC, RLS, Audit Logging)

**Context**: Phase 2 of the RC1 security work required choosing between organisation-wide authenticated access (every role sees the same records, differing only in permitted operations) and per-user record ownership (a salesperson sees only their own leads). Inspection found no table (`leads`, `customers`, `sites`, `tasks`, `activities`) has an owner/agent/assignment column — per-user ownership is not implementable today without inventing a schema field, which the RLS phase rules explicitly forbid without separate approval.

**Decision**: Version 1.0 uses organisation-wide authenticated access. Five roles — `admin`, `manager`, `operations`, `consultant`, `read_only` — gate which *operations* a user may perform (view, write, view dashboards, administer security, view the audit log), never which *rows* they can see. `operations` and `consultant` are technically identical permission sets in this model, since nothing in the schema distinguishes "belongs to sales" from "belongs to ops" — documented explicitly in `docs/AUTHORISATION_AND_RBAC.md` rather than silently reinterpreted into an unenforceable distinction.

**Consequences**: Per-user ownership, if ever needed, requires a deliberate future migration adding an assignment column and a new RLS policy generation — not a configuration change to the current policies. Anyone extending the role model should keep `frontend/src/lib/auth/roles.ts` as the single source of truth and update the RLS migration in lockstep, never let the two drift.

---

## ADR-009: middleware.ts must live in src/ — a silent-failure class of bug worth recording

**Date**: RC1 (Authentication, RBAC, RLS, Audit Logging)

**Context**: `middleware.ts` was first created at the project root (`frontend/middleware.ts`). Next.js compiled it once at dev-server startup with no error or warning, but never invoked it on any request — every route, including ones that should have redirected to `/login`, returned `200`. This was only caught because the RC1 validation plan included a live browser redirect-matrix test, not just `npm run build` (which also succeeded silently with the file in the wrong place).

**Decision**: `middleware.ts` (now `src/middleware.ts`) must live inside `src/` for any project using that directory structure, confirmed by moving the file and re-running the exact same redirect matrix, which then passed for all six protected routes and both public routes.

**Consequences**: This is recorded as an ADR, not just a code fix, because the failure mode is dangerous specifically for security-relevant files: a wrongly-placed middleware doesn't error, doesn't warn, and doesn't fail the build — it just silently does nothing, which for an auth gate means silently granting full access. Any future move or restructuring of `middleware.ts` (e.g. the pending rename to `proxy.ts` — see `docs/AUTHENTICATION.md`) must be followed by the same live redirect-matrix check before being trusted, not just a clean build.
