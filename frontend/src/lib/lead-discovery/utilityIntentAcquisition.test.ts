import assert from "node:assert/strict";
import test from "node:test";
import { assessPlanningDataFixture, assessCompaniesHouseFixture, planningRobotsPermitsAcquisition, UTILITY_ACQUISITION_POLICY } from "./utilityIntentAcquisition.ts";

const now = "2026-09-28T12:00:00Z";
function planning() {
  return { entities: [{ entity: 10000000001, dataset: "planning-application", reference: "SYN/2026/1",
    description: "Construction of a new warehouse with refrigeration and solar PV.",
    "decision-date": "2026-09-25", "entry-date": "2026-09-26", "organisation-entity": 109,
    "applicant-name": "Synthetic Logistics Ltd", "site-address": "Synthetic Industrial Estate" }] };
}
function ch() {
  return { company: { company_name: "Synthetic Works Ltd", company_number: "12345678" },
    requestUrl: "https://api.company-information.service.gov.uk/company/12345678/filing-history",
    filingHistory: { items: [{ transaction_id: "synthetic-filing-1", type: "AD01", category: "address", description: "Registered office address changed", date: "2026-09-25" }] } };
}
const p = (payload: unknown = planning(), prior: readonly string[] = []) => assessPlanningDataFixture(payload, now, prior);
const c = (payload: unknown = ch()) => assessCompaniesHouseFixture(payload, now);

test("planning preserves exact evidence, dates, aggregate provenance, location and scores", () => {
  const input = planning(); input.entities[0].description += "\n  Exact spacing.";
  const [output] = p(input);
  assert.equal(output.research.exactEvidence, input.entities[0].description);
  assert.equal(output.research.sourceTier, "PLANNING_AGGREGATE");
  assert.equal(output.research.eventAt, "2026-09-25T00:00:00.000Z");
  assert.equal(output.research.publishedAt, null);
  assert.equal(output.acquisition.datasetEntryDate, "2026-09-26T00:00:00.000Z");
  assert.equal(output.location, "Synthetic Industrial Estate");
  assert.equal(output.research.scores.freshness_score, 20);
  assert.equal(output.research.totalScore, 43);
  assert.ok(Object.isFrozen(output) && Object.isFrozen(output.acquisition));
});
test("planning never proves energy need or binds a company by name", () => {
  const [output] = p();
  assert.equal(output.companyNumber, null);
  assert.equal(output.research.signal.companyNumber, null);
  assert.equal(output.research.interpretation.basis, "INFERENCE");
  assert.equal(output.research.signal.sourceVerified, false);
  assert.equal(output.research.contactability, "AMBER");
  assert.match(output.safestNextResearchStep, /Do not infer tenancy or an energy requirement/);
});
test("unknown applicant and location remain absent; publisher is not applicant", () => {
  const item = planning().entities[0];
  const { "applicant-name": _name, "site-address": _site, ...rest } = item;
  void _name; void _site;
  const [output] = p({ entities: [rest] });
  assert.equal(output.organisation, null); assert.equal(output.location, null);
  assert.equal(output.acquisition.publisherOrganisationEntity, "109");
});
test("malformed provider roots, records, datasets and entity identities fail closed", () => {
  for (const payload of [null, {}, [], { entities: {} }, { entities: [null] }, { entities: Array(11).fill(planning().entities[0]) }]) assert.throws(() => p(payload));
  for (const changes of [{ dataset: "company" }, { entity: "100" }, { entity: -1 }, { entity: 1.5 }, { entity: Number.MAX_SAFE_INTEGER + 1 }, { description: null }]) {
    assert.throws(() => p({ entities: [{ ...planning().entities[0], ...changes }] }));
  }
});
test("source spoofing and aggregate relabelling are rejected", () => {
  for (const changes of [{ sourceTier: "LOCAL_AUTHORITY" }, { adapter: "LOCAL_AUTHORITY_PLANNING" },
    { sourceUrl: "https://council.gov.uk/entity/10000000001" }, { sourceUrl: "https://www.planning.data.gov.uk.evil.example/entity/10000000001" }]) {
    assert.throws(() => p({ entities: [{ ...planning().entities[0], ...changes }] }));
  }
});
test("unsafe evidence URLs never get sanitized into acceptable provenance", () => {
  for (const url of ["https://user:secret@www.planning.data.gov.uk/entity/10000000001", "https://www.planning.data.gov.uk/entity/10000000001?token=secret",
    "http://www.planning.data.gov.uk/entity/10000000001", "https://www.planning.data.gov.uk/person/123", "https://127.0.0.1/entity/10000000001"]) {
    assert.throws(() => p({ entities: [{ ...planning().entities[0], sourceUrl: url }] }));
  }
});
test("planning rejects company-number claims regardless of matching name", () => {
  for (const key of ["companyNumber", "company-number"]) assert.throws(() => p({ entities: [{ ...planning().entities[0], [key]: "12345678" }] }));
});
test("future and invalid timestamps rejected; stale evidence cannot manufacture freshness", () => {
  for (const changes of [{ "decision-date": "2026-09-29" }, { "entry-date": "2026-09-29" }, { "decision-date": "2026-02-30" }]) assert.throws(() => p({ entities: [{ ...planning().entities[0], ...changes }] }));
  const input = planning(); input.entities[0]["decision-date"] = "2024-01-01";
  const [output] = p(input); assert.equal(output.research.scores.freshness_score, 0); assert.equal(output.research.scores.intent_score, 0);
});
test("entry dates cannot replace missing event dates", () => {
  const input = planning(); input.entities[0]["decision-date"] = "";
  assert.equal(p(input).length, 0);
});
test("duplicate source IDs survive changed excerpt and attribution within and across batches", () => {
  const first = planning().entities[0]; const second = { ...first, description: "Installation of new factory boilers", "applicant-name": "Different unbound name" };
  const outputs = p({ entities: [first, second] });
  assert.equal(outputs[1].research.scores.duplication_penalty, 100);
  assert.equal(p({ entities: [second] }, outputs[0].research.deduplicationKeys)[0].research.scores.duplication_penalty, 100);
});
test("accessors and inherited fields rejected without invoking getter", () => {
  let calls = 0;
  const item = planning().entities[0]; Object.defineProperty(item, "description", { enumerable: true, get() { calls++; return "new factory"; } });
  assert.throws(() => p({ entities: [item] })); assert.equal(calls, 0);
  assert.throws(() => p(Object.create(planning())));
  assert.throws(() => c({ ...ch(), company: Object.create(ch().company) }));
});
test("proxy traps never execute, including nested and revoked proxies", () => {
  let calls = 0;
  const proxy = new Proxy(planning(), { getPrototypeOf() { calls++; throw new Error("trap"); } });
  assert.throws(() => p(proxy)); assert.equal(calls, 0);
  const revoked = Proxy.revocable({}, {}); revoked.revoke(); assert.throws(() => c({ ...ch(), company: revoked.proxy }));
});
test("cycles, hidden fields, sparse arrays and oversized payloads rejected", () => {
  const cyc: Record<string, unknown> = {}; cyc.self = cyc; assert.throws(() => p(cyc));
  const hidden = planning(); Object.defineProperty(hidden, "hidden", { value: true }); assert.throws(() => p(hidden));
  assert.throws(() => p({ entities: Array(1) }));
  assert.throws(() => p({ entities: [], extra: "x".repeat(1000001) }));
});
test("mutating the provider after assessment cannot mutate stored evidence or scores", () => {
  const input = planning(); const [output] = p(input); input.entities[0].description = "replaced";
  assert.notEqual(output.research.exactEvidence, "replaced");
  assert.throws(() => Object.assign(output.research, { outreachAllowed: true }));
});
test("forged live status, GREEN and execution flags cannot survive projection", () => {
  const forged = { ...planning(), mode: "LIVE_PUBLIC_READ", networkExecutionAllowed: true };
  Object.assign(forged.entities[0], { contactability: "GREEN", sourceVerified: true, outreachAllowed: true, emailSendAllowed: true, suppression: "CLEAR" });
  for (const output of [...p(forged), ...c({ ...ch(), outreachAllowed: true })]) {
    assert.equal(output.acquisition.mode, "FIXTURE_ONLY"); assert.equal(output.research.contactability, "AMBER");
    for (const [key, value] of Object.entries(output.research)) if (key.endsWith("Allowed")) assert.equal(value, false, key);
  }
});
test("domestic, unrelated, ended and refused applications are not admitted", () => {
  for (const changes of [{ description: "New solar installation on a dwelling" }, { description: "Replacement garden fence" },
    { "end-date": "2026-09-26" }, { "planning-application-status": "refused" }]) assert.equal(p({ entities: [{ ...planning().entities[0], ...changes }] }).length, 0);
});
test("all requested commercial planning themes can yield only possible load research", () => {
  for (const theme of ["commercial premises", "factory", "manufacturing", "warehouse", "logistics", "refrigeration", "cold storage", "hotel", "care facility", "glasshouse", "EV charging", "HVAC", "boiler", "CHP", "solar", "battery storage"]) {
    const [output] = p({ entities: [{ ...planning().entities[0], description: `Installation of new ${theme}.` }] });
    assert.ok(output, theme); assert.equal(output.research.interpretation.basis, "INFERENCE");
  }
});
test("CH reuses filing primitive but a registered-office change does not prove tenancy", () => {
  const [output] = c();
  assert.equal(output.research.exactEvidence, ch().filingHistory.items[0].description);
  assert.equal(output.research.interpretation.kind, "NEW_PREMISES_TENANCY");
  assert.equal(output.research.interpretation.basis, "INFERENCE");
  assert.match(output.research.signal.summary, /does not establish trading activity, occupancy, tenancy or a utility contract/);
  assert.equal(output.companyNumber, null); assert.equal(output.acquisition.claimedCompanyNumber, "12345678");
});
test("CH source/number mismatch and unsupported numbers fail closed", () => {
  for (const payload of [{ ...ch(), requestUrl: "https://api.company-information.service.gov.uk/company/87654321/filing-history" },
    { ...ch(), company: { company_name: "Synthetic", company_number: "ABCDEFGH" } },
    { ...ch(), filingHistory: { ...ch().filingHistory, company_number: "87654321" } },
    { ...ch(), requestUrl: `${ch().requestUrl}?api_key=secret` }]) assert.throws(() => c(payload));
});
test("CH incorporation/financing events remain inference and unknown activity; unsupported status is not invented", () => {
  for (const type of ["NEWINC", "SH01", "SH02", "MR01"]) {
    const input = ch(); input.filingHistory.items[0].type = type;
    assert.equal(c(input)[0].research.signal.evidenceBasis, "INFERENCE");
  }
  for (const type of ["toString", "__proto__", "STATUS_UNKNOWN", "AA"]) {
    const input = ch(); input.filingHistory.items[0].type = type; assert.equal(c(input).length, 0);
  }
});
test("CH malformed filings and future dates fail closed", () => {
  assert.throws(() => c({ ...ch(), filingHistory: { items: [null] } }));
  const input = ch(); input.filingHistory.items[0].date = "2027-01-01"; assert.throws(() => c(input));
});
test("only the exact reviewed robots policy permits acquisition; unknown rules block", () => {
  assert.equal(planningRobotsPermitsAcquisition("User-agent: *\nDisallow: /fact/\n"), true);
  for (const policy of [null, "", "<html>login</html>", "User-agent: *\nDisallow: /", "User-agent: *\nDisallow: /fact/\nCrawl-delay: 60", "User-agent: other\nDisallow: /fact/"]) assert.equal(planningRobotsPermitsAcquisition(policy), false);
});
test("acquisition policy is immutable, narrow and does not enable CH, local authorities or credentials", () => {
  assert.ok(Object.isFrozen(UTILITY_ACQUISITION_POLICY));
  assert.equal(UTILITY_ACQUISITION_POLICY.planningEndpoint, "https://www.planning.data.gov.uk/entity.json?dataset=planning-application&limit=10&offset=0");
  assert.equal(UTILITY_ACQUISITION_POLICY.companiesHouseLiveAllowed, false);
  assert.equal(UTILITY_ACQUISITION_POLICY.localAuthorityLiveAllowed, false);
  assert.equal(UTILITY_ACQUISITION_POLICY.credentialAccessAllowed, false);
  assert.equal(UTILITY_ACQUISITION_POLICY.redirectsAllowed, false);
});

test("live transport refuses redirects, throttling, malformed responses, unsafe robots and oversized bodies without retry", async (t) => {
  const https = (await import("node:https")).default;
  const { syncBuiltinESMExports } = await import("node:module");
  const { EventEmitter } = await import("node:events");
  const { acquirePlanningDataResearch } = await import("./utilityIntentAcquisition.ts");
  const original = https.get;
  const originalNow = Date.now;
  let clock = originalNow();
  type Reply = { status?: number; type?: string; body: string | Buffer; chunks?: Buffer[]; aborted?: boolean; encoding?: string };
  let replies: Reply[] = [];
  let calls: string[] = [];
  const robots: Reply = { body: "User-agent: *\nDisallow: /fact/\n", type: "text/plain" };
  const json: Reply = { body: JSON.stringify(planning()), type: "application/json" };
  try {
    Date.now = () => clock;
    https.get = ((url: string, options: { headers: Record<string, string>; agent: boolean }, callback: (response: unknown) => void) => {
      calls.push(url);
      assert.equal(options.agent, false);
      assert.equal(Object.hasOwn(options.headers, "Authorization"), false);
      const request = Object.assign(new EventEmitter(), { destroy() {} });
      const reply = replies.shift(); assert.ok(reply, "unexpected request or retry");
      queueMicrotask(() => {
        let destroyed = false;
        const response = Object.assign(new EventEmitter(), { statusCode: reply.status ?? 200,
          headers: { "content-type": reply.type ?? "application/json", "content-encoding": reply.encoding }, destroy() { destroyed = true; } });
        callback(response);
        if (!destroyed) {
          if (reply.aborted) response.emit("aborted");
          else {
            for (const chunk of reply.chunks ?? [Buffer.from(reply.body)]) {
              if (!destroyed) response.emit("data", chunk);
            }
            if (!destroyed) response.emit("end");
          }
        }
      });
      return request;
    }) as unknown as typeof https.get;
    syncBuiltinESMExports();
    const cases: Reply[][] = [
      [{ ...robots, status: 302 }], [{ ...robots, body: "User-agent: *\nDisallow: /" }],
      [robots, { ...json, status: 429 }], [robots, { ...json, status: 302 }],
      [robots, { ...json, type: "text/html" }], [robots, { ...json, body: "not json" }],
      [robots, { ...json, body: "x".repeat(262145) }], [robots, { ...json, aborted: true }],
      [robots, { ...json, encoding: "gzip" }],
    ];
    for (const scenario of cases) {
      clock += 20000; replies = [...scenario]; calls = [];
      await assert.rejects(acquirePlanningDataResearch());
      assert.equal(calls.length, scenario.length);
      await assert.rejects(acquirePlanningDataResearch(), /rate_limit/);
      assert.equal(calls.length, scenario.length);
    }
    const marked = planning(); marked.entities[0].description += " __BYTE_MARKER__";
    const [prefix, suffix] = JSON.stringify(marked).split("__BYTE_MARKER__");
    const malformed = [
      { name: "invalid leading byte", bytes: [0xff] },
      { name: "overlong encoding", bytes: [0xc0, 0xaf] },
      { name: "truncated multibyte sequence", bytes: [0xe2, 0x82] },
      { name: "encoded surrogate", bytes: [0xed, 0xa0, 0x80] },
      { name: "code point above Unicode maximum", bytes: [0xf4, 0x90, 0x80, 0x80] },
      { name: "isolated continuation byte", bytes: [0x80] },
      { name: "invalid continuation byte", bytes: [0xe2, 0x28, 0xa1] },
    ];
    for (const item of malformed) await t.test(`rejects UTF-8 ${item.name} inside evidence`, async () => {
      clock += 20000; calls = [];
      replies = [robots, { ...json, body: Buffer.concat([Buffer.from(prefix), Buffer.from(item.bytes), Buffer.from(suffix)]) }];
      await assert.rejects(acquirePlanningDataResearch(), /official_source_invalid_utf8/);
      assert.equal(calls.length, 2);
      await assert.rejects(acquirePlanningDataResearch(), /rate_limit/);
      assert.equal(calls.length, 2);
    });
    await t.test("malformed UTF-8 in robots blocks the data request", async () => {
      clock += 20000; calls = [];
      replies = [{ ...robots, body: Buffer.concat([Buffer.from(`${robots.body}# `), Buffer.from([0xff])]) }];
      await assert.rejects(acquirePlanningDataResearch(), /official_source_invalid_utf8/);
      assert.deepEqual(calls, ["https://www.planning.data.gov.uk/robots.txt"]);
    });
    await t.test("valid Unicode split across response chunks preserves exact evidence", async () => {
      clock += 20000; calls = [];
      const input = planning(); input.entities[0].description += " £ café ❄ �\n  Exact spacing.";
      const body = Buffer.from(JSON.stringify(input));
      // One byte per chunk splits every non-ASCII character across chunks.
      replies = [robots, { ...json, body, chunks: Array.from(body, byte => Buffer.from([byte])) }];
      const result = await acquirePlanningDataResearch();
      assert.equal(result.records[0].research.exactEvidence, input.entities[0].description);
      assert.equal(result.records[0].research.outreachAllowed, false);
    });
    clock += 20000; replies = [robots, json]; calls = [];
    const running = acquirePlanningDataResearch();
    await assert.rejects(acquirePlanningDataResearch(), /rate_limit/);
    const success = await running;
    assert.equal(success.records[0].acquisition.mode, "LIVE_PUBLIC_READ");
    assert.equal(success.records[0].research.networkExecutionAllowed, false);
    assert.equal(success.records[0].research.contactability, "AMBER");
    assert.deepEqual(calls, ["https://www.planning.data.gov.uk/robots.txt", UTILITY_ACQUISITION_POLICY.planningEndpoint]);
  } finally {
    https.get = original; Date.now = originalNow; syncBuiltinESMExports();
  }
});

test("different CH filing transactions do not collide on shared listing URL or template description", () => {
  const input = ch(); input.filingHistory.items.push({ ...input.filingHistory.items[0], transaction_id: "synthetic-filing-2" });
  const outputs = c(input);
  assert.equal(outputs[0].research.scores.duplication_penalty, 0);
  assert.equal(outputs[1].research.scores.duplication_penalty, 0);
  input.filingHistory.items[1].transaction_id = input.filingHistory.items[0].transaction_id;
  input.filingHistory.items[1].description = "Changed excerpt for same filing";
  assert.equal(c(input)[1].research.scores.duplication_penalty, 100);
});

test("negative suppression/objection/subscriber claims remain RED; positive claims cannot clear them", () => {
  for (const contactReview of [{ suppression: "SUPPRESSED" }, { objection: true }, { legalForm: "SOLE_TRADER" }, { legalForm: "PARTNERSHIP" }]) {
    assert.equal(p({ ...planning(), contactReview })[0].research.contactability, "RED");
    assert.equal(c({ ...ch(), contactReview })[0].research.contactability, "RED");
  }
  const input = planning(); Object.assign(input.entities[0], { suppression: "SUPPRESSED", contactReview: { suppression: "CLEAR" } });
  assert.equal(p(input)[0].research.contactability, "RED");
});

test("negative partnership claim is preserved exactly rather than rewritten as sole trader", () => {
  const [output] = p({ ...planning(), contactReview: { legalForm: "PARTNERSHIP" } });
  assert.equal(output.research.contactReviewClaims.legalForm, "PARTNERSHIP");
  assert.equal(output.research.contactability, "RED");
});

test("CH filing-level suppression survives normalization and cannot be cleared by parent claims", () => {
  const input = ch();
  Object.assign(input, { contactReview: { suppression: "CLEAR" } });
  Object.assign(input.company, { contactReview: { suppression: "CLEAR" } });
  Object.assign(input.filingHistory, { contactReview: { suppression: "CLEAR" } });
  const contactReview = { suppression: "SUPPRESSED" };
  Object.assign(input.filingHistory.items[0], { contactReview });
  const [output] = c(input);
  contactReview.suppression = "CLEAR";
  assert.equal(output.research.contactReviewClaims.suppression, "SUPPRESSED");
  assert.equal(output.research.contactability, "RED");
  assert.equal(output.research.outreachAllowed, false);
  for (const [key, value] of Object.entries(output.research)) if (key.endsWith("Allowed")) assert.equal(value, false, key);
});

test("CH filing review remains attached to its source item after unsupported filings are skipped", () => {
  const input = ch();
  input.filingHistory.items.unshift({ ...input.filingHistory.items[0], transaction_id: "unsupported", type: "AA" });
  Object.assign(input.filingHistory.items[1], { contactReview: { suppression: "SUPPRESSED" } });
  const outputs = c(input);
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].research.contactReviewClaims.suppression, "SUPPRESSED");
  assert.equal(outputs[0].research.contactability, "RED");
  assert.equal(outputs[0].research.outreachAllowed, false);
});

test("CH direct and nested filing suppression/objection remain RED despite parent clearance", () => {
  for (const claim of [{ suppression: "SUPPRESSED" }, { objection: true }]) {
    for (const filingFields of [claim, { contactReview: claim }]) {
      const input = ch();
      Object.assign(input, { contactReview: { suppression: "CLEAR", objection: false } });
      Object.assign(input.filingHistory.items[0], filingFields);
      const [output] = c(input);
      assert.equal(output.research.contactability, "RED");
      assert.equal(output.research.outreachAllowed, false);
      if ("suppression" in claim) assert.equal(output.research.contactReviewClaims.suppression, "SUPPRESSED");
      else assert.equal(output.research.contactReviewClaims.objection, true);
    }
  }
});

test("CH filing contact-review accessors and inherited reviews fail before reading their values", () => {
  let reads = 0;
  const input = ch();
  Object.defineProperty(input.filingHistory.items[0], "contactReview", { enumerable: true, get() { reads++; return { suppression: "CLEAR" }; } });
  assert.throws(() => c(input)); assert.equal(reads, 0);
  const inherited = ch();
  Object.assign(inherited.filingHistory.items[0], { contactReview: Object.create({ objection: true }) });
  assert.throws(() => c(inherited));
});
