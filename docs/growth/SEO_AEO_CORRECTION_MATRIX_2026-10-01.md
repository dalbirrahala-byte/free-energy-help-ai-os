# FEH SEO/AEO factual correction matrix — 1 October 2026

**DRAFT / PREVIEW ONLY — DO NOT PUBLISH FROM THIS DOCUMENT**

## Priority 1 — MPAN terminology consistency

Affected pages:
- /what-is-an-mpan
- /understanding-business-energy-bills
- /resources/mpan-mprn-guide
- /incorrect-business-energy-bill

Current issue:
Several pages call the MPAN itself a 21-digit number. The website homepage already describes the MPAN as a 13-digit identifier, so FEH is internally inconsistent.

Required wording model:
- Define the **MPAN Core** as the 13-digit identifier for the electricity supply point.
- Explain separately that older/traditional Supply Number presentations can show an additional top line of technical fields (Profile Class, Meter Time Switch Code and Line Loss Factor) around the 13-digit core.
- Do not describe Profile Class as part of the 13-digit core.
- Do not state that an MPAN appears on the physical meter; the meter serial number is a different identifier.

Evidence:
- Elexon / BSC guidance on MPAN Core structure: https://www.elexon.co.uk/
- FEH homepage currently uses the 13-digit definition, so the internal site should converge on that terminology.

Acceptance checks:
1. Search repository for `21-digit` and inspect every MPAN occurrence.
2. Search repository for claims that the MPAN appears "on the meter".
3. Confirm the structured example distinguishes top-line technical fields from the 13-digit core.
4. Confirm no page contradicts the homepage.

## Priority 2 — renewal / deemed / out-of-contract distinction

Affected page:
- /business-energy-contract-renewal-review

Required wording model:
- Treat rolling/evergreen, out-of-contract and deemed-rate arrangements as distinct possible states.
- Explain that the customer's actual position depends on the contract and circumstances.
- Do not write "out-of-contract (deemed)" as though the terms are interchangeable.
- Preserve the general-information disclaimer.

Evidence:
- Ofgem business switching guidance: https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/switch-your-business-energy-supplier
- Ofgem business-contract guidance: https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/get-business-energy-contract

Acceptance checks:
1. No conflation of deemed and out-of-contract terminology.
2. Telephone number is consistently `01332 605506`.
3. No placeholder `01332 000000` remains on the page.
4. Seven-step "Where do I start?" section and Health Check CTA remain internally consistent.

## Priority 3 — Health Check unsupported prevalence claims

Affected pages:
- /free-business-energy-health-check
- /business-energy-health-check

Current claims to remove or qualify:
- "Most UK business energy contracts auto-renew at uncompetitive rates."
- "Most UK businesses are on the wrong tariff, in a rolled-over contract, or paying avoidable charges."

Replacement approach:
Use customer-specific, non-prevalence wording, for example:
"Business energy contract terms, renewal arrangements and charges vary. A Health Check reviews your current position so you can see what applies to your business."

Acceptance checks:
1. No unsupported "Most UK..." prevalence statement remains.
2. No savings guarantee or implied universal overpayment.
3. CTA remains factual: free review, no obligation, commercial customers only.
4. Any turnaround statement is operationally supportable.

## Priority 4 — MPRN consistency

Affected pages:
- /what-is-an-mprn
- /resources/mpan-mprn-guide

Current position:
The 6–10 digit description is consistent with Xoserve.

Evidence:
- Xoserve A–Z, Meter Point Reference Number: https://xoserve.com/a-to-z/

Acceptance checks:
1. Keep 6–10 digit wording.
2. Keep supply-point vs physical-meter distinction.
3. Avoid implying every network/process uses identical customer-facing lookup steps.

## Preview verification sequence

1. Apply changes on the SEO/AEO feature branch only.
2. Run repository text searches for the old claims and placeholder phone number.
3. Run unit/type/build checks.
4. Inspect preview rendering and schema/FAQ parity.
5. Verify canonical URLs and internal links.
6. Do not merge or publish without explicit approval.
