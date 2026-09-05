import assert from "node:assert/strict";
import test from "node:test";

import { createCrmWritePipelineReceipt } from "./crmWritePipelineReceipt.ts";
import type { ControlledCrmWriteExecutionResult } from "./executeControlledCrmWrite.ts";

const result: ControlledCrmWriteExecutionResult = {
  status: "WRITTEN",
  organisationName: " Example Manufacturing Ltd ",
  reviewerReference: " reviewer:human ",
  authorizationReference: " authz:001 ",
  idempotencyKey: " factory044:example:001 ",
  crmRecordReference: " lead:123 ",
  reasons: ["Controlled write completed."],
  crmWriteAllowed: true,
  crmWriteAttempted: true,
  crmWritePerformed: true,
  outreachAllowed: false,
  executionPerformed: false,
};

test("creates a deterministic receipt preserving controlled-write provenance", () => {
  assert.deepEqual(createCrmWritePipelineReceipt(result), {
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
  });
});

test("normalises absent CRM references without inventing success", () => {
  const receipt = createCrmWritePipelineReceipt({
    ...result,
    status: "INDETERMINATE",
    crmRecordReference: null,
    crmWritePerformed: false,
  });

  assert.equal(receipt.status, "INDETERMINATE");
  assert.equal(receipt.crmRecordReference, null);
  assert.equal(receipt.crmWritePerformed, false);
});

test("receipt can never enable outreach or provider execution", () => {
  const receipt = createCrmWritePipelineReceipt(result);
  assert.equal(receipt.outreachAllowed, false);
  assert.equal(receipt.executionPerformed, false);
});
