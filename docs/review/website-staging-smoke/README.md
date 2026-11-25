# One fictional CRM staging check for PR 133

Dalbir approved private staging setup and one direct fictional receiver request on 24 November 2026. The reserved reference is `ea675a41-993b-499c-899c-23fa4950db46`. The timestamp inside the fictional fixture is fixed to make its payload reproducible. At execution, the authorised sender signs the request with the current time.

## Local rehearsal

With Node 24, libseccomp and an already-installed PGlite module, run from the repository root:

```sh
python3 docs/review/website-enquiry-intake/tests/deny-network.py "$(command -v node)" --no-warnings docs/review/website-staging-smoke/rehearse.mjs /absolute/path/to/pglite/dist/index.js
```

The rehearsal uses an in-process receiver, disposable PostgreSQL-compatible storage and a fictional signing value. It checks the full payload digest, returned lead ID, four business answers, skipped SMS choice and correlated audit after commit. It cannot connect to a hosted destination. The local schema and privileges model only this rehearsal.

## Hosted handoff

1. The CRM maintainer records the private receiver address, reviewed and deployed revision, isolated database identifier, existing scoped receipt and Inbox observer, and evidence of disabled provider dispatch. Confirm the protected route review before setting up the target. Keep connection strings and keys out of GitHub. Source review alone does not identify an environment.
2. Assign one executor for this reference. Check the handoff for any previous or in-flight attempt. Use scoped read-only access to confirm the reference is absent before the first attempt. An existing row, ambiguous history, missing visibility, or conflicting executor holds execution for reconciliation.
3. With the private setup verified, that executor records the start against the reserved reference and submits the exact fictional JSON once through the authenticated direct receiver. Use the reviewed server-side signing path. Keep the public form, mail, SMS and advertising systems out of the test. No automatic retries or redirects.
4. Record the HTTP outcome and returned reference and lead ID. Use a separate scoped read to match the committed receipt, exact payload digest, lead ID and intake audit. An authorised operator opens that same lead in the staging CRM Inbox and verifies its four answers. Record only redacted identifiers, pass/fail results and the absence of dispatch from scoped staging evidence.
5. After a timeout, lost reply or inconsistent result, retain the original reference and reconcile read-only. Close the one-request test path after the exercise, preserving its evidence. A successful direct check proves the staging CRM leg. The published website and its two emails require their own end-to-end verification.
