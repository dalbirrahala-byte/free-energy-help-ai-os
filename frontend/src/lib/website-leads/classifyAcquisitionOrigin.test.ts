import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyAcquisitionOrigin, isAcquisitionOrigin } from "./classifyAcquisitionOrigin.ts";

test("no referrer at all classifies as direct", () => {
  const result = classifyAcquisitionOrigin({ referrer: null });
  assert.equal(result.origin, "direct");
  assert.equal(result.matchedHostname, null);
});

test("empty-string referrer classifies as direct, same as absent", () => {
  const result = classifyAcquisitionOrigin({ referrer: "   " });
  assert.equal(result.origin, "direct");
});

test("organic Google search referrer classifies as organic_search", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://www.google.com/search?q=business+energy" });
  assert.equal(result.origin, "organic_search");
  assert.equal(result.matchedHostname, "google.com");
});

test("Google country-TLD referrer (google.co.uk) also classifies as organic_search", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://www.google.co.uk/search?q=energy" });
  assert.equal(result.origin, "organic_search");
});

test("organic Bing search referrer classifies as organic_search, not ai_search", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://www.bing.com/search?q=business+energy" });
  assert.equal(result.origin, "organic_search");
  assert.equal(result.matchedHostname, "bing.com");
});

test("recognised AI-search referrer (chatgpt.com) classifies as ai_search", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://chatgpt.com/" });
  assert.equal(result.origin, "ai_search");
  assert.equal(result.matchedHostname, "chatgpt.com");
});

test("recognised AI-search referrer (perplexity.ai) classifies as ai_search", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://www.perplexity.ai/search?q=energy+brokers" });
  assert.equal(result.origin, "ai_search");
  assert.equal(result.matchedHostname, "perplexity.ai");
});

test("Copilot referrer (copilot.microsoft.com) classifies as ai_search", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://copilot.microsoft.com/" });
  assert.equal(result.origin, "ai_search");
});

test("organic social referrer (facebook.com) classifies as organic_social", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://www.facebook.com/" });
  assert.equal(result.origin, "organic_social");
  assert.equal(result.matchedHostname, "facebook.com");
});

test("ordinary third-party referral classifies as referral", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://some-unrelated-blog.example/post-123" });
  assert.equal(result.origin, "referral");
  assert.equal(result.matchedHostname, "some-unrelated-blog.example");
});

test("malformed referrer string classifies as unknown, never throws", () => {
  const result = classifyAcquisitionOrigin({ referrer: "not a valid url ///:::" });
  assert.equal(result.origin, "unknown");
  assert.equal(result.matchedHostname, null);
});

test("self-referral (referrer hostname matches our own site hostname) classifies as direct", () => {
  const result = classifyAcquisitionOrigin({
    referrer: "https://www.freeenergyhelp.example/some-other-page",
    siteHostname: "freeenergyhelp.example",
  });
  assert.equal(result.origin, "direct");
});

test("referrer present but siteHostname not supplied still classifies normally (self-referral check is optional)", () => {
  const result = classifyAcquisitionOrigin({ referrer: "https://www.google.com/search?q=x" });
  assert.equal(result.origin, "organic_search");
});

test("classification is a pure function: identical input always yields identical output", () => {
  const input = { referrer: "https://chatgpt.com/", siteHostname: "example.com" };
  const first = classifyAcquisitionOrigin(input);
  const second = classifyAcquisitionOrigin(input);
  assert.deepEqual(first, second);
});

test("isAcquisitionOrigin accepts every real category and rejects arbitrary strings", () => {
  assert.equal(isAcquisitionOrigin("direct"), true);
  assert.equal(isAcquisitionOrigin("ai_search"), true);
  assert.equal(isAcquisitionOrigin("organic_search"), true);
  assert.equal(isAcquisitionOrigin("organic_social"), true);
  assert.equal(isAcquisitionOrigin("referral"), true);
  assert.equal(isAcquisitionOrigin("unknown"), true);
  assert.equal(isAcquisitionOrigin("paid_search"), false);
  assert.equal(isAcquisitionOrigin("website"), false);
  assert.equal(isAcquisitionOrigin(""), false);
  assert.equal(isAcquisitionOrigin("<script>alert(1)</script>"), false);
});
