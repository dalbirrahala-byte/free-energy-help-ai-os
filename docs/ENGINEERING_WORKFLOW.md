# FEH engineering workflow

This document summarizes the repository-wide policy in [`../AGENTS.md`](../AGENTS.md). The root policy is authoritative. The CRM app lives in `frontend/`; run frontend quality commands from that folder unless using the root launcher.

## 1. Synchronize before work

- Read the applicable `AGENTS.md` chain.
- Confirm approved scope, current branch, HEAD, and `git status`.
- Classify existing modified/untracked files without deleting or overwriting them.
- Inspect the relevant implementation and history before constructing anything.
- Reconcile the task with existing architecture; stop on a material conflict.

## 2. Build

- Reuse existing components, patterns, and types.
- Make the **smallest safe change** that meets the requirement.
- Verify every **local import** (`./`, `../`, `@/`) resolves to a real file before finishing.
- Do not recreate completed work or overwrite another agent’s work because it is unfamiliar.
- Self-correct narrow syntax, import, fixture, formatting, type, and in-scope test defects.

## 3. Validate proportionately

Use this ladder, widening only as risk warrants:

1. Smallest focused test or structural check.
2. Relevant module/suite tests.
3. Typecheck when applicable.
4. Targeted lint when applicable.
5. Broader regression tests when warranted.
6. Production build when warranted by routing, bundling, framework, dependency, release, or equivalent risk.

For a full frontend gate, run `npm run check` from `frontend/` or use **`Check CRM Health.bat`**. Security-boundary changes require appropriately broad regression testing. Record hanging or broken tooling separately from product failures.

## 4. Review and report

Return one consolidated report with the root policy’s mandatory Completion Evidence Block, including exact tests/results, Git/commit/push/deployment state, external-system and credential access, customer-data impact, remaining risks, and the recommended next gate.

## 5. Commit and push

- Commit only when the current task explicitly authorizes it.
- Stage only exact approved files and inspect the complete staged diff.
- Push only when explicitly authorized; push does not authorize merge, PR creation, deployment, or migration execution.
- Never include unrelated files, secrets, or local tooling configuration.

## 6. Database, provider, and deployment gates

Construction, commit, push, migration deployment, credential provisioning, capability activation, and production deployment are separate approvals. A migration in Git is not deployed. Dormant provider code is not activated. Supabase access, remote migration execution, real provider execution, STOP/RELEASE, and production changes require explicit human-owner approval.

## 7. Manual testing

When user-visible behavior changes, exercise the affected route or flow and record exact URLs/actions and expected results. Do not start a development server or browser session when the change is documentation/governance-only and structural validation is sufficient.
