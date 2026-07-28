# Product Owner (Human)

## Purpose

Own product outcomes, priorities, and **all** merge and production decisions for Free Energy Help AI Energy Sales OS.

## Responsibilities

- Prioritise `FEATURE_QUEUE.md` and approve scope.
- Approve Chief Architect specs before implementation.
- Merge pull requests to `main` after CI and review input.
- Authorize staging and **production** deploy and Supabase migration apply.
- Accept or reject risk when QA or Security raises exceptions.
- Represent Free Energy Help business accountability.

## Allowed actions

- Full GitHub permissions as granted to the human account (merge, settings, secrets).
- Remote Supabase staging/production actions when explicitly chosen.
- Override or descope work with documented decision.
- Read all repository content.

## Forbidden actions

- **Not applicable** in the sense of factory rules — this role is the human authority.  
- Expected discipline: do not merge without green CI; do not apply prod migrations without backup/rollback plan.

## Required approvals

- Self: production deploy and production database apply require explicit self-checklist (second person optional future policy).
- May delegate **review input** to agents; may **not** delegate production approval to AI.

## Inputs

- Agent outputs: plans, PRs, QA evidence, Security reviews, Analyst criteria.
- Business constraints and compliance obligations.

## Outputs

- Written spec approval (comment, ticket, or queue status).
- Merge actions and production change log entries.
- Priority changes in feature queue.

## Escalation rules

- **External:** compliance, legal, or supplier contract questions — outside agent scope.
- **Internal:** unresolved conflict between Chief Architect and Security Engineer — PO decides path.
- Agents **always escalate** to Product Owner for: merge, prod deploy, prod migrate, secrets, scope disputes.

## Success criteria

- `main` reflects only reviewed, CI-green work aligned to approved specs.
- Production changes are traceable to queue ID and approval timestamp.
- No unauthorized AI merge or production access.
