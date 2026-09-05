import assert from "node:assert/strict";
import test from "node:test";

import {
  createControlledCrmPersistenceAdapter,
  type CrmWritePersistencePrimitive,
} from "./controlledCrmPersistenceAdapter.ts";
import type { CrmWritePersistenceCommand } from "./crmWriteTransportBoundary.ts";

const command: CrmWritePersistenceCommand = {
  operation: "create_lead_once",
  organisationName: "Example Manufacturing Ltd",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date.",
  idempotencyKey: "factory044:example:001",
  audit: {
    reviewerReference: "reviewer:dominic",
    authorizationReference: "authz:001",
  },
};

test("delegates exactly one valid command to the injected persistence primitive", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce(received) {
      calls += 1;
      assert.deepEqual(received, command);
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await createControlledCrmPersistenceAdapter(primitive).persistOnce(command);

  assert.equal(calls, 1);
  assert.deepEqual(result, { status: "created", recordReference: "lead:123" });
});

test("fails closed before the primitive when provenance is missing", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      calls += 1;
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await createControlledCrmPersistenceAdapter(primitive).persistOnce({
    ...command,
    audit: { ...command.audit, authorizationReference: " " },
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "blocked");
});

test("fails closed before the primitive when idempotency is missing", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      calls += 1;
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await createControlledCrmPersistenceAdapter(primitive).persistOnce({
    ...command,
    idempotencyKey: " ",
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "blocked");
});

test("preserves duplicate suppression with an existing record reference", async () => {
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      return { status: "duplicate", recordReference: "lead:existing" };
    },
  };

  const result = await createControlledCrmPersistenceAdapter(primitive).persistOnce(command);
  assert.deepEqual(result, { status: "duplicate", recordReference: "lead:existing" });
});

test("treats missing record references as indeterminate", async () => {
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      return { status: "created", recordReference: " " };
    },
  };

  const result = await createControlledCrmPersistenceAdapter(primitive).persistOnce(command);
  assert.equal(result.status, "indeterminate");
});

test("converts primitive exceptions to indeterminate without retrying", async () => {
  let calls = 0;
  const primitive: CrmWritePersistencePrimitive = {
    async createLeadOnce() {
      calls += 1;
      throw new Error("connection dropped");
    },
  };

  const result = await createControlledCrmPersistenceAdapter(primitive).persistOnce(command);

  assert.equal(calls, 1);
  assert.equal(result.status, "indeterminate");
  assert.match(result.reason ?? "", /do not automatically retry/i);
});
