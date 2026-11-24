import assert from 'node:assert/strict';
import {test} from 'node:test';
import {wireHealthCheck} from './wire-health-check.mjs';

const imports = 'import quote__post          from "./api/quote/POST";';
const route = 'app.post("/api/quote",            quote__post);';
const entry = [imports, route, 'app.get("/api/health", health__get);'].join('\n');
const form = [
  "const body = {source: 'health-check-form', submissionId, postcode, energyType, contractEnd, annualSpend, smsConsent};",
  "const res = await fetch('/api/quote', {method: 'POST', body: JSON.stringify(body)});",
].join('\n');

test('adds the named dedicated handler and edits only the Health Check fetch', () => {
  const wired = wireHealthCheck(entry, form);
  assert.equal(wired.entry, [
    imports,
    'import { verifiedEnquiry } from "./api/quote/POST";',
    route,
    'app.post("/api/health-check/quote", verifiedEnquiry);',
    'app.get("/api/health", health__get);',
  ].join('\n'));
  assert.equal(wired.healthCheckForm, form.replace("'/api/quote'", "'/api/health-check/quote'"));
});

test('refuses missing or ambiguous source anchors and existing wiring', () => {
  assert.throws(() => wireHealthCheck(entry.replace(route, ''), form), /registration/);
  assert.throws(() => wireHealthCheck(entry, form + '\n' + form), /quote fetch/);
  assert.throws(() => wireHealthCheck(entry, form.replace('health-check-form', 'homepage-quote-form')), /source field/);
  const wired = wireHealthCheck(entry, form);
  assert.throws(() => wireHealthCheck(wired.entry, wired.healthCheckForm), /already exists/);
});

test('retains CRLF on the editable server entry', () => {
  const {entry: wired} = wireHealthCheck(entry.replaceAll('\n', '\r\n'), form);
  assert.equal(wired.split('\r\n').length, 5);
  assert.equal(wired.replaceAll('\r\n', '').includes('\n'), false);
});
