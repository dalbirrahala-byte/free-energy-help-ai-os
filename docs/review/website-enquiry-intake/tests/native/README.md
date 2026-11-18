# Native PostgreSQL verification — local engineering evidence

Executed 18 November 2026 against unchanged PR #133 candidate SQL from
`59bd9b7d5a3e40c5098ad741f68dcd547f7834fd`.
**9/9 local native PostgreSQL scenarios passed. This is not hosted acceptance.**
These new test files require independent review; the earlier source approval
does not approve this new delta or authorise runtime activation.

## Scope and results

| Scenario | Verified assertion |
|---|---|
| 63 pinned CRM migrations + candidate SQL | Native PostgreSQL accepted the full baseline schema chain; each migration Git blob hash checked |
| Role/ACL boundary | anon/authenticated/service_role cannot execute intake or access receipts; fixture ingestion role has function execution only, no direct lead/receipt access |
| Concurrent identical submission ID | Independent sessions; second backend observed waiting on advisory lock; exactly one lead, receipt and audit; same lead ID returned |
| Concurrent conflicting payload | Same contention barrier; second result conflict; first payload unchanged; one lead/receipt/audit |
| Different IDs | Second transaction commits while first remains open |
| First transaction rollback | Already-inflight waiting transaction completes once; no application retry |
| Deferred COMMIT failure | Function returned a candidate receipt, then COMMIT failed; zero lead/receipt/audit for that ID |
| Abrupt shutdown before commit | Immediate cluster shutdown; WAL recovery; uncommitted ID absent without resubmission |
| Abrupt shutdown after commit | Committed ID survives WAL recovery with one lead/receipt/audit; read-only reconciliation, no replay |

This is SQL/database verification. It does not execute the HTTP sender/receiver,
the Airo handler, hosted UI, or email transports. Earlier PGlite composition
evidence remains separately recorded on #133. An abrupt PostgreSQL process
shutdown is not physical disk/power-loss testing. Runtime role ownership, target
schema drift and connection-pool transaction behaviour still require verification
against the separately approved destination and adapter.

## Runtime and isolation

Native PostgreSQL **17.11 (Debian 17.11-0+deb13u1)**, Python 3.13, libpq17,
libseccomp. Official Debian snapshot packages downloaded using authenticated APT
metadata and extracted locally; no system installation/service was performed.

Package SHA-256:

```text
postgresql-17: d2ce1ddffafa783f9acda4c92c86fc21e8288bff3782d739294f14fa797d7886
postgresql-client-17: 9d8558f8dd57c8e92e218a20698383575d53742ca3f9e7c2b7fe5f246d5216ae
libpq5: 20a4c9ef58b4baf90deda67cfb2cc062871c062830dddc234d28f5ac7931b86b
```

Unix socket creation is denied by this execution environment. The harness instead
starts its own temporary cluster bound only to `127.0.0.1:55433`, with local
synthetic trust authentication and no remote DSN/configuration input. It must run
only in a disposable isolated developer workspace, never on a shared database
host. A port collision fails startup; it does not reuse an existing database.

Each worker opens a fixed pool to that new cluster **before** loading application
SQL, then seccomp denies all new socket/socketpair/connect/io_uring_setup calls.
The guard is asserted by attempted IPv4/IPv6 socket creation. Existing DB sockets
are fixed to the loopback peer. PostgreSQL itself inherits a connect/io_uring
denial filter from its wrapper. The controller starts/stops only this cluster and
never executes an application/provider transport. Child environments contain only
PATH and LANG; no credentials are supplied. No external HTTP/SMS/email is sent.
The cluster is stopped in `finally`; evidence files remain in the printed scratch
directory for inspection. No customer data is used.

Early fixture setup attempts stopped on the environment's Unix-socket denial,
an inet text-format assertion and the missing synthetic `postgres` owner role.
These were test-environment corrections, not product defects. Final portable
fixture ran successfully in a fresh cluster with `postgres` as its local owner.

## Reproduce

Extract the three matching official Debian packages under a local package root
using `dpkg-deb -x`; do not install/start a shared service. Use a checkout whose
migrations match `migration-provenance.json` and the reviewed SQL digest. From
the repository root, with `PG_PACKAGE_ROOT` set to that extraction directory:

```bash
mkdir -p /tmp/feh133-native-evidence
env -i PATH=/usr/bin:/bin LANG=C.UTF-8 /usr/bin/python3 \
  docs/review/website-enquiry-intake/tests/native/native_pg.py \
  --package-root "$PG_PACKAGE_ROOT" \
  --source-root docs/review/website-enquiry-intake \
  --migration-root . \
  --work-root /tmp/feh133-native-evidence
```

No packages are fetched by the test. Missing runtime dependencies fail closed.
Use normal Python execution, not `python -O` (which would disable assertions).
All role creation/grants and injected failure triggers are fixture-only in the
new disposable local cluster. No production privilege or migration is authorised.

## Remaining connection prerequisite and next action

GoDaddy's requested Airo project redirected this browser to sign-in. No source
export was obtained. The historical supplied c334165 export and reconstructed
f6cb234 handler are not verified-current source.

After authenticated access or a source-only export is available, engineering must
compare current complete quote handler, route registration, enquiry store, CRM
client, closed replay handler, email implementation, schema and package manifest
against the reviewed baseline, with source commit and published revision identity.
Do not read environment values, secrets or enquiry rows; do not create diagnostic
endpoints, run the default Preview worker, submit forms, publish or replay.
Then prepare the sender/bootstrap integration and email regression evidence for
independent review. Target/role/configuration and release authority remain separate.

Preserve the rollback plan on #133: disable only the CRM handoff through a reviewed
path while retaining enquiry storage and both emails; keep replay closed; preserve
receipts/leads/audits and uncertain references. No destructive down migration.
