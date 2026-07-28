# AI Energy Sales OS — Agent guide

This repository uses an agent-driven development workflow. **Do not push directly to `main`.** All work happens on feature branches and merges via pull request after CI passes and human review.

## Repository layout

| Path | Purpose |
|------|---------|
| `frontend/` | Next.js 16 App Router CRM application |
| `supabase/migrations/` | Version-controlled SQL migrations (apply manually; never auto-apply production) |
| `docs/factory/` | Feature queue, factory process, and planning artefacts |
| `.cursor/rules/` | Persistent Cursor project rules |

## Standard commands

Run from `frontend/`:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

## Workflow (summary)

1. Pick or receive an item from [docs/factory/FEATURE_QUEUE.md](docs/factory/FEATURE_QUEUE.md).
2. **Chief Architect:** produce spec and file list; wait for **Product Owner** approval before code changes.
3. **Senior Developer / Database Engineer / QA / Security / Documentation / Automation:** work on a named branch; open a PR to `main`.
4. CI (`.github/workflows/ci.yml`) must pass: install, lint, TypeScript, production build.
5. **No production deploy** and **no remote Supabase migration apply** without explicit **Product Owner** approval.

## Roles

AI Development Factory roles, permissions, and escalation: **[docs/factory/AGENT_REGISTRY.md](docs/factory/AGENT_REGISTRY.md)**.

Individual charters: `docs/factory/roles/`.

Follow [.cursor/rules/00-core-workflow.mdc](.cursor/rules/00-core-workflow.mdc) and the active feature plan. **Product Owner (Human)** approves specs, merges, and all production changes.

## Next.js 16

The frontend includes additional agent notes in `frontend/AGENTS.md` (breaking changes vs older Next.js versions).
