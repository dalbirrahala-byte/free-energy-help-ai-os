import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyBusinessEnergyMarketSignals,
  getBusinessEnergyMarketSignalDefinitions,
} from "./businessEnergyMarketSignals.ts";

test("returns no signals when there is no lead text", () => {
  assert.deepEqual(classifyBusinessEnergyMarketSignals(null, undefined, ""), []);
});

test("detects no-pressure contact language and marks it critical", () => {
  const signals = classifyBusinessEnergyMarketSignals(
    "Please do not call. We were bombarded by energy brokers last time.",
  );

  const contact = signals.find((signal) => signal.id === "contact_preference");
  assert.ok(contact);
  assert.equal(contact.severity, "critical");
  assert.match(contact.revenueAction, /Do not auto-contact/);
});

test("detects HH and kVA complexity without inventing metering facts", () => {
  const signals = classifyBusinessEnergyMarketSignals(
    "Half-hourly HH meter, three phase supply and 500 kVA capacity.",
  );

  const complex = signals.find((signal) => signal.id === "complex_supply");
  assert.ok(complex);
  assert.ok(complex.matchedTerms.includes("half-hourly"));
  assert.ok(complex.matchedTerms.includes("hh meter"));
  assert.ok(complex.matchedTerms.includes("kva"));
});

test("detects renewal, green and multi-site language together", () => {
  const ids = classifyBusinessEnergyMarketSignals(
    "Our renewal is coming up for multiple sites and we want a green tariff with REGO evidence.",
  ).map((signal) => signal.id);

  assert.ok(ids.includes("renewal_price_check"));
  assert.ok(ids.includes("green_claims"));
  assert.ok(ids.includes("multi_site"));
});

test("taxonomy keeps every signal tied to a CRM prompt, revenue action and social theme", () => {
  for (const definition of getBusinessEnergyMarketSignalDefinitions()) {
    assert.ok(definition.crmPrompt.length > 10);
    assert.ok(definition.revenueAction.length > 10);
    assert.ok(definition.socialTheme.length > 10);
  }
});
