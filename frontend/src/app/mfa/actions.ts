"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { safeMfaRedirectTarget } from "@/lib/auth/mfa";

export type MfaActionState = { error: string | null };

export async function verifyMfaChallenge(_previous: MfaActionState, formData: FormData): Promise<MfaActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const redirectTo = safeMfaRedirectTarget(String(formData.get("redirectTo") ?? "/"));
  if (!/^\d{6}$/.test(code)) return { error: "Enter the six-digit code from your authenticator app." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) return { error: "We could not check your security factor. Try again." };
  const factor = factors.totp.find((item) => item.status === "verified");
  if (!factor) redirect("/mfa/enroll");

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) return { error: "We could not start verification. Try again." };

  const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
  if (error) return { error: "That code was not accepted. Check Microsoft Authenticator and try again." };

  redirect(redirectTo);
}

export async function enrollTotp(): Promise<{ factorId: string; qrCode: string; secret: string } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sign in again before setting up MFA." };

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Free Energy Help" });
  if (error) return { error: "Authenticator setup could not be started." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyEnrollment(_previous: MfaActionState, formData: FormData): Promise<MfaActionState> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!factorId || !/^\d{6}$/.test(code)) return { error: "Enter the six-digit code from Microsoft Authenticator." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { error: "We could not start verification. Try again." };
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (error) return { error: "That code was not accepted. Try the current code shown in Microsoft Authenticator." };
  redirect("/");
}
