# Customer Lifecycle — Version 1.0 Status

The commercial journey this platform exists to support:

> Website enquiry → Lead → Qualified opportunity → Quote or tender → Signed contract → Supplier submission → Onboarding → First service check → Account management → Issue resolution → Renewal → Retention → Referral

Each stage below is reported honestly against what's actually in the codebase today — no stage is marked complete because a page exists for it if that page is demo data.

| Stage | Status | Detail |
|---|---|---|
| Website enquiry | **Partially implemented** | `/business-energy-quote` (public capture form) and `/leads/web/[ref]` (staff review workspace) are real and functional, but write to browser **local storage**, not Supabase — meaning captured enquiries are per-browser, not shared across the team until manually promoted to a real Lead. |
| Lead | **Fully implemented** | `/leads`, `/leads/[id]`, `/leads/new`, `/leads/[id]/edit` — real Supabase-backed CRUD, now behind authentication and RBAC, with audit logging on create/update. |
| Qualified opportunity | **Partially implemented** | "Qualified" exists as one value of the lead `status` field, and Commercial Energy Intelligence's Lead Quality Score gives a real, deterministic, evidence-based signal — but there's no structured qualification data (budget, consumption, decision-maker) beyond that single status label. |
| Quote or tender | **Not yet implemented** | `/quotes` is demo data (`lib/quotes/demo-data.ts`, labelled `DEMO_QUOTE_LABEL` in the UI). **This is an explicit Version 1.0 minimum requirement ("quote/tender status") that is not met today** — flagged as the largest remaining gap in the Final Report. |
| Signed contract | **Not yet implemented** | `/contracts` is demo data (`ContractCentreDashboard`, subtitle literally says "(demo)"). **Also an explicit Version 1.0 minimum ("signed-contract status") not met today.** The closest real signal is a lead's `status` reaching `"Won"` — a pipeline marker, not a contract record. |
| Supplier submission | **Not yet implemented** | No real supplier-submission tracking exists; `/suppliers` (Supplier Intelligence) is demo data. |
| Onboarding | **Partially implemented** | The Lead → Customer conversion is real and documented as a manual workflow in the schema migration (`20250727180000_customers_and_sites.sql`): insert a `customers` row linked via `source_lead_id`, insert a `sites` row, update the lead's status to Won, relink tasks/activities. `/customers/new` is real Supabase-backed. There is no dedicated "onboarding status" field or checklist UI — just the underlying data model and manual steps. |
| First service check | **Not yet implemented** | No concept of this exists anywhere in the schema or app. |
| Account management | **Partially implemented** | Customer 360 (`lib/customer-360`) gives a real customer detail view with linked activities and tasks; Commercial Energy Intelligence's Customer Health score is a real, deterministic signal. No dedicated account-manager assignment or relationship-health workflow beyond that. |
| Issue resolution | **Partially implemented** | "Complaint" exists as one selectable `activity_type` on the activity-logging form — capture is real. There is no issue/ticket entity, no open/resolved status, and no dedicated view filtering for unresolved issues. |
| Renewal | **Partially implemented** | The *intelligence* is fully real and live: Renewal Intelligence V1 (shipped), V2 (shadow-validated against V1), and the Gate 7 Enterprise Intelligence panel (flag-gated) all compute genuine urgency/days-remaining/tender-window signals on `/leads/[id]`. The *case-tracking workflow* — a renewals queue/pipeline UI — is demo data (`/renewals`, `DemoRenewalRecord`). |
| Retention | **Partially implemented** | Mission Control's Priority Actions (built this pass) surfaces real, evidence-based signals — overdue follow-ups, stale leads, renewals due — as prioritised nudges. No structured retention campaign or win-back workflow exists beyond that. |
| Referral | **Not yet implemented** | No referral-source field or referral-tracking concept exists anywhere. |

## Against the stated Version 1.0 minimums

| Minimum requirement | Met? |
|---|---|
| Lead capture | ✅ |
| Qualification | ⚠️ Status-based only |
| Follow-up activity | ✅ |
| Task management | ✅ |
| Quote/tender status | ❌ **Not met — demo data only** |
| Signed-contract status | ❌ **Not met — demo data only** |
| Onboarding status | ⚠️ Manual process exists, no explicit status field |
| Customer issue visibility | ⚠️ Loggable, no resolution tracking |
| Retention actions | ⚠️ Evidence-based nudges exist, no structured workflow |

Two of nine explicitly-required minimums — quote/tender status and signed-contract status — are not met. Both `/quotes` and `/contracts` are UI previews over fabricated data, not working features. This is stated plainly here because it directly affects the release decision in the Final Report: authentication, RBAC, RLS, and audit logging (this pass's focus) are real production security infrastructure, but the commercial workflow itself still has two real gaps against its own stated Direct Revenue objectives ("Quotation and tender workflow," "Contract signing").
