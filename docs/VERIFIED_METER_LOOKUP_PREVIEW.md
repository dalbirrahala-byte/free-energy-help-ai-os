# Verified meter lookup OTP preview

This branch extends PR #100's fail-closed verified meter lookup gate with a **preview-only** end-to-end OTP harness.

## What it proves

- Generates separate six-digit EMAIL and SMS challenges using the existing OTP primitive.
- Delivers EMAIL through Resend when configured.
- Delivers SMS through Telnyx Messaging when configured.
- Restricts real preview sends to explicit destination allowlists.
- Supports explicit preview echo mode when provider credentials are not yet configured.
- Stores challenge objects in signed, HttpOnly cookies so code digests and attempt state are not exposed to browser JavaScript.
- Verifies both codes, then calls the existing `authorizeVerifiedLookup()` gate.
- Stops at the ALLOW / HOLD / DENY decision. It never calls a supplier/meter provider and never releases meter or supplier data.
- The route and delivery adapter fail closed when `VERCEL_ENV=production`.

## Preview environment variables

Required for all preview tests:

- `OTP_HMAC_SECRET` — at least 32 characters.

Choose one of the following delivery modes.

### Echo mode (no provider spend)

- `OTP_PREVIEW_ECHO_CODE=true`

Codes are rendered in the preview harness. This mode is blocked in production because the entire harness is blocked in production.

### Resend EMAIL

- `RESEND_API_KEY`
- `OTP_EMAIL_FROM`
- `OTP_PREVIEW_ALLOWED_EMAILS` — comma-separated exact test email destinations.

### Telnyx SMS

- `TELNYX_API_KEY`
- `TELNYX_MESSAGING_FROM`
- `OTP_PREVIEW_ALLOWED_PHONES` — comma-separated UK test destinations.

If provider credentials are present, the destination **must** be allowlisted. Provider failures do not fall back silently to echo mode.

## Route

`/verified-meter-lookup-preview`

The route returns 404 in production.

## Important production gap

This is a test harness, not the public lookup integration. The current connected repository does not contain the live public Free Energy Help Supplier/MPAN/MPRN lookup source. Production wiring still requires:

1. opening the actual public-site source;
2. moving durable challenge state to an approved server-side store (for example a dedicated Supabase table/RPC or equivalent) so replay/attempt state is authoritative across requests;
3. replacing preview-simulated bot/rate-limit values with server-derived controls;
4. enforcing the authorization decision immediately before the real supplier/meter provider call;
5. independent security review and production approval.

No production deployment, provider activation, secret change or live meter disclosure is authorized by this branch.
