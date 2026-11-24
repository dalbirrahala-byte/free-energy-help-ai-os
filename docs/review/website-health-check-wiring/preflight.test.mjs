import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { preflight } from './preflight.mjs';
import { wireHealthCheck } from './wire-health-check.mjs';
const ts = createRequire(import.meta.url)(resolve(process.argv[2]));
const entry = 'import quote__post from "./api/quote/POST";\napp.post("/api/quote", quote__post);';
const fields = ['postcode', 'energyType', 'contractEnd', 'annualSpend'];
const form = `function Page() {
  async function handleSubmit() {
    const submissionId = crypto.randomUUID();
    const fd = new FormData(formRef.current!);
    const body = { source:'health-check-form', smsConsent, submissionId,
      ${fields.map(k => k + ": fd.get('" + k + "')").join(',\n')}
    };
    try { await fetch('/api/quote', {method: 'POST', body: JSON.stringify(body)}); } catch {}
  }
  return <form onSubmit={handleSubmit}/>;
}`;
test('changes only the destination in the supplied form', () => {
  const wired = preflight(ts, entry, form);
  assert.equal(wired.healthCheckForm, form.replace("'/api/quote'", "'/api/health-check/quote'"));
  assert.ok(wired.entry.includes('app.post("/api/quote", quote__post);'));
});
for (const [name, from, to] of [
  ['different form element', 'formRef.current!', 'otherRef.current!'],
  ['missing browser reference', 'smsConsent, submissionId,', 'smsConsent,'],
  ['unrelated browser reference', 'crypto.randomUUID()', 'cachedReference'],
  ['preselected SMS answer', 'smsConsent,', "smsConsent:'yes',"],
  ['different serialized object', 'stringify(body)', 'stringify(other)'],
  ['later override via spread', 'smsConsent,', 'smsConsent,...overrides,'],
  ['wrong HTTP method', "'POST'", "'GET'"],
  ...fields.map(k => ['wrong form control for '+k, "fd.get('"+k+"')", "fd.get('other')"]),
]) {
  test(name, () => {
    const changed = form.replace(from, to);
    assert.notEqual(changed, form);
    assert.ok(wireHealthCheck(entry, changed).healthCheckForm.includes('/api/health-check/quote'));
    assert.throws(() => preflight(ts, entry, changed));
  });
}
