# Product roadmap — Free Energy Help OS

Strategic versions from AI factory bootstrap through full commercial broker platform.

## Version overview

| Version | Name | Goal | Primary outcomes |
|---------|------|------|------------------|
| **v0.1** | AI Factory | Agent-driven delivery safely on GitHub | CI, roles, queue, ops dashboard, docs index |
| **v0.2** | CRM Foundation | Daily broker CRM in production (staging first) | Auth, customers/sites, leads pipeline, tasks, activities |
| **v0.3** | Energy Platform | UK B2B supply domain | Meters (MPAN/MPRN), contracts, renewals, quotes, suppliers |
| **v0.4** | AI Employees | Assisted sales and ops | In-app AI summaries, draft comms, renewal insights (human-in-loop) |
| **v0.5** | Automation Hub | Notifications and workflows | n8n digests, reminders, GitHub/Cursor automation patterns |
| **v1.0** | Free Energy Help OS | Commercial-grade broker OS | Commission, documents, reporting, email integration, hardened security |

---

## v0.1 — AI Factory

**Theme:** Build the machine that builds the product.

| Milestone | Deliverables | Backlog IDs (examples) |
|-----------|--------------|-------------------------|
| Governance | CI, Cursor rules, AGENTS.md | FACTORY-001 |
| Agent registry | Roles, permissions, escalation | FACTORY-003 |
| Operations dashboard | Roadmap, backlog, sprint board | FACTORY-004 |
| Hygiene | Lint fix, PR template (future) | FACTORY-002, FACTORY-007 |

**Exit criteria:** PRs to `main` always pass CI; Product Owner merges; no prod deploy without approval.

---

## v0.2 — CRM Foundation

**Theme:** Replace spreadsheets for core sales workflow.

| Milestone | Deliverables | Backlog IDs (examples) |
|-----------|--------------|-------------------------|
| Identity | Supabase Auth, RLS, middleware | CRM-001, DB-001 |
| Leads | Pipeline CRUD (in progress locally) | CRM-002 |
| Customers | Accounts + multi-site model | CRM-003 |
| Work | Tasks, activities, lead conversion | CRM-004, CRM-005 |
| Shell | Shared nav, dashboard KPIs | UI-001 |

**Exit criteria:** Broker staff can manage leads → customers on staging with auth.

---

## v0.3 — Energy Platform

**Theme:** Sites, meters, contracts, renewals, quotes.

| Milestone | Deliverables | Backlog IDs (examples) |
|-----------|--------------|-------------------------|
| Sites & meters | MPAN/MPRN, consumption fields | DB-002, CRM-010 |
| Contracts & renewals | End dates, alerts, renewal queue | CRM-011, AUTO-010 |
| Quotes | Multi-supplier comparison | CRM-012 |
| Suppliers | Master supplier list | CRM-013 |

**Exit criteria:** Renewal-led sales visible per site; quote comparison for one site.

---

## v0.4 — AI Employees

**Theme:** AI assists; humans decide.

| Milestone | Deliverables | Backlog IDs (examples) |
|-----------|--------------|-------------------------|
| Copilot | Customer/lead context Q&A | AI-001 |
| Drafts | Task/email drafts (no auto-send) | AI-002 |
| Renewal intelligence | Contract-end prioritisation | AI-003 |

**Exit criteria:** AI answers grounded in CRM rows only; rate limits; audit log.

---

## v0.5 — Automation Hub

**Theme:** Reliable notifications and factory reporting.

| Milestone | Deliverables | Backlog IDs (examples) |
|-----------|--------------|-------------------------|
| n8n | Daily digest, CI failure notify | AUTO-001 |
| Reminders | Rule-based tasks from contract dates | AUTO-002 |
| Cursor cloud | Role agents on feature branches | AUTO-003 |

**Exit criteria:** Documented automations; no auto-merge or prod migrate.

---

## v1.0 — Free Energy Help OS

**Theme:** Production broker OS.

| Milestone | Deliverables | Backlog IDs (examples) |
|-----------|--------------|-------------------------|
| Finance | Commission tracking | CRM-020 |
| Documents | LOA, bills, storage | CRM-021, DB-020 |
| Comms | Email integration | CRM-022 |
| Reporting | Pipeline, renewal, commission reports | UI-010 |
| Hardening | Security review, backup/restore runbook | FACTORY-* |

**Exit criteria:** Product Owner sign-off for production; GDPR-aware handling documented.

---

## Dependency graph (high level)

```text
v0.1 AI Factory
    └── v0.2 CRM Foundation
            └── v0.3 Energy Platform
                    ├── v0.4 AI Employees
                    └── v0.5 Automation Hub
                            └── v1.0 Free Energy Help OS
```

---

## Related documents

- [MASTER_BACKLOG.md](./MASTER_BACKLOG.md) — detailed items  
- [RELEASE_PLAN.md](./RELEASE_PLAN.md) — release train  
- [SPRINT_BOARD.md](./SPRINT_BOARD.md) — current iteration
