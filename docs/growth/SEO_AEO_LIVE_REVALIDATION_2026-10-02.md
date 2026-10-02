# FEH SEO/AEO — live revalidation 2026-10-02

Status: INTERNAL / DRAFT / PREVIEW-ONLY. No publication authority.

## Live issues revalidated

1. `/what-is-an-mpan` still describes the MPAN itself as a 21-digit reference and later calls the 21-digit presentation the full MPAN.
2. `/understanding-business-energy-bills` still describes MPAN as a 21-digit reference and incorrectly states that the first two digits of the 13-digit bottom line are Profile Class.
3. `/resources/mpan-mprn-guide` still says an MPAN is 21 digits.
4. `/incorrect-business-energy-bill` still says MPAN is 21 digits and appears on the meter itself.
5. The homepage already gives the cleaner direct answer: MPAN = 13 digits; MPRN = 6–10 digits.
6. `/free-business-energy-health-check` still contains unsupported market-prevalence wording beginning “Most UK...”.
7. `/business-energy-contract-renewal` still exposes `01332 000000` in the booking CTA and phone field.

## Evidence boundary

- Elexon should be treated as the primary terminology source for the MPAN Core: the identifier is 13 digits; the wider traditional Supply Number display can include additional technical fields around that core.
- Xoserve remains the primary terminology source for MPRN: six to 10 digits and a supply-point identifier rather than a physical meter identifier.
- Ofgem separates rolling/evergreen arrangements, out-of-contract rates and deemed-rate contracts. Renewal copy must not collapse those into a single state.

## Exact preview changes required

### MPAN family
Use this direct answer consistently:

> An MPAN (Meter Point Administration Number) is the 13-digit identifier for an electricity supply point in Great Britain. On many bills it appears as the lower line of the wider Supply Number box. Additional fields such as Profile Class, Meter Time Switch Code and Line Loss Factor Class may appear around it, but they are not part of the 13-digit MPAN Core.

Remove any claim that the MPAN itself is 21 digits. If describing the familiar 21-digit bill presentation, label it the wider/traditional Supply Number presentation, not the MPAN Core.

### MPRN
Retain the current six-to-10-digit supply-point explanation. Do not state that the MPRN is always printed on the physical meter.

### Health Check
Remove both unsupported prevalence statements beginning “Most UK...”. Replace with customer-specific review wording that does not imply a quantified market-wide problem without a cited source.

### Renewal
Replace FEH-owned phone placeholders with the verified FEH number already used elsewhere on the site. Keep rolling/evergreen, out-of-contract and deemed arrangements distinct in all direct answers and FAQs.

## Acceptance gate before any publication request

- no page says the MPAN itself is 21 digits;
- no page places Profile Class inside the 13-digit MPAN Core;
- no page says MPAN appears on the physical meter as a general rule;
- MPRN remains six to 10 digits and supply-point based;
- no `01332 000000` FEH phone placeholder remains;
- unsupported “Most UK...” claims are absent;
- visible FAQs and JSON-LD answers match;
- canonical/internal links resolve in preview;
- Health Check CTA remains no-obligation and avoids guaranteed-savings language;
- publication, deployment and paid-campaign activation remain separate human gates.
