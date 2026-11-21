# Website enquiry route for independent source review

The patch registers a Node POST handler in the CRM application and directs only the exact query-free POST path through to the signed receiver. The exported handler has a null runtime binding. It returns HTTP 503 until separate work supplies an authorised server-only signing and database binding. The factory accepts an injected clock and an opener for a fresh restricted PostgreSQL session, and uses the existing committed-store and receiver contracts.

Review the middleware condition, the factory and the exported default together. The earlier isolated [request tests](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133#issuecomment-7061552838) cover signed and unsigned requests, browser redirects and uncertain outcomes. The existing Factory 041 checkpoint protects both the middleware and API paths. This review package keeps that checkpoint intact.

## Local build and reversal

In a disposable repository copy with the reviewed dependencies, apply `next-route.patch` using `git apply --check` and then `git apply` from the repository root. Run a production-mode webpack build from `frontend` under enforced network isolation, using local Geist font fixtures and synthetic public build settings. Run `node ../docs/review/website-enquiry-intake/next/check-built-route.cjs` in the same isolation. Run the auth suite and the archived quote handoff suite with mock email delivery. Reverse the exact patch with `git apply --reverse` from the repository root. Application of the patch neither installs a driver nor provisions a runtime binding.

## Release dependencies

Independent review of the machine-authenticated route must precede any separately authorised protected-path checkpoint change. Staging requires a named isolated destination, a restricted database session with verified TLS/schema, and authority for the approved synthetic case. Verify a single matching committed receipt, a single operator-visible lead, both existing email paths and duplicate handling. Preserve uncertain outcomes for read-only reconciliation. Production configuration and release require separate approval. The [rollback package](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/pull/133#issuecomment-6974607208) keeps website storage and email available and preserves prior receipts.
