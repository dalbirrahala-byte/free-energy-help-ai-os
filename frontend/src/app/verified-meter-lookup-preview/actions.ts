"use server";

import { randomUUID } from "node:crypto";

import { authorizeVerifiedLookup } from "@/lib/verified-meter-lookup/authorizeVerifiedLookup";
import {
  issueOtpChallenge,
  verifyOtpChallenge,
  type OtpVerificationResult,
} from "@/lib/verified-meter-lookup/otpChallenge";
import {
  clearPreviewChallenges,
  getOrCreatePreviewSecret,
  loadPreviewChallenge,
  savePreviewChallenge,
} from "@/lib/verified-meter-lookup/previewChallengeStore";
import { deliverPreviewOtp } from "@/lib/verified-meter-lookup/previewOtpDelivery";
import type { LookupRelationship } from "@/lib/verified-meter-lookup/evaluateVerifiedLookup";

type RequestSnapshot = Readonly<{
  requestId: string;
  email: string;
  telephone: string;
  postcode: string;
  relationship: LookupRelationship;
  authorityDeclared: boolean;
  botCheckPassed: boolean;
  rateLimitPassed: boolean;
  riskFlags: string;
}>;

export type PreviewOtpState = Readonly<{
  stage: "request" | "codes_sent" | "decision";
  message: string | null;
  request: RequestSnapshot | null;
  echoedCodes: Readonly<{ email: string | null; sms: string | null }> | null;
  decision: Readonly<{
    status: "ALLOW_LOOKUP" | "HOLD_FOR_REVIEW" | "DENY";
    reason: string;
    lookupAllowed: boolean;
    supplierInformationReleaseAllowed: boolean;
    meterInformationReleaseAllowed: boolean;
  }> | null;
}>;

function ensurePreview(): void {
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("preview_lookup_disabled_in_production");
  }
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function relationship(value: string): LookupRelationship | null {
  return value === "BUSINESS_OWNER_DIRECTOR" ||
    value === "AUTHORISED_EMPLOYEE" ||
    value === "AUTHORISED_AGENT" ||
    value === "OTHER"
    ? value
    : null;
}

function boolField(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true";
}

function errorState(message: string): PreviewOtpState {
  return Object.freeze({
    stage: "request",
    message,
    request: null,
    echoedCodes: null,
    decision: null,
  });
}

function reason(result: OtpVerificationResult): string | null {
  return result.ok ? null : result.reason;
}

export async function runPreviewOtpAction(
  _previous: PreviewOtpState,
  formData: FormData,
): Promise<PreviewOtpState> {
  ensurePreview();
  const step = field(formData, "_step");

  if (step === "request") {
    await clearPreviewChallenges();

    const rel = relationship(field(formData, "relationship"));
    if (!rel) return errorState("Choose a valid relationship.");

    const request: RequestSnapshot = Object.freeze({
      requestId: randomUUID(),
      email: field(formData, "email"),
      telephone: field(formData, "telephone"),
      postcode: field(formData, "postcode"),
      relationship: rel,
      authorityDeclared: boolField(formData, "authorityDeclared"),
      botCheckPassed: boolField(formData, "botCheckPassed"),
      rateLimitPassed: boolField(formData, "rateLimitPassed"),
      riskFlags: field(formData, "riskFlags"),
    });

    try {
      const now = new Date().toISOString();
      const secret = await getOrCreatePreviewSecret();
      const email = issueOtpChallenge({
        requestId: request.requestId,
        channel: "EMAIL",
        destination: request.email,
        now,
        secret,
      });
      const sms = issueOtpChallenge({
        requestId: request.requestId,
        channel: "SMS",
        destination: request.telephone,
        now,
        secret,
      });

      const emailDelivery = await deliverPreviewOtp({
        channel: "EMAIL",
        destination: request.email,
        code: email.code,
      });
      const smsDelivery = await deliverPreviewOtp({
        channel: "SMS",
        destination: request.telephone,
        code: sms.code,
      });

      await savePreviewChallenge("EMAIL", email.challenge);
      await savePreviewChallenge("SMS", sms.challenge);

      return Object.freeze({
        stage: "codes_sent",
        message: "Both verification challenges were issued. Enter the two six-digit codes.",
        request,
        echoedCodes: Object.freeze({
          email: emailDelivery.mode === "echo" ? email.code : null,
          sms: smsDelivery.mode === "echo" ? sms.code : null,
        }),
        decision: null,
      });
    } catch (error) {
      await clearPreviewChallenges();
      const code = error instanceof Error ? error.message : "preview_otp_request_failed";
      return errorState(`Could not issue both codes: ${code}`);
    }
  }

  if (step === "verify") {
    const rel = relationship(field(formData, "relationship"));
    if (!rel) return errorState("The preview request is incomplete. Request fresh codes.");

    const request: RequestSnapshot = Object.freeze({
      requestId: field(formData, "requestId"),
      email: field(formData, "email"),
      telephone: field(formData, "telephone"),
      postcode: field(formData, "postcode"),
      relationship: rel,
      authorityDeclared: boolField(formData, "authorityDeclared"),
      botCheckPassed: boolField(formData, "botCheckPassed"),
      rateLimitPassed: boolField(formData, "rateLimitPassed"),
      riskFlags: field(formData, "riskFlags"),
    });

    const emailChallenge = await loadPreviewChallenge("EMAIL");
    const smsChallenge = await loadPreviewChallenge("SMS");
    if (!emailChallenge || !smsChallenge) {
      return errorState("Verification state is missing or expired. Request fresh codes.");
    }

    try {
      const now = new Date().toISOString();
      const secret = await getOrCreatePreviewSecret();
      const emailResult = verifyOtpChallenge({
        challenge: emailChallenge,
        code: field(formData, "emailCode"),
        destination: request.email,
        now,
        secret,
      });
      const smsResult = verifyOtpChallenge({
        challenge: smsChallenge,
        code: field(formData, "smsCode"),
        destination: request.telephone,
        now,
        secret,
      });

      if (!emailResult.ok || !smsResult.ok) {
        if (!emailResult.ok) await savePreviewChallenge("EMAIL", emailResult.challenge);
        if (!smsResult.ok) await savePreviewChallenge("SMS", smsResult.challenge);
        return Object.freeze({
          stage: "codes_sent",
          message: `Verification failed. Email: ${reason(emailResult) ?? "OK"}; SMS: ${reason(smsResult) ?? "OK"}.`,
          request,
          echoedCodes: null,
          decision: null,
        });
      }

      const decision = authorizeVerifiedLookup({
        request: {
          ...request,
          riskFlags: request.riskFlags
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          asOf: now,
        },
        emailReceipt: emailResult.receipt,
        phoneReceipt: smsResult.receipt,
        secret,
      });
      await clearPreviewChallenges();

      return Object.freeze({
        stage: "decision",
        message: "Verification completed. This preview stops at the authorization boundary; no supplier or meter data was requested.",
        request,
        echoedCodes: null,
        decision: Object.freeze({
          status: decision.status,
          reason: decision.reason,
          lookupAllowed: decision.lookupAllowed,
          supplierInformationReleaseAllowed: decision.supplierInformationReleaseAllowed,
          meterInformationReleaseAllowed: decision.meterInformationReleaseAllowed,
        }),
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "preview_otp_verify_failed";
      return Object.freeze({
        stage: "codes_sent",
        message: `Verification could not complete: ${code}`,
        request,
        echoedCodes: null,
        decision: null,
      });
    }
  }

  return errorState("Choose request or verify.");
}
