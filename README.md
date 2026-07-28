# free-energy-help-ai-os

AI-powered commercial energy sales platform for Free Energy Help.

## Application

The CRM lives in **`frontend/`** (Next.js 16, Supabase). See `frontend/README.md` for local dev.

### Local setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Supabase project URL and publishable key
npm ci
npm run dev
```

### Quality checks

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs the same checks on pull requests and pushes to `main` (see `.github/workflows/ci.yml`).

## Development workflow

- **Source of truth:** GitHub; work on feature branches, not directly on `main`.
- **Agents:** See root `AGENTS.md` and `.cursor/rules/`.
- **Backlog:** `docs/factory/FEATURE_QUEUE.md`
- **Database:** SQL migrations in `supabase/migrations/` — apply manually to Supabase; no automatic production apply from CI.

## Deployments

Production deployment and remote migration apply require **explicit human approval** and are not automated from this repository’s CI.
