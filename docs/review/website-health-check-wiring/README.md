# Health Check draft route wiring

This package targets the route and form anchors in the Airo source excerpt for draft `8bf854b`. The full editable Airo files and deployed build identity are pending. This repository stores the routing change for review.

Apply the named `verifiedEnquiry` handler and business-answer store from the sibling `website-enquiry-intake` archive to the editable Airo draft. Use the receiver and sender pinned to the approved parent of this change. The candidate keeps CRM transport disabled in the draft. The handler is designed to preserve the owner notification and visitor acknowledgement and hold duplicate or uncertain references.

- In `src/server/entry.ts`, preserve `POST /api/quote` and add `POST /api/health-check/quote` bound to `verifiedEnquiry` from the quote handler.
- In `src/pages/business-energy-health-check.tsx`, change that form's fetch URL to `/api/health-check/quote`. Preserve its request body, UUID, confirmation handling and optional SMS choice.
- Keep `postcode`, `energyType`, `contractEnd` and `annualSpend` in the existing `businessAnswers` projection. The candidate's `business_answers` column is a website schema prerequisite. Review its presence and compatibility on the actual draft schema. Use disposable data for regression checks.
- Apply these changes to the unpublished draft. Return the exact source SHAs and changed files for independent review. Runtime receiver approval and a scoped readback of an existing synthetic reference are separate gates.

The exported `wireHealthCheck(entry, healthCheckForm)` applies the two routing edits to source strings and refuses missing, duplicate or already-wired anchors. It leaves the browser payload untouched. Run the fixture in Linux with Node 24, Python and libseccomp.

```sh
python3 docs/review/website-enquiry-intake/tests/deny-network.py "$(command -v node)" docs/review/website-health-check-wiring/wire-health-check.test.mjs
```
