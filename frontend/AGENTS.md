<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Free Energy Help AI OS — Frontend agent rules

Repository layout: Next.js app in **`frontend/`**. Quality commands run from `frontend/` unless using **`Check CRM Health.bat`** at the repo root.

See also: [`docs/ENGINEERING_WORKFLOW.md`](../docs/ENGINEERING_WORKFLOW.md) (Plan → Build → Check → Manual Test → Review → Commit → Push).

## FACTORY-100A: Engineering safety foundation

### Quality gate (required before completion)

```bash
cd frontend
npm run check
```

Runs **in order** and **stops on first failure**:

1. `npm run typecheck` — `tsc --noEmit`
2. `npm run lint` — ESLint
3. `npm run build` — `next build`

**Do not** mark a task complete unless `npm run check` exits with code **0** in a **fresh run** for this task.

### How to work on every task

1. **Inspect** existing files, scripts, and patterns before editing.
2. Make the **smallest safe change** that satisfies the spec.
3. **Verify** every local import (`./`, `../`, `@/`) points at a file that exists in the repo.
4. **Run** `npm run check` before claiming completion.
5. **Never** treat old terminal or dev-server errors as current results — re-run checks after changes.
6. **Never** commit or push without explicit human approval.
7. **List** all files created, modified, or deleted.
8. Provide **exact manual testing steps** (URLs, actions, expected outcomes).
9. Report **warnings and limitations** honestly (demo data, lint warnings, missing integrations).

### Scripts (`frontend/package.json`)

| Script      | Purpose |
| ----------- | ------- |
| `typecheck` | TypeScript only |
| `lint`      | ESLint |
| `build`     | Production build |
| `check`     | Full gate: typecheck → lint → build |

### Windows launcher

Double-click **`Check CRM Health.bat`** at the repository root to run `npm run check` in `frontend/` and display **ALL CHECKS PASSED** or **QUALITY CHECK FAILED**.

### Out of scope for FACTORY-100A

Husky, GitHub Actions, Dependabot, security scanners, and new test frameworks — add only in later FACTORY-100 stages after this gate is proven.
