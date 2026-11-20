# Airo durable CRM handoff candidate — local engineering only

## Current quote-handler integration patch

From `docs/review/website-enquiry-intake`, generate the patch for independent source review:

```sh
sh airo/attempt/quote-patch.sh > /tmp/feh-quote-review.patch
```

The script checks the archived Airo export hash, patches a private copy of
`src/server/api/quote/POST.ts`, compares the result byte for byte with
`native/quote-held.ts`, then reverses the patch and compares with the export.
Use its output only on exit 0. The checked-in `quote.patch` below belongs to
the earlier `quote-POST.candidate.ts` fixture. It predates duplicate holds
and the recovery references for uncertain saves and owner email failures.

At handler commit `60eedf450f553e9fb3ab227237f7ca5915ef9dc1`, the generated
patch SHA-256 is `aec2e7d891e248b6fc06bc62268f8c754d3781a88e224684320bee396e8855ea`.
Disposable CI verified 34 database checks and four focused handler tests with
mock email. The PostgreSQL fixture checked all 63 migration hashes. See the
[assertions and recovery handoff](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133#issuecomment-7020857465).

**Integration gates.** The patched handler expects the published website build
to resolve `@/server/lib/quote-crm-step.js`. The archive exports
`finishQuoteCrm = createQuoteCrmStep(null)` in `handoff.ts`. The Airo
maintainer must identify the published revision, form, build and server alias
mapping. On that source, verify that the browser shows the returned UUID and
holds a second submission after an uncertain response. The CRM maintainer must
verify the server route reaches the authenticated receiver through the actual
middleware and identify its authorised destination, TLS and restricted service
identity. See the [route test](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133#issuecomment-6994035067).

Source reversal demonstrates file recovery only. An authorised runtime rollback
would close the new CRM transport, preserve the email path and durable records,
and reconcile existing UUIDs without replay. Restoring an enabled older CRM
sender could send again. Live delivery and the published build remain unverified.

## Historical fixture scope and provenance

Parent PR #133 head: f5f5e16c552ad9213fc7e3f03f572634f9757603.
Owner-supplied Airo source baseline: 4bdb65372cdba68a0332482c8de16835a939e89d.
The preserved quote fixture SHA256 is 25219749b68dd6c3b4efd8d79a70ca9377e6e14a68b23f1e3dcd02f1c4680893.
Transfer integrity is established; published deployment identity is not.

This directory is a dormant review archive, not application wiring. No imports
were added to the CRM application, no environment settings changed, no migration
executed. The exported finishQuoteCrm is deliberately bound to null dependencies.
A future reviewed integration would place the handoff module behind
@/server/lib/quote-crm-step.js and adapt its archive-relative imports to the reviewed
sender modules. This package is NOT a drop-in release or an enabled connection.

## Behavior

The previous handler could send successfully, fail to update its status, and leave
pending eligible for another attempt. The candidate uses existing crm_status and
submission_id, with no new table, grant, credential or schema state:

1. Only a row freshly created by this request is eligible. Historical pending rows
   are held, even when the endpoint is later configured. Never replay them here.
2. Missing dependencies or endpoint does not claim or send. Configuration errors
   after a claim may conservatively finish failed; no automatic retry exists.
3. Atomic UPDATE pending -> uncertain must COMMIT and report exactly one affected
   row before transport. The stable submission UUID is also the receiver's
   deduplication key. uncertain means a durable reconciliation hold, including a
   process that died before it sent anything; it does not prove a send occurred.
4. The existing candidate sender signs the exact request and requires a correlated
   committed receipt. Only then can uncertain -> sent be recorded. An error response after transport leaves the
   enquiry held, even when its JSON matches a receiver rejection. Reconcile by
   submission UUID. Unknown claim and finalization results are also held. No exception escapes this CRM step.
5. A second concurrent claimant cannot win the same conditional UPDATE. No expiry,
   reset-to-pending, replay route or automatic recovery was introduced.

mysql-attempt-store.ts accepts a narrow injected mysql2 executor. Its statement
completion MUST mean committed autocommit, never merely completion within an open
transaction. It rejects malformed result shapes and zero/multiple affected rows.
The native MySQL executor/bootstrap has not been wired or proven. Existing source
uses MySQL on the website and PostgreSQL in the CRM; those are different test needs.
No real MySQL server was executed in this pass. Mock CAS tests are not native SQL
concurrency proof. The previously recorded PostgreSQL 9/9 evidence is unchanged,
not rerun or promoted to hosted acceptance.

## Email preservation

quote.patch changes the CRM import, obsolete header comments and Step 4 only.
quote-POST.candidate.ts is the resulting review fixture. Tests compare the entire
validation/persistence/email implementation before Step 4 and the entire response
and email-builder suffix byte for byte against the supplied baseline. Actual email
arguments and ordering match across success, absent configuration, transport error,
lost claim acknowledgment and finalization failure. Owner email failure retains
HTTP500/no CRM; visitor email failure retains nonfatal behavior. email.ts, route
registration, schema, replay handler, provider settings and published files are
unchanged. This does not fix or prove concurrent email exactly-once delivery; that
behavior is inherited and outside this CRM-only patch.

## Reproduction and evidence

From docs/review/website-enquiry-intake, with Node 24's TypeScript stripping:

```sh
python3 tests/deny-network.py /absolute/path/to/node --no-warnings --test --test-isolation=none --test-reporter=tap tests/connection.test.ts airo/quote-composition.test.mjs airo/attempt/handoff.test.mjs
```

regression.tap: 74/74 pass, 0 skipped (52 candidate, 8 baseline-composition,
14 new attempt/quote cases). Synthetic example.invalid inputs, injected in-memory
receiver/store/transport, actual candidate quote handler, all DB/email mocked.
Linux seccomp denies socket/socketpair/connect/sendto/sendmsg/sendmmsg/io_uring_setup,
inherited descriptors closed and child environment empty. No runtime secrets read,
external messages or database connections. Tests assert one or zero mock transport
calls and redacted CRM outcomes. These are LOCAL engineering results only.

Strict standalone TypeScript check of handoff.ts and mysql-attempt-store.ts plus
transitive candidate modules passed (ES2022, ESNext, Bundler, allowImportingTsExtensions,
skipLibCheck). Full Airo build/typecheck and lint were not run: no exact installed
Airo lockfile/build environment is claimed. The complete quote fixture is exercised
by the runtime tests with mocked imports. An initial combined test invocation had
8 fixture failures due to sharing the baseline module cache between differing
mock-import bindings. A distinct baseline module URL fixed the harness; the final
combined run above passed all 74. No product success was inferred from that failure.

## Original fixture handoff and release/rollback gates

Engineering next: provide a disposable native MySQL/autocommit fixture for the exact
conditional UPDATEs and actual mysql2 result shape, including simultaneous claims,
connection loss before/after commit and finalization failure. Check the actual
source DB client integration without reading configuration/credentials. Independent
reviewer (Dominic/appointed reviewer): review this exact new source delta, particularly
new-row eligibility, conservative uncertain semantics and unchanged email behavior.
His baseline review 5952331814 is currently DISMISSED and is not approval of this delta.

Before any deployment decision, produce the final path/import/build integration,
verify reviewed sender/receiver versions and SQL schema/role assumptions, confirm
exact authenticated destination and scoped runtime authority, installed dependencies,
authorized isolated runtime test path, and approved release/rollback steps. Operator
access and an endpoint string are not runtime authority. No hosted destination is
assumed, including vredwhyphrhsudggrsen.

Release plan (not executed): stage only exact reviewed artifacts after independent
review and scoped release approval; preserve the email implementation and closed
replay; drain older sender processes before cutover so an old implementation cannot
race the new claim discipline. Verify using separately authorized synthetic evidence,
correlated committed receipt and correct CRM-visible record plus preserved emails.
Do not generate another website submission or real message under this package.

Rollback plan (not executed): disable the new CRM binding/transport while preserving
website persistence/emails and held statuses. Do not roll back to an enabled old
sender, clear uncertain records, reset pending, or replay. Reconcile a known reference
only via separately approved access. Native DB and runtime verification failures hold
release; source approval alone is not completion. #115 and its watches are unchanged.
