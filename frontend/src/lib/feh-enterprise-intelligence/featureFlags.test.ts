import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getFeatureFlagState,
  isEnterpriseIntelligenceEngineEnabled,
  isEnterpriseIntelligenceShadowModeEnabled,
} from "./featureFlags.ts";

test("engine flag defaults to false (rollback-safe: engine is off unless explicitly enabled)", () => {
  delete process.env.USE_ENTERPRISE_INTELLIGENCE_ENGINE;
  assert.equal(isEnterpriseIntelligenceEngineEnabled(), false);
});

test("engine flag is true only when explicitly set to 'true'", () => {
  process.env.USE_ENTERPRISE_INTELLIGENCE_ENGINE = "true";
  try {
    assert.equal(isEnterpriseIntelligenceEngineEnabled(), true);
  } finally {
    delete process.env.USE_ENTERPRISE_INTELLIGENCE_ENGINE;
  }
});

test("shadow mode flag defaults to true", () => {
  delete process.env.ENTERPRISE_INTELLIGENCE_SHADOW_MODE;
  assert.equal(isEnterpriseIntelligenceShadowModeEnabled(), true);
});

test("shadow mode flag is false only when explicitly set to 'false' (instant rollback)", () => {
  process.env.ENTERPRISE_INTELLIGENCE_SHADOW_MODE = "false";
  try {
    assert.equal(isEnterpriseIntelligenceShadowModeEnabled(), false);
  } finally {
    delete process.env.ENTERPRISE_INTELLIGENCE_SHADOW_MODE;
  }
});

test("getFeatureFlagState reflects both flags together", () => {
  delete process.env.USE_ENTERPRISE_INTELLIGENCE_ENGINE;
  delete process.env.ENTERPRISE_INTELLIGENCE_SHADOW_MODE;
  const state = getFeatureFlagState();
  assert.deepEqual(state, { engineEnabled: false, shadowMode: true });
});
