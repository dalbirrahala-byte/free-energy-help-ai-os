import assert from "node:assert/strict";
import { test } from "node:test";
import { isEnquiryIntent, resolveEnquiryIntent } from "./enquiryIntent.ts";

const routes = [
  ["/business-energy-renewal", "renewal"],
  ["/business-energy-change-of-tenancy", "change_of_tenancy"],
  ["/business-energy-bill-help", "billing_issue"],
] as const;

for (const [route, intent] of routes) {
  test(`known first-party ${intent} landing page is page context, NOT declared choice`, () => {
    assert.deepEqual(resolveEnquiryIntent({ serverRoute: route }), {
      intent, evidence: "first_party_page_context", landingRoute: route,
    });
  });
}

test("trailing slash on a known route is canonicalised", () => {
  assert.deepEqual(resolveEnquiryIntent({ serverRoute: "/business-energy-renewal/" }), {
    intent: "renewal", evidence: "first_party_page_context", landingRoute: "/business-energy-renewal",
  });
});

test("unknown or general Health Check route must not invent a reason", () => {
  for (const route of ["/free-business-energy-health-check", "/other", "", null, {}]) {
    assert.deepEqual(resolveEnquiryIntent({ serverRoute: route }), {
      intent: "general", evidence: "unknown", landingRoute: null,
    });
  }
});

test("explicit declared customer need overrides page context", () => {
  assert.deepEqual(resolveEnquiryIntent({
    serverRoute: "/business-energy-renewal", visitorSelection: "billing_issue",
  }), {
    intent: "billing_issue", evidence: "customer_selection", landingRoute: "/business-energy-renewal",
  });
});

test("visitor can deliberately choose general help", () => {
  assert.deepEqual(resolveEnquiryIntent({
    serverRoute: "/business-energy-bill-help", visitorSelection: "general",
  }), {
    intent: "general", evidence: "customer_selection", landingRoute: "/business-energy-bill-help",
  });
});

test("null or missing visitor choice remains page context but never declared", () => {
  for (const value of [null, undefined]) {
    assert.equal(resolveEnquiryIntent({
      serverRoute: "/business-energy-renewal", visitorSelection: value,
    }).evidence, "first_party_page_context");
  }
});

test("invalid supplied choice cannot silently inherit page intent", () => {
  for (const value of ["billing", "Billing_Issue", "", "renewal,tenancy", ["renewal"], 1, {}, true]) {
    assert.deepEqual(resolveEnquiryIntent({
      serverRoute: "/business-energy-renewal", visitorSelection: value,
    }), {
      intent: "general", evidence: "unknown", landingRoute: "/business-energy-renewal",
    });
  }
});

test("a UTM, query, fragment, look-alike or external URL is not a first-party route", () => {
  for (const route of [
    "/business-energy-renewal?intent=billing_issue",
    "/business-energy-bill-help#form",
    "/business-energy-renewal/extra",
    "https://attacker.invalid/business-energy-renewal",
    "https://freeenergyhelp.co.uk/business-energy-renewal",
    "/business-energy-renewal.evil",
  ]) {
    assert.equal(resolveEnquiryIntent({ serverRoute: route }).intent, "general");
  }
});

test("no untrusted input can become a stored landing route", () => {
  const out = resolveEnquiryIntent({
    serverRoute: "/not-a-feh-page?email=private@example.com",
    visitorSelection: "renewal",
  });
  assert.deepEqual(out, { intent: "renewal", evidence: "customer_selection", landingRoute: null });
  assert.equal(JSON.stringify(out).includes("private@example.com"), false);
});

test("the intent allowlist is strict", () => {
  assert.equal(isEnquiryIntent("billing_issue"), true);
  assert.equal(isEnquiryIntent("CHANGE_OF_TENANCY"), false);
  assert.equal(isEnquiryIntent("unexpected"), false);
  assert.equal(isEnquiryIntent(null), false);
});
