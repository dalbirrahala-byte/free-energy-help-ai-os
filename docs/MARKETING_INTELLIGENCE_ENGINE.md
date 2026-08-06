# Marketing Intelligence Engine — target architecture (design only)

Documentation only. No code exists yet beyond the `marketingDirector` worker's typed interface in `frontend/src/lib/ai-workforce/workers/marketingDirectorWorker.ts`, which honestly reports "Not Yet Configured" for every capability below.

## Purpose

Shared services supporting marketing activity for commercial energy brokerage — always grounded in real data from a connected source, never simulated traffic, rankings, or engagement figures.

## Target capabilities and their real dependencies

| Capability | Requires |
|---|---|
| SEO intelligence | A connected SEO data source (Search Console, a ranking tool, or genuine crawl data) — the AI Control Centre's "Website SEO" service already exists as an honest "Checking" placeholder for exactly this reason (`lib/ai-control-centre/status.ts`) |
| Regional campaign planning | Real conversion data broken down by region — doesn't exist in the current schema |
| Landing-page optimisation | Real conversion-rate data per page — requires connected web analytics |
| Content generation | An approved AI provider connection (Claude/OpenAI/Gemini — all currently "Not configured" in the AI Control Centre) plus a human-review workflow; content generation must never publish unreviewed |
| LinkedIn campaigns | A connected LinkedIn integration — none exists |
| Email campaigns | A connected email platform — none exists |
| Lead nurturing | Real engagement/activity history (this exists — `activities`/`tasks` tables) combined with a sequencing engine that doesn't exist yet |
| Website conversion analysis | Connected web analytics — none exists |

## Relationship to the AI Control Centre

Several of these capabilities are gated by the same provider connections already tracked honestly in `lib/ai-control-centre/status.ts` (Claude, OpenAI, Gemini, n8n, Website SEO). This engine should read that same status, not duplicate a second "is this connected" check — one source of truth for provider connectivity across the whole platform.

## What's genuinely buildable soon vs. what needs new integrations

**Buildable without a new external integration**: lead nurturing sequencing logic, since the underlying `activities`/`tasks` data already exists — the gap is a sequencing/scheduling engine, not a data source. Still needs its own dedicated design and approval before implementation.

**Needs a new external connection first**: everything else in the table above. None of these should be attempted with fabricated or estimated figures standing in for a real connection.

## Integration point

A future `marketingDirector` worker implementation would replace the current honest placeholder at `frontend/src/lib/ai-workforce/workers/marketingDirectorWorker.ts`, following the same thin-wrapper pattern as the two real workers already shipped.
