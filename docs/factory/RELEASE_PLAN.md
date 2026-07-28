# Release plan — Free Energy Help OS

How versions ship. **Production deploy and production Supabase apply require explicit Product Owner approval** (see [AGENT_REGISTRY.md](./AGENT_REGISTRY.md)).

## Release train

| Version | Codename | Target environment | Gate |
|---------|----------|-------------------|------|
| v0.1 | AI Factory | GitHub `main` only | CI green; PO merge; no hosting required |
| v0.2 | CRM Foundation | Staging (Vercel + Supabase staging) | Auth + RLS; PO staging sign-off |
| v0.3 | Energy Platform | Staging → prod pilot | PO + Security review |
| v0.4 | AI Employees | Staging | AI DPA/risk acceptance |
| v0.5 | Automation Hub | Staging | No auto-prod migrate |
| v1.0 | Free Energy Help OS | Production | PO written go-live |

## Pre-release checklist (all versions)

1. [ ] [CHANGELOG.md](./CHANGELOG.md) updated for scope.  
2. [ ] [MASTER_BACKLOG.md](./MASTER_BACKLOG.md) statuses → **Completed** for shipped IDs.  
3. [ ] CI passed on release branch or `main`.  
4. [ ] [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — no open **Critical** for target env.  
5. [ ] Migrations documented; apply manual per environment log.  
6. [ ] Product Owner approval recorded (date + version).

## v0.1 — AI Factory (current focus)

**Scope:** Documentation and CI; no CRM feature release.

| Step | Action | Automatable? |
|------|--------|--------------|
| 1 | Merge FACTORY-001 PR | No — PO |
| 2 | Rebase + merge FACTORY-003 PR | No — PO |
| 3 | Merge FACTORY-004 PR (ops dashboard) | No — PO |
| 4 | Tag `v0.1.0` on `main` | Optional — PO |

**Not in v0.1:** Vercel production, Supabase prod migrate, CRM on `main`.

## v0.2 — CRM Foundation (next)

**Scope:** Auth, leads, customers/sites, tasks, activities on staging.

| Step | Action |
|------|--------|
| 1 | Apply migrations to **staging** Supabase (PO) |
| 2 | Deploy `frontend` to staging URL (PO) |
| 3 | QA smoke per [TEST_REGISTER.md](./TEST_REGISTER.md) when created |
| 4 | Tag `v0.2.0` after PO staging acceptance |

## Rollback (principles)

- **App:** Redeploy previous Vercel deployment (PO).  
- **Database:** Forward-fix migration preferred; restore from backup only with PO + Database Engineer runbook.  
- **Factory docs:** Revert git commit on `main`.

Details: future `ROLLBACK_AND_CHANGE_REPORT.md` (FACTORY-006/007).

## Related documents

- [ROADMAP.md](./ROADMAP.md)  
- [SPRINT_BOARD.md](./SPRINT_BOARD.md)  
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
