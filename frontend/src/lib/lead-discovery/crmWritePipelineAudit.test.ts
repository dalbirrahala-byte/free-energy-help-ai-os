import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCrmWritePipelineReceipt } from "./crmWritePipelineAudit.ts";
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

test("accepts a complete written receipt", () => {
  assert.equal(evaluateCrmWritePipelineReceipt(receipt).status, "ACCEPTED");
});

test("rejects a written receipt that claims no write was performed", () => {
  assert.equal(
    evaluateCrmWritePipelineReceipt({ ...receipt, crmWritePerformed: false }).status,
    "REJECTED",
  );
});

test("accepts duplicate suppression only when no new write was performed", () => {
  assert.equal(
    evaluateCrmWritePipelineReceipt({
      ...receipt,
      status: "DUPLICATE_SUPPRESSED",
      crmWritePerformed: false,
    }).status,
    "ACCEPTED",
  );
});

test("requires review for indeterminate outcomes rather than retrying", () => {
  assert.equal(
    evaluateCrmWritePipelineReceipt({
      ...receipt,
      status: "INDETERMINATE",
      crmRecordReference: null,
      crmWritePerformed: false,
    }).status,
    "REVIEW_REQUIRED",
  );
});

test("rejects missing authorisation provenance", () => {
  assert.equal(
    evaluateCrmWritePipelineReceipt({ ...receipt, authorizationReference: " " }).status,
    "REJECTED",
  );
});

test("blocked outcomes are accepted as safe non-mutations", () => {
  assert.equal(
    evaluateCrmWritePipelineReceipt({
      ...receipt,
      status: "BLOCKED",
      crmRecordReference: null,
      crmWriteAttempted: false,
      crmWritePerformed: false,
    }).status,
    "ACCEPTED",
  );
});
