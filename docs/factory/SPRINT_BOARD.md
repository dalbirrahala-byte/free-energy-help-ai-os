# Sprint board — Free Energy Help OS

Operational view of the **current sprint**. Update at sprint start/end; link items to [MASTER_BACKLOG.md](./MASTER_BACKLOG.md).

## Current sprint

| Field | Value |
|-------|--------|
| **Sprint name** | Sprint 0 — AI Factory bootstrap |
| **Goal** | Merge factory governance; publish ops dashboard; no CRM merge until PO prioritises |
| **Start** | _Set by Product Owner_ |
| **End** | _Set by Product Owner_ |
| **Product Owner** | Human |

### Sprint backlog

| ID | Title | Priority | Status | Assignee / role | Branch / PR |
|----|-------|----------|--------|-------------------|-------------|
| FACTORY-001 | CI + governance | Critical | Waiting Review | Automation Engineer | `chore/factory-001-ci-governance` |
| FACTORY-003 | Agent registry | High | Waiting Review | Documentation Engineer | `chore/factory-003-agent-registry` |
| FACTORY-004 | Operations dashboard docs | High | In Progress | Documentation Engineer | _branch TBD after approval_ |
| FACTORY-002 | Lint warning fix | Low | Planned | Senior Developer | Optional if capacity |

### Blocked

| ID | Reason | Escalation |
|----|--------|------------|
| FACTORY-003 (clean PR) | Waiting FACTORY-001 merge + rebase | Product Owner merge 001 first |

### Completed this sprint

| ID | Completed | Notes |
|----|-----------|-------|
| — | — | Record on merge |

---

## Sprint status board (template)

Copy this section each sprint.

```markdown
## Sprint [N] — [Name]

**Dates:** YYYY-MM-DD → YYYY-MM-DD  
**Goal:** [One sentence]

### In Progress
| ID | Title | Owner |
|----|-------|-------|

### Waiting Review
| ID | Title | PR |
|----|-------|-----|

### Testing
| ID | Title | Evidence |
|----|-------|----------|

### Blocked
| ID | Blocker |
|----|---------|

### Done
| ID | Merge date |
|----|------------|
```

---

## New sprint checklist (template)

Use at sprint planning with **Product Owner** and **Chief Architect**.

1. [ ] Review [ROADMAP.md](./ROADMAP.md) — confirm target version (e.g. v0.1).  
2. [ ] Pull candidates from [MASTER_BACKLOG.md](./MASTER_BACKLOG.md) — respect WIP limit (recommended: 2 product + 1 factory).  
3. [ ] Assign primary agent role per [AGENT_REGISTRY.md](./AGENT_REGISTRY.md).  
4. [ ] Create/update rows in [FEATURE_QUEUE.md](./FEATURE_QUEUE.md) for FACTORY items.  
5. [ ] Name branches: `feat/<ID>-slug`, `chore/factory-<ID>-slug`.  
6. [ ] Clear **Blocked** table or assign owners.  
7. [ ] Archive previous sprint **Done** items to [CHANGELOG.md](./CHANGELOG.md) if user-visible.  
8. [ ] Communicate sprint goal (Slack/email when n8n exists — v0.5).

---

## Daily standup prompt (template)

_Agents or humans fill briefly; Product Owner reads._

| Item | Answer |
|------|--------|
| IDs moved forward yesterday | |
| IDs **In Progress** today | |
| **Blocked** items | |
| CI / staging health | |
| Needs PO decision | |

---

## Related documents

- [MASTER_BACKLOG.md](./MASTER_BACKLOG.md)  
- [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)  
- [RELEASE_PLAN.md](./RELEASE_PLAN.md)
