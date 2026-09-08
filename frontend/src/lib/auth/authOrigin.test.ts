import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalAuthUrl,
  getCanonicalAuthOrigin,
  isCanonicalAuthOrigin,
} from "./authOrigin.ts";

test("defaults to the canonical FEH CRM origin", () => {
  assert.equal(getCanonicalAuthOrigin(), "https://free-energy-help-ai-os.vercel.app");
});

test("recognizes only the canonical auth origin", () => {
  assert.equal(isCanonicalAuthOrigin("https://free-energy-help-ai-os.vercel.app"), true);
  assert.equal(
    isCanonicalAuthOrigin("https://free-energy-help-ai-os-git-fix-crm-logi-eae1a2-free-energy-help.vercel.app"),
    false,
  );
  assert.equal(isCanonicalAuthOrigin("not-a-url"), false);
});

test("builds only same-site canonical auth URLs", () => {
  assert.equal(
    canonicalAuthUrl("/forgot-password"),
    "https://free-energy-help-ai-os.vercel.app/forgot-password",
  );
  assert.equal(
    canonicalAuthUrl("//evil.example/reset"),
    "https://free-energy-help-ai-os.vercel.app/",
  );
});
