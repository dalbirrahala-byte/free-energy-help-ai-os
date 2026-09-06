import assert from "node:assert/strict";
import test from "node:test";

import { createCrmWriteCompletionRecord } from "./crmWriteCompletionRecord.ts";
import type { CrmWritePipelineReceipt } from "./crmWritePipelineReceipt.ts";

const receipt: CrmWritePipelineReceipt = {
  status: "WRITTEN",
  organisationName: "Example Manufacturing Ltd",
  reviewerReference: "reviewer:human",
  authorizationReference: "authz:001",
  idempotencyKey: "factory044:example:001",
  crmRecordReference: "lead:123",
  crmWriteAttempted: true,
  crmWritePerformed: true,
  outreachAllowed: false,
  executionPerformed: false,
};

test("records a safely closed controlled CRM write", () => {
  const result = createCrmWriteCompletionRecord(receipt, {
    status: "CLOSED_SAFE",
    reasons: ["Audit accepted."],
    automaticRetryAllowed: false,
    outreachAllowed: false,
    executionAllowed: false,
  });
  assert.equal(result.disposition, "CLOSED_SAFE");
  assert.equal(result.crmRecordReference, "lead:123");
  assert.equal(result.automaticRetryAllowed, false);
});

test("preserves human-review disposition for uncertain outcomes", () => {
  const result = createCrmWriteCompletionRecord(
    { ...receipt, status: "INDETERMINATE", crmRecordReference: null, crmWritePerformed: false },
    {
      status: "HUMAN_REVIEW_REQUIRED",
      reasons: ["Outcome uncertain."],
      automaticRetryAllowed: false,
      outreachAllowed: false,
      executionAllowed: false,
    },
  );
  assert.equal(result.disposition, "HUMAN_REVIEW_REQUIRED");
  assert.equal(result.crmRecordReference, null);
});

test("fails closed to human review when provenance is incomplete", () => {
  const result = createCrmWriteCompletionRecord(
    { ...receipt, authorizationReference: " " },
    {
      status: "CLOSED_SAFE",
      reasons: ["Audit accepted."],
      automaticRetryAllowed: false,
      outreachAllowed: false,
      executionAllowed: false,
    },
  );
  assert.equal(result.disposition, "HUMAN_REVIEW_REQUIRED");
});

test("completion records never grant retry, outreach, or provider execution", () => {
  const result = createCrmWriteCompletionRecord(receipt, {
    status: "CLOSED_SAFE",
    reasons: [],
    automaticRetryAllowed: false,
    outreachAllowed: false,
    executionAllowed: false,
  });
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionAllowed, false);
});
