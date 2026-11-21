# Website enquiry source review

This archive contains the candidate sender, receiver, database store and tests for the website-to-CRM connection. The original README records the 17 November baseline. The [draft PR](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133) tracks independent review and release decisions.

## Verify the review package

From a clean export of the chosen Git commit, run the following command inside this directory before installing dependencies or generating test outputs.

```sh
python3 tests/deny-network.py /usr/bin/python3 -B tests/verify-archive.py
```

The verifier checks every regular file against the SHA-256 inventory in MANIFEST.json, including the SQL, patches, rollback fixtures and historical test evidence. It reports missing files, extra files, symbolic links and changed contents. The Git commit identifies the manifest itself. The native database CI entry point runs this check and the isolated sender/receiver tests before starting the database fixtures.

## Integration and release evidence

The archived enquiry-only handler has been exercised with disposable MySQL and PostgreSQL. The isolated test correlated a committed receipt with one CRM lead, checked its detail view and recorded the owner and visitor mock emails. Loss of the response after commit left the website enquiry available for reconciliation by reference. [Four handler scenarios](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133#issuecomment-7051040686)

Before applying the integration, the website maintainer must identify the editable revision matching the public bundle and the registered server-owned enquiry route. The CRM custodian must confirm the authorised destination, runtime identity, schema, TLS and read-only access for the agreed existing reference. A release decision requires separate scoped authority. The rollback procedure closes the CRM handoff while retaining the saved enquiry, its email states and its receipt. [Release and rollback package](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133#issuecomment-6974607208)
