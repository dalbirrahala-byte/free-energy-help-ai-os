import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { wireHealthCheck } from './wire-health-check.mjs';

// Read editable source as syntax. Never import or execute the Airo application.
export function preflight(ts, entry, form) {
  const wired = wireHealthCheck(entry, form);
  const file = ts.createSourceFile('form.tsx', wired.healthCheckForm, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw Error('Provide the complete parseable form source');
  function find(root, predicate, skipFunctions = false) {
    const found = [];
    function visit(node) {
      if (skipFunctions && node !== root && ts.isFunctionLike(node)) return;
      if (predicate(node)) found.push(node);
      ts.forEachChild(node, visit);
    }
    visit(root);
    return found;
  }
  function one(values, description) {
    if (values.length !== 1) throw Error('Expected exactly one ' + description);
    return values[0];
  }
  const submit = one(find(file, n => ts.isFunctionDeclaration(n) && n.name?.text === 'handleSubmit'), 'handleSubmit function');
  const sameScope = predicate => find(submit, predicate, true);
  const named = (node, name) => node && ts.isIdentifier(node) && node.text === name;
  function declaration(name) {
    const node = one(sameScope(n => ts.isVariableDeclaration(n) && named(n.name, name)), name + ' declaration');
    if (!(node.parent.flags & ts.NodeFlags.Const)) throw Error('Expected const ' + name);
    return node;
  }
  function method(node, owner, name) {
    return node && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      named(node.expression.expression, owner) && node.expression.name.text === name;
  }
  const uuid = declaration('submissionId').initializer;
  if (!method(uuid, 'crypto', 'randomUUID') || uuid.arguments.length) throw Error('Expected browser-generated submissionId');
  const fd = declaration('fd').initializer;
  if (!fd || !ts.isNewExpression(fd) || !named(fd.expression, 'FormData')) throw Error('Expected form data');
  const formElement = fd.arguments?.[0];
  const ref = formElement && ts.isNonNullExpression(formElement) ? formElement.expression : formElement;
  if (fd.arguments?.length !== 1 || !ref || !ts.isPropertyAccessExpression(ref) ||
      !named(ref.expression, 'formRef') || ref.name.text !== 'current') throw Error('Review source form element');
  function value(object, key) {
    if (!object || !ts.isObjectLiteralExpression(object) || object.properties.some(p =>
      ts.isSpreadAssignment(p) || (p.name && ts.isComputedPropertyName(p.name)))) throw Error('Review dynamic object before routing');
    const p = one(object.properties.filter(p => p.name?.text === key), key + ' property');
    return ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer;
  }
  const body = declaration('body').initializer;
  for (const key of ['postcode', 'energyType', 'contractEnd', 'annualSpend']) {
    const v = value(body, key);
    if (!method(v, 'fd', 'get') || v.arguments.length !== 1 ||
        !ts.isStringLiteral(v.arguments[0]) || v.arguments[0].text !== key) throw Error('Review input mapping for ' + key);
  }
  for (const key of ['submissionId', 'smsConsent']) {
    if (!named(value(body, key), key)) throw Error('Review input mapping for ' + key);
  }
  const source = value(body, 'source');
  if (!source || !ts.isStringLiteral(source) || source.text !== 'health-check-form') throw Error('Review form source');
  const fetch = one(sameScope(n => ts.isCallExpression(n) && named(n.expression, 'fetch') &&
    n.arguments.length > 0 && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === '/api/health-check/quote'), 'dedicated form fetch');
  const options = fetch.arguments[1];
  const verb = value(options, 'method');
  const sent = value(options, 'body');
  if (!verb || !ts.isStringLiteral(verb) || verb.text !== 'POST' || !method(sent, 'JSON', 'stringify') ||
      sent.arguments.length !== 1 || !named(sent.arguments[0], 'body')) throw Error('Review dedicated POST body');
  return wired;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [typescript, entry, form] = process.argv.slice(2);
  if (!typescript || !entry || !form) throw Error('Pass the installed TypeScript module, server entry and Health Check TSX paths');
  preflight(createRequire(import.meta.url)(resolve(typescript)), readFileSync(entry, 'utf8'), readFileSync(form, 'utf8'));
  console.log('PASS Health Check draft source anchors and request-field mappings');
}
