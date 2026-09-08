import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { canonicalAuthUrl, isCanonicalAuthOrigin } from "@/lib/auth/authOrigin";
import { isSetPasswordOtpType, safeAuthNext } from "@/lib/auth/recovery";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // Auth tokens are accepted only on the canonical FEH CRM origin. This
  // prevents preview/alternate-host recovery flows from silently crossing
  // environments and issuing a session on the wrong host.
  if (!isCanonicalAuthOrigin(requestUrl.origin)) {
    return NextResponse.redirect(canonicalAuthUrl("/forgot-password?error=wrong-origin"));
  }
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeAuthNext(requestUrl.searchParams.get("next"));

  if (tokenHash && isSetPasswordOtpType(type)) {
    const destination = new URL(next, requestUrl.origin);
    destination.searchParams.set("mode", type === "invite" ? "invite" : "recovery");
    const response = NextResponse.redirect(destination);

    // The recovery/invite token is verified server-side. Supabase may issue
    // session cookies during verifyOtp(); they must be attached to the exact
    // redirect response returned to the browser. Writing them only through
    // next/headers is not sufficient for this cross-device email-link handoff.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return response;
    }
  }

  const expired = new URL("/forgot-password", requestUrl.origin);
  expired.searchParams.set("error", "expired");
  return NextResponse.redirect(expired);
}
