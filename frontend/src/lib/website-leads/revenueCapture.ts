import { ENERGY_SUPPLY_OPTIONS } from "./constants.ts";
import { renewalTimingLabel } from "./labels.ts";
import type { WebsiteLeadFormInput } from "./types.ts";
import { isValidRenewalTiming } from "./validation.ts";

export const REVENUE_CAPTURE_INITIAL_STATE = {
  pipelineStage: "New",
  leadOwner: "Unassigned",
  nextAction: "Review enquiry and assign follow-up.",
  followUp: "Required; date unassigned.",
  contactPermission: "Acknowledged for this enquiry",
} as const;

export type RevenueCaptureAttribution = {
  leadSource: "Website";
  campaign: string | null;
  utmSource: string;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPageOrigin: "Business energy health check";
};

const MAX_ATTRIBUTION_LENGTH = 150;
export const MAX_INGEST_CONTEXT_LENGTH = 500;

export function cleanAttributionValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > MAX_ATTRIBUTION_LENGTH || /[\u0000-\u001f\u007f]/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export function buildRevenueCaptureAttribution(input: {
  campaign?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  acquisitionOrigin?: string | null;
}): RevenueCaptureAttribution {
  const utmCampaign = cleanAttributionValue(input.utmCampaign);
  return {
    leadSource: "Website",
    campaign: cleanAttributionValue(input.campaign) ?? utmCampaign,
    utmSource: cleanAttributionValue(input.utmSource) ?? input.acquisitionOrigin ?? "direct",
    utmMedium: cleanAttributionValue(input.utmMedium),
    utmCampaign,
    utmContent: cleanAttributionValue(input.utmContent),
    utmTerm: cleanAttributionValue(input.utmTerm),
    landingPageOrigin: "Business energy health check",
  };
}

export function buildRevenueCaptureContext(
  input: WebsiteLeadFormInput,
  attribution: RevenueCaptureAttribution,
): string {
  const supply = ENERGY_SUPPLY_OPTIONS.find((option) => option.value === input.energySupply)?.label;
  const context: string[] = [];
  let contextLength = 0;

  // Priority is deliberate and fail-safe: workflow/contact authority first,
  // followed by the core commercial enquiry, attribution, and optional detail.
  // A line is included whole or not at all; values are never partially sliced.
  const lines = [
    `Stage: ${REVENUE_CAPTURE_INITIAL_STATE.pipelineStage}`,
    `Owner: ${REVENUE_CAPTURE_INITIAL_STATE.leadOwner}`,
    "Next: Review and assign follow-up",
    `Follow-up: ${REVENUE_CAPTURE_INITIAL_STATE.followUp}`,
    `Permission: ${REVENUE_CAPTURE_INITIAL_STATE.contactPermission}`,
    `Reason: ${input.painPoint.trim()}`,
    `Energy: ${supply ?? "Not provided"}`,
    ...(attribution.campaign ? [`Campaign: ${attribution.campaign}`] : []),
    `Contract end: ${input.contractEndDate || "Not known"}`,
    `Renewal: ${isValidRenewalTiming(input.renewalTiming) ? renewalTimingLabel(input.renewalTiming) : "Not provided"}`,
    `Postcode: ${input.postcode.trim().toUpperCase()}`,
    `Landing page: ${attribution.landingPageOrigin}`,
  ];

  for (const line of lines) {
    const separatorLength = context.length === 0 ? 0 : 1;
    if (contextLength + separatorLength + line.length <= MAX_INGEST_CONTEXT_LENGTH) {
      context.push(line);
      contextLength += separatorLength + line.length;
    }
  }

  return context.join("\n");
}
