import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { preflight } from './preflight.mjs';

// Compare the full draft files immediately before and after the route-only edit.
export function verifyApplied(ts, beforeEntry, beforeForm, afterEntry, afterForm) {
  const expected = preflight(ts, beforeEntry, beforeForm);
  if (expected.entry !== afterEntry) throw Error('Server entry differs from the proposed route-only edit');
  if (expected.healthCheckForm !== afterForm) throw Error('Form differs from the proposed route-only edit');

  const file = ts.createSourceFile('entry.ts', afterEntry, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (file.parseDiagnostics.length) throw Error('Provide the complete parseable server entry');
  const imports = file.statements.filter(node =>
    ts.isImportDeclaration(node) && node.moduleSpecifier.text === './api/quote/POST' &&
    node.importClause && !node.importClause.isTypeOnly
  ).map(node => node.importClause);
  const named = (node, name) => node && ts.isIdentifier(node) && node.text === name;
  const shared = imports.filter(clause => named(clause.name, 'quote__post'));
  const dedicated = imports.flatMap(clause => {
    const bindings = clause.namedBindings;
    return bindings && ts.isNamedImports(bindings) ? [...bindings.elements] : [];
  }).filter(binding => !binding.isTypeOnly && !binding.propertyName && named(binding.name, 'verifiedEnquiry'));
  if (shared.length !== 1 || dedicated.length !== 1) throw Error('Review the executable quote handler imports');

  const routes = new Map([['/api/quote', 'quote__post'], ['/api/health-check/quote', 'verifiedEnquiry']]);
  const seen = new Set();
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        named(node.expression.expression, 'app') && node.expression.name.text === 'post') {
      const [path, handler] = node.arguments;
      if (path && ts.isStringLiteralLike(path) && routes.has(path.text)) {
        if (seen.has(path.text) || node.arguments.length !== 2 || !named(handler, routes.get(path.text)) ||
            !ts.isExpressionStatement(node.parent) || node.parent.parent !== file) {
          throw Error('Review the route registration for ' + path.text);
        }
        seen.add(path.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (seen.size !== routes.size) throw Error('The server entry is missing an executable route registration');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [compiler, ...paths] = process.argv.slice(2);
  if (!compiler || paths.length !== 4) throw Error('Pass TypeScript and the before-entry, before-form, after-entry and after-form paths');
  const ts = createRequire(import.meta.url)(resolve(compiler));
  verifyApplied(ts, ...paths.map(path => readFileSync(path, 'utf8')));
  console.log('PASS draft route edits, handler imports and top-level registrations');
}
