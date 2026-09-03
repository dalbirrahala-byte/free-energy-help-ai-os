import { NextResponse } from "next/server";

import { isSetPasswordOtpType, safeAuthNext } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeAuthNext(requestUrl.searchParams.get("next"));

  if (tokenHash && isSetPasswordOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      const destination = new URL(next, requestUrl.origin);
      destination.searchParams.set("mode", type === "invite" ? "invite" : "recovery");
      return NextResponse.redirect(destination);
    }
  }

  const expired = new URL("/forgot-password", requestUrl.origin);
  expired.searchParams.set("error", "expired");
  return NextResponse.redirect(expired);
}
