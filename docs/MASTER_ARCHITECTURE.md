# Master Architecture — Free Energy Help AI Sales OS

A whole-project architecture overview: what exists, what's real vs. demo data, how the pieces fit together, and where the Voice Workforce initiative sits relative to everything else. This is the top-level map — detailed specs live in their own documents (see below).

This is a living document. Update it whenever a module moves from demo data to real, a new architectural layer is added, or a cross-cutting risk is resolved.

## Document map

| Document | Covers |
|---|---|
| `docs/MASTER_ARCHITECTURE.md` | This file — whole-project overview |
| `docs/PRODUCT_BACKLOG.md` | Vision, principles, prioritised feature backlog, version roadmap |
| `docs/ENGINEERING_WORKFLOW.md` | The plan → build → check → test → review → commit → push lifecycle |
| `docs/ENTERPRISE_INTELLIGENCE_ENGINE.md` | The FEH Enterprise Intelligence Engine — architecture, contracts, capabilities, feature flags, shadow mode |
| `docs/AI_WORKFORCE_ORCHESTRATOR.md` | The AI Workforce Orchestrator and its 8 workers — 2 real, 6 honestly not yet configured |
| `docs/SALES_INTELLIGENCE_ENGINE.md` | Target architecture for the Sales Director AI worker (design only) |
| `docs/MARKETING_INTELLIGENCE_ENGINE.md` | Target architecture for the Marketing Director AI worker (design only) |
| `docs/EXECUTIVE_INTELLIGENCE.md` | Target architecture for the Executive Reporting AI worker, incl. the forecasting gate (design only) |
| `docs/WORKFLOW_AUTOMATION.md` | Target event-driven architecture between CRM/Marketing/Voice/Email/Tasks/Calendar/Renewals/Reporting (design only) |
| `docs/DECISIONS.md` | Architecture Decision Records (ADRs) — production namespace, evidence-first architecture, Gate 6 scope, forecasting gate, voice sequencing, RC1 access model and middleware placement |
| `docs/AUTHENTICATION.md` | Supabase Auth implementation, login/logout flow, middleware enforcement |
| `docs/AUTHORISATION_AND_RBAC.md` | The five-role access model, permission matrix, enforcement point |
| `docs/SUPABASE_RLS.md` | RLS migration plan, policy design, apply sequence, manual test checklist |
| `docs/AUDIT_LOGGING.md` | Audit event design, what's wired in, what's a known gap |
| `docs/CUSTOMER_LIFECYCLE.md` | Honest stage-by-stage status of the commercial journey from enquiry to referral |
| `docs/RELEASE_CHECKLIST.md` | RC1 validation status — tests, build, browser checks, backup, rollback |
| `docs/VOICE_ARCHITECTURE.md` | Adapter design for the AI Voice Workforce, plus the top-priority Voice Naturalness and Quality Standard |
| `docs/VOICE_COMPLIANCE.md` | *Planned, not yet created* — consent, suppression, audit, retention |
| `docs/VOICE_AGENT_SPEC.md` | *Planned, not yet created* — the AI Receptionist's full behavioural spec |
| `docs/VOICE_TOOL_CONTRACTS.md` | *Planned, not yet created* — CRM tool request/response schemas |
| `docs/VOICE_TEST_PLAN.md` | Staged release protocol and measurable pass/fail criteria for voice quality |
| `docs/VOICE_PROVIDER_SCORECARD.md` | Weighted, blind-tested provider comparison framework |
| `docs/VOICE_RELEASE_PLAN.md` | *Planned, not yet created* — delivery gates with acceptance criteria |

Three of the seven `VOICE_*.md` files now exist — `VOICE_ARCHITECTURE.md`, `VOICE_TEST_PLAN.md`, and `VOICE_PROVIDER_SCORECARD.md` — created specifically to document the Voice Naturalness and Quality Standard below. The remaining four (`VOICE_COMPLIANCE.md`, `VOICE_AGENT_SPEC.md`, `VOICE_TOOL_CONTRACTS.md`, `VOICE_RELEASE_PLAN.md`) are still design-only, not yet created, and still require separate approval.

## 1. System overview

Free Energy Help AI Sales OS is a single Next.js application (`frontend/`) — App Router, Turbopack, React 19, TypeScript in `strict` mode — talking to one external dependency, Supabase (Postgres). There is no separate backend service and no API layer: data access happens either through React Server Components reading Supabase directly, or through inline `"use server"` Server Actions on individual pages (e.g. `addLead`, `updateLead`, `deleteActivity`).

There are currently **zero API routes** anywhere in the app (`frontend/src/app/api/` doesn't exist). Everything that exists today is designed to be called from inside a browser session rendering this app — nothing exists yet that an external system (a voice agent, a webhook, another service) could call directly.

Styling is Tailwind utility classes with a small set of hand-built, reused UI primitives (`SectionCard`, `StatCard`, and a repeated badge-pill pattern) rather than a component library.

## 2. Data foundation

### 2.1 Real, Supabase-backed

| Table | Key fields | Notes |
|---|---|---|
| `leads` | company_name, contact_name, telephone, email, supplier, contract_end, status, notes | One generic contact per lead; no postcode/address; no fuel-split usage or contract dates |
| `customers` | company_name, contact_name, telephone, email, status, notes, source_lead_id | `source_lead_id` links back to the originating lead (unique) |
| `sites` | customer_id, name, address_line1/2, city, postcode, is_primary, current_supplier, contract_end | Multi-site ready — but only under *customers*, never under leads |
| `tasks` | title, due_date, due_time, priority, status, notes, lead_id, customer_id | |
| `activities` | activity_type, title, details, activity_date, activity_time, lead_id, customer_id | |

Only one migration file exists: `supabase/migrations/20250727180000_customers_and_sites.sql`.

### 2.2 Demo data only (not connected to Supabase)

Quotes, Contracts, Commissions, Renewals, Digital Twin, Live Transfers, Automation Centre, Reports, Suppliers, Workflow Intelligence, and AI Sales Assistant are all UI previews reading from `lib/*/demo-data.ts` files. Website Leads are stored in browser local storage, not Supabase. **A large fraction of the visible app is a prototype over fabricated data** — this is tracked as the "Data Foundation Completion" theme in `PRODUCT_BACKLOG.md` (Must Have items M3, M4; Should Have S2, S3, S6).

**Naming note**: `frontend/src/components/enterprise-intelligence/` (route `/enterprise-intelligence`) and `frontend/src/lib/decision-engine/` are one of these demo-only modules — every value in it is fabricated and labelled `(demo)`. This predates, and is entirely unrelated to, the real **FEH Enterprise Intelligence Engine** at `frontend/src/lib/feh-enterprise-intelligence/` (§4 below). Neither has been modified by the other — see `docs/DECISIONS.md` ADR-001.

### 2.3 Known schema gaps

- No `contacts` table — a lead or customer has exactly one baked-in contact.
- No appointments/calendar table or route — Customer 360's "Appointments" tab is explicitly labelled "Appointments module — Not configured."
- No address/postcode field on `leads`.
- No electricity/gas usage or fuel-specific contract fields on `leads`.

## 3. Intelligence layer

Two deterministic, rules-based engines on the lead detail page (`frontend/src/app/leads/[id]/page.tsx`), both following the same design discipline: every value ships with a status badge and a plain-English explanation, and nothing is ever fabricated — a signal that can't be genuinely calculated says so ("Not enough data", "Unknown") rather than guessing.

**Commercial Energy Intelligence Engine** (`lib/commercial-energy-intelligence`) — 9 metrics computed from the lead record plus its already-loaded activities/tasks (no new queries): Renewal Urgency, Days Remaining, Lead Quality Score, Data Completeness, Customer Health, Engagement Status, Quote Readiness, Commercial Opportunity, Commission Readiness. Honestly capped at 90/100 for Lead Quality Score, since the schema gap in §2.3 means the "postcode present" rule can never be met yet.

**Renewal Intelligence V1** (`lib/renewal-intelligence`) — a more detailed, renewal-specific breakdown from `contract_end` alone: a 6-tier urgency scale (Overdue / Critical / Urgent / Approaching / Future / Unknown), procurement status text, a suggested tender window (contract end minus 180 days), and a recommended next action.

Both are pure, synchronous, server-side TypeScript modules with no AI involved — deterministic logic first, per the product principles in `PRODUCT_BACKLOG.md`.

**Shared foundation** (`lib/shared/`, added Gate 7A) — canonical domain types (`CanonicalLead`, `CanonicalCustomer`, `CanonicalActivity`, `CanonicalTask` in `domain.ts`) and the date/text/feature-flag helper functions (`dateUtils.ts`, `textUtils.ts`, `featureFlags.ts`) that were previously duplicated independently across `lib/intelligence`, `lib/commercial-energy-intelligence`, `lib/feh-enterprise-intelligence`, and `lib/ai-workforce`. Every module's own record/context type is now a `Pick<>`/`Partial<>` derivation of one of these canonical types rather than a separately hand-declared shape. **`lib/renewal-intelligence` (V1) is deliberately excluded** and keeps its own independent copies — see ADR-006.

## 4. Enterprise Intelligence Engine (Gate 5, V1 — additive, not yet wired in)

`lib/feh-enterprise-intelligence/` is the shared reasoning layer intended to eventually sit behind the CRM, dashboard, website, automation platform, and future AI voice workforce. Every output follows one fixed shape — **Evidence → Reasoning → Recommendation → Confidence → Missing Data → Provenance** — with confidence calculated by exactly one rule, derived from evidence completeness, never an arbitrary number.

Gate 5 wraps two already-validated modules (`lib/intelligence/scoring/renewal.ts`, `lib/commercial-energy-intelligence`) through thin adapters rather than recalculating anything, adds a customer-health capability, a closed-vocabulary workflow-action recommender, and two honest placeholders (`opportunityIntelligence`, `complianceEvaluation`) for capabilities that would otherwise require fabricating data. Full detail: `docs/ENTERPRISE_INTELLIGENCE_ENGINE.md`.

`lib/intelligence/` also contained 13 files of unreachable scaffolding from earlier gate planning — a standalone `engine.ts` and speculative `scoring/`, `recommendations/`, and `timeline/` modules with no importer anywhere in the app and no test coverage. These were removed in Gate 7A (see ADR-006); the live path (`scoring/renewal.ts`, `scoring/customerHealth.ts`, `renewalShadowDeployment.ts`, `featureFlags.ts`, `types.ts`) is unaffected.

**Wired into `/leads/[id]` as of Gate 7 Production Integration**, through one typed `CommercialIntelligenceViewModel` (`lib/commercial-intelligence/viewModel.ts`) — see §4.1. `USE_ENTERPRISE_INTELLIGENCE_ENGINE` still defaults to `false` (page unaffected); `ENTERPRISE_INTELLIGENCE_SHADOW_MODE` still defaults to `true` (computed and compared, never shown, once the engine is enabled). 61 automated tests (37 new, 24 pre-existing) all pass at the engine level; see §4.1 for the integration layer's own tests.

### 4.1 Gate 7 Production Integration — the Commercial Intelligence ViewModel

`lib/commercial-intelligence/viewModel.ts` is the single integration point between `/leads/[id]` and both dormant engines (§4, §5). `buildCommercialIntelligenceViewModel()` calls `runEnterpriseIntelligence()` directly — no new computation of its own — and decides visibility from the existing feature flags:

- Engine disabled (default): the function returns immediately with `visible: false`; the engine is never called and the page is byte-identical to pre-Gate-7 behaviour.
- Engine enabled, shadow mode on (default once enabled): the engine runs, its renewal urgency is compared against the page's already-displayed, already-proven V2 renewal result, any mismatch is logged server-side only (`console.warn`) — `visible` stays `false`, matching shadow mode's existing documented meaning elsewhere in this codebase.
- Engine enabled, shadow mode off: `visible: true`, and `components/leads/CommercialIntelligencePanel.tsx` renders the engine's own evidence/reasoning/recommendation/confidence per capability, plus honest placeholder labels for `opportunityIntelligence`/`complianceEvaluation`.
- The engine throwing, or returning zero capability results, is treated as unavailable — logged, `visible: false`, existing cards remain the source of truth. Never a crash, never a fabricated value.

The AI Workforce Orchestrator (§5) is deliberately **not invoked** from this page — its two real workers are thin wrappers over this same engine (ADR-003), so calling both would recompute identical output twice. Only its feature-flag readiness state (`isAiWorkforceOrchestratorEnabled()`, `isAiWorkforceShadowModeEnabled()`) is surfaced in the panel's "AI Workforce Orchestrator" tile.

### 4.2 Executive Mission Control (`/`)

`src/app/page.tsx` → `loadMissionControlData()` (`lib/dashboard/queries.ts`) is the real, Supabase-backed executive dashboard — not a placeholder. It reports live counts for leads, customers, tasks due today, and renewals due; a pipeline breakdown by lead status; overdue/today/upcoming tasks; leads with no activity in 14+ days; renewals due within 90 days; recent leads/customers/activity; and AI Control Centre external-service health — every field falls back to `"Not configured"` if its underlying table can't be read, never a fabricated number.

Two sections were added by Gate 7 Production Integration, both pure re-surfacing of data already computed elsewhere on the same page — no new Supabase queries, no new scoring logic:

- **Priority Actions** (`lib/dashboard/priorityActions.ts` → `buildPriorityActions()`) — a pure function that turns the already-computed overdue-task count, follow-up-lead count, and renewals-due count into a prioritised list. An item only appears once its count is greater than zero and its source table is confirmed available; there is no path that can fabricate a count.
- **AI Service Readiness** (`buildEngineReadiness()`, same file) — surfaces the existing `USE_ENTERPRISE_INTELLIGENCE_ENGINE`/`ENTERPRISE_INTELLIGENCE_SHADOW_MODE`/`USE_AI_WORKFORCE_ORCHESTRATOR`/`AI_WORKFORCE_SHADOW_MODE` flag state — the same four flags described in §4 and §5 — as a readable status, not a new computation.

Both functions are pure (no I/O) and unit tested directly; `loadMissionControlData()` itself remains integration-tested only, via the live page, since it requires a real Supabase connection.

## 5. AI Workforce Orchestrator (Gate 6, V1 — additive, not yet wired in)

`lib/ai-workforce/` coordinates 8 AI workers (Sales Director, Marketing Director, Commercial Energy Intelligence, Renewal Intelligence, Customer Success, Compliance, Voice, Executive Reporting) behind one typed request/response contract. Full detail: `docs/AI_WORKFORCE_ORCHESTRATOR.md`.

The original Gate 6 brief described a full AI-first business operating platform — voice, marketing automation, sales AI, executive forecasting, event-driven automation across 8 subsystems. That was deliberately bounded (`docs/DECISIONS.md` ADR-003): Gate 6 V1 ships a real, tested coordination layer where **2 workers do real work** (both thin wrappers over the Gate 5 Enterprise Intelligence Engine — no logic duplicated) and **6 workers honestly report "Not Yet Configured"**, each for a specific, real reason (no data source, no external integration, or a still-open architectural gap like authentication). The four larger subsystems (Marketing Intelligence, Sales Intelligence, Executive Intelligence, Workflow Automation) exist as target architecture documents, not code.

Two decisions worth restating here because they'll matter to whoever extends this next: revenue/pipeline/commission forecasting remains explicitly gated (ADR-004) — no figure, even in aggregate, without real historical data and a separate decision to activate it. Voice AI's Gate 6 work stayed within the existing Voice Foundation V0 plan (ADR-005) — "highest priority" was recorded as a sequencing signal, not authorisation to skip provider blind-testing.

**Not wired into any page or route.** `USE_AI_WORKFORCE_ORCHESTRATOR` defaults to `false`; `AI_WORKFORCE_SHADOW_MODE` defaults to `true`. 81 automated tests (20 new this gate, 61 pre-existing) all pass.

## 6. AI Control Centre

`lib/ai-control-centre/status.ts` reports genuine, live status for six services — Claude, OpenAI, Gemini, n8n, Supabase, Website SEO — using a strict four-state vocabulary: **Connected / Not configured / Unavailable / Checking**. Every "Connected" state requires a real, successful check (an API call, a Supabase query, an n8n health endpoint); nothing is ever assumed from key presence alone. All provider keys are read server-side only (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `N8N_BASE_URL`) and never reach the browser.

Today: Supabase is genuinely connected; Claude, OpenAI, Gemini, and n8n show "Not configured" (no keys/URL set anywhere); Website SEO permanently shows "Checking" because no real check has been implemented yet — an honest placeholder, not a bug.

## 7. Voice Workforce roadmap (planned, not yet built)

A Voice Foundation V0 architecture assessment has been completed and delivered as a report — provider-independent adapters (telephony, STT, LLM, TTS, CRM tools, calendar, automation, analytics), a first agent design (the inbound "Free Energy Help AI Receptionist"), a compliance-by-design framework, a planned data model, strict CRM tool contracts, conversation design, a provider evaluation framework, and a phased delivery plan from **Voice Foundation V0** through **Multi-tenant Voice Agency**.

**Nothing from that assessment has been built** — no code, no packages, no migrations, no external connections. The `VOICE_*.md` documents listed in the document map above capture that design in full once individually approved.

### 5.1 Voice Naturalness and Quality Standard — top priority, release-blocking

Added as a top-priority architectural requirement, defined in full in `docs/VOICE_ARCHITECTURE.md` §0: **the production voice experience must be exceptionally natural, warm, responsive and professional, and this is a release-blocking requirement, not a cosmetic one.** No agent reaches Production Approval without passing the full 20-criterion Voice Quality Gate in `docs/VOICE_TEST_PLAN.md`, regardless of how complete its CRM capability is.

This sits alongside, and never overrides, the non-negotiable transparency rule: the agent must clearly and briefly identify itself as an AI assistant at the start of every call, and must never be designed to deceive a caller or impersonate a human. Naturalness governs *how* it sounds and responds; honesty about *what it is* is never in scope for optimisation.

Provider selection must use blind testing against this standard, not vendor marketing demonstrations — see `docs/VOICE_PROVIDER_SCORECARD.md` for the methodology and `docs/VOICE_TEST_PLAN.md` for the eight staged release gates (synthetic script test through production approval).

The single most important finding from the original assessment, restated here because it affects the whole project, not just voice, is §8 below.

## 7.5 Authentication, RBAC, RLS, and Audit Logging (RC1)

Version 1.0 security infrastructure, built this pass. Full detail in `docs/AUTHENTICATION.md`, `docs/AUTHORISATION_AND_RBAC.md`, `docs/SUPABASE_RLS.md`, and `docs/AUDIT_LOGGING.md`.

- **Authentication**: Supabase Auth, email/password only, no open registration. Enforced by one file, `src/middleware.ts`, for the whole app — no page has its own auth check. Public routes: `/login`, `/business-energy-quote`, `/leads/web/[ref]`.
- **RBAC**: five roles (`admin`, `manager`, `operations`, `consultant`, `read_only`), organisation-wide access (ADR-008) — role gates operations, never row visibility. Single source of truth: `lib/auth/roles.ts`.
- **RLS**: three migrations exist under `supabase/migrations/`, tracked but **not applied to any database** — `user_roles`, RLS on all five real tables (`leads`/`customers`/`sites`/`tasks`/`activities`), and `audit_log`. Applying them requires a staged rollout on a project you control; see `docs/SUPABASE_RLS.md`.
- **Audit logging**: append-only `audit_log` table (migration written, not applied); service layer wired into lead/task/activity creation, lead updates, login/logout, and permission denials. Login failures are logged server-side only, never persisted (see `docs/AUDIT_LOGGING.md` for why).

This closes §8 items 1 and 2 below (no authentication, no RLS) at the code/migration level — they remain open in practice until the migrations are actually applied to production.

## 8. Known gaps & risks (cross-cutting)

These affect any future feature that needs to trust "who did this" — not just voice:

1. **Authentication code exists (RC1) but is not yet live in any deployed environment.** `src/middleware.ts` enforces it and has been validated via a full redirect-matrix browser test — but no real Supabase Auth user has been provisioned anywhere, so in practice every environment is still fully open until a user is created and the app is actually deployed with Auth enabled on the Supabase project. See `docs/AUTHENTICATION.md`.
2. **RLS migrations are written (RC1) but not applied to any database.** The app still allows unrestricted read/write to every table today, in every environment, until `supabase/migrations/20260805100000_user_roles.sql` and `20260805100100_enable_rls.sql` are actually run — deliberately not done as part of this pass. See `docs/SUPABASE_RLS.md` for the apply sequence and manual test checklist.
3. **No API routes exist** — nothing outside a browser session rendering this app can call into it. This blocks any external integration (voice, webhooks, third-party services) until a real HTTP surface is built.
4. **No root-level `.gitignore`** — only `frontend/.gitignore` exists. Not currently causing a problem, but worth resolving before more secret-bearing integrations arrive.
5. **No appointments/calendar backend** — anything that wants to "book" something (a human feature or a future voice tool) has nothing real to book into yet.

None of these are voice-specific. They're prerequisites for *any* feature that needs to attribute an action to an identifiable actor, which is most of what comes next on the roadmap.

## 9. Architectural principles

These carry over from `PRODUCT_BACKLOG.md` and apply to every layer described above:

1. **Truth over polish** — never show a fabricated status, score, or figure.
2. **Deterministic before AI** — rules-based logic first; AI only where genuinely justified, always explainable.
3. **Secrets never reach the browser** — every key lives server-side only.
4. **Small, reversible steps** — versioned slices, each validated (`npm run check` + a real browser check) before the next.
5. **One visual language** — new screens reuse `SectionCard`, the badge-pill pattern, and existing layout components.
6. **Humans stay in control** — anything destructive, costly, or hard to reverse requires explicit sign-off first.
