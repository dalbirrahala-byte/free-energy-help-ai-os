# Known issues — Free Energy Help OS

Tracked defects, risks, and technical debt. **Critical** items block production release per [RELEASE_PLAN.md](./RELEASE_PLAN.md).

## Status legend

| Severity | Meaning |
|----------|---------|
| Critical | Ship blocker / security / data exposure |
| High | Fix before next minor version |
| Medium | Scheduled backlog |
| Low | Hygiene |

---

## Open issues

| ID | Severity | Area | Description | Workaround | Backlog link |
|----|----------|------|-------------|------------|--------------|
| KI-001 | High | Database | Supabase tables may not match repo (`customers`, `sites` vs manual `customer_sites`) | Apply [migration](../../supabase/migrations/20250727180000_customers_and_sites.sql) or align naming in ADR | CRM-003, DB-001 |
| KI-002 | Medium | Security | No RLS policies in versioned migrations | Do not use production data until DB-001 | DB-001 |
| KI-003 | Medium | Auth | No login; Supabase SSR cookie `setAll` no-op | Internal dev only | CRM-001 |
| KI-004 | Low | Quality | ESLint: unused `revalidatePath` in `tasks/page.tsx` | None | FACTORY-002 |
| KI-005 | Medium | Factory | FACTORY-003 PR stacks on FACTORY-001 until 001 merged | Merge 001 first, rebase 003 | FACTORY-001 |
| KI-006 | Medium | UX | Dashboard nav links to routes without pages (`/quotes`, etc.) | Use Leads/Customers directly | UI-001 |
| KI-007 | Low | Docs | `FEATURE_QUEUE` status labels differ from master backlog lifecycle | Use MASTER_BACKLOG for product | FACTORY-005 |

---

## Resolved issues

| ID | Resolved | Resolution |
|----|----------|------------|
| — | — | — |

---

## Issue template

```markdown
| KI-NNN | Severity | Area | Description | Workaround | Backlog link |
```

---

## Related documents

- [MASTER_BACKLOG.md](./MASTER_BACKLOG.md)  
- [SPRINT_BOARD.md](./SPRINT_BOARD.md)  
- [CHANGELOG.md](./CHANGELOG.md)
