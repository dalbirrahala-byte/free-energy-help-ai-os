import assert from "node:assert/strict";
import { test } from "node:test";

import { getWorker, listWorkerDescriptors, WORKER_REGISTRY } from "./workerRegistry.ts";
import type { WorkerId } from "./types";

const ALL_WORKER_IDS: WorkerId[] = [
  "salesDirector",
  "marketingDirector",
  "commercialEnergyIntelligence",
  "renewalIntelligence",
  "customerSuccess",
  "compliance",
  "voice",
  "executiveReporting",
];

test("all 8 mission-brief workers are registered", () => {
  for (const id of ALL_WORKER_IDS) {
    assert.ok(WORKER_REGISTRY[id], `Expected worker "${id}" to be registered`);
  }
  assert.equal(Object.keys(WORKER_REGISTRY).length, 8);
});

test("every registered worker returns a valid descriptor", () => {
  const descriptors = listWorkerDescriptors();
  assert.equal(descriptors.length, 8);
  for (const descriptor of descriptors) {
    assert.ok(descriptor.id);
    assert.ok(descriptor.name.length > 0);
    assert.ok(descriptor.responsibility.length > 0);
    assert.ok(Array.isArray(descriptor.capabilities));
    assert.ok(["operational", "not_yet_configured", "error"].includes(descriptor.status));
  }
});

test("exactly 2 workers are operational; the other 6 are honestly not yet configured", () => {
  const descriptors = listWorkerDescriptors();
  const operational = descriptors.filter((d) => d.status === "operational");
  const notConfigured = descriptors.filter((d) => d.status === "not_yet_configured");

  assert.equal(operational.length, 2);
  assert.deepEqual(
    operational.map((d) => d.id).sort(),
    ["commercialEnergyIntelligence", "renewalIntelligence"],
  );
  assert.equal(notConfigured.length, 6);
});

test("not-yet-configured workers never claim an implemented capability", () => {
  const descriptors = listWorkerDescriptors().filter((d) => d.status === "not_yet_configured");
  for (const descriptor of descriptors) {
    for (const capability of descriptor.capabilities) {
      assert.equal(capability.implemented, false, `${descriptor.id}.${capability.id} should not claim implemented: true`);
    }
  }
});

test("getWorker returns undefined for an unregistered id", () => {
  // @ts-expect-error deliberately invalid id for this test
  assert.equal(getWorker("notARealWorker"), undefined);
});
