import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getOrchestratorFeatureFlagState,
  isAiWorkforceOrchestratorEnabled,
  isAiWorkforceShadowModeEnabled,
} from "./featureFlags.ts";

test("orchestrator flag defaults to false", () => {
  delete process.env.USE_AI_WORKFORCE_ORCHESTRATOR;
  assert.equal(isAiWorkforceOrchestratorEnabled(), false);
});

test("orchestrator flag is true only when explicitly set to 'true'", () => {
  process.env.USE_AI_WORKFORCE_ORCHESTRATOR = "true";
  try {
    assert.equal(isAiWorkforceOrchestratorEnabled(), true);
  } finally {
    delete process.env.USE_AI_WORKFORCE_ORCHESTRATOR;
  }
});

test("shadow mode flag defaults to true", () => {
  delete process.env.AI_WORKFORCE_SHADOW_MODE;
  assert.equal(isAiWorkforceShadowModeEnabled(), true);
});

test("shadow mode flag is false only when explicitly set to 'false' (instant rollback)", () => {
  process.env.AI_WORKFORCE_SHADOW_MODE = "false";
  try {
    assert.equal(isAiWorkforceShadowModeEnabled(), false);
  } finally {
    delete process.env.AI_WORKFORCE_SHADOW_MODE;
  }
});

test("getOrchestratorFeatureFlagState reflects both flags together", () => {
  delete process.env.USE_AI_WORKFORCE_ORCHESTRATOR;
  delete process.env.AI_WORKFORCE_SHADOW_MODE;
  assert.deepEqual(getOrchestratorFeatureFlagState(), { orchestratorEnabled: false, shadowMode: true });
});
