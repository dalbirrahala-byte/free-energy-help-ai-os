# Google receiver implementation and review — 2 November 2026

Request `d6a8b240-9103-475c-b4f7-f51a70fb0c5e`: implement, test and review the next unfinished advertising-readiness component under retained staging approvals. **PASS for the bounded local Google receiver implementation; BLOCKED for its hosted deployment. Advertising acceptance remains incomplete.**

## Reconciled baseline

Initial local HEAD `885331986da3aaf5d2b84958d62cb3dc26691e80`, remote `abf16288960af8c559e3191b89d5c7f57f70738f`, matching tree `74ee3fdf74a950459a95d0229471ff00dde97122`; local tree clean. Root/frontend AGENTS and existing implementation/evidence were reviewed. Remote was checked again before publication; no unrelated work overwritten. The completed five-enquiry repair, delivery-receipt foundation and delivered Meta SMS were not repeated.

## Implemented

- A separate `feh-google-lead-intake` receiver and explicit nine-file Edge artifact, independent of Preview authentication. It accepts only the exact staging project, Google form `402325113451`, campaign `24096131756`, a matching private webhook key and explicit `owner-test` scope/enable switches. Disabled or invalid configuration returns 404 before database access.
- Google's `is_test=true` demonstration remains a fixed fictional contact, intake-only, without an SMS reservation. Ordinary payload semantics (`false` or omitted marker) are exercised only for the configured owner-test telephone. This does **not** admit arbitrary customer numbers or establish a permanent customer connection.
- A timestamped owner-test enquiry uses the existing atomic Google ingestion/reservation primitive. Its repeated delivery preserves one enquiry and one reservation; no contact permission, approval, authorization or provider invocation is fabricated.
- Google may omit submission time. The receiver then uses the existing intake-only primitive and retains the enquiry for human review with NULL provider time and no reservation. A later replay with a timestamp cannot backfill authority or create a reservation. Inspection caught the existing acknowledgement RPC's mandatory timestamp condition; the implementation preserves it rather than weakening the SQL guard.
- The public runtime can use only the existing two restricted ingestion identities and Google RPCs. It cannot select Meta ingestion, a worker, raw SQL, authority creation, STOP/RELEASE or provider dispatch. The runtime restriction and receiver configuration are pinned against caller mutation. Exact raw body bytes are retained across routing so numeric identifiers are not reserialized through rounded numbers.
- The existing temporary receiver build manifest includes the new shared configuration dependency. Its deployed code and settings were not replaced. No middleware, application route, migration, grant, credential lifetime or accepted checkpoint was changed.

## Verification

| Check | Result |
| --- | --- |
| New receiver tests | 61 passed, 0 failed |
| New PostgreSQL receiver integration tests | 4 passed, 0 failed |
| Full acknowledgement suite | 793 passed, 0 failed, 0 skipped |
| Factory 041 suite | 177 passed, 0 failed, 0 skipped |
| Execution-dispatch suite | 708 passed, 0 failed, 0 skipped |
| TypeScript and targeted ESLint | PASS |
| Next.js build | PASS; existing middleware convention deprecation remains |
| Both Edge manifests | All relative imports resolved; generated JavaScript syntax checks passed |

Suites overlap; these counts are not summed into a distinct-test total. The new PostgreSQL tests apply all repository migrations to isolated PGlite, without granting an actor authority or releasing STOP. They prove HTTP-to-SQL mapping, two duplicate audits, review defaults, no fabricated consent, missing-time behavior, wrong-key/recipient rejection, and zero authorizations/attempts. PGlite has one connection: this is not multi-session hosted concurrency proof. An initial test assertion used `record_id` instead of the existing audit `entity_id`; that test-only error was corrected and the relevant suite rerun successfully.

New nine-file artifact SHA-256: `442b3dd361fab5f490ccc785322861ceb17c7b0a0f57515874ea23ce3487ce35`. Regenerated existing fourteen-file receiver artifact: `92e91e6ca3c2b37488260245dab55b28f30f07b3ca7954fd32aa35c4b60b86ad`. Neither artifact was deployed. Tooling notices were the existing npm `http-proxy` warning, Node module/strip-type notices and Next middleware deprecation; no unrelated cleanup was introduced.

## Current hosted/configuration evidence

Read-only staging database inspection: latest control **STOP**; active execution grants **0**; approved adapters **0**; unconsumed authorizations **0**; reservations **2**; attempts **2**; delivery receipts **0**. Both existing ingestion logins are restricted (no superuser/bypass-RLS/create-role), with unchanged expiry **6 November 2026, 23:59:59 UTC**. A stable endpoint does not solve credential renewal; no lifetime was extended.

Google Ads account `553-034-0666` was inspected in the Cloud Browser. The exact form/campaign editor retains the owner's email notification; webhook URL and key are blank, and the account banner says no ads are running. The email and webhook controls are separately present. The editor was closed without applying changes. This is saved-configuration inspection, not a newly delivered email or completed webhook test.

Automatic approval review rejected `deploy_edge_function` for the new Google receiver: **"This would persistently deploy a new public, JWT-disabled Supabase Edge Function and expose a new endpoint"**, and said the earlier no-deployment instruction had not clearly been superseded for that exact action. No retry or workaround was attempted. Subsequent function inventory confirms only existing `feh-staging-lead-intake` configuration v20/code v16, bundle `0149447052fa48ce0bc78f7509351d88f86c485bf41e9d312e9ff731e2e6594c`; the new function is absent. Intake switches were not changed; their previously recorded disabled values were not re-read in this increment.

## Concrete next approval and remaining gates

The prepared request is to install this exact reviewed nine-file artifact as **`feh-google-lead-intake` in staging `vredwhyphrhsudggrsen` only**, with platform JWT verification off because Google authenticates using the receiver's private form key. It remains disabled by default. Then enable only a bounded owner/fictional Google intake test, preserve the saved owner email, verify the saved webhook and replay, and restore intake closure. No SMS dispatch, STOP release, privilege/credential-lifetime expansion, production change or ad activation is included. Wrong-key/form/campaign/recipient requests remain rejected. Google-facing configuration is not to be saved until the deployed endpoint and restricted test configuration have been verified.

This approval addresses the specific public endpoint installation/testing rejected by automatic review, not general customer sending. The full standing authorization process, authenticated customer STOP-to-suppression wiring, live callback delivery, durable invocation/recovery, restricted credential renewal and all five complete acceptance groups still require completion. Protected-path acceptance remains a separate review; checkpoint `1d2151f1d7d624ce77d06a98dd24f32b6e74461c` was not altered to make CI pass. The full release packet and production/ad approval remain future gates.

## Completion Evidence Block

- **Scope completed:** separate Google-only restricted staging receiver, honest demonstration/ordinary/review-only routing, ingestion-only runtime restrictions, regression and real-SQL local verification, current closed-state and Google email configuration inspection.
- **Created:** `frontend/src/lib/lead-gateway/googleReceiver.server.ts`, `googleReceiverConfiguration.server.ts`, `googleReceiver.test.mjs`, `googleReceiver.database.test.mjs`; `scripts/build-google-receiver.mjs`; this report.
- **Modified:** `frontend/src/lib/lead-gateway/googleIngress.server.ts`, `googleWebhookTest.server.ts`, `previewDatabase.server.ts`; `scripts/build-intake-receiver.mjs`. **Deleted:** none.
- **Tests/typecheck/lint/build:** exact results and limits above; staged diff/whitespace/secret review performed before the narrow commit. No live SMS or repeat Meta send.
- **Git:** narrow local commit and normal expected-head publication to existing draft PR115 authorized; final local/remote hashes, matching tree, exact-head CI and final clean status recorded in the PR handoff. No merge, force push, unrelated staging or accepted-baseline change.
- **Deployment/migration:** new deployment rejected before installation; no migration, settings change or grant. Existing staging function remains v20. The automatic branch Preview, if triggered by publication, is tracked separately in the PR handoff.
- **External systems:** GitHub review branch; Supabase staging read-only queries/inventory and rejected deployment request; Google Ads read-only form review; official Supabase documentation. **Credentials accessed:** no secret values. **Production/customer data touched:** no; local data synthetic, live DB queries aggregate/control metadata only.
- **Remaining risk/next gate:** hosted Google installation/testing requires the precise approval above; this local PASS must not be reported as permanent Google-to-SMS readiness or permission to advertise.
