"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type UpdatePasswordActionState = { error: string | null };

export async function updatePassword(
  _prevState: UpdatePasswordActionState,
  formData: FormData,
): Promise<UpdatePasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 10) {
    return { error: "Use at least 10 characters for your new password." };
  }

  if (password !== confirmPassword) {
    return { error: "The passwords do not match." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return { error: "Your recovery link is no longer valid. Request a new password reset." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.warn("[Audit] password_update_failed");
    return { error: "We could not update your password. Please request a new reset link and try again." };
  }

  await supabase.auth.signOut();
  redirect("/login?password=updated");
}
