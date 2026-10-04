# SEO/AEO live factual revalidation — 4 October 2026

Status: internal preview evidence only. No production change.

Fresh checks against current public pages confirm the correction work remains necessary.

## Renewal terminology

Ofgem currently treats rolling/evergreen, out-of-contract and deemed-rate arrangements as separate possible states after or outside fixed contracts. Ofgem also states that a deemed-rate contract commonly applies when a business moves into premises and uses energy before arranging a formal contract, and may also apply after a supplier failure.

The current FEH renewal page still says an expired contract moves to an "out-of-contract (deemed) rate", which conflates distinct concepts. Other FEH supplier/sector pages also use "out-of-contract or deemed" as if interchangeable. Those pages should be queued for a later factual sweep after the main renewal correction.

Authoritative references:
- https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/get-business-energy-contract
- https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/switch-your-business-energy-supplier

## MPAN

National Grid currently describes the MPAN number as the 13-digit number along the bottom line on the supply bill.

The live FEH pages /what-is-an-mpan, /understanding-business-energy-bills and /resources/mpan-mprn-guide currently describe the MPAN itself as a 21-digit number. The correction should define the 13-digit MPAN core separately from the wider traditional Supply Number / S-number display.

Authoritative reference:
- https://connections.nationalgrid.co.uk/changing-your-electricity-load

## MPRN

Xoserve currently states that an MPRN is a unique number relating to a site and that the six- to 10-digit number appears on every gas bill in Britain.

Authoritative reference:
- https://umbraco.xoserve.com/a-to-z/

## Health Check claims

The live FEH Health Check page currently contains broad prevalence claims including "Most UK business energy contracts auto-renew at uncompetitive rates" and "Most UK businesses are on the wrong tariff...". These should remain in the correction queue until a current authoritative source and defined population support them; otherwise replace them with customer-specific factual wording.

## Release gate

Apply only in the verified serving source/CMS, on a preview branch. Before publication: repository/site text search for old terminology, structured-data parity, internal-link QA, phone-number QA, preview form test and explicit production approval.
