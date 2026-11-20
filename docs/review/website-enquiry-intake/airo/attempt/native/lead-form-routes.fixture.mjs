import assert from 'node:assert/strict';

export async function verifyLeadFormRoutes(loadSource, requirePinned) {
  const notFound = new Error('fixture notFound');
  const navigation = {notFound() { throw notFound; }};
  const requireId = loadSource('frontend/src/lib/navigation/requireNumericRouteId.ts', {
    'next/navigation': navigation,
  });
  const React = requirePinned('react');
  const {renderToStaticMarkup} = requirePinned('react-dom/server');
  const reads = [];
  const deps = {
    'react/jsx-runtime': requirePinned('react/jsx-runtime'),
    'next/navigation': navigation,
    'next/cache': {},
    'next/link': {default: ({href, children}) => React.createElement('a', {href}, children)},
    '@/components/layout/AppShell': {AppShell: ({children}) => children},
    '@/lib/audit/log': {},
    '@/lib/auth/enforceWrite': {},
    '@/lib/dashboard/dates': {PIPELINE_STATUSES: ['New']},
    '@/lib/navigation/requireNumericRouteId': requireId,
    '@/lib/supabase/server': {async createClient() {
      reads.push('client');
      return {from(table) {
        reads.push(table);
        const row = {};
        return {
          select() { return this; },
          eq(column, value) { row[column] = value; reads.push([column, value]); return this; },
          async maybeSingle() { return {data: row, error: null}; },
        };
      }};
    }},
  };

  const root = 'frontend/src/app/leads/[id]/';
  const edit = loadSource(root + 'edit/page.tsx', deps).default;
  const add = loadSource(root + 'activity/new/page.tsx', deps).default;
  const activity = loadSource(root + 'activity/[activityId]/edit/page.tsx', deps).default;
  const render = async (page, params) => renderToStaticMarkup(await page({params: Promise.resolve(params)}));

  for (const id of ['9007199254740992', '9007199254740993', '9223372036854775807',
    '0', '-1', '042', '4.2e1', '42.0', ' 42', '']) {
    for (const [page, params] of [
      [edit, {id}], [add, {id}], [activity, {id, activityId: '7'}], [activity, {id: '42', activityId: id}],
    ]) {
      await assert.rejects(() => render(page, params), err => err === notFound);
    }
  }
  assert.deepEqual(reads, [], 'Unsupported IDs must be rejected before creating a database client');

  for (const id of ['42', String(Number.MAX_SAFE_INTEGER)]) {
    assert.match(await render(edit, {id}), /<form\b/);
    assert.deepEqual(reads.splice(0), ['client', 'leads', ['id', Number(id)]]);
    assert.match(await render(add, {id}), /<form\b/);
    assert.deepEqual(reads, []);
    assert.match(await render(activity, {id, activityId: id}), /<form\b/);
    assert.deepEqual(reads.splice(0), ['client', 'activities', ['id', Number(id)], ['lead_id', Number(id)]]);
  }
  console.log('# Direct lead/activity form routes rejected 40 unsupported inputs before database access; six supported forms rendered');
}
