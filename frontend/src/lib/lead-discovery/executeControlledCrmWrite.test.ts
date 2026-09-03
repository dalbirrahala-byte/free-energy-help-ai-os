import assert from "node:assert/strict";
import test from "node:test";

import type { CrmWriteExecutionPreparation } from "./crmWriteExecutionPreparation.ts";
import {
  executeControlledCrmWrite,
  type ControlledCrmWriter,
} from "./executeControlledCrmWrite.ts";

const prepared: CrmWriteExecutionPreparation = {
  status: "PREPARED_FOR_CONTROLLED_EXECUTION",
  organisationName: "Example Manufacturing Ltd",
  reviewerReference: "reviewer:dominic",
  authorizationReference: "authz:crm-write:001",
  idempotencyKey: "factory044:example-manufacturing:001",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date with decision-maker.",
  authorizationReasons: ["Human authoriser approved one controlled CRM write."],
  reasons: ["Authorised CRM write has been prepared for a separate controlled execution review."],
  crmWriteExecutionReviewRequired: true,
  crmWriteAllowed: true,
  crmWritePerformed: false,
  outreachAllowed: false,
  executionPerformed: false,
};

function writerReturning(
  outcome: Awaited<ReturnType<ControlledCrmWriter["writePreparedCandidate"]>>,
  calls: { count: number },
): ControlledCrmWriter {
  return {
    async writePreparedCandidate() {
      calls.count += 1;
      return outcome;
    },
  };
}

test("performs exactly one controlled CRM write for a valid preparation", async () => {
  const calls = { count: 0 };
  const result = await executeControlledCrmWrite(
    writerReturning({ status: "written", crmRecordReference: "lead:123" }, calls),
    prepared,
  );

  assert.equal(calls.count, 1);
  assert.equal(result.status, "WRITTEN");
  assert.equal(result.crmRecordReference, "lead:123");
  assert.equal(result.crmWritePerformed, true);
  assert.equal(result.executionPerformed, true);
  assert.equal(result.outreachAllowed, false);
});

test("fails closed before invoking writer when preparation is not execution-ready", async () => {
  const calls = { count: 0 };
  const result = await executeControlledCrmWrite(
    writerReturning({ status: "written", crmRecordReference: "lead:123" }, calls),
    { ...prepared, status: "BLOCKED", crmWriteAllowed: false },
  );

  assert.equal(calls.count, 0);
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.executionPerformed, false);
});

test("fails closed before invoking writer when idempotency key is missing", async () => {
  const calls = { count: 0 };
  const result = await executeControlledCrmWrite(
    writerReturning({ status: "written", crmRecordReference: "lead:123" }, calls),
    { ...prepared, idempotencyKey: "   " },
  );

  assert.equal(calls.count, 0);
  assert.equal(result.status, "BLOCKED");
});

test("suppresses a duplicate without marking a new CRM write as performed", async () => {
  const calls = { count: 0 };
  const result = await executeControlledCrmWrite(
    writerReturning({ status: "duplicate_suppressed", crmRecordReference: "lead:123" }, calls),
    prepared,
  );

  assert.equal(calls.count, 1);
  assert.equal(result.status, "DUPLICATE_SUPPRESSED");
  assert.equal(result.crmRecordReference, "lead:123");
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(result.outreachAllowed, false);
});

test("treats writer exceptions as indeterminate and does not retry", async () => {
  const calls = { count: 0 };
  const writer: ControlledCrmWriter = {
    async writePreparedCandidate() {
      calls.count += 1;
      throw new Error("database connection dropped after mutation boundary");
    },
  };

  const result = await executeControlledCrmWrite(writer, prepared);

  assert.equal(calls.count, 1);
  assert.equal(result.status, "INDETERMINATE");
  assert.equal(result.crmWritePerformed, false);
  assert.equal(result.executionPerformed, false);
  assert.match(result.reasons.join(" "), /must not be automatically retried/i);
});

test("rejects success without a CRM record reference", async () => {
  const calls = { count: 0 };
  const result = await executeControlledCrmWrite(
    writerReturning({ status: "written", crmRecordReference: "   " }, calls),
    prepared,
  );

  assert.equal(calls.count, 1);
  assert.equal(result.status, "EVALUATION_FAILED");
  assert.equal(result.crmWritePerformed, false);
});

test("never enables outreach regardless of controlled writer outcome", async () => {
  for (const outcome of [
    { status: "written" as const, crmRecordReference: "lead:123" },
    { status: "duplicate_suppressed" as const, crmRecordReference: "lead:123" },
    { status: "blocked" as const, reason: "writer policy blocked" },
    { status: "indeterminate" as const, reason: "unknown database outcome" },
  ]) {
    const calls = { count: 0 };
    const result = await executeControlledCrmWrite(writerReturning(outcome, calls), prepared);
    assert.equal(result.outreachAllowed, false);
  }
});
