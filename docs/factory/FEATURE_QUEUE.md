# Feature queue

Status values: `Planned` | `In progress` | `In review` | `Done` | `Blocked`

| ID | Title | Status | Branch | Notes |
|----|-------|--------|--------|-------|
| FACTORY-001 | Bootstrap CI + root governance shell | In review | `chore/factory-001-ci-governance` | GitHub Actions, AGENTS.md, Cursor rules, `.env.example`, README |
| FACTORY-002 | Fix pre-existing lint warning in tasks page | Planned | `fix/factory-002-tasks-lint` | Optional; separate PR after FACTORY-001 |
| FACTORY-003 | AI Agent Registry | In review | `chore/factory-003-agent-registry` | [AGENT_REGISTRY.md](./AGENT_REGISTRY.md) + role charters |
| FACTORY-004 | Task Queue System | Planned | `chore/factory-004-task-queue` | Priority, lifecycle, dependencies, approval workflow |
| FACTORY-005 | Project Dashboard | Planned | `chore/factory-005-project-dashboard` | Sprint, progress, blocked items |
| FACTORY-006 | Documentation Hub | Planned | `chore/factory-006-documentation-hub` | Index, architecture map, standards |
| FACTORY-007 | Automation Framework | Planned | `chore/factory-007-automation-framework` | Cursor, GitHub, n8n, reporting |

## Adding items

1. Append a row with a unique `ID` (e.g. `FEAT-012` or `FACTORY-003`).
2. Link to a plan document in `docs/factory/plans/` when the Chief Architect produces one.
3. Record the working branch name before implementation starts.
4. Assign primary agent role per [AGENT_REGISTRY.md](./AGENT_REGISTRY.md).
