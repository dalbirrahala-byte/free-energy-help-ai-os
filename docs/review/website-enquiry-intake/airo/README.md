# Actual Airo quote-handler composition — local engineering evidence

18 November 2026. Eight tests passed, none failed or skipped. This is a source-only test archive, not application wiring, independent approval or hosted acceptance.

## Provenance

`quote-POST.ts` is the complete owner-supplied export of `src/server/api/quote/POST.ts`, reported Airo commit `4bdb65372cdba68a0332482c8de16835a939e89d`. Normalize pasted CRLF to LF and retain one final newline: 19,136 UTF-8 bytes, 390 lines, SHA256 `25219749b68dd6c3b4efd8d79a70ca9377e6e14a68b23f1e3dcd02f1c4680893`. The test enforces this hash. Transfer integrity does not independently establish the published runtime commit. The fixture includes existing comments that are stale about retry behavior; it is deliberately unchanged.

Candidate sender/receiver/contract imports are the exact Git blobs at PR head `2bdf1d3c5c9a4795492b31766c46f28f15963d5c`. No candidate implementation was modified. Only the quote handler is executed from the Airo export; email transport, database operations, phone constants and stored-row mapping are test doubles. The mapping mirrors supplied store fields but does not execute the real MySQL store. The receiver returns a mock persistence receipt: no durable database commitment is proven by these tests.

## Reproduce

From this archive's parent directory, using Linux, libseccomp.so.2, Python 3 and Node 24:

```sh
python3 tests/deny-network.py /absolute/path/to/node --no-warnings --test --test-isolation=none --test-reporter=tap airo/quote-composition.test.mjs
```

Run recorded here used Node 24 from the local runtime. The existing repository launcher denies socket/socketpair/connect/sendto/sendmsg/sendmmsg/io_uring_setup, closes inherited descriptors and executes with an empty environment. The test supplies only a synthetic notification address and literal synthetic HMAC fixture, disables global fetch, and calls the receiver directly in memory. No HTTP server, remote request, database, provider or customer data is used. Email arguments remain in memory.

## Assertions

1. Actual handler orders save, owner email, visitor email, then signed candidate delivery; accepts only the correlated mock receipt before recording sent.
2. Absent endpoint performs no transport, retains pending, returns 201 and produces byte-identical email arguments to the successful candidate path.
3. Delivery exception plus uncertain-write exception still returns 201, makes no repeat delivery/email attempt, and emits only the redacted reconciliation label for those exceptions.
4. A receipt followed by a failed status write leaves pending, logs reconciliation and does not log CRM success. This demonstrates why pending alone is insufficient authority to retry.
5. HTTP 202 is uncertain, with one transport call, unchanged email arguments and preserved 201 response.
6. Already-sent emails and uncertain CRM are skipped.
7. Owner email failure retains the existing 500 path and prevents visitor/CRM attempts.
8. Visitor email failure retains the existing nonfatal path.

## Remaining gates and handoff

Source custodian: provide the already-requested full schema, then retry handler, route registration, email module and package at the same source commit (or disclose changed HEAD). Three of eight requested files have matched supplied hashes; this test does not replace the remaining exports or prove deployment identity.

Engineering: after schema verification, prepare durable attempt/reconciliation handling and the exact sender adapter without changing email behavior. Keep replay closed; never infer that pending means no earlier attempt. Current handler also accepts an undefined status-write result as success and the store does not verify matched/persisted state; these remain source integration concerns.

Independent reviewer: review these new fixtures and candidate deltas at the new exact PR head. Baseline review 5952331814 is currently dismissed and does not approve this work. Previously recorded native PostgreSQL 9/9 evidence remains separate and was not rerun because SQL is unchanged. These eight tests neither extend that database proof to MySQL nor prove CRM UI visibility.

Release remains blocked pending complete source reconciliation, independent review, exact runtime identity/configuration and separately scoped deployment/runtime authority. Existing release/rollback package remains applicable; this archive adds no release action. No merge, deployment, remote DDL, real send, replay, form submission, grants or activation occurred. #115 and other watches are unchanged.
