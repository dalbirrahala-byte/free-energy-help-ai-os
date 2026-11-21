# FEH website → CRM connection draft

17 November 2026. Source construction and isolated verification only. Not wired, deployed, independently approved or live.

## Outcome

A website-specific receiver, signed sender, parameterized store adapter and database receipt function are implemented as a review candidate. They retain the existing website enquiry payload, write ordinary CRM leads, and preserve missing consent. The existing authenticated CRM /leads page already selects these lead columns, so no parallel inbox is introduced.

46 local Node tests passed, including one in-memory signed sender → receiver → receipt flow, duplicate/conflict contract cases, missing configuration, invalid authentication, malformed data, uncertain delivery and redaction. PostgreSQL execution, real concurrency/rollback and whole-project typecheck/build are NOT verified. No PostgreSQL, TypeScript compiler, project dependencies or Docker runtime was available in this workspace. The SQL file remains a candidate outside the executable migration directory. Do not apply it.

## Files

- source/contract.ts: exact Airo payload fields, bounds, missing-answer preservation, correlated receipt contract.
- source/receiver.ts: HMAC authentication, timestamp window, bounded body, fixed website source/path and commit-only receipt response. No route registration.
- source/client.ts: matching signed sender with exact approved HTTPS destination, no redirects, bounded validated receipt, indeterminate errors and no retry. No global fetch default, secrets or environment reads.
- source/store.ts: single parameterized function call; a connection must be separately approved, scoped and autocommit. No database driver/configuration is supplied.
- source/website-enquiries.sql: new source-specific UUID receipt table plus dormant security-definer ingestion function; ordinary leads and receipt/audit written transactionally. No execute grants or role creation. Existing Meta-only primitives/constraints and health-check consent requirements stay intact.
- tests/connection.test.ts, tests/deny-network.py, evidence/tests.tap: executed tests and network-denying launcher.
- tests/postgres-local.sql: guarded disposable-local fixture/verification script, NOT RUN. It is not a production migration or proof.

## Architecture and existing work reconciliation

Repository main inspected at dacbdbf67427e6d333f2e0a7130276f89073b782; applicable root/frontend AGENTS policies read. The open PR inventory was inspected; existing staging Meta/Google, Inbox, Health Check and security work is separate. No files on those branches were changed. No local repository checkout existed: this is a source-only candidate bundle, not a claimed Git worktree or committed PR.

Inspected existing migrations for baseline leads/audit, source attribution, consent, Meta provider uniqueness, and health-check ingestion. Existing health-check ingestion cannot accept missing phone/consent/qualification answers and only deduplicates contacts for ten minutes. The external provider primitive is Meta-only. This candidate does not loosen either boundary or mislabel website records as Meta.

Source-specific receipt storage is required to retain durable Airo submission UUIDs without changing Meta provider semantics. It stores only UUID, lead ID, payload digest and timestamp; customer fields remain in existing leads. Message, meter references, source page, original submission time, click IDs and raw SMS answer are retained in notes as JSON. Review display/retention policy before activation. No new caller can supply source identity or outgoing permission. consent_given is false; raw yes/no/null SMS answer is evidence only, never automatic messaging authority. The lead defaults to New, unassigned, manual follow-up required.

## Security and delivery limits

HMAC identifies the website sender; it does not establish runtime approval, marketing consent, SMS authority or permission to deploy. Independently approved runtime binding/configuration and a least-privilege database role are required before any route registration. Neither a role nor credentials are created here.

The SQL holds a transaction-scoped per-submission advisory lock and a unique receipt key. The function must return through an autocommit query only after commit. Same ID and same canonical JSON returns the same lead ID; changed content is a conflict without overwriting a lead. Actual PostgreSQL concurrency and crash tests remain mandatory. Existing live grants, triggers and schema drift are unknown. A newly created security-definer function's complete ACL/owner/default-privilege inheritance must be reviewed, not assumed from source revokes alone.

Airo f6cb234 remains the reported draft preserving the website email journey and closing replay. This bundle is NOT a drop-in crm-client.ts replacement: it needs a small reviewed server-only configuration wrapper and route bootstrap once the receiver is approved. Do not paste invented endpoint/key values. Sender/receiver key provisioning, endpoint pinning and transport wiring are deferred. The existing owner test must be reconciled by its saved reference; there is no new form submission or bulk retry in this work.

Network ambiguity, unexpected 2xx, missing/mismatched receipt, timeout and unknown responses remain uncertain. Retry is never automatic. A hard interruption after CRM commit but before Airo status recording requires reconciliation using durable receipt; merely leaving crmStatus=pending is not authority to retry. No notification or provider dependencies exist in the receiver.

## Validation and execution

Executed (absolute paths adapted to local location):

    python3 tests/deny-network.py /path/to/node --no-warnings --test --test-isolation=none /absolute/path/tests/connection.test.ts

Node 24.22.1, 46 passed / 0 failed / 0 skipped. Empty inherited environment; non-stdio descriptors closed; seccomp denied socket, connect, socketpair, sendto, sendmsg, sendmmsg, io_uring_setup. All persistence and transport dependencies were synthetic in-memory doubles. Global fetch was overridden to throw. An initial attempt with Node's permission flag failed test discovery before tests ran; execution used the network-denying launcher without that filesystem permission flag. No real credentials, customer records or provider calls were involved.

SQL checks in the Node suite are structural only. SHA256 and advisory-lock APIs were checked against PostgreSQL official documentation:
https://www.postgresql.org/docs/16/functions-binarystring.html
https://www.postgresql.org/docs/18/functions-admin.html
Documentation checks do not establish that SQL executes or is correctly deployed.

Typecheck/lint/build: not run; required project dependencies/compiler unavailable. The Node runtime parsed/ran TypeScript by stripping types; that is not a typecheck. The standalone modules do not use Next.js framework APIs or change its routes. Framework bootstrap work must follow the installed Next.js version's own documentation and full project gate.

## Completion evidence and next gate

Created only the files listed in MANIFEST.json. Existing website files, repository branches and live systems were not modified. Git staging/commit/push/PR creation: not performed. Deployment/migration: not performed. External systems accessed: GitHub source/PR metadata and official public PostgreSQL documentation, read-only. Credentials accessed: no. Production/customer data touched: no. Real sends/new form submissions: zero. PR #115 hosted acceptance result and results watch unchanged.

Next recommended gate: publish the source as a clearly labelled draft review PR, then have an independent reviewer run the supplied disposable PostgreSQL checks plus two-session concurrency/crash and full project typecheck/build. Suggested locations: frontend/src/lib/website-enquiry-intake/ for the four TypeScript modules and docs/review/website-enquiry-intake/ for the not-yet-applied SQL/test/handoff. Public route, grants and environment wiring stay absent until separately approved. Public source publication is separate from deployment and may trigger CI; review workflow side effects before pushing.

Do not call this live or complete until the exact reviewed revision, destination, role/configuration and single existing-reference CRM receipt are verified while the working email behavior remains intact. No extra user form submission is needed.
