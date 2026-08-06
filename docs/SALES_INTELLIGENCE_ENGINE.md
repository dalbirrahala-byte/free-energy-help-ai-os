# Sales Intelligence Engine — target architecture (design only)

Documentation only. No code exists yet beyond the `salesDirector` worker's typed interface in `frontend/src/lib/ai-workforce/workers/salesDirectorWorker.ts`, which honestly reports "Not Yet Configured" for every capability below.

## Purpose

Recommendation services that help a sales consultant decide who to contact, what to do next, and in what order — always from real CRM data, never a fabricated score.

## Target capabilities

| Capability | What it would need to be real |
|---|---|
| Next best customer | Real historical outcome data (which leads converted, how, why) to rank against — doesn't exist yet |
| Next best action | Combines Renewal Intelligence AI, Commercial Energy Intelligence AI, and real activity history — the first two already exist and are real; the combination logic doesn't exist yet |
| Probability to close | Requires a real historical win/loss dataset large enough to be statistically meaningful — doesn't exist yet |
| Call timing optimisation | Requires real historical response-time data per contact attempt — not currently captured (activities record *that* contact happened, not response outcome) |
| Opportunity prioritisation | Combines multiple existing real signals (renewal urgency, data completeness, engagement) — buildable once the aggregation rules are designed and approved |
| Cross-sell recommendation | Requires a defined product/service catalogue and real purchase-history data — neither exists |

## What's genuinely buildable soon vs. what needs new data

**Buildable now, from existing real modules** (once explicitly approved as its own gate): opportunity prioritisation, since it can combine `renewalIntelligence` and `commercialEnergyIntelligence` worker output with a deterministic ranking rule — no new data required, same pattern as the Enterprise Intelligence Engine's `decisionEngine.ts`.

**Needs new data capture first**: probability to close, call timing optimisation, and cross-sell all require historical outcome data this CRM doesn't record yet (win/loss reasons, response times, product catalogue). Building these before that data exists would mean fabricating them — explicitly prohibited.

## Evidence and confidence approach (once built)

Same discipline as every other intelligence module in this project: every recommendation carries its evidence array, and confidence is calculated by the same rule as `lib/feh-enterprise-intelligence/confidence.ts` — ratio of available to required evidence, never an arbitrary number.

## Integration point

A future `salesDirector` worker implementation would live at `frontend/src/lib/ai-workforce/workers/salesDirectorWorker.ts`, replacing the current honest placeholder, following the exact pattern already proven by `renewalIntelligenceWorker.ts` and `commercialEnergyIntelligenceWorker.ts` — a thin wrapper over real, independently-tested logic, never a second implementation.
