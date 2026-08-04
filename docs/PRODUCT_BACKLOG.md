# Project Phoenix — Product Backlog

**Project Phoenix** is the next phase of the **Free Energy Help AI Sales OS** — the commercial energy CRM in `frontend/`. This document is the single source of truth for what we're building next, why, and in what order. It is written so both engineers and non-technical stakeholders can read it and understand the plan.

This is a living document. Update it as work is approved, delivered, or re-prioritised — don't let it drift out of date.

---

## 1. Vision

Free Energy Help's sales team currently works across a mix of working CRM basics (leads, customers, tasks) and a growing set of forward-looking screens that preview where the product is going. Project Phoenix turns that mix into one dependable command centre: a system where every number, status, and recommendation a broker sees is either **genuinely real** or **clearly labelled as not available yet** — never guessed, never faked.

The end state: a broker opens the CRM in the morning and sees a truthful picture of their pipeline, exactly which leads deserve attention today and why, live status of every connected system, and (once the data and integrations exist to support it) AI-assisted help that speeds up — but never replaces — their judgement.

## 2. Product principles

These principles come directly from how this product has been built so far, and every feature in this backlog is expected to follow them.

1. **Truth over polish.** Never show a fabricated status, score, or figure. If something can't be genuinely calculated or verified yet, say so plainly (e.g. "Not configured", "Not enough data") rather than guessing or estimating quietly.
2. **Deterministic before AI.** Build transparent, rules-based logic first, using data already on file. Only introduce an AI model once there's a genuine, disclosed reason a deterministic rule can't do the job — and always in a way a human can inspect and explain.
3. **Secrets never reach the browser.** Every API key and commercial figure (e.g. commission rates) lives server-side only.
4. **Small, reversible steps.** Ship in versioned slices, each validated end-to-end (typecheck, lint, build, and a real browser check) before moving to the next slice.
5. **One visual language.** New screens reuse the existing card, badge, and layout components rather than inventing new ones.
6. **Humans stay in control.** Anything destructive, costly, or hard to reverse — schema changes, deployments, AI-generated content reaching a customer — requires explicit sign-off before it happens.

## 3. Version roadmap

| Version | Theme | Status |
|---|---|---|
| v0.1 | CRM Foundation — leads, customers, sites, tasks, activities on Supabase | Delivered |
| v0.2 | Mission Control dashboard & AI Control Centre V1 (truthful integration status) | Delivered |
| v0.3 | Lead Intelligence Engine V1A (compact, deterministic lead scoring) | Delivered |
| v0.4 | Data Foundation Completion — schema gaps closed, contracts & commissions on real data | Planned |
| v0.5 | Real Intelligence Activation — Claude, OpenAI, n8n genuinely connected; Lead Intelligence V2 | Planned |
| v0.6 | Module Completion — quotes, renewals, reporting, SEO, Gemini all on real data | Planned |
| v0.7 | AI-Assisted Selling — tender drafting, automated reconciliation, remaining demo modules | Planned |
| v1.0 | General Availability | Target |
| v1.x+ | Future horizon — see [Future](#7-future) | Exploratory |

## 4. Prioritised feature backlog

Each feature below includes its acceptance criteria, technical dependencies, and complexity estimate (**Small / Medium / Large**). Feature IDs are referenced in the [suggested implementation order](#9-suggested-implementation-order).

### 4.1 Must Have

| ID | Feature | Complexity |
|---|---|---|
| M1 | Extend `leads` schema: address/postcode, electricity & gas usage, fuel-specific contract dates and suppliers | Medium |
| M2 | Multi-contact support for Leads & Customers | Medium |
| M3 | Contracts module on real Supabase data | Medium |
| M4 | Commissions module on real Supabase data | Large |
| M5 | Activate real Claude (Anthropic) connection | Small |
| M6 | Activate real OpenAI connection | Small |
| M7 | Activate real n8n health-check connection | Small |

---

**M1 — Extend `leads` schema for energy and location data**
Add the fields Lead Intelligence and the sales team already need but don't have: `postcode`, `address_line1/2`, `electricity_annual_usage_kwh`, `gas_annual_usage_kwh`, `electricity_contract_end`, `gas_contract_end`, `electricity_supplier`, `gas_supplier`.
- **Acceptance criteria:**
  - New columns exist on `leads` via a versioned Supabase migration file, all nullable (no data loss on existing rows).
  - Add Lead / Edit Lead forms capture the new fields.
  - Existing leads without this data continue to display correctly (fields show "Not provided", not errors).
- **Technical dependencies:** New Supabase migration in `supabase/migrations/`; no package installs required.
- **Complexity:** Medium.

**M2 — Multi-contact support for Leads & Customers**
Today a lead/customer has one baked-in contact (name/phone/email). Real accounts often have several stakeholders.
- **Acceptance criteria:**
  - New `contacts` table linked to `leads` and/or `customers`.
  - Lead/Customer detail pages list all contacts with add/edit/remove.
  - Existing single-contact fields remain functional during migration (no forced data loss).
- **Technical dependencies:** New Supabase migration; UI additions reusing existing form patterns.
- **Complexity:** Medium.

**M3 — Contracts module on real data**
The Contract Centre currently reads from `lib/contracts/demo-data.ts`.
- **Acceptance criteria:**
  - Contract list, detail, and renewal timeline read from Supabase.
  - No demo data remains reachable in production builds.
  - Empty/error states are truthful ("Not configured" / "Unavailable"), matching the pattern already used on Mission Control.
- **Technical dependencies:** Supabase table(s) for contracts (new or extending `sites`); migration required.
- **Complexity:** Medium.

**M4 — Commissions module on real data**
The Commission Intelligence Centre currently reads from `lib/commissions/demo-data.ts`.
- **Acceptance criteria:**
  - Commission records, pipeline, and reporting read from Supabase.
  - Figures reconcile against real contract/customer records — no invented totals.
  - Estimated Commission (Lead Intelligence) can genuinely calculate once a commission rate is configured **and** real usage data exists (see M1).
- **Technical dependencies:** New Supabase schema for commission records; depends on M1 and M3 for genuinely calculable figures.
- **Complexity:** Large.

**M5 — Activate real Claude (Anthropic) connection**
The AI Control Centre already has the code path for this (`lib/ai-control-centre/status.ts`) — it just needs a real key.
- **Acceptance criteria:**
  - Setting `ANTHROPIC_API_KEY` on the server causes the AI Control Centre to show "Connected" only after a genuine, successful API check — never assumed from key presence alone.
  - Key is never present in any browser-visible bundle or network request.
  - Removing/invalidating the key correctly shows "Unavailable" or "Not configured".
- **Technical dependencies:** Anthropic API key (server env var only); no code changes expected beyond configuration and verification.
- **Complexity:** Small.

**M6 — Activate real OpenAI connection**
Same pattern as M5, for `OPENAI_API_KEY`.
- **Acceptance criteria:** Same as M5, for OpenAI.
- **Technical dependencies:** OpenAI API key (server env var only).
- **Complexity:** Small.

**M7 — Activate real n8n health-check connection**
Same pattern, for `N8N_BASE_URL`.
- **Acceptance criteria:** Same as M5, for n8n's `/healthz` endpoint.
- **Technical dependencies:** A reachable n8n instance URL (server env var only).
- **Complexity:** Small.

### 4.2 Should Have

| ID | Feature | Complexity |
|---|---|---|
| S1 | Lead Intelligence Engine V2 (full renewal/engagement/opportunity signals) | Medium |
| S2 | Quotes module on real Supabase data | Medium |
| S3 | Renewals module on real Supabase data | Medium |
| S4 | Website SEO real health check | Medium |
| S5 | Gemini activation in AI Control Centre | Small |
| S6 | Executive Reporting on real data | Large |

---

**S1 — Lead Intelligence Engine V2**
Once M1 lands, extend the current compact V1A card into the fuller engine: genuine electricity/gas opportunity figures, fuel-specific renewal urgency, and engagement status drawn from real activity/task history.
- **Acceptance criteria:**
  - Electricity/Gas Opportunity display real usage figures once present, "Not enough data" otherwise — never estimated from business type.
  - Renewal Urgency uses the nearest genuine fuel-specific contract end date.
  - Every score, status, and recommendation keeps its plain-English explanation.
- **Technical dependencies:** Depends on M1 (usage/contract fields must exist first).
- **Complexity:** Medium.

**S2 / S3 — Quotes and Renewals on real data**
Same pattern as M3: replace `lib/quotes/demo-data.ts` and `lib/renewals/demo-data.ts` with genuine Supabase-backed data.
- **Acceptance criteria:** Same shape as M3 — real data, truthful empty states, no reachable demo data in production.
- **Technical dependencies:** Supabase schema for quotes/renewal cases.
- **Complexity:** Medium each.

**S4 — Website SEO real health check**
The AI Control Centre currently shows "Checking" for SEO permanently, honestly labelled as not yet implemented.
- **Acceptance criteria:**
  - A genuine, server-side check (e.g. sitemap/robots.txt reachability, or a connected search-console credential) replaces the permanent "Checking" state.
  - Result is one of the four real states (Connected / Not configured / Unavailable / Checking-in-progress), never fabricated.
- **Technical dependencies:** Decision needed on what "SEO connected" means (search console API key, or a simpler reachability check) — needs product input before build.
- **Complexity:** Medium.

**S5 — Gemini activation**
Same pattern as M5/M6, for `GEMINI_API_KEY`.
- **Acceptance criteria:** Same as M5, for Gemini.
- **Technical dependencies:** Gemini API key (server env var only).
- **Complexity:** Small.

**S6 — Executive Reporting on real data**
Replace `lib/reports/demo-data.ts` with genuine aggregation across leads, customers, contracts, and commissions.
- **Acceptance criteria:** Reporting figures reconcile against the underlying real modules; no placeholder charts remain in production.
- **Technical dependencies:** Depends on M3, M4, S2, S3 being on real data first — reporting is only as truthful as what it aggregates.
- **Complexity:** Large.

### 4.3 Could Have

| ID | Feature | Complexity |
|---|---|---|
| C1 | AI-assisted supplier tender drafting | Large |
| C2 | Automated commission reconciliation via n8n | Medium |
| C3 | Digital Twin on real data | Large |
| C4 | Enterprise Intelligence / Decision Engine on real data | Large |
| C5 | Automation Centre real workflow builder | Large |

---

**C1 — AI-assisted supplier tender drafting**
Use Claude/OpenAI to draft a supplier tender document once a lead is qualified with sufficient real data.
- **Acceptance criteria:**
  - Only runs once M5/M6 are genuinely connected and usage data (M1) exists for the lead.
  - Every AI-drafted output is clearly labelled as AI-generated and requires human review before it reaches a customer or supplier.
  - No AI-generated recommendation is presented as a system-verified fact.
- **Technical dependencies:** M1, M5, M6. Requires explicit product/legal sign-off before build — this is the kind of feature Project Phoenix's principles gate behind approval.
- **Complexity:** Large.

**C2 — Automated commission reconciliation via n8n**
- **Acceptance criteria:** Reconciliation runs only report discrepancies against real commission records (M4); never invents a reconciled figure when source data is missing.
- **Technical dependencies:** M4, M7.
- **Complexity:** Medium.

**C3 / C4 — Digital Twin and Enterprise Intelligence on real data**
Currently both are rich prototypes over demo data.
- **Acceptance criteria:** Same real-data pattern as M3 — genuine Supabase-backed figures, truthful empty/unavailable states.
- **Technical dependencies:** Depend on the underlying modules (contracts, commissions, sites) already being real.
- **Complexity:** Large each.

**C5 — Automation Centre real workflow builder**
Move from the current preview/demo builder to genuinely creating and running n8n workflows.
- **Acceptance criteria:** Workflows created in the UI genuinely exist and run in n8n; status shown is a live n8n state, not a mock.
- **Technical dependencies:** M7, n8n workflow API access (beyond the health-check endpoint).
- **Complexity:** Large.

### 4.4 Future

| ID | Feature |
|---|---|
| F1 | AI-generated supplier recommendation engine |
| F2 | Predictive renewal & churn risk modelling |
| F3 | Customer self-service portal |
| F4 | Mobile / field-agent companion app |
| F5 | Multi-brand / white-label support |

These are directionally right but not yet scoped in detail. Each will need its own discovery pass — acceptance criteria, dependencies, and complexity — before entering Should/Could Have. **F1 in particular is explicitly gated**: no AI-generated supplier recommendation ships without a separate, dedicated approval, consistent with product principle #1.

## 5. Acceptance criteria

Acceptance criteria are documented inline with each feature in section 4, rather than repeated separately, so they stay attached to the feature they describe as priorities shift.

## 6. Technical dependencies

Cross-cutting dependencies that apply across multiple features above, rather than repeating them everywhere:

- **Supabase migrations** — every schema change ships as a new file in `supabase/migrations/`, additive and nullable wherever possible, following the existing pattern in `20250727180000_customers_and_sites.sql`.
- **Server-side environment variables only** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `N8N_BASE_URL`, and any future commission-rate configuration must never use the `NEXT_PUBLIC_` prefix, and must never be read from client components.
- **No new npm packages assumed.** The AI Control Centre already talks to Claude/OpenAI/Gemini via plain `fetch`, not vendor SDKs — keep that pattern unless a specific feature has a clear reason to add a dependency, and treat any package addition as its own approval step.
- **n8n instance** — required for M7, C2, and C5; must be reachable from the server and expose a health endpoint.
- **No destructive migrations** — schema changes must not drop or rename columns still read by existing code without a coordinated, separately-approved migration.

## 7. Estimated implementation complexity

Complexity is estimated per feature in section 4 using:

- **Small** — configuration or a single small, self-contained code change; low risk.
- **Medium** — a new schema element and/or a full module's UI+data wiring; moderate risk, single-module blast radius.
- **Large** — spans multiple modules, aggregates other data, or introduces a new class of behaviour (e.g. AI-generated content reaching a customer); needs the most care and testing.

## 8. Future

See [section 4.4](#44-future) above.

## 9. Suggested implementation order

This order follows the roadmap in section 3: close data gaps first, then activate real integrations, then complete remaining modules, then layer on AI-assisted features — never the reverse, since every later feature's honesty depends on the data foundation being real first.

1. **M1** — Extend `leads` schema (unblocks S1, M4, C1)
2. **M2** — Multi-contact support
3. **M5, M6, M7** — Activate Claude, OpenAI, n8n (independent, can run in parallel with each other and with M1/M2)
4. **M3** — Contracts on real data
5. **M4** — Commissions on real data (needs M1 for genuine commission figures)
6. **S1** — Lead Intelligence Engine V2 (needs M1)
7. **S2, S3** — Quotes and Renewals on real data
8. **S5** — Gemini activation
9. **S4** — Website SEO real check (needs a product decision on scope first)
10. **S6** — Executive Reporting on real data (needs M3, M4, S2, S3)
11. **C2** — Automated commission reconciliation (needs M4, M7)
12. **C3, C4** — Digital Twin and Enterprise Intelligence on real data
13. **C5** — Automation Centre real workflow builder
14. **C1** — AI-assisted supplier tender drafting (needs explicit approval gate, plus M1/M5/M6)
15. **Future items (F1–F5)** — each requires its own discovery/scoping pass before entering this order
