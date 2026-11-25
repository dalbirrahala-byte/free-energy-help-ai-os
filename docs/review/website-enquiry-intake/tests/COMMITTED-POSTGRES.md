# Dormant PostgreSQL connection boundary

Local engineering candidate only. No runtime connector, driver dependency,
credential/configuration reader, application import, route or grant is supplied.
The website's MySQL storage and both email paths are unchanged.

## Reason for this addition

At parent 51072bab0d3ef03f7b1a858a84002f0d36b23455, `source/store.ts`
requires its injected query to resolve only after commit, but cannot enforce
that requirement itself. The CRM's existing Supabase server client is scoped
to browser cookies; it does not implement this dedicated PostgreSQL session
contract. Previous SQL/native tests and the PGlite commit-boundary fixture proved
SQL behavior and a fixture transaction wrapper, not a runtime connection adapter.

`source/committed-postgres-store.ts` composes the existing store and receipt
validation with an injected fresh, exclusively owned physical session. It awaits
BEGIN, the parameterized ingestion function and COMMIT, verifies server command
tags, then closes the physical session. It never retries or releases a session
back to a pool. Failed commit acknowledgement, ROLLBACK command tags, malformed
receipts and close failure remain uncertain at the receiver boundary. Even a
cleanup failure after a confirmed commit remains conservatively uncertain.

A module-local WeakSet rejects reuse of the same handle across calls/factories
without closing another invocation's active handle. It cannot detect different
wrappers around one physical session, use in another module/process, or a lying
connector. The future opener must establish and test exclusive ownership, not
borrow a connection already in a transaction. An adapter contract is not runtime
authorization.

## Executed verification

13/13 local tests: one kernel network guard plus twelve behavior cases. These
include signed sender/receiver composition with a paused commit, failure at
BEGIN/SELECT/COMMIT, unexpected command tags, failed physical close, malformed
receipt, opener error, reused-handle contention, distinct-session independence,
and unchanged duplicate/conflict receipt validation. Driver responses and sessions
are synthetic in-memory doubles; no PostgreSQL server was opened by this suite.
No native database/concurrency/crash result is newly claimed by these tests.

Node 24.22.3. From this archive root:

```sh
python3 tests/deny-network.py /absolute/path/to/node --no-warnings --test --test-isolation=none --test-reporter=tap tests/committed-postgres-store.test.mjs
```

The launcher clears inherited environment, closes non-stdio descriptors and
denies socket/connect/send/io_uring calls with seccomp. The guard asserts an
attempt to create a loopback connection fails EPERM; no connection is made.
Global fetch calls=0. Test runner process isolation must be disabled because
its child-process IPC requires prohibited sockets. An initial default-runner
invocation failed with spawn EPERM before executing the fixture; this was a
tooling failure, then corrected without weakening the network guard.

Standalone strict TypeScript 5.9.3 checking of the adapter and imports passed
(ES2022, NodeNext, allowImportingTsExtensions, skipLibCheck). Stored result:
`evidence/committed-postgres-store.tap`. Full application lint/build was not rerun
locally because no application code, package or route changed.

## Remaining integration/release gates

- Independent reviewer: review this delta and the current #133 candidate. Prior
  approval of 59bd9b7 does not cover this code.
- Engineering: bind the contract to the selected pinned PostgreSQL driver only
  after verified destination/runtime selection. Verify real command tags,
  connection ownership/physical close, bounded timeouts and redacted diagnostics;
  execute native tests through the actual driver including abrupt failure and
  lost acknowledgement. Existing native SQL evidence is not this driver proof.
- Airo source maintainer: verify the two redacted assignments and published
  revision without exposing values. Existing request remains pending.
- Runtime/release owner: exact target/schema/restricted role/TLS, authenticated
  route/middleware boundary, server-only configuration and separately scoped
  release/verification authority remain unresolved. Do not reuse a browser
  publishable client or default provider-capable Preview worker.

The next unblocked engineering work can prepare a bounded opener/timeout
contract and failure fixture while destination evidence waits. No activation
switch is added. Release/rollback remains: separately approved integration,
correlated durable receipt and CRM visibility plus email regression verification;
rollback closes CRM handoff while retaining website storage, email behavior and
existing receipts. No automatic replay of pending/uncertain enquiries.
