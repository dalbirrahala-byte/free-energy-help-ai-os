# Workflow Automation — target architecture (design only)

Documentation only. No event bus, no n8n workflows, no code beyond the AI Workforce Orchestrator's synchronous request/response pattern exists yet.

## Purpose

Event-driven coordination between CRM, Marketing, Voice, Email, Tasks, Calendar, Renewals, and Reporting — so that a real event in one subsystem (a lead's contract renewal becoming urgent, a call ending, a task completing) can trigger a response in another, without those subsystems being hard-wired to each other.

## Why this is design-only for Gate 6

Every one of the eight subsystems named in the mission is either partially real (CRM) or entirely not-yet-real (Voice, most of Marketing, Calendar has no backend at all — see `docs/MASTER_ARCHITECTURE.md` §2.3). Event-driven automation between systems that mostly don't exist yet would mean building plumbing with nothing real flowing through it. The AI Control Centre already has an honest, tested pattern for the one piece of real infrastructure this would eventually need (`lib/ai-control-centre/status.ts`'s n8n health check, currently "Not configured" since no `N8N_BASE_URL` is set) — that's the actual current state of automation readiness.

## Target shape (for when the underlying subsystems are real)

```
Event source                Event                          Possible subscribers
─────────────                ─────                          ────────────────────
Renewal Intelligence AI  →  renewal.urgency_changed      →  Workflow Recommendation,
                                                              Executive Reporting
CRM (activities/tasks)   →  task.overdue                 →  Customer Success AI
Voice AI (future)        →  call.completed                →  CRM (summary), Compliance AI,
                                                              Executive Reporting
Marketing (future)       →  campaign.lead_captured        →  Sales Director AI
```

Every event would carry the same evidence/provenance discipline as the rest of this platform — an event is a fact that happened (a real state change), not an inference or a prediction.

## Relationship to the AI Workforce Orchestrator

The orchestrator built in Gate 6 (`lib/ai-workforce/orchestrator.ts`) is deliberately **synchronous, request/response** — a caller asks for specific workers, gets a response back immediately. Event-driven automation is a different pattern: something happens, and zero or more subscribers react asynchronously, on their own schedule. These are complementary, not competing — a future event handler would likely *call* the orchestrator synchronously in response to an event, reusing the same workers and the same "shared intelligence layer instead of isolated logic" principle, rather than reimplementing worker logic inside an event handler.

## What would need to exist first

1. A real event source — at minimum, one subsystem genuinely emitting events (the most realistic candidate: a Supabase row change on `leads`/`tasks`/`activities`, since those are the only real tables).
2. A decision on transport — n8n (already scaffolded, currently unconfigured) vs. something else — this is a technology decision requiring its own evaluation, not assumed here.
3. Authentication (`docs/MASTER_ARCHITECTURE.md` §8) — so an event handler's actions can be attributed to something, the same prerequisite blocking most of Executive Intelligence.

## Integration point

Not applicable yet — there is no workflow-automation worker or module to point to. This document exists so the shape is agreed before any of it is built, per "documentation-first architecture."
