# Engineering workflow (FACTORY-100A)

Concise lifecycle for changes to **Free Energy Help AI OS**. The CRM app lives in `frontend/`; run quality commands from that folder unless using the root launcher.

## 1. Plan

- Confirm scope with the approved specification or task ID.
- Inspect the repo: branch, git status, and files you will touch.
- Identify live vs demo data and whether Supabase or env changes are in scope (usually out of scope for UI tasks).

## 2. Build

- Reuse existing components, patterns, and types.
- Make the **smallest safe change** that meets the requirement.
- Verify every **local import** (`./`, `../`, `@/`) resolves to a real file before finishing.
- Do not remove or break existing CRM routes unless the spec requires it.

## 3. Check

From `frontend/`:

```bash
npm run check
```

Or double-click **`Check CRM Health.bat`** at the repository root.

Order (stops on first failure):

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

Do not claim the task is complete until this exits with code **0**. Re-run after fixes; do not rely on stale terminal output from an earlier run.

## 4. Manual test

- Start `npm run dev` if needed and exercise the affected routes.
- Record exact URLs, clicks, and expected behaviour in the completion report.

## 5. Review

- Summarise what changed and why.
- List **warnings and limitations** honestly (e.g. demo data, ESLint warnings, no persistence).
- List every file created, modified, or deleted.

## 6. Commit

- **Only** when the Product Owner explicitly approves (e.g. “Approved to commit”).
- One feature per branch; never commit directly to `main`.

## 7. Push

- **Only** when explicitly approved (e.g. “Approved to push”).
- Push does not imply approval to merge or deploy.

---

**Not in FACTORY-100A:** Husky, GitHub Actions, Dependabot, security scanners, and automated test frameworks. Those are planned for later FACTORY-100 stages after this foundation is proven.
