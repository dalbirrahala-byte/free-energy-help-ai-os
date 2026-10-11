import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as validation from "./validation.ts";
import * as constants from "./constants.ts";
import * as capture from "./revenueCapture.ts";
import * as conversion from "./healthCheckConversion.ts";
import { createGoogleAdsHealthCheckTracker, readAcceptedHealthCheckResult } from "./googleAdsHealthCheckConversion.ts";

// Execute the real component handlers with deterministic hook/JSX and boundary doubles.
// No browser, Supabase, Google loader or network transport is started.
type Element = { type: unknown; props: Record<string, unknown> };
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}
function loadModule(path: string, modules: Record<string, unknown>) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: Record<string, unknown> = {};
  runInNewContext(output, { exports, FormData, URLSearchParams, require(id: string) {
    if (!Object.hasOwn(modules, id)) throw new Error(`Unexpected module: ${id}`);
    return modules[id];
  } });
  return exports;
}
const valid = { businessName: "Synthetic Works Ltd", contactName: "Synthetic Contact", telephone: "07700900123", email: "synthetic@example.test", postcode: "SW1A 1AA", renewalTiming: "not_sure", energySupply: "both", painPoint: "Review renewal options", contractEndDate: "", consent: true };
const created = { success: true, disposition: "created", leadId: 42 };
function harness(options: { submit?: (payload: FormData) => Promise<unknown>; gtag?: unknown; localThrows?: boolean; trackerThrows?: boolean } = {}) {
  const slots: unknown[] = [];
  let cursor = 0;
  let submissions = 0;
  let localEvents = 0;
  const googleCalls: unknown[][] = [];
  const track = createGoogleAdsHealthCheckTracker(() => Object.hasOwn(options, "gtag") ? options.gtag : (...args: unknown[]) => googleCalls.push(args));
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const loaded = loadModule("src/components/website-leads/BusinessEnergyQuoteForm.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
      },
      useRef(initial: unknown) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
    },
    "lucide-react": { Zap: "zap-icon" },
    "@/app/business-energy-quote/actions": { submitQuoteEnquiry: async (payload: FormData) => { submissions++; return options.submit ? options.submit(payload) : created; } },
    "@/lib/website-leads/constants": constants,
    "@/lib/website-leads/validation": validation,
    "@/lib/website-leads/revenueCapture": capture,
    "@/lib/website-leads/healthCheckConversion": { ...conversion, emitHealthCheckConversion() { localEvents++; if (options.localThrows) throw new Error("local analytics failed"); } },
    "@/lib/website-leads/googleAdsHealthCheckConversion": { readAcceptedHealthCheckResult, trackGoogleAdsHealthCheckConversion(value: unknown) {
      if (options.trackerThrows) throw new Error("unexpected adapter failure");
      track(value);
    } },
  });
  const render = () => { cursor = 0; return (loaded.BusinessEnergyQuoteForm as (props: object) => Element)({}); };
  let tree = render();
  function fill() {
    for (const [id, value] of Object.entries(valid)) {
      const field = elements(tree).find(node => node.props.id === id || (id === "consent" && node.props.type === "checkbox"));
      assert.ok(field, id);
      const onChange = field.props.onChange as (value: unknown) => void;
      if (typeof field.type === "function") onChange(value);
      else onChange({ target: { value, checked: value } });
    }
    tree = render();
  }
  function submitHandler() {
    const form = elements(tree).find(node => node.type === "form"); assert.ok(form);
    return form.props.onSubmit as (event: { preventDefault: () => void }) => Promise<void>;
  }
  return { fill, submit: () => submitHandler()({ preventDefault() {} }), submitHandler,
    refresh: () => { tree = render(); return tree; },
    get tree() { return tree; }, get submissions() { return submissions; }, get googleCalls() { return googleCalls; }, get localEvents() { return localEvents; },
    accepted: () => elements(render()).some(node => node.props.role === "status"),
    errors: () => elements(render()).filter(node => node.props.role === "alert"),
  };
}

test("page/form render, opening/filling and client validation failure cannot dispatch", async () => {
  const form = harness(); form.refresh();
  assert.equal(form.submissions, 0); assert.equal(form.googleCalls.length, 0);
  await form.submit(); assert.equal(form.submissions, 0); assert.equal(form.googleCalls.length, 0);
  form.fill(); assert.equal(form.submissions, 0); assert.equal(form.googleCalls.length, 0);
});

test("submit click and rapid double submission dispatch only after real handler receives created result", async () => {
  let resolve!: (value: unknown) => void;
  const response = new Promise<unknown>(done => { resolve = done; });
  const form = harness({ submit: async () => response }); form.fill();
  const staleHandler = form.submitHandler();
  const first = staleHandler({ preventDefault() {} });
  await staleHandler({ preventDefault() {} });
  assert.equal(form.submissions, 1); assert.equal(form.googleCalls.length, 0);
  resolve(created); await first;
  await staleHandler({ preventDefault() {} });
  form.refresh(); form.refresh();
  assert.equal(form.submissions, 1); assert.equal(form.googleCalls.length, 1);
  assert.equal(form.accepted(), true); assert.equal(form.errors().length, 0);
});

test("server duplicate suppression is accepted by FEH but produces no conversion", async () => {
  const form = harness({ submit: async () => ({ ...created, disposition: "duplicate_suppressed" }) }); form.fill(); await form.submit();
  assert.equal(form.accepted(), true); assert.equal(form.googleCalls.length, 0); assert.equal(form.localEvents, 0);
});

test("server validation, failed ingestion, throws and malformed responses never fire", async () => {
  const results = [null, undefined, {}, { ...created, leadId: 0 }, { ...created, leadId: "42" }, { ...created, disposition: "unknown" },
    { ...created, success: "true" }, { success: false, disposition: "failed", errors: { form: "Rejected" } }];
  for (const result of results) {
    const form = harness({ submit: async () => result }); form.fill(); await form.submit();
    assert.equal(form.accepted(), false); assert.equal(form.googleCalls.length, 0); assert.equal(form.errors().length, 1);
  }
  const form = harness({ submit: async () => { throw new Error("ingestion failed"); } }); form.fill(); await form.submit();
  assert.equal(form.accepted(), false); assert.equal(form.googleCalls.length, 0); assert.equal(form.errors().length, 1);
  await form.submit(); assert.equal(form.submissions, 2); // Failure releases the synchronous guard.
});

test("unavailable/throwing gtag and local/tracker errors never undo accepted FEH success", async () => {
  for (const options of [{ gtag: undefined }, { gtag: () => { throw new Error("Google blocked"); } }, { localThrows: true }, { trackerThrows: true }]) {
    const form = harness(options); form.fill(); await form.submit();
    assert.equal(form.accepted(), true); assert.equal(form.errors().length, 0);
  }
});

test("explicit new enquiry releases success latch while repeated created lead callback stays deduplicated", async () => {
  const form = harness(); form.fill(); await form.submit();
  const tree = form.refresh();
  const button = elements(tree).find(node => node.type === "button"); assert.ok(button);
  (button.props.onClick as () => void)();
  form.refresh(); form.fill(); await form.submit();
  assert.equal(form.submissions, 2); assert.equal(form.googleCalls.length, 1); assert.equal(form.accepted(), true);
});

test("actual legacy redirect preserves GCLID and every existing scalar landing query parameter", async () => {
  let destination = "";
  const loaded = loadModule("src/app/business-energy-quote/page.tsx", { "next/navigation": { permanentRedirect(url: string) { destination = url; } } });
  const input = { gclid: "Synthetic-Click_123.A+b/=", utm_source: "google", utm_medium: "cpc", utm_campaign: "health check", campaign: "autumn", extra: "a&b=c", empty: "" };
  await (loaded.default as (props: unknown) => Promise<void>)({ searchParams: Promise.resolve(input) });
  const url = new URL(destination, "https://example.test");
  assert.equal(url.pathname, "/free-business-energy-health-check");
  for (const [key, value] of Object.entries(input)) assert.equal(url.searchParams.get(key), value, key);
  assert.equal(url.searchParams.size, Object.keys(input).length);
});

test("actual legacy redirect does not invent attribution and preserves existing ambiguity handling", async () => {
  let destination = "";
  const loaded = loadModule("src/app/business-energy-quote/page.tsx", { "next/navigation": { permanentRedirect(url: string) { destination = url; } } });
  const page = loaded.default as (props: unknown) => Promise<void>;
  await page({ searchParams: Promise.resolve({}) }); assert.equal(destination, "/free-business-energy-health-check");
  await page({ searchParams: Promise.resolve({ gclid: ["one", "two"], utm_source: "google" }) });
  const url = new URL(destination, "https://example.test"); assert.equal(url.searchParams.has("gclid"), false); assert.equal(url.searchParams.get("utm_source"), "google");
});
