# Utility Intent Radar — blocked implementation delta

DRAFT / REVIEW-ONLY — 2 October 2026

## Purpose
Record the exact remaining source-separation delta after the existing-source write path was blocked. This document does not grant network, CRM, Apollo or outreach authority.

## Required code change
In `frontend/src/lib/lead-discovery/utilityIntentRadar.ts`:

- `COMPANY_NEWSROOM`: `ONLINE_DIRECT` -> `PUBLIC_WEB_SIGNAL`
- `COMMERCIAL_PROPERTY`: `ONLINE_DIRECT` -> `PUBLIC_WEB_SIGNAL`
- `TRADE_LOCAL_PRESS`: `ONLINE_DIRECT` -> `PUBLIC_WEB_SIGNAL`
- provenance validation must treat only `PUBLIC_WEB_SIGNAL` as `PUBLIC_WEB`; official adapters remain `PUBLIC_OFFICIAL`.

## Required regression proof
In `utilityIntentRadar.test.ts`:

1. The synthetic newsroom fixture uses `PUBLIC_WEB_SIGNAL`.
2. Adapter provenance selection uses `PUBLIC_WEB_SIGNAL ? PUBLIC_WEB : PUBLIC_OFFICIAL`.
3. Add a cross-boundary test where a newsroom signal is confidence 100 and strength STRONG and assert:
   - source = `PUBLIC_WEB_SIGNAL`
   - provenance = `PUBLIC_WEB`
   - evidence basis remains `INFERENCE`
   - sourceVerified = false
   - Apollo enrichment = false
   - CRM write = false
   - outreach = false
   - downstream `assessIntentRadarSignal` returns `REVIEW_ONLY`
   - strongVerifiedTrigger = false

## Fail-closed boundary
No public-web signal, regardless of confidence or commercial attractiveness, may independently create contact permission, promote a CRM lead, spend Apollo credits, enroll a sequence or send outreach.

## Verification after authorised implementation
Run the focused Utility Intent Radar tests, then the relevant lead-discovery suite. Confirm the branch only contains the intended source/provenance/test changes and remains unmerged/unpublished.
