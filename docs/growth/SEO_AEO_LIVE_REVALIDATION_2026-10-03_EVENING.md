# SEO / AEO live revalidation — 3 October 2026 evening

Status: **draft / no publish / no production deployment**

## Newly confirmed live inconsistencies

### MPAN terminology

Live FEH pages are internally inconsistent:

- Homepage wording already describes an MPAN as a **13-digit number**.
- `/what-is-an-mpan` still calls the MPAN itself a **21-digit reference number** and tells users to look for a 21-digit number.
- `/understanding-business-energy-bills` repeats the same 21-digit description.

Correction rule:
- call the MPAN core/reference the **13-digit MPAN**;
- explain separately that many bills show a wider Supply Number / S-number layout containing additional data around that core;
- do not call the whole wider display the MPAN itself.

Authoritative reference:
- Elexon current terminology describes MPAN as a 13-digit reference.

### Renewal terminology

`/business-energy-contract-renewal` remains live with a phone placeholder `01332 000000` in the form, while the same page displays `01332 605506` as FEH's actual telephone number elsewhere.

Ofgem separates:
- rolling / evergreen arrangements;
- out-of-contract rates;
- deemed rates.

Do not use “deemed” as a generic synonym for every out-of-contract position.

A second FEH route, `/business-energy-contract-renewal-review`, is currently indexed with the correct `01332 605506` telephone example. Before any public change, decide which route is canonical and avoid duplicate-intent pages.

### Health Check claims

Re-check and remove or narrow any unsupported market-wide statements beginning “Most UK…” unless a current authoritative source directly supports the precise claim.

### Phone placeholders beyond renewal

Search indexing also shows `01332 000000` as a phone placeholder on other commercial pages, including sector/supplier forms. Treat this as a site-wide QA pattern rather than a single-page defect.

## Public-site source gate

The connected Vercel workspace still does **not** prove it is the source serving the public marketing website.

Do not edit or deploy a guessed project.

Before implementation, prove the serving source using at least two independent checks:
1. domain / project binding or equivalent host/CMS ownership evidence;
2. source text or preview output that matches a current live page.

## Preview-only acceptance checks

1. MPAN wording is consistent across the homepage, MPAN page, bill guide, FAQs and structured data.
2. MPRN wording remains six-to-ten digits unless a stronger official source requires narrower phrasing.
3. Renewal wording distinguishes evergreen/rolling, out-of-contract and deemed.
4. No visible form uses `01332 000000`.
5. Canonical route is chosen between renewal and renewal-review pages; duplicates redirect/canonicalise deliberately.
6. FAQ JSON-LD matches visible FAQ copy exactly.
7. Claims with prevalence words such as “most”, “usually”, “typically” or percentages have a cited evidence basis or are rewritten.
8. Internal links point to the chosen canonical renewal and MPAN/MPRN guides.
9. Preview passes mobile, metadata, schema and broken-link checks.
10. No production publish until explicit approval.
