const assert = require('node:assert/strict');
const path = require('node:path');

// Run from the frontend directory after the patched, isolated webpack build.
const output = path.resolve('.next/server');
const routes = require(path.join(output, 'app-paths-manifest.json'));
const entry = routes['/api/website-enquiries/route'];
assert.equal(entry, 'app/api/website-enquiries/route.js');
const { POST, runtime } = require(path.join(output, entry)).routeModule.userland;
assert.equal(runtime, 'nodejs');
async function checkClosedRoute() {
  const request = new Request('https://fixture.invalid/api/website-enquiries', { method: 'POST' });
  const response = await POST(request);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { error: 'not_configured' });
  console.log('PASS compiled website POST is registered and closed');
}
checkClosedRoute().catch(error => { console.error(error); process.exitCode = 1; });
