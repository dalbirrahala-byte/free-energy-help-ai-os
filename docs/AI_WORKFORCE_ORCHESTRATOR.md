# AI Workforce Orchestrator — Gate 6, V1

The coordination layer for all AI workers in the FEH AI Business Operating System. Additive only — not called by any page or route yet.

**Namespace**: `frontend/src/lib/ai-workforce/`

**Status**: Gate 6, V1. `USE_AI_WORKFORCE_ORCHESTRATOR` defaults to `false`; `AI_WORKFORCE_SHADOW_MODE` defaults to `true`.

## Why Gate 6 is bounded

The original Gate 6 brief described eight AI workers, a full voice platform, marketing automation, sales AI, executive forecasting, and event-driven workflow automation across eight subsystems — a multi-quarter platform, not a single increment. Building all of it literally in one pass would have meant either fabricating capabilities that have no real data behind them, or building a large amount of code with nothing genuine to validate it against — both directly against this project's own principles (see `docs/DECISIONS.md` ADR-003).

Gate 6 V1 instead builds the **real coordination layer** — genuinely tested, genuinely working — and gives every one of the eight workers a real, typed interface. Two workers do real work today by wrapping the already-validated Gate 5 Enterprise Intelligence Engine. The other six honestly report **"Not Yet Configured"**, each with a specific, real reason, rather than a vague "coming soon." The four larger subsystems described in the brief (Marketing Intelligence, Sales Intelligence, Executive Intelligence, Workflow Automation) are captured as target architecture documents, not code, since every one of them depends on data sources or external integrations that don't exist yet.

## Architecture

```
OrchestratorRequest { workers: WorkerId[], input: WorkerExecutionInput }
        │
        ▼
orchestrator.ts  ── validates request, isolates per-worker failures
        │
        ▼
workerRegistry.ts  ── only registered workers are invokable
        │
   ┌────┴───────────────────────────────────────────────────────┐
   ▼            ▼            ▼         ▼         ▼      ▼        ▼        ▼
Sales        Marketing    Commercial  Renewal  Customer Compli-  Voice   Executive
Director     Director     Energy      Intel.   Success  ance     AI      Reporting
(N/A)        (N/A)        Intel.      (real)   (N/A)    (N/A)    (N/A)   (N/A)
             (real)
```

Every worker exposes `describe()` (its identity, responsibility, and capability list) and `execute()` (its result). The two real workers call directly into `lib/feh-enterprise-intelligence` — no calculation logic is duplicated anywhere in this tree.

## Request / response contracts

```ts
type OrchestratorRequest = {
  requestId?: string;
  workers: WorkerId[];
  input: WorkerExecutionInput; // reuses lib/feh-enterprise-intelligence's context types directly
};

type OrchestratorResponse = {
  requestId: string;
  audit: AiWorkforceAuditMetadata;
  workerResults: Partial<Record<WorkerId, WorkerResult>>;
  errors: SafeFailure[];
};
```

`WorkerExecutionInput` deliberately reuses `LeadContextInput`/`CustomerContextInput`/`ActivityContextInput`/`TaskContextInput` from the Enterprise Intelligence Engine rather than defining a second, parallel context shape — this is the mission's "share a common intelligence layer instead of creating isolated logic" principle applied directly, not just stated.

## The 8 workers

| Worker | Status | Real capabilities | Reference |
|---|---|---|---|
| Commercial Energy Intelligence AI | **Operational** | Lead quality score, data completeness, customer health — wraps Gate 5's `leadIntelligence` + `customerHealth` | `docs/ENTERPRISE_INTELLIGENCE_ENGINE.md` |
| Renewal Intelligence AI | **Operational** | Renewal urgency, procurement status, suggested next action — wraps Gate 5's `renewalIntelligence` + `workflowRecommendation` | `docs/ENTERPRISE_INTELLIGENCE_ENGINE.md` |
| Sales Director AI | Not Yet Configured | — | `docs/SALES_INTELLIGENCE_ENGINE.md` |
| Marketing Director AI | Not Yet Configured | — | `docs/MARKETING_INTELLIGENCE_ENGINE.md` |
| Customer Success AI | Not Yet Configured | — | No satisfaction/churn data source exists |
| Compliance AI | Not Yet Configured | — | No consent/suppression data source exists |
| Voice AI | Not Yet Configured | — | `docs/VOICE_ARCHITECTURE.md` (provider not yet selected) |
| Executive Reporting AI | Not Yet Configured | — | `docs/EXECUTIVE_INTELLIGENCE.md` (forecasting explicitly gated) |

Every "Not Yet Configured" worker still returns a fully-formed `WorkerResult` — `status: "not_yet_configured"`, `data: null`, `confidence: { level: "Insufficient", ... }`, and a specific `reasonNotConfigured` — never a thrown error, never an empty response, never a vague placeholder.

## Confidence and explainability

Every worker result carries a `confidence` field using the exact same rule as the Enterprise Intelligence Engine (`lib/feh-enterprise-intelligence/confidence.ts`) — reused, not reimplemented — and an `explanation` string. No worker, real or placeholder, produces a confidence value that isn't derived from that rule.

## Safe failure behaviour

Identical discipline to Gate 5: request-level validation failures return a typed `SafeFailure`, never a throw. A single worker throwing during execution is caught, sanitised (`errors.ts` strips anything resembling a path, key, token, or Supabase/Postgres reference), and isolated in `response.errors` — every other requested worker still returns its result.

## Feature flags

| Flag | Default | Effect |
|---|---|---|
| `USE_AI_WORKFORCE_ORCHESTRATOR` | `false` | Whether a future caller should treat orchestrator output as authoritative |
| `AI_WORKFORCE_SHADOW_MODE` | `true` | Reserved for future worker-level shadow comparisons, following the same pattern as `ENTERPRISE_INTELLIGENCE_SHADOW_MODE` |

## Rollback

Set `USE_AI_WORKFORCE_ORCHESTRATOR=false` (the default) — no code change required. The orchestrator function itself remains callable for testing regardless of flag state, exactly like the Enterprise Intelligence Engine.

## Testing

20 new automated tests (`featureFlags.test.ts`, `workerRegistry.test.ts`, `orchestrator.test.ts`) covering: all 8 workers registered with valid descriptors, exactly 2 operational and 6 honestly not-configured, no placeholder ever claims an implemented capability, real workers return correct data, unknown-worker and missing-input requests fail safely, per-worker error isolation, mixed real/placeholder aggregation, audit metadata, timestamps, and rollback behaviour. Run via `node --test`, no new package required — same native Node test runner established in Gate 5.

## Extension process

To make a placeholder worker real: implement its logic (reusing `lib/feh-enterprise-intelligence` or another validated module wherever possible), update its `WorkerDescriptor.capabilities[].implemented` flags to `true` only for what's genuinely built, change its `status` to `"operational"`, and add tests proving the specific scenarios in its target architecture doc. Never flip `status` to `"operational"` for a worker still returning placeholder data.
