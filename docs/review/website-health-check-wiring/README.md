# Health Check draft route wiring

This package targets the route and form anchors in the Airo source excerpt for draft `8bf854b`. The full editable Airo files and deployed build identity are pending. This repository stores the routing change for review.

Generate the dedicated backend files from this commit in a disposable checkout for source review.

```sh
python3 docs/review/website-health-check-wiring/backend-patch.py > feh-health-check.patch
git -C /path/to/disposable-airo-checkout apply --check "$PWD/feh-health-check.patch"
```

The generated patch contains new files only. Inspect it alongside the complete editable draft. It retains the existing shared quote handler, store and schema. The dedicated handler has a separate store and table mapping, uses the existing website database client and email adapter, and imports the archived disabled CRM handoff. No website schema migration is included. Confirm the physical website table supports the new mapping before release. Reconcile any path collision before applying a patch in a disposable draft. The archived and published website revisions may differ.

- In `src/server/entry.ts`, preserve `POST /api/quote` and add `POST /api/health-check/quote` bound to `verifiedEnquiry` from the new `./api/health-check/POST` module.
- In `src/pages/business-energy-health-check.tsx`, change that form's fetch URL to `/api/health-check/quote`. Preserve its request body, UUID, confirmation handling and optional SMS choice.
- Keep `postcode`, `energyType`, `contractEnd` and `annualSpend` in the existing `businessAnswers` projection. The candidate's `business_answers` column is a website schema prerequisite. Review its presence and compatibility on the actual draft schema. Use disposable data for regression checks.
- Apply these changes to the unpublished draft. Return the exact source SHAs and changed files for independent review. Runtime receiver approval and a scoped readback of an existing synthetic reference are separate gates.

The exported `wireHealthCheck(entry, healthCheckForm)` applies the two routing edits to source strings and refuses missing, duplicate or already-wired anchors. It leaves the browser payload untouched. Run the fixture in Linux with Node 24, Python and libseccomp.

```sh
python3 docs/review/website-enquiry-intake/tests/deny-network.py "$(command -v node)" docs/review/website-health-check-wiring/wire-health-check.test.mjs
```

## Check the editable draft before changing its route

Run the read-only preflight on the complete, unwired Airo draft files at a recorded commit. It parses the TypeScript source and tries the route edit in memory. Use this entry point to check the request mapping before applying the route change. It writes no files and never imports the website application. Supply an already-installed TypeScript compiler.

```sh
python3 docs/review/website-enquiry-intake/tests/deny-network.py "$(command -v node)" \
  docs/review/website-health-check-wiring/preflight.mjs \
  /absolute/path/to/typescript/lib/typescript.js \
  /absolute/path/to/airo/src/server/entry.ts \
  /absolute/path/to/airo/src/pages/business-energy-health-check.tsx
```

The check recognises the reported draft's direct form construction. It looks for the UUID generator, SMS state, four named form controls, and the dedicated POST serialising that body. A different implementation needs source review. A pass establishes the checked syntax only. Use the rendered form and isolated handler integration tests to confirm actual control values, saved answers and email behaviour. The hosted CRM check has its own approval and reserved reference.

Run `sh docs/review/website-health-check-wiring/test-backend.sh` from the review commit for the isolated two-route rehearsal. It applies and reverses the add-only patch in a temporary checkout. It uses the archived quote handler, mock website database and email adapters. For a draft rollback, restore the recorded route and form versions together before removing the additive modules. Retain saved rows and outstanding references. Keep CRM transport disabled during draft checks.

The earlier seven-case combined integration fixture models the two routes with named exports from a single test bundle. Use its signed receiver evidence at the recorded revision. The separate-backend rehearsal above resolves both new module paths and exercises the disabled binding. The actual Airo build and private staging receiver still need verification.

## Keep one reference for the Health Check form

The route-only comparison covers the fetch URL and four field mappings. For the editable Airo draft, use the archived `submitHealthCheckQuote(body, dependencies)` browser helper in the Health Check submit handler. Keep the existing form validation and body fields, including `source: 'health-check-form'`. Give the helper the tab’s session storage, UUID generator and same-origin POST transport. It owns reference allocation and posts to the dedicated handler. Read `readHealthCheckAttempt(storage)` on mount. Show the stored reference for a held or saved enquiry. Treat a held result as requiring reconciliation and an unavailable result as blocked. A saved result confirms the website receipt. The CRM delivery state has its own receipt.

Verify the actual draft component with two overlapping events and a same-tab reload after a lost reply. Check that the owner notification and visitor acknowledgement each run once and that the four answers reach the same CRM reference. For a rollback, restore the previous form and route together and retain all held references for read-only reconciliation.
