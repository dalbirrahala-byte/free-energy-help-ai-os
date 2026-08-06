# Executive Intelligence — target architecture (design only)

Documentation only. No code exists yet beyond the `executiveReporting` worker's typed interface in `frontend/src/lib/ai-workforce/workers/executiveReportingWorker.ts`, which honestly reports "Not Yet Configured" for every capability below.

## The forecasting rule (read this first)

**Revenue, pipeline, and commission forecasting are explicitly gated and remain "Not Yet Configured" as of Gate 6.** This was a live decision point during Gate 6's scoping (see `docs/DECISIONS.md` ADR-002 and ADR-004): no figure is produced — not per-customer, not in aggregate, not as a range — until real historical Supabase data exists in sufficient volume *and* a separate, explicit decision authorises it. This is not a temporary oversight to route around; it's the same "never fabricate" discipline enforced everywhere else in this project, applied to numbers with a currency symbol on them.

If and when this is revisited, the distinction that matters is: **portfolio-level statistical forecasting from real historical aggregates** (a defensible future capability) is a fundamentally different thing from **estimating a figure for one specific customer or deal** (which stays forbidden regardless of any future forecasting decision — see `opportunityIntelligence` and `scoring/commission.ts`, both permanent placeholders for exactly this reason).

## Target capabilities

| Capability | Requires |
|---|---|
| Revenue forecasting | Gated (see above) |
| Pipeline forecasting | Gated (see above) |
| Commission forecasting | Gated (see above) |
| Team performance | Real activity/outcome history attributable to an individual user — requires authentication, which doesn't exist anywhere in this app yet (`docs/MASTER_ARCHITECTURE.md` §8) |
| AI productivity metrics | Requires audit records to actually persist somewhere — Gate 5 explicitly deferred audit persistence to a future gate |
| Compliance metrics | Requires the Compliance AI worker to be real first (itself gated on consent/suppression data that doesn't exist) |
| Supplier performance | Requires real historical tender/outcome data per supplier — doesn't exist |
| Marketing ROI | Requires the Marketing Director AI worker to be real first |

## Every dependency chain leads back to the same few gaps

Reading the table above, nearly every capability is blocked by one of: (1) the forecasting rule, (2) no authentication, (3) no audit persistence, or (4) another AI worker that's itself not real yet. This isn't a coincidence — Executive Intelligence is, by nature, the aggregation layer sitting on top of everything else. It becomes real gradually, as the layers underneath it do, not by building its own shortcut around them.

## Integration point

A future `executiveReporting` worker implementation would replace the current honest placeholder at `frontend/src/lib/ai-workforce/workers/executiveReportingWorker.ts`. Whatever ships first should be the metric with the shortest real dependency chain — likely team performance, once authentication exists — not revenue forecasting, regardless of how it might be prioritised elsewhere.
