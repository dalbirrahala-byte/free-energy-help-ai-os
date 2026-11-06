# Google staging deployment and boundary tests — 2 November 2026

Owner request `8fcc134a-80d2-4bd1-89d6-b0ef34d26725` explicitly approved deploying and testing `feh-google-lead-intake` in staging. **PASS: deployment, source match, closed-state and rejection checks. BLOCKED: successful Google form submission/replay until its private connection key can be entered securely.** This is not a permanent Google-to-SMS acceptance result.

## Baseline and deployed artifact

Preflight: clean local `e7b0a78bf5e69e621799b08d42929c60784a4428`, remote `38f553f921cdd549e26cdd04613d109ee97bd026`, matching tree `65b09e5396b6bce1627889438558a39ee6a9ea6e`. Root/frontend AGENTS and the previously reviewed nine-file artifact remain applicable. No concurrent source change was found.

- Exact reviewed artifact regenerated with SHA-256 `442b3dd361fab5f490ccc785322861ceb17c7b0a0f57515874ea23ce3487ce35`.
- Installed only in Supabase staging `vredwhyphrhsudggrsen`, function `feh-google-lead-intake`, ID `ba5b9c42-952b-4711-814c-7a9aa700815a`.
- Code version **1**, final configuration version **3**, platform bundle `9b9ae80dbc728a174c94e048db7f674b13212fee281c323d5642a608d8f8d0bb`. All nine fetched deployed source files exactly matched the generated artifact.
- Platform JWT verification is off as explicitly approved; the handler requires its own private Google key, fixed staging/form/campaign and owner-test scope. No worker or provider transport is exposed.
- Existing `feh-staging-lead-intake` source remains code v16 and bundle `0149447052fa48ce0bc78f7509351d88f86c485bf41e9d312e9ff731e2e6594c`. Supabase propagated project-secret refreshes to its configuration version **22**; its intake switch stayed false and its code was not redeployed.

## Bounded hosted test

Initial GET/POST checks each returned **404** while the new switches were absent. In staging only, saved `FEH_GOOGLE_RECEIVER_SCOPE=owner-test` and temporarily `FEH_GOOGLE_RECEIVER_ENABLED=true` at **13:47:22 UTC**. The existing private key, exact form/campaign, allowed phone, database credentials and legacy intake/Meta switches were not replaced.

| Hosted request | Observed response |
| --- | --- |
| POST with deliberately invalid synthetic key | 403 |
| POST with missing key | 403 |
| GET on receiver | 405 |
| POST to extra/unexposed path | 404 |
| POST with browser Origin header | 400 |
| POST with non-JSON content type | 415 |

Restored `FEH_GOOGLE_RECEIVER_ENABLED=false` at **13:49:00 UTC**. UI digest matched SHA-256 of `false`; subsequent GET and POST each returned **404**. The legacy intake and Meta form switches also showed the saved false digest. `FEH_GOOGLE_RECEIVER_SCOPE=owner-test` remains saved, with its matching digest; scope alone cannot enable the receiver. No valid-key payload, new enquiry, HTTP replay or real SMS was submitted.

Fresh pre/post sending-control readbacks agree: latest event **STOP**, active grants **0**, approved adapters **0**, unconsumed authorizations **0**, reservations **2**, attempts **2**. Final Google lead count is the three historical records. No customer data or production project was accessed.

## Exact remaining limitation and handoff

The existing Google key is stored as a Vercel **Secret/sensitive** variable on the exact PR115 Preview branch, and Supabase exposes only its digest. The supported single-variable read returned metadata without a value. Neither secret value nor allowed-phone value was exposed. No hidden browser state, administrator credential, runtime secret-export route or alternative security bypass was used.

Google's saved webhook URL/key are still blank from the previous reviewed configuration; the owner-email notification remains untouched. Successful Google-originated submission therefore cannot be claimed. The next secure step is to enter a newly generated 40-character alphanumeric connection key in staging's existing `FEH_GOOGLE_WEBHOOK_KEY` field, retaining it privately for the Google form and matching Preview configuration. This is an internal integration key, not an account/CRM login password. Browser credential-change guidance requires the owner to enter and submit a replacement credential manually. Prepare the exact field and hand off; do not put the key in chat or logs. Intake must stay closed during this step.

After secure key configuration: reopen only the bounded owner/fictional test, preserve owner email while saving the Google webhook, prove genuine dashboard submission and a controlled ordinary-payload replay, verify no sending authority/attempt growth, then close intake again. Existing ingestion credentials still expire on 6 November; no authority or lifetime expansion is implied. Automatic acknowledgement authorization, customer STOP integration and full advertising/protected-path acceptance remain separate unfinished items.

## Completion Evidence Block

- **Completed:** approved staging-only function installation; exact deployed-file verification; six hosted rejection tests; two initial and two final closed-route checks; bounded scope configuration and verified closure; current aggregate/control readback.
- **Files:** created this report only. No source/migration file changed or deleted. The previous tested artifact was deployed unchanged.
- **Tests:** all ten hosted HTTP checks produced expected statuses. Prior 65 new receiver tests, 793 acknowledgement, 177 Factory041 and 708 execution tests remain the verified code results; they were not pointlessly repeated for this deployment/evidence-only increment. Typecheck/lint/Next build likewise not repeated; artifact build and diff checks passed.
- **Git:** exact report-only commit and normal expected-head publication to existing draft PR115; final hashes and clean status recorded there. No merge or checkpoint change.
- **Deployment/migrations:** new function code v1/config v3; existing receiver code v16/config v22 following project-secret refresh; no SQL migration, role grant, STOP release or production deployment.
- **External systems:** Supabase staging deployment, two non-credential test settings and read-only verification; Vercel exact-branch variable metadata/read attempt; GitHub evidence publication. Google Ads settings and owner-email delivery were not changed.
- **Credentials accessed:** secret metadata/digests only; no secret values retrieved, changed or exposed. The replacement credential remains a user handoff, not a completed action.
- **Production/customer data touched:** no. **Real sends:** none. **Final state:** Google receiver disabled, legacy intake disabled, Meta test disabled, global STOP on.
- **Remaining gate:** secure connection-key entry, then valid-key/provider submission and duplicate proof. Deployment approval has been satisfied; do not ask for it again or misreport the old auto-review rejection as current.
