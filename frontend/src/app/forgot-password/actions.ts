"use server";

import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordActionState = {
  status: "idle" | "sent" | "error";
  message: string | null;
};

function recoveryRedirectUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return new URL("/auth/callback?next=/update-password", explicit).toString();
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return `https://${productionHost}/auth/callback?next=/update-password`;
  }

  return "http://localhost:3000/auth/callback?next=/update-password";
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { status: "error", message: "Enter your email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: recoveryRedirectUrl(),
  });

  if (error) {
    console.warn(`[Audit] password_reset_request_failed for email domain "${email.split("@")[1] ?? "unknown"}".`);
    // Keep the response deliberately non-enumerating. A user should not be
    // able to discover whether an email address exists in FEH CRM.
  }

  return {
    status: "sent",
    message: "If that email is registered with FEH CRM, a secure password-reset email has been sent.",
  };
}
