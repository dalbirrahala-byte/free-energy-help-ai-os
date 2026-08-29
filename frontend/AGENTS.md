<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Free Energy Help AI OS — Frontend agent rules

The repository-root [`AGENTS.md`](../AGENTS.md) is authoritative and applies here. These rules specialize frontend work and must not weaken the root authority, security, approval, or pre-work requirements.

Repository layout: the Next.js app is in **`frontend/`**. Quality commands run from `frontend/` unless using **`Check CRM Health.bat`** at the repo root.

See also: [`docs/ENGINEERING_WORKFLOW.md`](../docs/ENGINEERING_WORKFLOW.md) (Plan → Build → Check → Manual Test → Review → Commit → Push).

## FACTORY-100A: Engineering safety foundation

### Risk-based quality ladder

Use the smallest validation that proves the change, then widen according to risk:

1. Focused test or structural check.
2. Relevant module/suite tests.
3. `npm run typecheck` when TypeScript/imports are affected.
4. Targeted `npm run lint -- <paths>` when supported and applicable.
5. Broader regression tests when warranted.
6. `npm run build` or `npm run check` when routing, bundling, Next.js configuration, dependencies, broad UI behavior, release readiness, or comparable risk warrants it.

Do not repeatedly run expensive checks without new evidence. Security-boundary changes require appropriately broad regression testing. Report skipped checks as not run, with the reason; do not describe them as passing.

### How to work on every task

1. **Inspect** existing files, scripts, and patterns before editing.
2. Make the **smallest safe change** that satisfies the spec.
3. **Verify** every local import (`./`, `../`, `@/`) points at a file that exists in the repo.
4. **Validate** through the risk-based ladder and rerun affected checks after corrections.
5. **Never** treat old terminal or dev-server errors as current results.
6. **Never** commit or push without explicit human approval.
7. **List** all files created, modified, or deleted in the root Completion Evidence Block.
8. Provide manual testing steps when user-visible behavior changes.
9. Report warnings and limitations honestly, separating tooling failures from product failures.

### Scripts (`frontend/package.json`)

| Script      | Purpose |
| ----------- | ------- |
| `typecheck` | TypeScript only |
| `lint`      | ESLint |
| `build`     | Production build |
| `check`     | Full gate: typecheck → lint → build |

### Windows launcher

Double-click **`Check CRM Health.bat`** at the repository root to run `npm run check` in `frontend/` and display **ALL CHECKS PASSED** or **QUALITY CHECK FAILED**.
