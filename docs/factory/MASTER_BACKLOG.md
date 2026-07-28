# Master backlog — Free Energy Help OS

Single prioritised list for product and factory work. Factory infra uses `FACTORY-*`; product uses prefixes below.

## Status categories

| Status | Meaning |
|--------|---------|
| **Planned** | Approved for backlog; not started |
| **In Progress** | Active branch / agent work |
| **Waiting Review** | PR open or spec awaiting Product Owner |
| **Testing** | QA validation on branch or staging |
| **Completed** | Merged to `main` or otherwise done |
| **Blocked** | Cannot proceed; reason in Notes |

## Priorities

| Priority | Use when |
|----------|----------|
| **Critical** | Blocks release, security, data loss, or all users |
| **High** | Current sprint commitment or strong revenue/ops impact |
| **Medium** | Important but can slip one sprint |
| **Low** | Nice-to-have, hygiene, future phase |

## Feature numbering

| Prefix | Domain | Example |
|--------|--------|---------|
| `FACTORY-*` | AI development factory | FACTORY-004 |
| `CRM-*` | Broker CRM features | CRM-001 |
| `AI-*` | AI-assisted capabilities | AI-001 |
| `AUTO-*` | Automation (CI, n8n, agents) | AUTO-001 |
| `DB-*` | Schema, RLS, migrations | DB-001 |
| `UI-*` | Layout, dashboard, design system | UI-001 |

New IDs increment within prefix (e.g. CRM-004 after CRM-003).

---

## Factory backlog

| ID | Title | Priority | Status | Version | Owner role | Notes |
|----|-------|----------|--------|---------|------------|-------|
| FACTORY-001 | CI + governance bootstrap | Critical | Waiting Review | v0.1 | Automation Engineer | Branch `chore/factory-001-ci-governance` |
| FACTORY-002 | Fix tasks page lint warning | Low | Planned | v0.1 | Senior Developer | `revalidatePath` unused import |
| FACTORY-003 | AI Agent Registry | High | Waiting Review | v0.1 | Documentation Engineer | Rebase after 001 merge |
| FACTORY-004 | Project Operations Dashboard | High | In Progress | v0.1 | Documentation Engineer | This document set |
| FACTORY-005 | Task queue system (enhanced) | Medium | Planned | v0.1 | Chief Architect | Extend FEATURE_QUEUE schema |
| FACTORY-006 | Documentation Hub | Medium | Planned | v0.1 | Documentation Engineer | Architecture map, standards |
| FACTORY-007 | Automation framework | Medium | Planned | v0.5 | Automation Engineer | n8n, Cursor cloud runbooks |

---

## Product backlog (seed)

| ID | Title | Priority | Status | Version | Owner role | Notes |
|----|-------|----------|--------|---------|------------|-------|
| CRM-001 | Authentication + route protection | Critical | Planned | v0.2 | Senior Developer | Supabase Auth, middleware |
| CRM-002 | Leads module (complete) | High | In Progress | v0.2 | Senior Developer | Local/unmerged work exists |
| CRM-003 | Customers + sites module | High | In Progress | v0.2 | Senior Developer | Align DB name `sites` vs `customer_sites` |
| CRM-004 | Lead → customer conversion | High | Planned | v0.2 | Chief Architect | `source_lead_id` workflow |
| CRM-005 | Activity management (complete) | Medium | Testing | v0.2 | Senior Developer | Edit/delete/revalidate |
| DB-001 | RLS policies for all CRM tables | Critical | Planned | v0.2 | Database Engineer | Before production |
| DB-002 | Meters table (MPAN/MPRN) | Medium | Planned | v0.3 | Database Engineer | Per site |
| UI-001 | Shared app shell + navigation | High | Planned | v0.2 | Senior Developer | Dashboard link consistency |
| AI-001 | Read-only CRM copilot | Medium | Planned | v0.4 | Chief Architect | Grounded context only |
| AUTO-001 | n8n daily factory digest | Low | Planned | v0.5 | Automation Engineer | Notifications only |

---

## Dependencies (selected)

| ID | Blocked by | Notes |
|----|------------|-------|
| FACTORY-003 (clean PR) | FACTORY-001 merge | Option 1: merge 001 then rebase 003 |
| CRM-001 | DB-001 design | Auth + RLS together |
| CRM-004 | CRM-003, CRM-002 | Conversion needs both entities |
| AI-001 | CRM-002, CRM-003 | Needs stable data model |

---

## Related documents

- [FEATURE_QUEUE.md](./FEATURE_QUEUE.md) — factory task queue (subset of FACTORY-*)  
- [SPRINT_BOARD.md](./SPRINT_BOARD.md) — current sprint selection  
- [ROADMAP.md](./ROADMAP.md) — version themes
