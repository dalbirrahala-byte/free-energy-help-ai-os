# Native owned-transaction fixture — prepared, NOT executed

18 November 2026, parent 5ab74082fe7b649710baf851c8a8d67d025e98e2.

`committed-store.test.mjs` adds six executable cases against the actual archived
committed-mysql-store.ts and mysql2 driver: network-denial prerequisite, 24
simultaneous owned claims, disconnect before COMMIT, actual commit followed by an
injected lost application acknowledgement, failed finalization before commit,
and durable sent/failed states. This closes the preparation gap between the older
raw conditional-update fixture and the new dedicated transaction executor.

The lost-ack case deliberately injects a failure AFTER a successful server commit;
it does not claim to reproduce a real lost wire-level COMMIT response. No case
invokes a transport, website handler or replay. Synthetic identifiers only.

The test creates a separate fresh database `synthetic_committed_attempts`, refusing
existing state. It uses the same minimal InnoDB id/submission_id/crm_status schema
as the original native fixture, NOT the full Airo schema or runtime role/ACLs.
The synthetic local root connection is not evidence of production privileges.
All connections are discarded in finally, even after an assertion failure.
Locking observer reads wait for rollback after disconnect, avoiding a race between
client destruction and the server finishing rollback. Apply an external time bound
to classify a hanging lock/test as failure, never automatically retry it.

## Run only when the local prerequisite is available

Use the scratch-extracted MySQL runtime and Unix-only seccomp launcher documented
in README.md/provenance.json. Server: skip-networking, mysqlx=0, private test.sock,
fresh disposable data directory, no runtime config or inherited credentials.

```sh
timeout 60s python3 unix-only.py /absolute/local/libdir /absolute/path/to/node --no-warnings committed-store.test.mjs /absolute/local/mysql2/promise.js /workspace/scratch/TASK/test.sock
```

Run from this directory. Shut down only the known disposable server and dispose
of its test directory afterwards. Do not use hosted staging, production, or Preview.

## Actual result this pass

AF_UNIX socket creation remains EPERM in the executor. No server or native test
was started; **native SQL assertions: zero**. Node syntax check passed under the
existing deny-network guard. The previous 83/83 mocked regressions and historical
PostgreSQL results were not rerun and are unchanged. Syntax is not runtime evidence.

Next engineering action: execute this fixture plus the original native fixture
once an authorized disposable executor permits Unix sockets. Independently inspect
non-secret Airo DB client/locked dependency source to prepare the real owned factory;
do not request the eight original exports again. Independent review is pending.
Deployment, destination/auth/role/build identity and scoped runtime verification
remain separate release gates. Existing release/rollback notes remain applicable.

Completion evidence: two source archive files added, MANIFEST updated, none deleted;
syntax PASS; no new runtime test pass, typecheck/lint/build or native result claimed.
No application source changes or wiring. GitHub source publication only; no secrets,
customer data, external sends, DB connections, remote DDL, privileges, production,
new form submissions, replay, merge, deploy, activation or spend. PR115/watch unchanged.
