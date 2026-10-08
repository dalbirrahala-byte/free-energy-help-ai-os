import { normalizeOtpDestination, type OtpChannel } from "./otpChallenge.ts";

export type PreviewOtpDeliveryResult = Readonly<{
  channel: OtpChannel;
  mode: "provider" | "echo";
  providerReference: string | null;
}>;

function previewOnly(): void {
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("preview_otp_delivery_disabled_in_production");
  }
}

function splitAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function destinationAllowed(channel: OtpChannel, destination: string): boolean {
  const normalized = normalizeOtpDestination(channel, destination);
  if (!normalized) return false;
  const key = channel === "EMAIL" ? "OTP_PREVIEW_ALLOWED_EMAILS" : "OTP_PREVIEW_ALLOWED_PHONES";
  return splitAllowlist(process.env[key]).some(
    (candidate) => normalizeOtpDestination(channel, candidate) === normalized,
  );
}

function providerConfigured(channel: OtpChannel): boolean {
  return channel === "EMAIL"
    ? Boolean(process.env.RESEND_API_KEY && process.env.OTP_EMAIL_FROM)
    : Boolean(process.env.TELNYX_API_KEY && process.env.TELNYX_MESSAGING_FROM);
}

function echoEnabled(): boolean {
  return process.env.OTP_PREVIEW_ECHO_CODE !== "false";
}

export function evaluatePreviewDeliveryPolicy(input: {
  channel: OtpChannel;
  destination: string;
}): "provider" | "echo" {
  previewOnly();
  const normalized = normalizeOtpDestination(input.channel, input.destination);
  if (!normalized) throw new Error("invalid_otp_destination");

  if (providerConfigured(input.channel)) {
    if (!destinationAllowed(input.channel, normalized)) {
      throw new Error("preview_destination_not_allowlisted");
    }
    return "provider";
  }

  if (echoEnabled()) return "echo";
  throw new Error("otp_provider_not_configured");
}

async function sendEmail(to: string, code: string): Promise<string | null> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.OTP_EMAIL_FROM,
      to: [to],
      subject: "Your Free Energy Help verification code",
      text: `Your Free Energy Help verification code is ${code}. It expires shortly. If you did not request it, ignore this email.`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("otp_email_delivery_failed");
  const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
  return typeof body?.id === "string" ? body.id : null;
}

async function sendSms(to: string, code: string): Promise<string | null> {
  const response = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.TELNYX_MESSAGING_FROM,
      to,
      text: `Free Energy Help verification code: ${code}. It expires shortly. If you did not request it, ignore this message.`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("otp_sms_delivery_failed");
  const body = (await response.json().catch(() => null)) as { data?: { id?: unknown } } | null;
  return typeof body?.data?.id === "string" ? body.data.id : null;
}

export async function deliverPreviewOtp(input: {
  channel: OtpChannel;
  destination: string;
  code: string;
}): Promise<PreviewOtpDeliveryResult> {
  const normalized = normalizeOtpDestination(input.channel, input.destination);
  if (!normalized) throw new Error("invalid_otp_destination");
  const mode = evaluatePreviewDeliveryPolicy({ channel: input.channel, destination: normalized });
  if (mode === "echo") {
    return Object.freeze({ channel: input.channel, mode, providerReference: null });
  }
  const providerReference = input.channel === "EMAIL"
    ? await sendEmail(normalized, input.code)
    : await sendSms(normalized, input.code);
  return Object.freeze({ channel: input.channel, mode, providerReference });
}
