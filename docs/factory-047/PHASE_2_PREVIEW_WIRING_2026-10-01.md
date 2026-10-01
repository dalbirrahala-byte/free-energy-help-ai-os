# Factory 047 Phase 2 — preview wiring specification

Status: preview/design branch only. No production deployment, database migration, outbound communication, Apollo execution or autonomous CRM mutation.

## Goal

Expose the already-tested Phase 1 `buildDailyAssistantBrief` result at the top of Mission Control using only existing CRM facts.

## Data path

`loadMissionControlData()` already calculates:
- overdue task count and task availability;
- follow-up lead count and lead/activity availability;
- renewal count and site/customer availability;
- deterministic `priorityActions`.

Phase 2 should pass those exact values into `buildDailyAssistantBrief`. It must not add a new database query merely to feed the assistant.

## Time handling

Use an explicit `Europe/London` clock when choosing morning/afternoon/evening wording. Do not rely on Vercel/server-local time.

Acceptance examples:
- 2026-01-15T08:30:00Z -> London hour 08 (GMT).
- 2026-07-15T08:30:00Z -> London hour 09 (BST).

## Mission Control presentation

Place the read-only briefing immediately below the KPI cards and before the existing deterministic priority-action queue.

Show:
- greeting;
- evidence state: LIVE_FACTS / PARTIAL_FACTS / NO_FACTS;
- concise headline;
- top proven action, if one exists;
- link to the existing CRM route for review;
- source-unavailable notes when data is partial;
- permanent capability disclosure: no sending, enrichment, CRM writes or external execution.

Do not display demo data as live facts.

## Capability boundary

The Phase 2 component has no mutation handler and no provider connector. It may navigate to existing CRM review pages only.

Explicitly prohibited:
- Apollo enrichment or sequence enrollment;
- email/WhatsApp/social sends;
- task/customer/lead writes;
- automatic owner assignment;
- autonomous status changes;
- production deployment.

## Files intended for the preview patch

- `frontend/src/lib/daily-assistant/dailyAssistant.ts`
  - add a small `Europe/London` hour helper.
- `frontend/src/lib/daily-assistant/dailyAssistant.test.ts`
  - add GMT/BST tests.
- `frontend/src/lib/dashboard/types.ts`
  - add `dailyAssistant: DailyAssistantBrief` to `MissionControlData`.
- `frontend/src/lib/dashboard/queries.ts`
  - build the daily brief from existing `priorityActions` and table availability.
- `frontend/src/components/dashboard/MissionControlContent.tsx`
  - render a read-only Daily Assistant card.

## Verification gate before PR

1. Daily Assistant unit tests pass.
2. Dashboard typecheck passes.
3. Full frontend check/build passes.
4. Mission Control loads with full CRM availability.
5. Mission Control loads with one or more unavailable tables and makes no inferred counts.
6. The component contains no mutation callback, provider call or hidden execution control.
7. Preview deployment only; no production alias or merge.
