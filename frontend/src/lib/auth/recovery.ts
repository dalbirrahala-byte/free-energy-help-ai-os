import type { EmailOtpType } from "@supabase/supabase-js";

const SET_PASSWORD_TYPES = new Set<EmailOtpType>(["invite", "recovery"]);

export function safeAuthNext(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/reset-password";
}

export function isSetPasswordOtpType(value: string | null): value is EmailOtpType {
  return SET_PASSWORD_TYPES.has(value as EmailOtpType);
}

export function passwordValidationError(password: string, confirmation: string): string | null {
  if (password.length < 12) {
    return "Use at least 12 characters.";
  }
  if (password !== confirmation) {
    return "The passwords do not match.";
  }
  return null;
}
