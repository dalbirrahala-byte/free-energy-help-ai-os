// Run under attempt/native/unix-only.py on a disposable Linux runner.
// Chrome DevTools Protocol uses inherited pipes. No HTTP server is involved.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {connect} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

for (const host of ['127.0.0.1', '::1']) {
  const socket = connect({host, port:9});
  const [error] = await once(socket, 'error');
  assert.equal(error.code, 'EPERM', 'Use the kernel network guard');
}
const chrome = process.argv[2];
assert.ok(chrome?.startsWith('/'), 'Provide the installed Chrome path');
const module = await readFile(new URL('./homepage-attempt.mjs', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'feh-quote-browser-'));
const html = join(directory, 'fixture.html');
await writeFile(html, `<!doctype html><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data:; connect-src 'none'">
<button id="submit">Submit synthetic enquiry</button><output id="result"></output>
<script type="module">
import {readHomepageAttempt, submitHomepageQuote} from 'data:text/javascript;base64,${module.toString('base64')}';
const fields = {businessName:'Fixture', contactName:'Fixture', email:'fixture@example.invalid', phone:'', currentSupplier:'', message:''};
const paint = value => document.querySelector('output').textContent = JSON.stringify(value);
paint(readHomepageAttempt(sessionStorage));
document.querySelector('button').onclick = async () => {
  paint(await submitHomepageQuote(fields, {
    storage:sessionStorage, newId:() => crypto.randomUUID(),
    async post(path, options) {
      if (path !== '/api/quote' || options.method !== 'POST') throw Error('Unexpected request');
      console.info('fixture-post');
      if (location.hash === '#loss') throw Error('Synthetic response loss');
      return Response.json({ok:true, created:location.hash !== '#duplicate', submissionId:JSON.parse(options.body).submissionId}, {status:201});
    },
    recordConversion() { console.info('fixture-analytics'); throw Error('Synthetic analytics fault'); }
  }));
  document.querySelector('button').dataset.finished = 'yes';
};
</script>`);
const child = spawn(chrome, [
  '--headless', '--no-sandbox', '--disable-background-networking', '--disable-sync',
  '--disable-extensions', '--no-first-run', '--disable-dev-shm-usage', '--remote-debugging-pipe',
  '--user-data-dir=' + join(directory, 'profile'), 'about:blank',
], {env:{HOME:directory, PATH:'/usr/bin:/bin'}, stdio:['ignore','ignore','ignore','pipe','pipe']});
const closed = once(child, 'close');
const pending = new Map();
let buffer = '', sequence = 0, posts = 0, analytics = 0, httpRequests = 0, exceptions = 0;
child.stdio[4].setEncoding('utf8');
child.stdio[4].on('data', chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0,end));
    buffer = buffer.slice(end+1);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) continue; // A response can arrive during timeout cleanup.
      if (message.error) waiter.reject(Error(message.error.message));
      else waiter.resolve(message.result);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const value = message.params.args[0]?.value;
      if (value === 'fixture-post') posts++;
      if (value === 'fixture-analytics') analytics++;
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions++;
    if (message.method === 'Network.requestWillBeSent' && /^https?:/.test(message.params.request.url)) httpRequests++;
  }
});
let disconnectReason;
function disconnected(reason) {
  disconnectReason ??= reason;
  for (const waiter of pending.values()) waiter.reject(Error(waiter.method + ': ' + disconnectReason));
}
for (const pipe of [child.stdio[3], child.stdio[4]]) {
  pipe.on('error', error => disconnected('Chrome pipe error ' + error.code));
}
child.stdio[4].once('end', () => disconnected('Chrome response pipe closed'));
child.once('exit', (code, signal) => disconnected('Chrome exited ' + (signal ?? code)));
async function command(method, params = {}, sessionId) {
  if (disconnectReason) throw Error(method + ': ' + disconnectReason);
  assert.equal(child.exitCode, null);
  const id = ++sequence;
  const waiter = Promise.withResolvers();
  pending.set(id, {...waiter, method});
  const timeout = method === 'Browser.getVersion' ? 45000 : 10000;
  const timer = setTimeout(() => waiter.reject(Error('CDP timeout for ' + method)), timeout);
  try {
    child.stdio[3].write(JSON.stringify({id, method, params, sessionId}) + '\0');
    return await waiter.promise;
  } finally {
    clearTimeout(timer);
    pending.delete(id);
  }
}
try {
  const version = await command('Browser.getVersion');
  for (const [mode, expected] of [['loss','held'], ['duplicate','held'], ['analytics','saved']]) {
    const initialPosts = posts, initialAnalytics = analytics;
    const {targetId} = await command('Target.createTarget', {url:'about:blank'});
    const {sessionId} = await command('Target.attachToTarget', {targetId, flatten:true});
    const page = (method, params) => command(method, params, sessionId);
    await page('Runtime.enable');
    await page('Network.enable');
    await page('Page.enable');
    async function evaluate(expression) {
      const {result, exceptionDetails} = await page('Runtime.evaluate', {expression, returnByValue:true});
      assert.equal(exceptionDetails, undefined);
      return result.value;
    }
    async function waitFor(expression) {
      for (let i=0; i<150; i++) {
        if (await evaluate(expression)) return;
        await delay(40);
      }
      throw Error('Fixture did not reach expected browser state');
    }
    await page('Page.navigate', {url:pathToFileURL(html).href+'#'+mode});
    const value = 'document.querySelector("output")?.textContent';
    await waitFor(`${value} === '{"status":"ready"}'`);
    await evaluate('document.querySelector("button").click()');
    const finished = 'document.querySelector("button")?.dataset.finished === "yes"';
    await waitFor(finished);
    const receipt = JSON.parse(await evaluate(value));
    assert.equal(receipt.status, expected);
    assert.match(receipt.submissionId, /^[0-9a-f-]{36}$/);
    const stamp = await evaluate('document.documentElement.dataset.fixtureStamp="before"');
    assert.equal(stamp, 'before');
    await page('Page.reload', {ignoreCache:true});
    await waitFor(`!document.documentElement?.dataset.fixtureStamp && ${value} === ${JSON.stringify(JSON.stringify(receipt))}`);
    assert.equal(await evaluate('sessionStorage.length'),1);
    assert.equal(await evaluate('sessionStorage.getItem(sessionStorage.key(0))'), JSON.stringify(receipt));
    await evaluate('document.querySelector("button").click()');
    await waitFor(finished);
    assert.deepEqual(JSON.parse(await evaluate(value)), receipt);
    assert.equal(posts-initialPosts,1);
    assert.equal(analytics-initialAnalytics,Number(mode==='analytics'));
    assert.equal(httpRequests,0);
    assert.equal(exceptions,0);
    console.log(`PASS ${version.product} ${mode}: one mock POST, same reference after document reload, zero HTTP(S) requests`);
    await command('Target.closeTarget', {targetId});
  }
} finally {
  if (child.exitCode === null) child.kill();
  await closed;
  await rm(directory,{recursive:true,force:true,maxRetries:3});
}
