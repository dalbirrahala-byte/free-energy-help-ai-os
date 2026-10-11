import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { normalizeUkTelephone } from "./evaluateVerifiedLookup.ts";

export type OtpChannel = "EMAIL" | "SMS";
export type OtpChallengeStatus = "ACTIVE" | "USED" | "LOCKED" | "EXPIRED";

export type OtpChallenge = Readonly<{
  id: string;
  requestId: string;
  channel: OtpChannel;
  destinationBinding: string;
  codeDigest: string;
  issuedAt: string;
  expiresAt: string;
  attemptsRemaining: number;
  status: OtpChallengeStatus;
}>;

export type OtpVerificationReceipt = Readonly<{
  challengeId: string;
  requestId: string;
  channel: OtpChannel;
  verifiedValue: string;
  verifiedAt: string;
  expiresAt: string;
  proof: string;
}>;

const SIX_DIGITS = /^\d{6}$/;
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

function requireSecret(secret: string): void {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("otp_secret_too_short");
  }
}

function parseTime(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("invalid_time");
  return parsed;
}

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function normalizeOtpDestination(channel: OtpChannel, value: string): string | null {
  if (channel === "EMAIL") {
    const email = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }
  return normalizeUkTelephone(value);
}

function destinationBinding(secret: string, channel: OtpChannel, normalized: string): string {
  return hmac(secret, `otp-destination-v1|${channel}|${normalized}`);
}

function codeDigest(secret: string, challenge: Pick<OtpChallenge, "id" | "requestId" | "channel" | "destinationBinding">, code: string): string {
  return hmac(
    secret,
    `otp-code-v1|${challenge.id}|${challenge.requestId}|${challenge.channel}|${challenge.destinationBinding}|${code}`,
  );
}

function receiptProof(secret: string, receipt: Omit<OtpVerificationReceipt, "proof">): string {
  return hmac(
    secret,
    `otp-receipt-v1|${receipt.challengeId}|${receipt.requestId}|${receipt.channel}|${receipt.verifiedValue}|${receipt.verifiedAt}|${receipt.expiresAt}`,
  );
}

export function issueOtpChallenge(input: {
  requestId: string;
  channel: OtpChannel;
  destination: string;
  now: string;
  secret: string;
  ttlMs?: number;
  maxAttempts?: number;
}): { challenge: OtpChallenge; code: string } {
  requireSecret(input.secret);
  if (!input.requestId.trim()) throw new Error("invalid_request_id");
  const normalized = normalizeOtpDestination(input.channel, input.destination);
  if (!normalized) throw new Error("invalid_destination");

  const now = parseTime(input.now);
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isInteger(ttlMs) || ttlMs < 60_000 || ttlMs > 15 * 60_000) throw new Error("invalid_ttl");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error("invalid_attempt_limit");

  const id = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const base = {
    id,
    requestId: input.requestId.trim(),
    channel: input.channel,
    destinationBinding: destinationBinding(input.secret, input.channel, normalized),
  };

  const challenge: OtpChallenge = Object.freeze({
    ...base,
    codeDigest: codeDigest(input.secret, base, code),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    attemptsRemaining: maxAttempts,
    status: "ACTIVE",
  });
  return { challenge, code };
}

export type OtpVerificationResult =
  | { ok: true; challenge: OtpChallenge; receipt: OtpVerificationReceipt }
  | { ok: false; challenge: OtpChallenge; reason: "INVALID_CODE" | "DESTINATION_MISMATCH" | "EXPIRED" | "LOCKED" | "ALREADY_USED" | "INVALID_INPUT" };

export function verifyOtpChallenge(input: {
  challenge: OtpChallenge;
  code: string;
  destination: string;
  now: string;
  secret: string;
}): OtpVerificationResult {
  requireSecret(input.secret);
  const now = parseTime(input.now);
  const challenge = input.challenge;

  if (challenge.status === "USED") return { ok: false, challenge, reason: "ALREADY_USED" };
  if (challenge.status === "LOCKED" || challenge.attemptsRemaining <= 0) {
    return { ok: false, challenge: Object.freeze({ ...challenge, status: "LOCKED", attemptsRemaining: 0 }), reason: "LOCKED" };
  }
  if (challenge.status === "EXPIRED" || now > parseTime(challenge.expiresAt)) {
    return { ok: false, challenge: Object.freeze({ ...challenge, status: "EXPIRED" }), reason: "EXPIRED" };
  }
  if (now < parseTime(challenge.issuedAt)) return { ok: false, challenge, reason: "INVALID_INPUT" };

  const normalized = normalizeOtpDestination(challenge.channel, input.destination);
  if (!normalized) return { ok: false, challenge, reason: "INVALID_INPUT" };
  const expectedDestination = destinationBinding(input.secret, challenge.channel, normalized);
  if (!safeEqualHex(challenge.destinationBinding, expectedDestination)) {
    return { ok: false, challenge, reason: "DESTINATION_MISMATCH" };
  }

  const matches = SIX_DIGITS.test(input.code) &&
    safeEqualHex(challenge.codeDigest, codeDigest(input.secret, challenge, input.code));

  if (!matches) {
    const remaining = Math.max(0, challenge.attemptsRemaining - 1);
    return {
      ok: false,
      challenge: Object.freeze({ ...challenge, attemptsRemaining: remaining, status: remaining === 0 ? "LOCKED" : "ACTIVE" }),
      reason: remaining === 0 ? "LOCKED" : "INVALID_CODE",
    };
  }

  const verifiedAt = new Date(now).toISOString();
  const unsigned = {
    challengeId: challenge.id,
    requestId: challenge.requestId,
    channel: challenge.channel,
    verifiedValue: normalized,
    verifiedAt,
    expiresAt: challenge.expiresAt,
  } as const;
  const receipt: OtpVerificationReceipt = Object.freeze({ ...unsigned, proof: receiptProof(input.secret, unsigned) });
  return {
    ok: true,
    challenge: Object.freeze({ ...challenge, status: "USED" }),
    receipt,
  };
}

export function validateOtpReceipt(input: {
  receipt: OtpVerificationReceipt;
  requestId: string;
  channel: OtpChannel;
  destination: string;
  now: string;
  secret: string;
}): boolean {
  try {
    requireSecret(input.secret);
    const normalized = normalizeOtpDestination(input.channel, input.destination);
    if (!normalized) return false;
    const now = parseTime(input.now);
    const verifiedAt = parseTime(input.receipt.verifiedAt);
    const expiresAt = parseTime(input.receipt.expiresAt);
    if (verifiedAt > now || now > expiresAt) return false;
    if (
      input.receipt.requestId !== input.requestId.trim() ||
      input.receipt.channel !== input.channel ||
      input.receipt.verifiedValue !== normalized
    ) return false;
    const { proof, ...unsigned } = input.receipt;
    return safeEqualHex(proof, receiptProof(input.secret, unsigned));
  } catch {
    return false;
  }
}
