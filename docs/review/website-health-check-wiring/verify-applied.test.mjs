import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { preflight } from './preflight.mjs';
import { verifyApplied } from './verify-applied.mjs';
const ts = createRequire(import.meta.url)(resolve(process.argv[2]));
const quoteImport = 'import quote__post from "./api/quote/POST";';
const route = 'app.post("/api/quote", quote__post);';
const entry = quoteImport + '\n' + route;
const form = `function handleSubmit() {
  const submissionId = crypto.randomUUID();
  const fd = new FormData(formRef.current!);
  const body = {source:'health-check-form', submissionId, smsConsent, postcode:fd.get('postcode'),
    energyType:fd.get('energyType'), contractEnd:fd.get('contractEnd'), annualSpend:fd.get('annualSpend')};
  return fetch('/api/quote', {method:'POST', body:JSON.stringify(body)});
}`;
const applied = preflight(ts, entry, form);
test('exact route-only edit passes', () => verifyApplied(ts, entry, form, applied.entry, applied.healthCheckForm));
for (const [label, server] of [
  ['commented registration', quoteImport + '\n/*\n' + route + '\n*/'],
  ['commented import', '/*\n' + quoteImport + '\n*/\n' + route],
  ['uninvoked registration', quoteImport + '\nfunction unused() {\n' + route + '\n}'],
  ['second registration with different spacing', entry + "\napp.post( '/api/quote', other );"],
]) {
  test(label, () => {
    const old = preflight(ts, server, form);
    assert.throws(() => verifyApplied(ts, server, form, old.entry, old.healthCheckForm), /registration|imports/);
  });
}
for (const [label, server, page] of [
  ['server edit omitted', entry, applied.healthCheckForm],
  ['form edit omitted', applied.entry, form],
  ['contract end lost in draft', applied.entry, applied.healthCheckForm.replace("fd.get('contractEnd')", 'null')],
  ['shared quote rerouted', applied.entry.replace('quote__post);','verifiedEnquiry);'), applied.healthCheckForm],
]) {
  test(label, () => assert.throws(() => verifyApplied(ts, entry, form, server, page), /differs/));
}
