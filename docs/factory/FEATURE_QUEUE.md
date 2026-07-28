# Feature queue

Factory infrastructure tasks (`FACTORY-*`). For full product backlog see [MASTER_BACKLOG.md](./MASTER_BACKLOG.md).

**Status values (factory queue):** `Planned` | `In progress` | `In review` | `Done` | `Blocked`  

**Product lifecycle (master backlog):** Planned | In Progress | Waiting Review | Testing | Completed | Blocked

| ID | Title | Status | Branch | Notes |
|----|-------|--------|--------|-------|
| FACTORY-001 | Bootstrap CI + root governance shell | In review | `chore/factory-001-ci-governance` | GitHub Actions, AGENTS.md, Cursor rules, `.env.example`, README |
| FACTORY-002 | Fix pre-existing lint warning in tasks page | Planned | `fix/factory-002-tasks-lint` | Optional; separate PR after FACTORY-001 |
| FACTORY-003 | AI Agent Registry | In review | `chore/factory-003-agent-registry` | [AGENT_REGISTRY.md](./AGENT_REGISTRY.md); rebase after 001 merge |
| FACTORY-004 | Project Operations Dashboard | In progress | _TBD_ | [INDEX.md](./INDEX.md), ROADMAP, backlog, sprint board |
| FACTORY-005 | Task queue system (enhanced) | Planned | `chore/factory-005-task-queue` | Align queue with MASTER_BACKLOG lifecycle |
| FACTORY-006 | Documentation Hub | Planned | `chore/factory-006-documentation-hub` | Architecture map, standards |
| FACTORY-007 | Automation framework | Planned | `chore/factory-007-automation-framework` | Cursor, GitHub, n8n, reporting |

## Adding items

1. Append a row with a unique `ID` (e.g. `FACTORY-008`).
2. Add the same ID to [MASTER_BACKLOG.md](./MASTER_BACKLOG.md) with priority and version.
3. Link to a plan in `docs/factory/plans/` when the Chief Architect produces one.
4. Assign primary agent role per [AGENT_REGISTRY.md](./AGENT_REGISTRY.md).

See also: [SPRINT_BOARD.md](./SPRINT_BOARD.md), [INDEX.md](./INDEX.md).
