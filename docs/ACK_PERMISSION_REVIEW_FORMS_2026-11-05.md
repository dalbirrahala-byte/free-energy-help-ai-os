# Owner wording review and fictional permission forms — 5 November 2026

## Result and scope

Implemented the owner's request to finish the forms for review before a fictional customer records an answer. The staging route is `/acknowledgement-permission-preview`. It shows the exact proposed contact notice, acknowledgement text and sending rule, records an attributable owner review for **fictional staging testing only**, then unlocks a mock enquiry form with explicit **yes / no / not sure** answers. No answer is preselected. Source selection is simulated Meta/Instagram or Google, not an actual provider submission.

This increment completes review/recording controls. It does **not** implement the remaining automatic per-enquiry Factory041 authorizer, automatic dispatch invocation, customer STOP callback integration, concurrent staging acceptance or production launch. It does not close the five groups in [the completion contract](ADVERTISING_COMPLETION_CONTRACT_2026-11-02.md). The earlier delivered Meta message and Google queue tests were not repeated.

## Review flow and boundaries

1. Owner signs into the existing staging account and completes MFA.
2. Read the proposed wording and rule. Only the owner may check the confirmation box and approve it. The agent has not done this on the owner's behalf.
3. After that recorded approval, select a fictional source and explicit fictional customer answer. No real name, phone, email or bill is collected. The UUID, source, answer, timestamp, actor and reviewed wording version are retained.
4. Yes is a synthetic permission record, not permission to send. No and not sure are shown as held. All records remain separate from real leads, SMS reservations and execution authority. Marketing consent is unchanged.

The wording proposes a STOP instruction; it must not be used with customers until the corresponding STOP handling is verified. Provider forms must be separately checked to present the adopted notice and deliver attributable matching evidence. The saved fictional approval does not imply that this mapping already exists.

The existing completed one-message test page links to the new review page. Its consumed authority is not reused. The persistent owner binding is reused solely to identify the owner; role promotion and execution grants are unnecessary for this review. RPCs require a verified staging issuer, bound owner, authenticated nonanonymous identity and AAL2. The page and actions additionally require the exact staging URL and Vercel Preview environment.

## Storage and security review

Two RLS-enabled private tables store immutable review snapshots and synthetic fixtures. No direct schema/table privileges are given to public, anonymous, authenticated, service or restricted ingress/worker roles. Three narrow security-definer RPCs have empty search paths and fully qualified objects. Authenticated callers can invoke them, but each checks the bound owner and MFA. Anonymous and service roles cannot execute them.

The full displayed proposal is pinned, not just its version. Changed snapshot, invalid/missing answer, unexpected source, wrong owner/project/session, absent review or failed audit blocks recording. UUID identity makes identical replay a no-op; changed data under the same identity is rejected. Review and audit insertion are transactional. Success is reconstructed from persisted records, never a query-string success flag. Form buttons show saving state.

This is review evidence, not a parallel execution-authorization system: no writes to Factory041 approval/authority tables, no provider imports or calls, no customer queue writes and no STOP/RELEASE operation occur.

## Staging installation and verification

- Project: `vredwhyphrhsudggrsen` only. Production excluded.
- Source migration: `20261105124723_ack_preview_permission_review.sql`.
- Hosted migration ledger version: `20261105125919`, name `ack_preview_permission_review` (the connected migration tool assigned the applied timestamp).
- SQL SHA-256: `d7df66f60a1fcf34ebbd4d147e6fd179b1330babbf28f93de49a4e70d80088a9`.
- Before applying: inspected migration history, affected table columns and exact existing owner-identity function; schema absent; live owner identity matched the reviewed definition. Full local migration-chain application passed.
- After applying: unbound read returned blocked; zero owner reviews and zero mock records. STOP remained stopped, active execution grants zero, approved adapters zero, reservations three, attempts two, unchanged from prestate.
- Verified all three RPCs deny anonymous/service execution, allow authenticated invocation and pin the empty search path.
- Security advisor delta: two intentional deny-by-default RLS/no-policy informational notices and three authenticated security-definer notices for the owner-checked RPCs. No anonymous callable function or mutable search path added. Existing unrelated advisories remain. References: [RLS no-policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated security-definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Recovery if a review defect is discovered: disable access to the three new RPCs or withdraw the Preview route under the appropriate operator approval; retain review/audit records. No destructive rollback or execution-control change is needed.

## Validation

| Check | Result |
| --- | --- |
| Focused local PGlite recording/security tests | PASS, 17/17 |
| `npm run test:lead-acknowledgement` | PASS, 813/813, including the new 17 |
| `npm run test:auth` | PASS, 33/33 |
| `npm run test:factory-041` | PASS, 177/177 |
| `npm run typecheck` | PASS |
| Targeted ESLint on all changed frontend files | PASS |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS, new dynamic route included |
| Staging post-install structural and closed-state verification | PASS as above |
| Actual authenticated owner review/recording in deployed UI | PASS on 5 November at 13:13–13:20 UK; owner approval and six fictional cases verified below |

The initial test fixture used an incorrect role name; corrected it to the existing ingress/runtime roles and reran. Initial local build failed because the worktree dependency symlink pointed outside Turbopack's root; copied the existing dependency installation locally and rebuilt successfully. These were local tooling/fixture defects, not staging failures. The existing Next middleware-deprecation and npm proxy warnings remain.

Automatic approval review blocked the Supabase CLI's attempted PostHog telemetry after it had created the local migration file. No telemetry exception was requested; local editing and the connected staging migration tool completed the work. The helper was not rerun to bypass that block.

## Completion Evidence Block

- Completed: staging owner wording review controls, synthetic permission recording form, pinned evidence, replay protection, error handling and focused/regression validation.
- Created: this document; `frontend/src/app/acknowledgement-permission-preview/{page.tsx,actions.ts,session.ts,SubmitButton.tsx}`; `frontend/src/lib/lead-gateway/acknowledgementPermissionReview{.ts,.server.ts,.database.test.mjs}`; the migration above.
- Modified: `frontend/src/app/acknowledgement-test-preview/page.tsx` (review link only). Deleted: none.
- Baseline: remote `6acc7f586f2a914a1535ba70c4ff92dfc1b9840f`, tree `20b4fc06257ca246a3d94771bdf6f92f68d89cec`; fresh isolated worktree. Original checkout preserved. Publication targets only draft PR115 branch `work/telnyx-otp-lead-sms-20261030` using normal expected-head push. No merge or accepted-checkpoint changes.
- Tests/typecheck/lint/build: exact results above. PGlite tests use local synthetic actors; they are not concurrent hosted staging or real provider proof.
- Migration: installed and verified in staging only. Preview publication/final hashes and deployed browser status are recorded in the publication note below.
- External systems: GitHub reads and authorized narrow publication; Supabase staging metadata/aggregate reads and the review-only migration; Vercel deployment metadata; Cloud Browser CRM login inspection. No Google/Meta form or provider configuration changes.
- Credentials accessed: no secret values read, printed or copied. Existing connected-tool authentication used. Production/customer data touched: no. Only owner-bound metadata, schema and aggregate counts inspected; no real customer payloads processed.
- Remaining gates: owner's wording review; authenticated UI recording verification; source-form/notice mapping; automatic attributable Factory041 authority/invocation; delivery and customer STOP callbacks; all outstanding staging acceptance groups; protected-path acceptance; separate production launch decision. No real SMS, ad spend, execution grant or STOP release is authorised by this page.

## Publication and browser handoff

- Code/evidence published as remote commit `c8c893e33a8e11d8ed52d0e40a3f510b8972188d`, tree `9cf89d4b5647756128c7386de710983a5c0b9644`. Local constructed commit `d8cfb16740b1c1506022e288665c56f963e60d89` has the identical tree. The ordinary CLI push lacked a GitHub username credential and changed no remote ref; the connected GitHub tree/commit API then published the exact verified tree with `force=false` and expected head `6acc7f586f2a914a1535ba70c4ff92dfc1b9840f`. No concurrent work overwritten. The isolated worktree was then moved to a new local tracking branch at the verified remote commit; the original local commit/checkout were preserved.
- Vercel Preview deployment `dpl_38h74UWVTaax27PA9N6o9Twj1ARm` is READY for that exact code head. No production target or manual deployment was used.
- [Verified owner-review sign-in link](https://free-energy-help-ai-6mj1b9kjc-free-energy-help.vercel.app/login?redirectTo=%2Facknowledgement-permission-preview). Cloud Browser opened the new route and observed the FEH login redirect with the correct return path. No authenticated owner interaction is claimed. The known existing staging test email was confirmed against the bound owner using a boolean-only query; no password was accessed.
- Code-head CI: [Navigation](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/actions/runs/42032540188) PASS; [Engineering](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/actions/runs/42032540114) PASS. [Factory041](https://github.com/dalbirrahala-byte/free-energy-help-ai-os/actions/runs/42032540110) failed only its protected migration/application-security drift comparison (job `127262331292`, step 12). Its focused tests, full dispatch tests, typecheck and lint passed. The accepted baseline is unchanged; an actual protected-path review is still required.
- This publication note is a documentation-only follow-up. No product code, remote configuration or test authority changed after the validated code commit. The original checkout remains clean and the review worktree is clean after its narrow evidence commit. PR115 remains draft/open/unmerged.
- Owner's Google screenshots received during the work show the existing lead-form editor and paused-ad banner. The visible disclosure permits contact about the request but does not explicitly mention an acknowledgement SMS. They are not evidence of adopted SMS wording or recorded customer permission. No edit or test was performed in Google during this increment.

## Owner approval and hosted fictional form results — 13:20 UK

After Dalbir reported "ok approved CRM", a fresh staging read verified review **1** at **2026-11-05 13:13:46.822142 UTC**. It belongs to the existing bound owner, matches the entire current proposal `feh-ack-permission-review-v1`, and has exactly one successful review audit. Its scope remains `fictional_staging_test_only`. The live page independently showed this saved approval and the unlocked fictional form. The implementation agent did not submit the owner-approval action or impersonate an owner through SQL.

Two yes records were already present on first inspection and were preserved. Four new no/not-sure cases were submitted through the authenticated deployed form. Each result was then checked in the UI and independently in the staging database:

| Simulated source | Answer | Recorded time (UTC / UK) | Verified result |
| --- | --- | --- | --- |
| Meta / Instagram | yes | 13:14:28.413476 | PASS — fictional permission recorded |
| Google | yes | 13:14:43.509087 | PASS — fictional permission recorded |
| Meta / Instagram | no | 13:17:57.013758 | PASS — refusal recorded; UI shows hold |
| Meta / Instagram | not sure | 13:18:43.171262 | PASS — uncertainty recorded; UI shows hold |
| Google | no | 13:19:12.894478 | PASS — refusal recorded; UI shows hold |
| Google | not sure | 13:19:49.918909 | PASS — uncertainty recorded; UI shows hold |

Final readback: **one review / one review audit; six synthetic fixtures / six matching successful audits; one of each source/answer combination**. Every fixture is marked `synthetic_fixture` and linked to the reviewed wording. STOP remains stopped, active execution grants **0**, approved adapters **0**, existing reservations **3**, existing dispatch attempts **2**. The latter controls/counts match the pre-review installation checkpoint. No real SMS or lead reservation was created.

This PASS covers authenticated private form recording and its displayed outcomes. It does not prove a real provider form delivers matching permission, or that a live acknowledgement authorizer/worker correctly consumes it. No actual provider intake, hosted replay/concurrency, customer STOP callback, SMS or production test was performed in this follow-up. Prior local replay/security results remain valid historical evidence and were not rerun for a documentation-only change. The five end-to-end acceptance groups and protected-path review remain open.

### Follow-up Completion Evidence Block

- Scope completed: verified the owner's actual saved review and the two existing yes cases; recorded and checked the four remaining fictional answers through the deployed form; independently checked audits and closed sending controls.
- Files modified: this existing evidence document only. No code/migration changes. A screenshot of all six synthetic results was captured for the owner's handoff; no secret or real customer data is included.
- Hosted UI/database result: **6/6 PASS** for permission recording, as scoped above. Approval **CONFIRMED**. Owner approval was not repeated. No real action authority was granted.
- Typecheck/lint/build: not rerun, documentation only; validated code remains `c8c893e33a8e11d8ed52d0e40a3f510b8972188d`. `git diff --check` passed for this follow-up.
- Git: reconciled clean local tree with current remote `59aea9efd457c99ab1adc48ec68a98855e95acb8`, tree `98adbf3018ae69909404444f7bf220ec6fdcd9e2`; preserved earlier local branches and original checkout. Narrow one-file expected-head publication to existing draft PR115, no force push or merge. Final local working tree clean after the evidence commit.
- Deployment/migration: unchanged. Existing Preview `dpl_38h74UWVTaax27PA9N6o9Twj1ARm` used. No manual deployment; a docs publication may trigger the existing Preview integration.
- External systems: Cloud Browser authenticated staging UI (four synthetic record submissions), Supabase staging read-only verification, GitHub evidence publication. No Google Ads, Meta, Telnyx, production or campaign changes.
- Credentials accessed: no credential values read or entered. Existing signed-in owner browser session used. Production/real customer data touched: no. User's real authenticated review and synthetic record/audit metadata only.
- Remaining gate: connect the adopted source-form wording and genuine permission provenance to the existing Factory041 authorizer/invocation, finish delivery/customer STOP handling, prove the full five acceptance groups, obtain protected-path acceptance and present a separate production launch packet. This fictional-test review must never be promoted to live sending authority.
