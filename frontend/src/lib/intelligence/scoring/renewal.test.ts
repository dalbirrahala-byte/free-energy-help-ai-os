import assert from "node:assert/strict";
import { test } from "node:test";

import type { LeadRecord } from "../types";
import { scoreRenewal } from "./renewal.ts";

function makeLead(contractEnd: string | null): LeadRecord {
  return {
    id: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    company_name: "Test Co",
    contact_name: "Test Contact",
    telephone: "01234 567890",
    email: "test@example.com",
    supplier: "Test Supplier",
    contract_end: contractEnd,
    status: "New",
    notes: null,
    lead_source: null,
    source_detail: null,
    source_provenance: "user-entered",
  };
}

function offsetDateKey(base: Date, days: number): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Fixed reference "today" — 2027-01-01 is not a leap year, kept separate
// from the dedicated leap-year cases below.
const TODAY = new Date(2027, 0, 1);

test("overdue date (10 days in the past) classifies as Overdue", () => {
  const lead = makeLead(offsetDateKey(TODAY, -10));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Overdue");
  assert.equal(result.daysRemaining, -10);
  assert.equal(result.confidence, "High");
  assert.equal(result.tenderWindowStatus, "Overdue");
  assert.equal(result.procurementStatus, "Contract date has passed — investigate current supply status immediately");
});

test("contract end date is today (0 days remaining) classifies as Critical", () => {
  const lead = makeLead(offsetDateKey(TODAY, 0));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Critical");
  assert.equal(result.daysRemaining, 0);
  assert.equal(result.tenderWindowStatus, "Open");
});

test("30 days remaining classifies as Critical (upper boundary)", () => {
  const lead = makeLead(offsetDateKey(TODAY, 30));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Critical");
  assert.equal(result.daysRemaining, 30);
});

test("31 days remaining classifies as Urgent (lower boundary)", () => {
  const lead = makeLead(offsetDateKey(TODAY, 31));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Urgent");
  assert.equal(result.daysRemaining, 31);
});

test("90 days remaining classifies as Urgent (upper boundary)", () => {
  const lead = makeLead(offsetDateKey(TODAY, 90));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Urgent");
  assert.equal(result.daysRemaining, 90);
  assert.equal(result.tenderWindowStatus, "Open");
});

test("91 days remaining classifies as Approaching (lower boundary)", () => {
  const lead = makeLead(offsetDateKey(TODAY, 91));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Approaching");
  assert.equal(result.daysRemaining, 91);
});

test("180 days remaining classifies as Approaching (upper boundary)", () => {
  const lead = makeLead(offsetDateKey(TODAY, 180));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Approaching");
  assert.equal(result.daysRemaining, 180);
  assert.equal(result.tenderWindowStatus, "Open");
});

test("181 days remaining classifies as Future (lower boundary) and tender window is Scheduled", () => {
  const lead = makeLead(offsetDateKey(TODAY, 181));
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Future");
  assert.equal(result.daysRemaining, 181);
  assert.equal(result.tenderWindowStatus, "Scheduled");
  assert.equal(result.tenderStartDate, offsetDateKey(TODAY, 181 - 180));
});

test("missing contract end date classifies as Unknown and fails safe", () => {
  const lead = makeLead(null);
  const result = scoreRenewal(lead, TODAY);

  assert.equal(result.urgency, "Unknown");
  assert.equal(result.daysRemaining, null);
  assert.equal(result.contractEndDate, null);
  assert.equal(result.confidence, "Low");
  assert.equal(result.tenderStartDate, null);
  assert.equal(result.tenderWindowStatus, "Unknown");
  assert.equal(result.procurementStatus, "Confirm current supplier and contract end date");
});

test("invalid contract end date classifies as Unknown and fails safe (does not throw)", () => {
  const lead = makeLead("not-a-real-date-value");

  assert.doesNotThrow(() => scoreRenewal(lead, TODAY));

  const result = scoreRenewal(lead, TODAY);
  assert.equal(result.urgency, "Unknown");
  assert.equal(result.daysRemaining, null);
  assert.equal(result.contractEndDate, null);
  assert.equal(result.confidence, "Low");
});

test("leap-year boundary: Feb 1 to Mar 1 in a leap year is 29 days", () => {
  const leapToday = new Date(2028, 1, 1); // 2028-02-01, 2028 is a leap year
  const lead = makeLead("2028-03-01");
  const result = scoreRenewal(lead, leapToday);

  assert.equal(result.daysRemaining, 29);
  assert.equal(result.urgency, "Critical");
});

test("non-leap-year contrast: Feb 1 to Mar 1 in a non-leap year is 28 days", () => {
  const nonLeapToday = new Date(2027, 1, 1); // 2027-02-01, 2027 is not a leap year
  const lead = makeLead("2027-03-01");
  const result = scoreRenewal(lead, nonLeapToday);

  assert.equal(result.daysRemaining, 28);
  assert.equal(result.urgency, "Critical");
});

test("recommendedNextAction always matches procurementStatus (V1's documented behaviour, carried over)", () => {
  const cases = [null, offsetDateKey(TODAY, -5), offsetDateKey(TODAY, 45), offsetDateKey(TODAY, 200)];

  for (const contractEnd of cases) {
    const result = scoreRenewal(makeLead(contractEnd), TODAY);
    assert.equal(result.recommendedNextAction, result.procurementStatus);
  }
});

test("dataSource and calculatedAt are always populated and traceable", () => {
  const result = scoreRenewal(makeLead(offsetDateKey(TODAY, 10)), TODAY);

  assert.equal(result.dataSource, "lead.contract_end");
  assert.equal(result.calculatedAt, TODAY.toISOString());
});
