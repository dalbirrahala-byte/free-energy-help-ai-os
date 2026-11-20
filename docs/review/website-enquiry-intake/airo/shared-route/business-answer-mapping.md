# Business enquiry answers

Source-only candidate for the 19 business enquiry forms in website asset `index--Ymz5FHJ.js` (SHA-256 `6346d0755a91d04a4ab4b99e07d92b90b5ecd3789e0922efa0adcb7809393b88`). The website store currently drops these answers before constructing its CRM payload. The sender/receiver fixture supplies them explicitly to test the receiving side.

| Website field | Forms | CRM lead detail destination | Meaning retained |
| --- | ---: | --- | --- |
| `contractEndDate` | 18 | Notes → businessAnswers.contractEndDate | Visitor's date text, including approximate dates |
| `postcode` | 17 | Notes → businessAnswers.postcode | Business or site postcode as labelled on the form |
| `annualUsage` | 1 | Notes → businessAnswers.annualUsage | Estimated annual **gas** usage band in kWh, using the submitted option value |
| `industry` | 1 | Notes → businessAnswers.industry | Selected sector |
| `annualElectricity` | 4 | Notes → businessAnswers.annualElectricity | Visitor's annual electricity usage text in kWh |
| `annualGas` | 4 | Notes → businessAnswers.annualGas | Visitor's annual gas usage text in kWh |
| `sites` | 4 | Notes → businessAnswers.sites | Selected number or range of sites |

The candidate renders these values through the existing Notes field. Free text, ranges and approximate dates stay as supplied. A future writer must omit unanswered fields and omit the entire object when none were answered. Each supplied value must fit 1–255 Unicode characters and the complete signed request must fit the existing 32 KiB cap. A writer must handle validation before acknowledging that the answer was saved. Free-text message, consent, routing and typed CRM dates have separate meanings.

The client form adapter also maps each static form tag to its router path. Four industry pages include `-for-` in the URL. The native website fixture resolves the route's component in the pinned bundle, finds its form and compares that route to the website's stored and projected path. The shared route remains CRM-excluded.

## Local verification

From the repository root with the pinned public bundle available as `$asset`, local frontend test dependencies, and the archive's verified MySQL runtime available as `$mysqlroot`:

```sh
archive=docs/review/website-enquiry-intake
python3 "$archive/tests/deny-network.py" "$(command -v node)" "$archive/tests/business-answers.mjs" "$asset"
sh "$archive/airo/shared-route/run-native-purpose.sh" "$archive" "$mysqlroot" "$asset"
```

The first command exercises the authenticated sender and receiver in process, applies 63 pinned migrations to in-memory PGlite and renders the CRM lead detail source using local reads. The second checks website persistence, route attribution and mock email delivery on disposable native MySQL. For native PostgreSQL concurrency, ACL and crash recovery use the archive instructions in `tests/native/README.md`. The contention case changes only the reported site-count band on a shared reference.

## Release and rollback dependency

Before release review, the integration engineer must update and verify website persistence and reconstruction of the signed payload, including missing, partial and oversize answers and both email outcomes. The website must retain a complete enquiry and its reference before reporting it saved. A shared-route website receipt alone establishes only the website save.

The release owner must identify the running schema and reviewed receiver revision before enabling a sender that supplies the optional member. The archived create-from-empty SQL cannot serve as an in-place update. A reviewed, separately authorised migration is needed if that function already exists at the approved destination. For rollback, close the CRM handoff first, preserve the website save and email path, and retain all rows, original answer text and uncertain references. Keep the receiver able to read both shapes while outstanding references are reconciled under scoped read access.
