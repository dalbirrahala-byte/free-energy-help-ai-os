import assert from "node:assert/strict";
import test from "node:test";

import type { CrmWriteExecutionPreparation } from "./crmWriteExecutionPreparation.ts";
import {
  createControlledCrmWriterAdapter,
  type ControlledCrmWriteTransport,
} from "./controlledCrmWriterAdapter.ts";

const prepared: CrmWriteExecutionPreparation = {
  status: "PREPARED_FOR_CONTROLLED_EXECUTION",
  organisationName: " Example Manufacturing Ltd ",
  reviewerReference: " reviewer:dominic ",
  authorizationReference: " authz:001 ",
  idempotencyKey: " factory044:example:001 ",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date.",
  authorizationReasons: ["Human authoriser approved one controlled CRM write."],
  reasons: ["Prepared for controlled execution."],
  crmWriteExecutionReviewRequired: true,
  crmWriteAllowed: true,
  crmWritePerformed: false,
  outreachAllowed: false,
  executionPerformed: false,
};

test("maps one governed transport creation to the Phase 10 writer outcome", async () => {
  const requests: unknown[] = [];
  const transport: ControlledCrmWriteTransport = {
    async writeOnce(request) {
      requests.push(request);
      return { status: "created", crmRecordReference: "lead:123" };
    },
  };

  const result = await createControlledCrmWriterAdapter(transport).writePreparedCandidate(prepared);

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    organisationName: "Example Manufacturing Ltd",
    reviewerReference: "reviewer:dominic",
    authorizationReference: "authz:001",
    idempotencyKey: "factory044:example:001",
    opportunityScore: 82,
    opportunityClassification: "HIGH_PRIORITY",
    nextBestAction: "Verify renewal date.",
  });
  assert.deepEqual(result, { status: "written", crmRecordReference: "lead:123" });
});

test("fails closed before transport when human authorisation provenance is missing", async () => {
  let calls = 0;
  const transport: ControlledCrmWriteTransport = {
    async writeOnce() {
      calls += 1;
      return { status: "created", crmRecordReference: "lead:123" };
    },
  };

  const result = await createControlledCrmWriterAdapter(transport).writePreparedCandidate({
    ...prepared,
    authorizationReference: " ",
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "blocked");
});

test("fails closed before transport when idempotency protection is missing", async () => {
  let calls = 0;
  const transport: ControlledCrmWriteTransport = {
    async writeOnce() {
      calls += 1;
      return { status: "created", crmRecordReference: "lead:123" };
    },
  };

  const result = await createControlledCrmWriterAdapter(transport).writePreparedCandidate({
    ...prepared,
    idempotencyKey: " ",
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "blocked");
});

test("maps duplicate transport result to duplicate suppression", async () => {
  const transport: ControlledCrmWriteTransport = {
    async writeOnce() {
      return { status: "duplicate", crmRecordReference: "lead:existing" };
    },
  };

  const result = await createControlledCrmWriterAdapter(transport).writePreparedCandidate(prepared);
  assert.deepEqual(result, {
    status: "duplicate_suppressed",
    crmRecordReference: "lead:existing",
  });
});

test("does not claim success when transport omits a CRM reference", async () => {
  const transport: ControlledCrmWriteTransport = {
    async writeOnce() {
      return { status: "created", crmRecordReference: " " };
    },
  };

  const result = await createControlledCrmWriterAdapter(transport).writePreparedCandidate(prepared);
  assert.equal(result.status, "indeterminate");
});

test("contains no retry, outreach, provider execution, credentials, or Supabase implementation", async () => {
  let calls = 0;
  const transport: ControlledCrmWriteTransport = {
    async writeOnce() {
      calls += 1;
      return { status: "indeterminate", reason: "unknown write outcome" };
    },
  };

  const result = await createControlledCrmWriterAdapter(transport).writePreparedCandidate(prepared);
  assert.equal(calls, 1);
  assert.deepEqual(result, { status: "indeterminate", reason: "unknown write outcome" });
});
