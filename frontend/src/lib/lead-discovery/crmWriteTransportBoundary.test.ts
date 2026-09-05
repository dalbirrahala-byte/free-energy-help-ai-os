import assert from "node:assert/strict";
import test from "node:test";

import {
  createCrmWriteTransportBoundary,
  type CrmWritePersistencePort,
} from "./crmWriteTransportBoundary.ts";

const request = {
  organisationName: " Example Manufacturing Ltd ",
  reviewerReference: " reviewer:dominic ",
  authorizationReference: " authz:001 ",
  idempotencyKey: " factory044:example:001 ",
  opportunityScore: 82,
  opportunityClassification: "HIGH_PRIORITY",
  nextBestAction: "Verify renewal date.",
} as const;

test("translates one controlled write into one narrow persistence command", async () => {
  const commands: unknown[] = [];
  const persistence: CrmWritePersistencePort = {
    async persistOnce(command) {
      commands.push(command);
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await createCrmWriteTransportBoundary(persistence).writeOnce(request);

  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0], {
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
  });
  assert.deepEqual(result, { status: "created", crmRecordReference: "lead:123" });
});

test("fails closed before persistence when provenance is missing", async () => {
  let calls = 0;
  const persistence: CrmWritePersistencePort = {
    async persistOnce() {
      calls += 1;
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await createCrmWriteTransportBoundary(persistence).writeOnce({
    ...request,
    authorizationReference: " ",
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "blocked");
});

test("fails closed before persistence when idempotency key is missing", async () => {
  let calls = 0;
  const persistence: CrmWritePersistencePort = {
    async persistOnce() {
      calls += 1;
      return { status: "created", recordReference: "lead:123" };
    },
  };

  const result = await createCrmWriteTransportBoundary(persistence).writeOnce({
    ...request,
    idempotencyKey: " ",
  });

  assert.equal(calls, 0);
  assert.equal(result.status, "blocked");
});

test("preserves duplicate suppression", async () => {
  const persistence: CrmWritePersistencePort = {
    async persistOnce() {
      return { status: "duplicate", recordReference: "lead:existing" };
    },
  };

  const result = await createCrmWriteTransportBoundary(persistence).writeOnce(request);
  assert.deepEqual(result, {
    status: "duplicate",
    crmRecordReference: "lead:existing",
  });
});

test("does not claim success when persistence omits its record reference", async () => {
  const persistence: CrmWritePersistencePort = {
    async persistOnce() {
      return { status: "created", recordReference: " " };
    },
  };

  const result = await createCrmWriteTransportBoundary(persistence).writeOnce(request);
  assert.equal(result.status, "indeterminate");
});

test("performs no retry when persistence returns an indeterminate result", async () => {
  let calls = 0;
  const persistence: CrmWritePersistencePort = {
    async persistOnce() {
      calls += 1;
      return { status: "indeterminate", reason: "unknown database outcome" };
    },
  };

  const result = await createCrmWriteTransportBoundary(persistence).writeOnce(request);
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    status: "indeterminate",
    reason: "unknown database outcome",
  });
});
