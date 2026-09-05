import assert from "node:assert/strict";
import test from "node:test";

import type { CrmWriteExecutionPreparation } from "./crmWriteExecutionPreparation.ts";
import { executeControlledCrmWritePipeline } from "./controlledCrmWritePipeline.ts";
import type { CrmWritePersistencePrimitive } from "./controlledCrmPersistenceAdapter.ts";

const prepared: CrmWriteExecutionPreparation = {
  status: "PREPARED_FOR_CONTROLLED_EXECUTION",
  organisationName: "Example Manufacturing Ltd",
  reviewerReference: "reviewer:human",
  authorizationReference: "authz:crm-write:001",
  idempotencyKey: "factory044:example:001",
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

test("composes the controlled boundaries into exactly one primitive call", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce(command) {
      calls += 1;
      assert.equal(command.idempotencyKey, prepared.idempotencyKey);
      assert.equal(command.audit.authorizationReference, prepared.authorizationReference);
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await executeControlledCrmWritePipeline(primitive, prepared);
  assert.equal(calls, 1);
  assert.equal(result.status, "WRITTEN");
  assert.equal(result.crmRecordReference, "lead:123");
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});

test("blocks before the primitive when preparation is not authorised", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      calls += 1;
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await executeControlledCrmWritePipeline(primitive, {
    ...prepared,
    crmWriteAllowed: false,
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "BLOCKED");
});

test("preserves duplicate suppression end to end", async () => {
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      return { status: "duplicate", recordReference: "lead:existing" };
    },
  };

  const result = await executeControlledCrmWritePipeline(primitive, prepared);
  assert.equal(result.status, "DUPLICATE_SUPPRESSED");
  assert.equal(result.crmRecordReference, "lead:existing");
  assert.equal(result.crmWritePerformed, false);
});

test("primitive exception becomes indeterminate with no retry", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      calls += 1;
      throw new Error("unknown persistence outcome");
    },
  };

  const result = await executeControlledCrmWritePipeline(primitive, prepared);
  assert.equal(calls, 1);
  assert.equal(result.status, "INDETERMINATE");
  assert.equal(result.crmWritePerformed, false);
});

test("never enables outreach or provider execution", async () => {
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      return { status: "blocked", reason: "policy hold" };
    },
  };

  const result = await executeControlledCrmWritePipeline(primitive, prepared);
  assert.equal(result.outreachAllowed, false);
  assert.equal(result.executionPerformed, false);
});
