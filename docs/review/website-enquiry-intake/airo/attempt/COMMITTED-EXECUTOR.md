# Dedicated commit boundary — local engineering candidate

18 November 2026. Parent ca76f556585f07452fa47278df8a8dd66cb2adc5.

`committed-mysql-store.ts` composes the existing conditional-update store with
an explicit transaction on an injected, new, exclusively owned connection.
For each claim/finalization: open -> begin -> execute -> await COMMIT -> destroy.
Only an acknowledged COMMIT permits the affected-row result to reach the caller.
No retry, rollback query, status reset, connection pooling, configuration read,
driver import, credential handling, default transport or runtime wiring is added.
The default quote binding remains closed. The existing SQL and quote handler
candidate are unchanged; the working published website/email code is untouched.

On COMMIT failure, its outcome may be unknown. The adapter discards the connection,
returns a redacted error to the enclosing handoff, and never permits transport or
automatic recovery. An uncommitted operation rolls back when the server sees the
dedicated connection close. A cleanup failure is also conservative. A WeakSet
rejects connection-object reuse within this store without destroying another
invocation's owned connection. This does not prove an injected factory is honest:
reviewed bootstrap MUST create a fresh connection, not return a shared/pool wrapper
or an outer transaction. Separate wrappers around one physical connection remain
prohibited. There is currently no real connection factory or live bootstrap.

## Executed verification

`committed-regression.tap`: **83/83 PASS, 0 skipped**, comprising existing 74
regressions and 9 new executor tests. New checks cover delayed COMMIT with zero
early transport; open/begin/statement/commit failures; lost commit acknowledgement;
failed finalization retaining uncertain; cleanup failure; reused/concurrent
connection rejection; malformed/zero affected rows; and error redaction. These
are injected-connection tests, not native database concurrency or hosted acceptance.
Existing actual quote fixture checks still prove byte preservation and mocked email
arguments/order through the previously covered CRM outcomes.

Run from the archive root, using Node 24 TypeScript stripping:

```sh
python3 tests/deny-network.py /absolute/path/to/node --no-warnings --test --test-isolation=none --test-reporter=tap tests/connection.test.ts airo/quote-composition.test.mjs airo/attempt/handoff.test.mjs airo/attempt/committed-mysql-store.test.mjs
```

Linux seccomp denies socket/socketpair/connect/sendto/sendmsg/sendmmsg/io_uring;
child environment is empty and inherited descriptors are closed. DB/transport/email
are synthetic injected mocks. Strict standalone TypeScript check passed with
ES2022, ESNext, Bundler, allowImportingTsExtensions and skipLibCheck. Full Airo
build/lint remain unverified without its exact installed lockfile/build source.

The local AF_UNIX probe still fails EPERM before database execution. Native MySQL
assertions remain zero; the prepared native fixture was not retried. Historical
native PostgreSQL 9/9 evidence is unchanged and was not rerun.

## Handoff and release gate

Engineering next: extend the prepared native MySQL fixture to exercise this owned
transaction executor, including concurrent claims and connection loss around
COMMIT. Execute only when an authorized disposable local executor permits private
Unix sockets. Independently prepare the concrete DB-client/import integration from
verified non-secret current Airo client source and locked build dependencies; do
not obtain credentials, assume pool ownership, or activate a destination.

Independent reviewer (Dominic or appointed reviewer): review this new delta and
the earlier unapproved archive deltas at the exact published head. Baseline review
5952331814 is DISMISSED and is not approval of this package.

Release/rollback remains as documented in README.md: separately approved exact
sender/receiver/schema/role/build/destination evidence and runtime verification,
drain old senders at authorized cutover, preserve emails and closed replay. Rollback
disables CRM binding without restoring the old enabled sender or resetting held
statuses. Completion needs a durably committed CRM-visible enquiry and preserved
email behavior under scoped authority; local tests do not satisfy that requirement.

Completion evidence: four archive files added plus MANIFEST updated; no deletions,
application changes, migrations or runtime wiring. Source publication/comment only.
No secret/customer access, grants, real sends, production/remote DB access, replay,
new form submission, activation, spend, merge or deployment. PR115 and all other
watchers unchanged. No new Dalbir decision needed for continued source work.
