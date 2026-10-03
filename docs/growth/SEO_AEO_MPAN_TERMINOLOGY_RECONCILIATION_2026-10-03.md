# FEH SEO/AEO — MPAN terminology reconciliation and public-page correction gate
Date: 3 October 2026
Status: INTERNAL / DRAFT ONLY / NO PUBLICATION

## Why this correction needs nuance

Current public industry usage is inconsistent:
- some network/supplier guidance calls the **13-digit core** the MPAN;
- some supplier guidance calls the full bill display a **21-digit MPAN / supply number**, with the last 13 digits used as the core identifier.

Therefore the FEH correction should not simply replace every "21-digit" reference with "13-digit".

## Recommended controlled wording

Use:

> An MPAN (Meter Point Administration Number) identifies an electricity supply point. In day-to-day switching and account administration, the **13-digit MPAN core** is the key unique identifier. On many electricity bills it appears inside a wider **21-digit Supply Number display** that also includes top-line metering/profile information.

Then add:

> If a supplier, DNO, broker or form asks for your MPAN, check whether it wants the 13-digit core or the full Supply Number display.

This avoids creating a new factual error while resolving the site's current inconsistency.

## Current FEH pages requiring harmonisation

1. /what-is-an-mpan
   - currently opens by calling the MPAN itself a unique 21-digit reference;
   - later calls the 13-digit core the most commonly referenced part;
   - should be rewritten around the distinction above.

2. /understanding-business-energy-bills
   - currently states MPAN is a unique 21-digit reference;
   - should use the same 13-digit-core / 21-digit-display distinction.

3. /resources/mpan-mprn-guide
   - currently states MPAN is a 21-digit number;
   - should use the same distinction and link to the main MPAN explainer.

4. homepage / knowledge-centre snippets
   - audit for any 13-digit-only wording and make sure it does not contradict the dedicated guide.

## Current MPRN position

The dedicated FEH MPRN page currently says an MPRN is typically 6–10 digits and identifies the gas supply point. That wording is broadly suitable.

Do not copy electricity MPAN structure language onto the MPRN page.

## Renewal correction remains separate and mandatory

Current FEH renewal copy says:
> If your contract expires without renewal or rollover, you will move onto your supplier's out-of-contract (deemed) rate.

Ofgem currently distinguishes:
- rolling / evergreen contracts;
- out-of-contract rates;
- deemed-rate contracts.

Recommended wording:

> If a fixed-term business energy contract ends without a new agreement, the supplier may place the account on out-of-contract rates, depending on the contract and supplier arrangements. A deemed-rate contract is a separate arrangement that commonly applies when a business moves into premises and uses energy before agreeing a contract, and can also arise in other specific circumstances.

Do not collapse out-of-contract and deemed rates into one label.

## Health Check claim correction

Remove or rewrite unsupported prevalence claims such as:
- "Most UK business energy contracts auto-renew at uncompetitive rates."
- "Most UK businesses are on the wrong tariff, in a rolled-over contract, or paying avoidable charges."

Safer replacement:

> Some businesses can end up on rollover, out-of-contract or otherwise unsuitable arrangements if contract dates and terms are not reviewed in time. The Health Check is designed to identify the position of the individual business rather than assume there is a problem.

## Publication/source gate

Do not edit production until:
1. the actual serving source/CMS for freeenergyhelp.co.uk is proven;
2. the exact page source is under FEH control;
3. preview output matches the intended correction;
4. visible FAQ text and structured data agree;
5. canonical URLs are checked;
6. phone number and CTA links are checked;
7. human production approval is given.

## Evidence used for this reconciliation

Current live FEH pages:
- https://www.freeenergyhelp.co.uk/what-is-an-mpan
- https://www.freeenergyhelp.co.uk/understanding-business-energy-bills
- https://www.freeenergyhelp.co.uk/resources/mpan-mprn-guide
- https://www.freeenergyhelp.co.uk/what-is-an-mprn
- https://www.freeenergyhelp.co.uk/business-energy-contract-renewal
- https://www.freeenergyhelp.co.uk/free-business-energy-health-check

Current public industry guidance checked:
- Ofgem business contract guidance distinguishes deemed, out-of-contract and rollover/evergreen arrangements.
- UK Power Networks describes the MPAN as a unique 13-digit number.
- British Gas Business describes the bill MPAN / Supply Number as usually 21 digits and says it normally needs the last 13 digits.
- Octopus Energy explicitly distinguishes the 21-character grid from the 13-digit core.

No public-site edit or deployment is authorised by this document.
