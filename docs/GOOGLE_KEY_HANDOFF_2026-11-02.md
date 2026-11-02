# Google staging key handoff — 2 November 2026

Owner request `edee14d7-cd89-4a3e-a01d-fec4b27f7c7a` reported successful manual replacement of the private Google connection key. Fresh Supabase UI evidence confirms `FEH_GOOGLE_WEBHOOK_KEY` was updated at **19:09:17 UTC** in staging `vredwhyphrhsudggrsen`. The agent did not read, enter, print or recover the value. User retained responsibility for private storage and reuse of the same key in Google.

## Verified state

- Google receiver remains disabled; its saved digest matches `false`. A fresh hosted POST with an empty JSON object returned **404**.
- Legacy intake and both Meta test switches remain false.
- Fresh staging SQL: emergency control **stopped**, active execution grants **0**, approved adapters **0**, unconsumed authorizations **0**, reservations **2**, dispatch attempts **2**.
- Secret refresh moved Google function configuration to **v4**, source still **v1**, unchanged platform bundle `9b9ae80dbc728a174c94e048db7f674b13212fee281c323d5642a608d8f8d0bb`. Legacy receiver configuration is **v23**, source still **v16**, unchanged bundle `0149447052fa48ce0bc78f7509351d88f86c485bf41e9d312e9ff731e2e6594c`. No source was redeployed.
- Google account **553-034-0666**, form **402325113451**, campaign **24096131756** opened successfully. The account banner says no ads are running. Existing owner-email notification is still selected.
- The staging receiver URL was entered into the form's previously empty webhook URL field. The key field was left empty for owner entry. **Apply was not pressed**; this is an unsaved preparation, not a permanent connection or successful intake test.

## Next step

Owner securely saves the same key in their chosen password manager and enters it into the prepared Google **Key** field, then submits **Apply**. Browser credential-change guidance requires owner entry and submission; no secret should be pasted into chat. Leave the existing email notification intact. Do not click **Send test data** while intake is closed. After the saved Google connection is verified, perform the already-approved bounded staging test and restore closure. No new SMS is authorized. The matching Preview variable has not been rotated and must not be claimed to match.

## Completion Evidence Block

- **Scope:** verified owner key replacement; checked closed controls and function source continuity; prepared unsaved Google URL and retained email settings.
- **Files:** created this evidence document only; no source or migration changes/deletions.
- **Tests:** one hosted closed-route POST, expected/actual **404**; fresh aggregate SQL readback as above. No valid-key payload, provider submission, replay or SMS executed. Typecheck/lint/build not repeated for documentation only; diff whitespace check required before commit.
- **Git:** starting clean local `68addec9cf9659318e9d21fc1795cbe59f4ece53`, remote `aeb23dcb4106e58fd0d74de3d3b7eded86155db0`, matching tree `d1163550521c56c753e060fe5053c7f55496afa2`; narrow documentation commit and expected-head publication to PR115 only. Final publication hashes recorded in the run evidence. No merge or accepted-baseline change.
- **External systems:** read-only Supabase controls/function inventory and secret metadata; Google unsaved form preparation. Owner, not agent, replaced the staging key.
- **Credentials accessed:** metadata only; no credential values accessed by agent. **Production/customer data touched:** no. **Deployment/migration:** no code deployment, migration, authority grant or STOP release.
- **Remaining gates:** owner Google key submission; verified saved email/webhook configuration; positive Google intake and replay proof; Preview key alignment; automatic authority, customer STOP and final acceptance. Full advertising readiness is not yet established.
