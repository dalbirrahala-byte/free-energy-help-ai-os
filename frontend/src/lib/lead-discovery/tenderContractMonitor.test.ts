import assert from "node:assert/strict";
import test from "node:test";

import {
  mapContractExpiryToIntentSignal,
  mapPublicTenderToIntentSignal,
} from "./tenderContractMonitor.ts";
import { assessIntentRadarSignal } from "./intentRadar.ts";

const asOf = new Date("2026-09-23T12:00:00Z");

const officialTender = {
  companyName: "Example Manufacturing Ltd",
  companyNumber: "12345678",
  companyDomain: "example-manufacturing.co.uk",
  tenderReference: "TENDER-2026-42",
  sourceUrl: "https://www.find-tender.service.gov.uk/Notice/012345-2026",
  publishedAt: "2026-09-20T09:00:00Z",
  closesAt: "2026-10-20T12:00:00Z",
  title: "Electricity and gas supply procurement",
  exactOrganisationMatch: true,
  sourceOfficial: true,
} as const;

test("known near-term FEH contract expiry becomes verified first-party renewal evidence", () => {
  const signal = mapContractExpiryToIntentSignal({
    companyName: "Example Manufacturing Ltd",
    companyNumber: "12345678",
    companyDomain: "example-manufacturing.co.uk",
    contractEnd: "2026-11-15",
    contractReference: "site-001-electricity",
  }, asOf);

  assert.ok(signal);
  assert.equal(signal.source, "TENDER_CONTRACT");
  assert.equal(signal.provenance, "FIRST_PARTY");
  assert.equal(signal.evidenceBasis, "VERIFIED_FACT");
  assert.equal(signal.strength, "STRONG");

  const assessment = assessIntentRadarSignal(signal, asOf.toISOString());
  assert.equal(assessment.apolloEnrichmentAllowed, true);
  assert.equal(assessment.crmWriteAllowed, false);
  assert.equal(assessment.outreachAllowed, false);
});

test("missing, expired or distant contract dates do not fabricate an opportunity", () => {
  assert.equal(mapContractExpiryToIntentSignal({
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    contractEnd: null,
    contractReference: "site-001",
  }, asOf), null);

  assert.equal(mapContractExpiryToIntentSignal({
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    contractEnd: "2026-01-01",
    contractReference: "site-001",
  }, asOf), null);

  assert.equal(mapContractExpiryToIntentSignal({
    companyName: "Example Manufacturing Ltd",
    companyDomain: "example-manufacturing.co.uk",
    contractEnd: "2027-12-31",
    contractReference: "site-001",
  }, asOf), null);
});

test("official exact-organisation open tender becomes verified; weak association remains inference", () => {
  const verified = mapPublicTenderToIntentSignal(officialTender, asOf);
  assert.ok(verified);
  assert.equal(verified.evidenceBasis, "VERIFIED_FACT");
  assert.equal(verified.sourceVerified, true);
  assert.equal(verified.strength, "STRONG");
  assert.equal(verified.provenance, "PUBLIC_OFFICIAL");

  const inferred = mapPublicTenderToIntentSignal({
    ...officialTender,
    tenderReference: "TENDER-2026-43",
    sourceUrl: "https://example.org/tender/43",
    title: "Possible energy procurement notice",
    exactOrganisationMatch: false,
    sourceOfficial: false,
  }, asOf);
  assert.ok(inferred);
  assert.equal(inferred.evidenceBasis, "INFERENCE");
  assert.equal(inferred.sourceVerified, false);
  assert.equal(inferred.provenance, "PUBLIC_WEB");
  assert.equal(assessIntentRadarSignal(inferred, asOf.toISOString()).apolloEnrichmentAllowed, false);
});

test("an arbitrary web source cannot be promoted by setting sourceOfficial true", () => {
  assert.throws(
    () => mapPublicTenderToIntentSignal({
      ...officialTender,
      tenderReference: "FALSE-OFFICIAL",
      sourceUrl: "https://example.org/tender/false-official",
      sourceOfficial: true,
    }, asOf),
    /unverified_official_tender_source/,
  );
});

test("reviewed official tender host requires HTTPS before it can become verified provenance", () => {
  assert.throws(
    () => mapPublicTenderToIntentSignal({
      ...officialTender,
      tenderReference: "HTTP-DOWNGRADE",
      sourceUrl: "http://www.find-tender.service.gov.uk/Notice/012345-2026",
      sourceOfficial: true,
    }, asOf),
    /unverified_official_tender_source/,
  );

  const inferred = mapPublicTenderToIntentSignal({
    ...officialTender,
    tenderReference: "HTTP-INFERENCE",
    sourceUrl: "http://www.find-tender.service.gov.uk/Notice/012346-2026",
    sourceOfficial: false,
  }, asOf);
  assert.ok(inferred);
  assert.equal(inferred.evidenceBasis, "INFERENCE");
  assert.equal(inferred.sourceVerified, false);
  assert.equal(inferred.provenance, "PUBLIC_WEB");
});

test("tender timestamps require explicit timezone and real calendar dates", () => {
  assert.throws(
    () => mapPublicTenderToIntentSignal({ ...officialTender, publishedAt: "2026-09-20T09:00:00" }, asOf),
    /invalid_tender_date/,
  );
  assert.throws(
    () => mapPublicTenderToIntentSignal({ ...officialTender, closesAt: "2026-02-31T12:00:00Z" }, asOf),
    /invalid_tender_date/,
  );
});

test("closed tender is ignored and invalid tender window fails closed", () => {
  assert.equal(mapPublicTenderToIntentSignal({
    ...officialTender,
    tenderReference: "CLOSED-1",
    sourceUrl: "https://www.find-tender.service.gov.uk/Notice/000001-2026",
    publishedAt: "2026-08-01T09:00:00Z",
    closesAt: "2026-09-01T12:00:00Z",
    title: "Closed tender",
  }, asOf), null);

  assert.throws(() => mapPublicTenderToIntentSignal({
    ...officialTender,
    tenderReference: "BAD-WINDOW",
    sourceUrl: "https://www.find-tender.service.gov.uk/Notice/000002-2026",
    publishedAt: "2026-10-01T09:00:00Z",
    closesAt: "2026-09-01T12:00:00Z",
    title: "Bad tender",
  }, asOf), /invalid_tender_window/);
});
