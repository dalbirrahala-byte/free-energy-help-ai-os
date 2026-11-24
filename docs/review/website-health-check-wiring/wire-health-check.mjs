const sharedPath = '/api/quote';
const healthCheckPath = '/api/health-check/quote';

function uniqueMatch(source, pattern, label) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label} in the editable Airo source`);
  }
  return matches[0][0];
}

export function wireHealthCheck(entry, healthCheckForm) {
  if (entry.includes(healthCheckPath) || healthCheckForm.includes(healthCheckPath) ||
      /\bverifiedEnquiry\b/.test(entry)) {
    throw new Error('A Health Check route or handler import already exists. Reconcile it before applying.');
  }

  const quoteImport = uniqueMatch(entry,
    /^([ \t]*)import[ \t]+quote__post[ \t]+from[ \t]+(["'])\.\/api\/quote\/POST\2;[ \t]*$/gm,
    'shared quote import');
  const quoteRegistration = uniqueMatch(entry,
    /^([ \t]*)app\.post\([ \t]*(["'])\/api\/quote\2[ \t]*,[ \t]*quote__post\);[ \t]*$/gm,
    'shared quote registration');
  const healthCheckFetch = uniqueMatch(healthCheckForm,
    /\bfetch\(\s*(["'])\/api\/quote\1\s*,/g, 'Health Check quote fetch');
  uniqueMatch(healthCheckForm, /\bsource\s*:\s*(["'])health-check-form\1/g,
    'Health Check source field');
  const eol = entry.includes('\r\n') ? '\r\n' : '\n';
  const quote = quoteImport.includes('"') ? '"' : "'";
  const indent = line => line.match(/^[ \t]*/)[0];

  return {
    entry: entry.replace(quoteImport, quoteImport + eol + indent(quoteImport) +
      `import { verifiedEnquiry } from ${quote}./api/quote/POST${quote};`)
      .replace(quoteRegistration, quoteRegistration + eol + indent(quoteRegistration) +
        `app.post(${quote}${healthCheckPath}${quote}, verifiedEnquiry);`),
    healthCheckForm: healthCheckForm.replace(healthCheckFetch,
      healthCheckFetch.replace(sharedPath, healthCheckPath)),
  };
}
