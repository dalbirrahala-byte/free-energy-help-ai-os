import type { RevenueCaptureAttribution } from "./revenueCapture.ts";

export const HEALTH_CHECK_CONVERSION_EVENT = "feh:health-check-lead-persisted";

export type HealthCheckConversion = {
  event: typeof HEALTH_CHECK_CONVERSION_EVENT;
  leadReference: string;
  attribution: {
    campaignId: string | null;
    source: string | null;
    medium: string | null;
  };
};

const MAX_MACHINE_TOKEN_LENGTH = 80;
const MACHINE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/** Rejects raw/free-text attribution rather than transforming it into a misleading token. */
export function machineAttributionToken(value: string | null): string | null {
  if (!value || value.length > MAX_MACHINE_TOKEN_LENGTH || !MACHINE_TOKEN.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 7) return null;
  return value;
}

/** Builds the provider-neutral, deliberately PII-free post-ingestion event. */
export function buildHealthCheckConversion(
  leadId: number,
  attribution: RevenueCaptureAttribution,
): HealthCheckConversion {
  if (!Number.isSafeInteger(leadId) || leadId <= 0) {
    throw new Error("A persisted lead reference is required");
  }

  return {
    event: HEALTH_CHECK_CONVERSION_EVENT,
    leadReference: `lead-${leadId}`,
    attribution: {
      campaignId: machineAttributionToken(attribution.campaign),
      source: machineAttributionToken(attribution.utmSource),
      medium: machineAttributionToken(attribution.utmMedium),
    },
  };
}

export function conversionAfterIngestion(
  result:
    | { success: true; leadId: number; disposition: "created" | "duplicate_suppressed" }
    | { success: false; disposition: "failed" },
  attribution: RevenueCaptureAttribution,
): HealthCheckConversion | null {
  return result.success && result.disposition === "created"
    ? buildHealthCheckConversion(result.leadId, attribution)
    : null;
}

/** Local browser boundary only: no tag, credential, SDK, or network transport is activated. */
export function emitHealthCheckConversion(conversion: HealthCheckConversion): void {
  window.dispatchEvent(new CustomEvent(HEALTH_CHECK_CONVERSION_EVENT, { detail: conversion }));
}
