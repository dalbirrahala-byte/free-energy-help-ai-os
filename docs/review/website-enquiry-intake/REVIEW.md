# Website enquiry connection — source review

This directory preserves the 11-file package published in issue #133 on 17 November 2026. The source files and manifest are unchanged. The original README is historical; this pull request now provides the GitHub review surface it requested.

Review the four TypeScript modules, candidate SQL and tests here. No application imports, route registration, deployed migration, credentials, configuration wrapper or live CRM connection is added. SQL remains outside supabase/migrations. Do not merge or activate as a substitute for independent validation.

Historical local result: 46 mock tests passed, zero failures/skips. PostgreSQL execution, concurrency/crash checks and full project typecheck/lint/build for the package remain unverified. Existing repository CI does not cover these archived source files automatically.

The root and frontend vercel.json files disable Git auto-deployment only for review/website-crm-source-133. Other branches retain their existing default behaviour. They are publication guards, not application functionality or deployment approval. Keep the guard if updating this branch.

Next: independent CRM/database source review, disposable PostgreSQL validation including ACL/concurrency/rollback, and candidate typechecking before any separately approved integration. Preserve the working website emails; no new form submission, replay, secret provisioning or endpoint configuration is part of this PR.
