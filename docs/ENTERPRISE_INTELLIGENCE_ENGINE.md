# Enterprise Intelligence Engine — Gate 5, V1

The production intelligence platform for the FEH Intelligence Platform, intended to become the shared reasoning layer behind the CRM, dashboard, website, automation platform, and future AI voice workforce.

**Namespace**: `frontend/src/lib/feh-enterprise-intelligence/` — a deliberately different name from the pre-existing, unrelated `frontend/src/lib/decision-engine/` and `frontend/src/components/enterprise-intelligence/` (a demo-data prototype at `/enterprise-intelligence` that predates this engine and is untouched by it). See `docs/DECISIONS.md` for why.

**Status**: Gate 5, V1. Additive only — not called by any page or route yet. `USE_ENTERPRISE_INTELLIGENCE_ENGINE` defaults to `false`.

## Purpose

Every output this engine produces follows one fixed shape:

**Evidence → Reasoning → Recommendation → Confidence → Missing Data → Provenance**

Nothing is ever presented without being traceable back to real, supplied data. Where real data doesn't exist, the engine says so honestly rather than guessing — the same discipline already proven in the Commercial Energy Intelligence and Renewal Intelligence modules, now formalised into a reusable contract with audit metadata.

## Architecture

```
EnterpriseIntelligenceRequest
        │
        ▼
intelligenceOrchestrator.ts  ── validates request, builds context (no queries)
        │
        ▼
capabilityRegistry.ts  ── only registered capabilities are invokable
        │
   ┌────┴─────────────────────────────────────┐
   ▼            ▼            ▼            ▼    ▼            ▼
renewal      lead        customer    opportunity workflow  compliance
Intelligence Intelligence Health     Intelligence Recommend Evaluation
(real)       (real)       (real)     (placeholder)(real)    (placeholder)
   │            │            │
   ▼            ▼            ▼
adapters/renewalAdapter.ts   adapters/leadAdapter.ts
   │                              │
   ▼                              ▼
lib/intelligence/scoring/renewal.ts   lib/commercial-energy-intelligence/
(validated V2, shadow-deployed)       (validated, shipped)
        │
        ▼
decisions/decisionEngine.ts + recommendationEngine.ts
  ── deterministic aggregation, closed-vocabulary recommendation
        │
        ▼
EnterpriseIntelligenceResponse (with full audit metadata)
```

Every capability wraps an **already-validated** module through a thin adapter — this engine performs no new scoring calculations of its own for renewal or lead intelligence. It orchestrates, aggregates, and audits.

## Request / response contracts

```ts
type EnterpriseIntelligenceRequest = {
  requestId?: string;
  capabilities: CapabilityId[];
  context: {
    lead: LeadContextInput;              // required
    customer?: CustomerContextInput;     // optional
    activities?: ActivityContextInput[]; // optional, caller-supplied only
    tasks?: TaskContextInput[];          // optional, caller-supplied only
    conversation?: ConversationContextInput; // optional, always "not supplied" today
  };
  today?: Date;
};

type EnterpriseIntelligenceResponse = {
  requestId: string;
  audit: AuditMetadata;
  capabilityResults: Partial<Record<CapabilityId, CapabilityOutcome>>;
  decision: DecisionOutcome;
  errors: SafeFailure[];
};
```

No Supabase query happens anywhere in this module. The caller loads data and supplies it; the engine only reasons over what it's given.

## Capability lifecycle

1. A capability is a `{ id, execute(input) }` pair implementing the `Capability` interface.
2. It is only invokable once added to `orchestration/capabilityRegistry.ts`.
3. Requesting an ID not in the registry returns a typed `SafeFailure` with code `UNKNOWN_CAPABILITY` — never a crash, never a silent no-op.
4. A capability that throws during execution is caught by the orchestrator and converted to a `SafeFailure` with code `CAPABILITY_EXECUTION_FAILED`, its message sanitised (see Safe failure behaviour below). One capability failing never prevents the others from returning results.

### Extension process

To add a new capability:
1. Add its ID to the `CapabilityId` union in `types.ts`.
2. Implement `{ id, execute }` in a new file under `capabilities/`, using `confidence.ts`'s `calculateConfidence` for its confidence field — never a bespoke rule.
3. If it wraps an existing module, add a translation-only adapter under `adapters/` first; capabilities should not contain calculation logic.
4. Register it in `orchestration/capabilityRegistry.ts`.
5. If it can ever be "Not configured"/"Insufficient data" (most new capabilities will be, until real data exists), make that the actual behaviour, not a documented aspiration.

## Real capabilities (Gate 5)

| Capability | Status | Wraps |
|---|---|---|
| `renewalIntelligence` | Real | `lib/intelligence/scoring/renewal.ts` (validated V2, shadow-deployed) |
| `leadIntelligence` | Real | `lib/commercial-energy-intelligence` (Lead Quality Score + Data Completeness only) |
| `customerHealth` | Real | `lib/intelligence/scoring/customerHealth.ts` |
| `workflowRecommendation` | Real | New deterministic logic — closed action vocabulary only |

## Placeholder capabilities (Gate 5)

| Capability | Status | Why |
|---|---|---|
| `opportunityIntelligence` | Always `insufficient_data` | Requires annual consumption data that doesn't exist anywhere in the schema; this engine will never estimate it |
| `complianceEvaluation` | Always `not_configured` | No consent/suppression data source exists yet (design-only in `docs/VOICE_ARCHITECTURE.md`) |

## Confidence rule

One rule, in one place (`confidence.ts`), used by every capability and the top-level decision:

> Confidence = ratio of evidence items marked `available` to total evidence items evaluated. ≥80% → High. ≥50% → Medium. Any evidence but <50% available → Low. Zero evidence items evaluated → Insufficient.

Never an arbitrary number, never model-generated. This is a direct, deliberate rebuttal of the kind of fabricated "96% confidence" output flagged during this gate's design discussion — every confidence value here is reconstructible from the evidence array sitting right next to it.

## Prohibited outputs (enforced by what the engine does *not* implement, not just documented)

This engine's capabilities and decision engine structurally cannot produce: supplier recommendations, prices, savings estimates, consumption estimates, commission figures, revenue estimates, contract values, sentiment scores, win probabilities, customer identity claims, or any confidence score not derived from the rule above. `opportunityIntelligence`'s permanent `insufficient_data` state is the concrete enforcement of "never fabricate consumption" — not a policy statement, a return value.

## Feature flags

| Flag | Default | Effect |
|---|---|---|
| `USE_ENTERPRISE_INTELLIGENCE_ENGINE` | `false` | Whether a future caller should treat this engine's output as authoritative. The engine function itself is always callable (e.g. by tests) — this flag is for integration points that don't exist yet. |
| `ENTERPRISE_INTELLIGENCE_SHADOW_MODE` | `true` | When true, the renewal capability's output is cross-checked against a direct call to the validated V2 renewal module. A mismatch is logged server-side only (`console.warn`) and never changes what's returned. |

Both default to the safest possible state: engine off, and when it does run, shadow-checked.

## Shadow deployment

`orchestration/shadowComparison.ts`'s `shadowCompareRenewal` compares the engine's `renewalIntelligence` capability output against a fresh, direct call to `lib/intelligence/scoring/renewal.ts`. This validates the **adapter layer** hasn't distorted anything — it is deliberately not a repeat of the existing V1-vs-V2 comparison, which already exists, tested, in `lib/intelligence/renewalShadowDeployment.ts`. On mismatch: log only, never surfaced to a user, never changes the response.

## Rollback

Set `USE_ENTERPRISE_INTELLIGENCE_ENGINE=false` (the default) and/or `ENTERPRISE_INTELLIGENCE_SHADOW_MODE=true` (the default) — no code change, no redeploy of logic, matching the same pattern already proven with `USE_COMMERCIAL_INTELLIGENCE_V2`.

## Safe failure behaviour

- Request-level validation failures (no capabilities requested, no lead context) return a typed `SafeFailure`, never a thrown exception.
- Per-capability failures are isolated — caught, sanitised, and collected in `response.errors`, never propagated.
- `errors.ts`'s message sanitiser strips anything that looks like a file path, key, token, password, or a reference to Supabase/Postgres before a capability-error message is ever returned, replacing it with a generic message.
- No stack trace is ever included in any response.

## Audit metadata

Every response includes: `requestId` (a generated `EIE-<uuid>` if the caller didn't supply one), `capabilitiesRequested`, `sourceFields` (which lead/customer fields were genuinely supplied), `featureFlagState` (both flags, as they were at calculation time), `calculatedAt` (ISO timestamp, from the same `today` used for calculation — deterministic and testable), and `engineVersion`. Audit records are **not** written to any database in Gate 5 — the response object itself is the audit record until a real persistence layer is approved.

## Future integration

- **Voice**: `conversationContext.ts` already exists as an honest "not supplied" placeholder — a future voice integration supplies real transcript data through the same contract, no shape change needed.
- **Website / email / automation**: any future caller (an API route, a scheduled job) constructs an `EnterpriseIntelligenceRequest` from whatever context it has and calls `runEnterpriseIntelligence` — the contract doesn't assume a CRM page is the caller.
- **Dashboards**: `EnterpriseIntelligenceResponse`'s `decision` and `capabilityResults` are already shaped for direct display using the same `SectionCard`/badge patterns proven elsewhere in this codebase.

None of this is built yet — Gate 5 is the contract and the first four real capabilities only.
