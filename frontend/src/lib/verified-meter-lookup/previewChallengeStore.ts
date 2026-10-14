import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { OtpChallenge, OtpChannel } from "./otpChallenge.ts";

const SECRET_COOKIE = "feh_lookup_preview_secret";
const COOKIE_BY_CHANNEL: Record<OtpChannel, string> = {
  EMAIL: "feh_lookup_preview_email_challenge",
  SMS: "feh_lookup_preview_sms_challenge",
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function proof(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`preview-challenge-v1|${payload}`, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function encode(challenge: OtpChallenge, secret: string): string {
  const payload = Buffer.from(JSON.stringify(challenge), "utf8").toString("base64url");
  return `${payload}.${proof(payload, secret)}`;
}

function decode(value: string, secret: string): OtpChallenge | null {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !safeEqualHex(signature, proof(payload, secret))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OtpChallenge;
  } catch {
    return null;
  }
}

export async function getOrCreatePreviewSecret(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SECRET_COOKIE)?.value;
  if (existing && existing.length >= 32) return existing;
  const value = randomBytes(48).toString("base64url");
  jar.set(SECRET_COOKIE, value, cookieOptions(60 * 60));
  return value;
}

async function getPreviewSecret(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(SECRET_COOKIE)?.value;
  return value && value.length >= 32 ? value : null;
}

export async function savePreviewChallenge(channel: OtpChannel, challenge: OtpChallenge): Promise<void> {
  const jar = await cookies();
  const secret = await getOrCreatePreviewSecret();
  jar.set(COOKIE_BY_CHANNEL[channel], encode(challenge, secret), cookieOptions(15 * 60));
}

export async function loadPreviewChallenge(channel: OtpChannel): Promise<OtpChallenge | null> {
  const jar = await cookies();
  const secret = await getPreviewSecret();
  if (!secret) return null;
  const value = jar.get(COOKIE_BY_CHANNEL[channel])?.value;
  return value ? decode(value, secret) : null;
}

export async function clearPreviewChallenges(): Promise<void> {
  const jar = await cookies();
  for (const name of Object.values(COOKIE_BY_CHANNEL)) {
    jar.delete(name);
  }
}
