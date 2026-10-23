/**
 * Review-only FEH Health Check OTP gate.
 *
 * Reuses the already-reviewed OTP receipt primitive from the verified
 * meter-lookup work. This file performs no OTP delivery, no provider I/O, no
 * database mutation and no customer contact. It only validates a supplied
 * receipt and returns a fail-closed verification state for later CRM review.
 */

import {
  validateOtpReceipt,
  type OtpVerificationReceipt,
} from "@/lib/verified-meter-lookup/otpChallenge";

export type VerifiedLeadOtpReviewInput = Readonly<{
  receipt: OtpVerificationReceipt | null;
  requestId: string;
  telephone: string;
  now: string;
  secret: string;
}>;

export type VerifiedLeadOtpReview = Readonly<{
  status: "VERIFIED" | "HOLD";
  mobileVerification: "VERIFIED" | "UNVERIFIED";
  crmHotLeadEligible: boolean;
  executionAllowed: false;
  reason: "verified_receipt" | "missing_receipt" | "invalid_or_expired_receipt";
}>;

export function reviewVerifiedLeadOtp(
  input: VerifiedLeadOtpReviewInput,
): VerifiedLeadOtpReview {
  if (!input.receipt) {
    return Object.freeze({
      status: "HOLD",
      mobileVerification: "UNVERIFIED",
      crmHotLeadEligible: false,
      executionAllowed: false,
      reason: "missing_receipt",
    });
  }

  const valid = validateOtpReceipt({
    receipt: input.receipt,
    requestId: input.requestId,
    channel: "SMS",
    destination: input.telephone,
    now: input.now,
    secret: input.secret,
  });

  if (!valid) {
    return Object.freeze({
      status: "HOLD",
      mobileVerification: "UNVERIFIED",
      crmHotLeadEligible: false,
      executionAllowed: false,
      reason: "invalid_or_expired_receipt",
    });
  }

  return Object.freeze({
    status: "VERIFIED",
    mobileVerification: "VERIFIED",
    crmHotLeadEligible: true,
    executionAllowed: false,
    reason: "verified_receipt",
  });
}
