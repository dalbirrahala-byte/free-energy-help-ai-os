import {
  evaluateVerifiedLookup,
  type VerifiedLookupDecision,
  type VerifiedLookupInput,
} from "./evaluateVerifiedLookup.ts";
import {
  validateOtpReceipt,
  type OtpVerificationReceipt,
} from "./otpChallenge.ts";

export type LookupRequestWithoutVerification = Omit<
  VerifiedLookupInput,
  "emailVerification" | "phoneVerification"
>;

export function authorizeVerifiedLookup(input: {
  request: LookupRequestWithoutVerification;
  emailReceipt: OtpVerificationReceipt;
  phoneReceipt: OtpVerificationReceipt;
  secret: string;
}): VerifiedLookupDecision {
  const { request, emailReceipt, phoneReceipt, secret } = input;

  const emailOk = validateOtpReceipt({
    receipt: emailReceipt,
    requestId: request.requestId,
    channel: "EMAIL",
    destination: request.email,
    now: request.asOf,
    secret,
  });
  const phoneOk = validateOtpReceipt({
    receipt: phoneReceipt,
    requestId: request.requestId,
    channel: "SMS",
    destination: request.telephone,
    now: request.asOf,
    secret,
  });

  if (!emailOk || !phoneOk) {
    return Object.freeze({
      status: "DENY",
      reason: "VERIFICATION_REQUIRED",
      lookupAllowed: false,
      supplierInformationReleaseAllowed: false,
      meterInformationReleaseAllowed: false,
      crmWriteAllowed: false,
      outboundAllowed: false,
      verificationBinding: null,
    });
  }

  return evaluateVerifiedLookup({
    ...request,
    emailVerification: {
      state: "VERIFIED",
      verifiedValue: emailReceipt.verifiedValue,
      verifiedAt: emailReceipt.verifiedAt,
    },
    phoneVerification: {
      state: "VERIFIED",
      verifiedValue: phoneReceipt.verifiedValue,
      verifiedAt: phoneReceipt.verifiedAt,
    },
  });
}
