import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { OtpChallenge, OtpChannel } from "./otpChallenge.ts";

const COOKIE_BY_CHANNEL: Record<OtpChannel, string> = {
  EMAIL: "feh_lookup_preview_email_challenge",
  SMS: "feh_lookup_preview_sms_challenge",
};

function secret(): string {
  const value = process.env.OTP_HMAC_SECRET;
  if (!value || value.length < 32) throw new Error("otp_secret_not_configured");
  return value;
}

function proof(payload: string): string {
  return createHmac("sha256", secret()).update(`preview-challenge-v1|${payload}`, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function encode(challenge: OtpChallenge): string {
  const payload = Buffer.from(JSON.stringify(challenge), "utf8").toString("base64url");
  return `${payload}.${proof(payload)}`;
}

function decode(value: string): OtpChallenge | null {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !safeEqualHex(signature, proof(payload))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OtpChallenge;
  } catch {
    return null;
  }
}

export async function savePreviewChallenge(channel: OtpChannel, challenge: OtpChallenge): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_BY_CHANNEL[channel], encode(challenge), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}

export async function loadPreviewChallenge(channel: OtpChannel): Promise<OtpChallenge | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_BY_CHANNEL[channel])?.value;
  return value ? decode(value) : null;
}

export async function clearPreviewChallenges(): Promise<void> {
  const jar = await cookies();
  for (const name of Object.values(COOKIE_BY_CHANNEL)) {
    jar.delete(name);
  }
}
