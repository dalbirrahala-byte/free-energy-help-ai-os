# Google ordinary enquiry and replay — 3 November 2026

**PASS.** Two identical HTTP requests to the saved Google staging receiver produced one CRM enquiry (lead **23**), one linked acknowledgement queue row and one unchanged-duplicate audit. The queue row is `awaiting_authority` and has zero linked dispatch attempts.

Owner request `25936435-a38d-435e-a3bd-e3e45e3adb8e` authorised the two submissions. The owner entered the existing form key privately in Supabase’s function tester and returned control in request `c877713b-bf63-426d-a955-33411c63c39f`. The tester posted a synthetic ordinary-format payload (`is_test=false`) to `feh-google-lead-intake` on staging `vredwhyphrhsudggrsen`, using the saved form and campaign IDs and the permitted owner test destination. The test exercised the deployed HTTP handler and its restricted database connection. Google's own dashboard submission and saved asset are evidenced separately in [the saved-form result](GOOGLE_EXPIRING_TEST_WINDOW_2026-11-03.md). No customer ad submission or handset delivery was part of this test.

Fixture ID `feh_owner_http_replay_629547552e51470bb547c695d7798b44`. Both submissions used the same request body and provider timestamp. Reads were restricted to identifiers, counts and status. UTC and UK local time coincide for this run.

| Readback | Enquiries for fixture | Queue rows for fixture | Total queue rows | Total dispatch attempts |
| --- | ---: | ---: | ---: | ---: |
| Before requests, 17:43:46 | 0 | 0 | 2 | 2 |
| After first HTTP 200, 17:45:16 | 1 | 1 | 3 | 2 |
| After replay HTTP 200, 17:46:19 | 1 | 1 | 3 | 2 |

The final queue row references lead 23 and has no execution authorisation. One `external_lead_duplicate` audit for this lead has `data_differs=false`. Consent is `unknown` and follow-up is required. The function log independently recorded exactly two POST 200s during the enabled interval. The separate readiness probes were GET 405 and an empty, unauthenticated POST 403.

The configured test interval was 17:43:46–17:55:46. The receiver was switched back to false early at **17:46:00**. The saved false digest matched, and closed-route GET and POST both returned 404. Final SQL showed STOP, zero active execution grants, zero approved adapters and zero unconsumed authorised records. The private request body was cleared from the tester after the replay.

## Completion Evidence Block

- Created this evidence report. No application or migration files changed or were deleted. Preflight was clean at local `5e4af6671b630a100851d51f7b708fd3bfc77e62` and remote `90139dddadc7943d65764a6c546a6322fa49bf16`, with matching tree `bf62822c93633b9294e887f1bf9715b61e446894`.
- Validation consisted of the hosted boundary probes, two ordinary POSTs, before/after SQL counts, duplicate audit and the function-log aggregate above. Staged diff and whitespace checked. Typecheck, lint and build were inapplicable to this documentation-only commit.
- The digest-protected window settings changed on staging only. Final Google configuration revision 17, legacy configuration revision 35. No code redeployment, new migration, permission grant, STOP release or SMS send. The ads were not activated.
- The operator supplied the key directly to the first-party test console. Only status checks were returned from the populated body. No private key, recipient number, provider request headers or response credentials appear in this evidence. The fixture used the owner-controlled test recipient and synthetic contact details. No real customer enquiry or production system was used.
- Narrow normal expected-head publication to the existing draft PR115. Resulting commit and tree are recorded there. The Google hosted sequential replay requirement is satisfied. Concurrent/restart acceptance, automatic authority/invocation, signed delivery and customer STOP handling, Preview/credential alignment and protected-path review remain launch gates.
