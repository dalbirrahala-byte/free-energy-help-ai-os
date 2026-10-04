# Public MPAN / Renewal Live QA Delta — 2026-10-04

Status: draft-only correction handoff; do not publish until the real public-site source/CMS is identified and previewed.

## Fresh live observations

### MPAN page

The dedicated MPAN guide currently opens by calling the MPAN a 21-digit reference and later labels the 21-digit display "full MPAN". Elsewhere on the same page it correctly refers to the 13-digit core.

Current Elexon Digital BSC terminology defines Meter Point Administration Number (MPAN) as a 13-digit reference used to identify electricity supply points.

Recommended public wording:
- "The MPAN is the 13-digit core identifier for an electricity supply point."
- "On many bills it appears within a larger Supply Number block that also contains profile class, time-switch and line-loss information."

Avoid calling the whole 21-digit bill display the MPAN without qualification.

### Understanding-business-energy-bills page

A separate live QA issue exists: the page says the first two digits of the bottom line indicate Profile Class. That is incorrect. The bottom-line 13-digit core begins with the Distributor ID. Profile Class belongs in the upper part of the Supply Number display.

The same page also says Profile Classes 05–08 indicate a half-hourly site. That should be removed or revalidated before publication because the current market-wide half-hourly settlement transition makes historic profile-class shorthand unsafe as a present-tense rule.

### Renewal page

The page currently says an expired fixed contract moves to an "out-of-contract (deemed) rate". Current Ofgem guidance lists rolling/evergreen, out-of-contract and deemed-rate arrangements separately.

Recommended wording:
- "If a fixed contract ends without a new agreement, the account may move onto an out-of-contract or other variable arrangement depending on the supplier and contract terms."
- "A deemed contract normally arises where energy is supplied without a negotiated contract, for example after moving into premises, although deemed treatment can also arise in some end-of-contract circumstances."

Do not present deemed and out-of-contract as universal synonyms.

### Health Check page

Remove unsupported prevalence claims such as:
- "Most UK business energy contracts auto-renew at uncompetitive rates."
- "Most UK businesses are on the wrong tariff..."

Replace with a factual benefit statement:
- "A contract and bill review can help identify renewal dates, tariff status, billing issues and avoidable charges."

## Release QA

Before publication:
- confirm the actual serving source/CMS;
- preview every changed route;
- keep visible FAQ text and JSON-LD FAQ content identical;
- verify canonical URLs;
- verify internal links;
- verify telephone numbers;
- verify no unsupported market-wide prevalence claim remains;
- verify MPAN/MPRN wording against current primary/industry sources.

Primary references used for this handoff:
- Elexon Digital BSC, DSD007 DIP Glossary — MPAN 13-digit definition.
- Ofgem, Switch your business energy supplier / Get a business energy contract — separate rolling/evergreen, out-of-contract and deemed arrangements.
