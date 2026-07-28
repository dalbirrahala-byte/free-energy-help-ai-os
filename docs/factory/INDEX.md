# Documentation index — Free Energy Help AI Development Factory

Central map of all project and factory documentation. Application code lives in `frontend/`; schema in `supabase/migrations/`.

## Factory operations (this task: FACTORY-004)

| Document | Purpose |
|----------|---------|
| [INDEX.md](./INDEX.md) | This index |
| [ROADMAP.md](./ROADMAP.md) | Product versions v0.1 → v1.0 |
| [MASTER_BACKLOG.md](./MASTER_BACKLOG.md) | Prioritised features, numbering, status |
| [SPRINT_BOARD.md](./SPRINT_BOARD.md) | Current sprint + sprint templates |
| [CHANGELOG.md](./CHANGELOG.md) | Factory and product change log |
| [RELEASE_PLAN.md](./RELEASE_PLAN.md) | Release criteria and train schedule |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Tracked defects, risks, tech debt |
| [FEATURE_QUEUE.md](./FEATURE_QUEUE.md) | Factory task queue (FACTORY-*) |
| [AGENT_REGISTRY.md](./AGENT_REGISTRY.md) | AI roles, permissions, escalation |

## Agent role charters

| Role | Charter |
|------|---------|
| Chief Architect | [roles/chief-architect.md](./roles/chief-architect.md) |
| Senior Developer | [roles/senior-developer.md](./roles/senior-developer.md) |
| Database Engineer | [roles/database-engineer.md](./roles/database-engineer.md) |
| QA Engineer | [roles/qa-engineer.md](./roles/qa-engineer.md) |
| Security Engineer | [roles/security-engineer.md](./roles/security-engineer.md) |
| Documentation Engineer | [roles/documentation-engineer.md](./roles/documentation-engineer.md) |
| Automation Engineer | [roles/automation-engineer.md](./roles/automation-engineer.md) |
| CRM Business Analyst | [roles/crm-business-analyst.md](./roles/crm-business-analyst.md) |
| Product Owner (Human) | [roles/product-owner.md](./roles/product-owner.md) |

## Repository root

| Document | Purpose |
|----------|---------|
| [README.md](../../README.md) | Human onboarding, local dev, CI commands |
| [AGENTS.md](../../AGENTS.md) | Agent entry point and workflow summary |

## Frontend

| Document | Purpose |
|----------|---------|
| [frontend/README.md](../../frontend/README.md) | Next.js default readme |
| [frontend/AGENTS.md](../../frontend/AGENTS.md) | Next.js 16 agent notes |
| [frontend/.env.example](../../frontend/.env.example) | Public Supabase env vars (no secrets) |

## Governance & automation

| Document | Purpose |
|----------|---------|
| [.cursor/rules/00-core-workflow.mdc](../../.cursor/rules/00-core-workflow.mdc) | Branch policy, approvals, no prod auto-apply |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | Lint, typecheck, production build (when merged) |

## Database (version control only)

| Document | Purpose |
|----------|---------|
| [supabase/migrations/20250727180000_customers_and_sites.sql](../../supabase/migrations/20250727180000_customers_and_sites.sql) | Customers + sites migration (apply manually) |

## Planned (future factory tasks)

| Document | Status |
|----------|--------|
| `docs/factory/plans/<ID>.md` | Per-feature Chief Architect plans |
| `docs/factory/MIGRATION_POLICY.md` | FACTORY-006+ |
| `docs/factory/DECISION_REGISTER.md` | FACTORY-006+ |
| `docs/factory/TEST_REGISTER.md` | FACTORY-006+ |
| `docs/architecture/` | FACTORY-006 Documentation Hub |

## Conventions quick reference

- **Feature status:** Planned → In Progress → Waiting Review → Testing → Completed | Blocked  
- **Priority:** Critical | High | Medium | Low  
- **Feature IDs:** `CRM-*`, `AI-*`, `AUTO-*`, `DB-*`, `UI-*`, `FACTORY-*`
