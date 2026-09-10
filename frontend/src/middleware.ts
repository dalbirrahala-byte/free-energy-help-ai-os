// Central authentication and MFA route protection for the FEH CRM.
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { decideAdminMfaRoute, safeMfaRedirectTarget } from "@/lib/auth/mfa";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/confirm", "/business-energy-quote"];
const PUBLIC_PREFIXES = ["/leads/web/"];
const MFA_PATHS = ["/mfa/challenge", "/mfa/enroll"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isMfaPath(pathname: string): boolean {
  return MFA_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") return NextResponse.redirect(new URL("/", request.url));

  if (user && (!isPublicPath(pathname) || isMfaPath(pathname))) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = roleData?.role === "admin";

    if (isAdmin) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const decision = decideAdminMfaRoute(true, {
        currentLevel: assurance?.currentLevel ?? null,
        nextLevel: assurance?.nextLevel ?? null,
      });

      if (decision === "enroll" && pathname !== "/mfa/enroll") {
        const enrollUrl = new URL("/mfa/enroll", request.url);
        enrollUrl.searchParams.set("redirectTo", safeMfaRedirectTarget(pathname));
        return NextResponse.redirect(enrollUrl);
      }

      if (decision === "challenge" && pathname !== "/mfa/challenge") {
        const challengeUrl = new URL("/mfa/challenge", request.url);
        challengeUrl.searchParams.set("redirectTo", safeMfaRedirectTarget(pathname));
        return NextResponse.redirect(challengeUrl);
      }

      if (decision === "allow" && isMfaPath(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
