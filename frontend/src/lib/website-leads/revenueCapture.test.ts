import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildRevenueCaptureAttribution,
  buildRevenueCaptureContext,
  MAX_INGEST_CONTEXT_LENGTH,
} from "./revenueCapture.ts";
import { isValidIsoCalendarDate, validateWebsiteLeadForm } from "./validation.ts";
import type { WebsiteLeadFormInput } from "./types.ts";

const validInput: WebsiteLeadFormInput = {
  businessName: "North Street Bakery",
  contactName: "Sam Taylor",
  telephone: "020 7946 0123",
  email: "sam@example.test",
  postcode: "SW1A 1AA",
  renewalTiming: "31_90_days",
  energySupply: "both",
  painPoint: "We would like help understanding our renewal options.",
  contractEndDate: "2026-11-30",
  consent: true,
};

test("revenue MVP input validates deterministically", () => {
  assert.deepEqual(validateWebsiteLeadForm(validInput), {});
  assert.deepEqual(validateWebsiteLeadForm({ ...validInput, energySupply: "", painPoint: "", consent: false }), {
    energySupply: "Select whether your enquiry is about electricity, gas or both.",
    painPoint: "Tell us what you would like help with.",
    consent: "Consent is required so we can contact you about your enquiry.",
  });
});

test("invalid optional contract dates fail without discarding other values", () => {
  assert.equal(validateWebsiteLeadForm({ ...validInput, contractEndDate: "next autumn" }).contractEndDate,
    "Enter a valid contract end date, or leave it blank if unknown.");
});

test("contract date validation accepts blank and real ISO dates but rejects impossible calendar dates", () => {
  assert.equal(validateWebsiteLeadForm({ ...validInput, contractEndDate: "" }).contractEndDate, undefined);
  assert.equal(isValidIsoCalendarDate("2026-11-30"), true);
  for (const impossible of ["2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10"]) {
    assert.equal(isValidIsoCalendarDate(impossible), false, impossible);
    assert.ok(validateWebsiteLeadForm({ ...validInput, contractEndDate: impossible }).contractEndDate);
  }
});

test("explicit campaign wins and malformed attribution never overwrites the safe fallback", () => {
  const attribution = buildRevenueCaptureAttribution({
    campaign: "google-search-august",
    utmSource: "\u0000bad",
    utmCampaign: "utm-campaign",
    acquisitionOrigin: "paid_search",
  });
  assert.equal(attribution.campaign, "google-search-august");
  assert.equal(attribution.utmSource, "paid_search");
  assert.equal(attribution.utmCampaign, "utm-campaign");
});

test("UTM campaign is used when an explicit campaign identifier is absent", () => {
  assert.equal(buildRevenueCaptureAttribution({ utmCampaign: "health-check" }).campaign, "health-check");
});

test("CRM context makes the initial commercial state and unknown owner/follow-up date explicit", () => {
  const context = buildRevenueCaptureContext(validInput, buildRevenueCaptureAttribution({ utmSource: "google" }));
  assert.match(context, /Stage: New/);
  assert.match(context, /Owner: Unassigned/);
  assert.match(context, /Follow-up: Required; date unassigned/);
  assert.match(context, /Permission: Acknowledged for this enquiry/);
  assert.match(context, /Energy: Electricity and gas/);
  assert.ok(context.length <= MAX_INGEST_CONTEXT_LENGTH, "context must fit the existing ingestion contract");
});

test("maximum accepted values never overflow or split fields and retain essential commercial workflow", () => {
  const maximumPainPoint = "P".repeat(160);
  const maximumCampaign = "C".repeat(150);
  const longPostcode = "LONG-BUT-VALID-INPUT-".repeat(40);
  const boundaryInput = {
    ...validInput,
    painPoint: maximumPainPoint,
    postcode: longPostcode,
  };
  assert.deepEqual(validateWebsiteLeadForm(boundaryInput), {});

  const context = buildRevenueCaptureContext(
    boundaryInput,
    buildRevenueCaptureAttribution({ campaign: maximumCampaign }),
  );

  assert.ok(context.length <= MAX_INGEST_CONTEXT_LENGTH);
  assert.match(context, /Stage: New/);
  assert.match(context, /Owner: Unassigned/);
  assert.match(context, /Next: Review and assign follow-up/);
  assert.match(context, /Follow-up: Required; date unassigned/);
  assert.match(context, /Permission: Acknowledged for this enquiry/);
  assert.ok(context.includes(`Reason: ${maximumPainPoint}`));
  assert.ok(context.includes(`Campaign: ${maximumCampaign}`));
  assert.equal(context.includes(longPostcode.slice(0, 100)), false, "oversized lower-priority values are omitted whole");
});
