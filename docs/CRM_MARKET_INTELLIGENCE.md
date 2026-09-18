# FEH CRM Revenue + Market Intelligence — Phase 1

## Purpose

This phase converts manually observed UK small-business energy language into a deterministic CRM vocabulary layer.

It does **not** connect to Reddit, scrape Reddit, score people from social data, or automate outreach.

## Source

Manual FEH research session, 18 September 2026, reviewing public UK small-business discussions about:

- broker trust and hidden commission concerns;
- contract authority / lock-in concerns;
- renewal and quote competitiveness;
- half-hourly / three-phase / kVA complexity;
- unwanted energy cold calling;
- green tariff / REGO / carbon-reporting questions;
- multi-site renewal complexity.

The code stores only a reusable vocabulary/taxonomy. It does not store usernames, post text, URLs or personal data.

## CRM behaviour

`classifyBusinessEnergyMarketSignals()` reads text that is already on an FEH lead record (initially notes and source detail) and returns zero or more transparent signal objects.

Each signal carries:

- a human-readable label;
- severity;
- the exact vocabulary term that matched;
- a CRM capture prompt;
- a suggested revenue action;
- a Social Autopilot content theme for later use.

The classifier is deterministic substring matching. It makes no predictions and invents no customer facts.

## Safety / contact rule

`contact_preference` is intentionally critical. Language such as "do not call", "cold calling", "bombarded" or "barrage of calls" must never become an automation trigger. Its revenue action explicitly says **Do not auto-contact** and requires permission-based follow-up.

## Scope

Phase 1 is deliberately additive and schema-free:

- no Supabase migration;
- no change to qualification scoring;
- no outbound adapter;
- no Apollo write;
- no Reddit API;
- no Social Autopilot publishing;
- no MPAN/MPRN metering-library expansion.

A later approved phase can persist structured signal tags or expose them to Apollo/Growers/Social Autopilot after the data model and consent/suppression controls are agreed.
