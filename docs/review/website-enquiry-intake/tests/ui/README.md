# Website receipt to existing CRM lead list — isolated engineering fixture

18 November 2026. Tested source snapshot: `d6338f0a40a2e5ac3171984963c40550d5af21e6`.
This closes a local display-composition gap; it is not deployed CRM acceptance or independent approval.

## Executed result

`result.tap`: **4/4 checks passed, zero skipped**, exit 0, empty stderr. One check explicitly verifies kernel TCP denial. All 67 input blobs match `provenance.json` (four actual source files and 63 CRM migrations). No native PostgreSQL/MySQL tests were manually rerun in this pass.

The fixture applies the complete pinned CRM migration chain and candidate ingestion SQL to a fresh in-memory PGlite database, writes one fictional enquiry, obtains the correlated receipt, then executes the actual `/leads` server component's projection and actual `LeadsPageClient` rendering against that database row. The pure worklist rank function is also real source. TypeScript transpilation is not a typecheck.

Verified:
- Candidate SQL creates an ordinary `leads` row with Website source, New status, unscored classification, null telephone, false contact permission, preserved unanswered SMS consent and matching submission reference.
- The real page query selects the required columns. The real list renders the row and numeric `/leads/<leadId>` link, null fallbacks and escaped HTML-shaped contact/company strings.
- The unrelated browser-local website panel receives no CRM row. It is not a receipt verification surface.
- A simulated failed CRM read displays the existing error without fabricating a CRM row. No write action, classification recomputation or retry executes during rendering.

## Reproduce without runtime access

Use separate directories or an exact read-only checkout of the pinned commit. Copy the four `provenance.json` source paths into SOURCE_ROOT and all listed migrations into MIGRATION_ROOT, preserving repository-relative paths. DEPENDENCY_ROOT must be an already provisioned trusted package directory. This fixture performs no installation and imports only React, React DOM server rendering, TypeScript and PGlite from it.

```sh
python3 docs/review/website-enquiry-intake/tests/deny-network.py \
  /absolute/path/to/node \
  docs/review/website-enquiry-intake/tests/ui/visibility.mjs \
  /absolute/DEPENDENCY_ROOT /absolute/SOURCE_ROOT /absolute/MIGRATION_ROOT
```

Executed versions: Node 24.22.3, React/React DOM 19.2.4, TypeScript 5.9.3, PGlite 0.5.13. Dependencies were reused from the existing local checkout; installed tarballs were not freshly downloaded or independently integrity-verified. The existing launcher clears inherited environment and closes non-stdio descriptors, and applies seccomp denial to socket/connect/socketpair/sendto/sendmsg/sendmmsg/io_uring_setup. A throwing fetch sentinel records zero calls. The database is closed in a finally block.

Explicit test doubles: Next Link/cache/navigation, AppShell, browser-local website panel/hooks, Supabase client/auth boundary and revenue-view loading. The Supabase double permits only the list's SELECT/order path and executes that SELECT in PGlite; unknown imports/actions throw. The database uses its disposable fixture owner, so this is **not authenticated/RLS access proof**. Revenue views return an empty object, so production revenue badges/loading are not covered. There is no browser hydration, live route, actual TLS, sender or email transport in this fixture.

Initial fixture execution stopped at rendering because the Next Link test double exposed the wrong default-export shape. Corrected that test double only; the final fixture passed. No application defect was inferred from this harness error.

## Source review and future verification target

At the pinned source, `frontend/src/app/leads/[id]/page.tsx` selects by numeric CRM lead ID, displays contact/email/source metadata and renders `lead.notes` as text. Message, meter references, original timestamp, raw SMS answer and submission UUID are retained in those JSON notes by candidate SQL. This detail route was source-reviewed, not executed by the fixture; it does not currently give these website note fields a dedicated presentation.

Future authorised runtime acceptance must correlate the preserved submission reference to a committed receipt and its numeric CRM lead ID, verify the intended authenticated operator can see that same row in **CRM leads (Supabase)** and its detail page, and verify email preservation. A browser-local website card alone does not prove CRM persistence. No new submission, receipt lookup against real data, or replay is authorised by this fixture.

Remaining gates: genuine current Airo mapping/published revision, exact approved receiver/runtime target, role/ACL and TLS evidence, independently reviewed integration delta, full integration build and separately scoped release/runtime verification. Keep the existing release/rollback handoff (PR #133 comment 6974607208) in force: disable only the CRM handoff through a reviewed path, preserve storage/emails/receipts/audits, and keep replay closed. No release recommendation is made until those prerequisites are concrete.

Completion evidence: four test/provenance/result/documentation files plus manifest entries, no application changes or deletions. Local engineering execution only. No hosted database/config access, secrets/customer payloads, new website submission, external message, migration, deployment, grants or provider/STOP changes. Typecheck/lint/application build not rerun for this fixture. Independent review is still required.
