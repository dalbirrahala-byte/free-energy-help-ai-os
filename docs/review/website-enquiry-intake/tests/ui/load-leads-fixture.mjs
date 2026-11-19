import assert from 'node:assert/strict';
import { compileFunction } from 'node:vm';

const forbidden = () => { throw Error('unexpected action'); };

export function loadLeadsFixture(requireDependency, readSource) {
  const ts = requireDependency('typescript');
  const React = requireDependency('react');
  // Compile exact source with strict dependency allowlists. No Next runtime, auth,
  // provider, email, local-storage or production Supabase implementation is imported.
  function loadSource(path, dependencies) {
    const output = ts.transpileModule(readSource(path), {
      fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      reportDiagnostics: true,
    });
    assert.equal(output.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} };
    const requireMock = name => {
      assert.ok(Object.hasOwn(dependencies, name), `unmocked import: ${name}`);
      return dependencies[name];
    };
    compileFunction(output.outputText, ['require', 'module', 'exports'], { filename: path })(requireMock, module, module.exports);
    return module.exports;
  }
  const jsx = requireDependency('react/jsx-runtime');
  const emptyPanelCalls = [];
  const rank = loadSource('frontend/src/lib/revenue-engine/leadWorklistOrder.ts', {});
  const client = loadSource('frontend/src/components/leads/LeadsPageClient.tsx', {
    react: React, 'react/jsx-runtime': jsx,
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) },
    '@/components/website-leads/WebsiteLeadsPanel': { WebsiteLeadsPanel: props => {
      emptyPanelCalls.push(props);
      return React.createElement('aside', { 'data-fixture-local-panel': true });
    } },
    '@/components/layout/AppShell': { AppShell: ({ children }) => React.createElement('main', null, children) },
    '@/lib/website-leads/useWebsiteLeads': { useWebsiteLeads: () => [], useNewWebsiteLeadCount: () => 0 },
    '@/components/leads/RevenueBadges': { PriorityBadge: forbidden, QualificationReadinessBadge: forbidden,
      NextActionBadge: forbidden, LeadQualityBadge: forbidden },
    '@/lib/revenue-engine/leadWorklistOrder': rank,
  });
  return { client, loadSource, emptyPanelCalls };
}
