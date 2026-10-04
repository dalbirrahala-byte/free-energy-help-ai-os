# FEH SEO/AEO — Media Centre QA Gate
Date: 4 October 2026
Status: PREVIEW / DOCUMENTATION ONLY — NO PUBLICATION

## Finding

The live FEH Media Centre currently lists five news/press-release cards whose linked detail routes return the site's 404 page:

1. `/media-centre/authority-hub-launch`
2. `/media-centre/sme-renewal-market-commentary`
3. `/media-centre/regional-expansion`
4. `/media-centre/pr-resource-hub-launch`
5. `/media-centre/pr-health-check-demand`

The listing page itself is live at:
https://www.freeenergyhelp.co.uk/media-centre

The Press Centre is live at:
https://www.freeenergyhelp.co.uk/press

## Why this matters

- Broken editorial links reduce trust for journalists, prospective partners and AI/search crawlers.
- Adding a Quantum Lab press release before repairing these links would compound the credibility problem.
- One existing headline ("reports growing demand for independent energy health checks") should not be retained unless FEH has evidence supporting that demand claim.

## Safe release order

1. Identify the actual source/CMS serving the public site.
2. Repair or remove the five broken Media Centre links in preview.
3. Reconcile any unsupported demand/growth claims with evidence or rewrite them factually.
4. Verify 200 responses, title/H1, canonical, structured data and internal links.
5. Only then stage the Quantum Lab release and Lab-page links in preview.
6. Obtain explicit human approval before production publication.

## Evidence-safe Quantum placement

When the Quantum Lab assets are eventually staged, link the Lab page from:
- Media Centre
- Press Centre
- relevant Technology / Innovation or Research section if one exists

Do not imply IBM endorsement, quantum advantage, customer savings or production readiness.
