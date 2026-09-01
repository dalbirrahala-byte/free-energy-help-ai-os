import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRevenueCaptureAttribution } from "./revenueCapture.ts";
import {
  buildHealthCheckConversion,
  conversionAfterIngestion,
  HEALTH_CHECK_CONVERSION_EVENT,
  machineAttributionToken,
} from "./healthCheckConversion.ts";

const attribution = buildRevenueCaptureAttribution({
  campaign: "health-check_search-2026.08",
  utmSource: "google",
  utmMedium: "cpc",
  utmTerm: "must-not-escape",
  utmContent: "must-not-escape",
});

test("created lead produces one minimal machine-token conversion", () => {
  assert.deepEqual(conversionAfterIngestion({ success: true, leadId: 42, disposition: "created" }, attribution), {
    event: HEALTH_CHECK_CONVERSION_EVENT,
    leadReference: "lead-42",
    attribution: {
      campaignId: "health-check_search-2026.08",
      source: "google",
      medium: "cpc",
    },
  });
});

test("duplicate, validation failure, and persistence failure produce no conversion", () => {
  assert.equal(conversionAfterIngestion({ success: true, leadId: 42, disposition: "duplicate_suppressed" }, attribution), null);
  assert.equal(conversionAfterIngestion({ success: false, disposition: "failed" }, attribution), null);
});

test("a thrown persistence error exits before conversion construction", () => {
  const submitThenConvert = () => {
    throw new Error("transport failed");
  };
  assert.throws(submitThenConvert, /transport failed/);
});

test("conversion rejects invalid internal lead references", () => {
  for (const id of [0, -1, Number.NaN, 1.5]) {
    assert.throws(() => buildHealthCheckConversion(id, attribution));
  }
});

test("machine attribution rejects adversarial free text and PII-like values", () => {
  for (const unsafe of [
    "person@example.test",
    "campaign-07700900123",
    "spring campaign offer",
    "line\nbreak",
    "x".repeat(81),
    "campaign/value",
  ]) {
    assert.equal(machineAttributionToken(unsafe), null, unsafe);
  }
  for (const safe of ["google", "cpc", "health-check_search-2026.08", "paid_search"]) {
    assert.equal(machineAttributionToken(safe), safe);
  }
});

test("event never exposes raw term, content, contact, or enquiry fields", () => {
  const event = buildHealthCheckConversion(7, attribution);
  assert.deepEqual(Object.keys(event).sort(), ["attribution", "event", "leadReference"]);
  assert.deepEqual(Object.keys(event.attribution).sort(), ["campaignId", "medium", "source"]);
  const serialized = JSON.stringify(event);
  for (const forbidden of ["utmTerm", "utmContent", "telephone", "email", "contactName", "painPoint", "must-not-escape"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
