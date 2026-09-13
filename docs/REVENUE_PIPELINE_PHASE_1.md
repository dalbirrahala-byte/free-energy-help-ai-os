# FEH Revenue Pipeline — Phase 1

## Objective

Make Mission Control answer one commercial question first: **what needs attention today to move revenue forward?**

The target queue combines real CRM evidence only: lead status, ownership, next action, follow-up date/requirement, source attribution, supplier/contract-end context, and direct navigation to the lead. It must not manufacture forecasts, values, owners, or activity.

## Construction completed on branch

- Added `lib/dashboard/revenueActions.ts`, a pure deterministic builder for Today's Revenue Actions.
- Added focused node tests covering overdue/today/attention/new priority, Won/Lost exclusion, source/campaign attribution, owner/default behaviour, renewal context, direct lead links, and deterministic queue limits.
- Added an additive optional `revenueActions` field to the Mission Control data contract. It remains optional until the live query adapter is schema-verified.

## Safety boundary

The production-verified MFA/authentication implementation is out of scope. Phase 1 must not alter auth middleware, MFA enrollment/challenge, Supabase auth settings, production credentials, or production deployment.

## Live-query integration gate

The repository contains `20260831120000_health_check_crm_persistence.sql`, which defines `lead_owner`, `next_action`, `follow_up_required`, and `follow_up_date`, but its header still says local construction only / not applied. Mission Control must not start selecting those columns until the target database schema is verified. The UI contract is therefore additive and backward-compatible for this batch.

Once schema verification confirms the fields exist, wire the adapter to:

1. load open leads and latest activity dates;
2. map canonical attribution (`lead_source`, campaign/source detail);
3. map supplier and contract end where present;
4. call `buildRevenueActions` using Mission Control's existing 14-day follow-up threshold;
5. render the queue above lower-priority dashboard sections with direct `/leads/:id` navigation.

## Social-to-revenue alignment

Social content should use the same attribution model already present in FEH: channel in `lead_source`, entry point in `source_detail`, and campaign in UTM/campaign fields. The commercial CTA should be the Free Business Energy Health Check rather than generic engagement. Social success should ultimately be measured as click/enquiry -> lead -> opportunity -> contract/revenue, not reactions alone.

No publishing, ad spend, production merge, or deployment is authorised by this phase document.
