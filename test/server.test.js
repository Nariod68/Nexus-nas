import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from '../server/main.js';
import { parseShares, snapshot } from '../server/system.js';
import { newer, latestRelease } from '../server/releases.js';
import { files, checksum, validateBundle } from '../scripts/bundle.js';

test('authentication, origin checks, revocation and static file isolation', async t => {
  const password = 'a-test-password-with-32-characters';
  const server = createServer({ password });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options) => fetch(origin + url, options);
  assert.equal((await request('/api/system')).status, 401);
  assert.equal((await request('/server/main.js')).status, 404);
  assert.equal((await request('/package.json')).status, 404);
  assert.equal((await request('/index.html')).status, 200);
  const login = headers => request('/api/login', { method: 'POST', headers, body: JSON.stringify({ password }) });
  assert.equal((await login({ Origin: 'https://malicious.example', 'X-Nexus-Request': '1' })).status, 403);
  assert.equal((await login({ Origin: origin })).status, 403);
  const response = await login({ Origin: origin, 'X-Nexus-Request': '1' });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const data = await request('/api/system', { headers: { Cookie: cookie } });
  assert.equal(data.status, 200); assert.ok((await data.json()).hostname);
  assert.equal((await request('/api/logout', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'X-Nexus-Request': '1' } })).status, 200);
  assert.equal((await request('/api/system', { headers: { Cookie: cookie } })).status, 401);
});
test('incorrect passwords are limited', async t => {
  const server = createServer({ password: 'another-long-test-password' });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${origin}/api/login`, { method: 'POST', headers: { Origin: origin, 'X-Nexus-Request': '1' }, body: '{"password":"wrong"}' });
    assert.equal(res.status, i < 5 ? 401 : 429);
  }
});
test('system snapshot returns host and real filesystem', async () => {
  const data = await snapshot(process.cwd());
  assert.ok(data.hostname); assert.ok(data.storage.total > 0);
  if (process.platform === 'linux') { assert.ok(Array.isArray(data.disks)); assert.ok(Array.isArray(data.users)); }
});
test('Samba parser and unavailable configuration', () => {
  assert.equal(parseShares(null), null);
  assert.deepEqual(parseShares('[global]\nworkgroup = HOME\n[Documents]\npath = /srv/documents\nvalid users = alice\nread only = No'), [{ name: 'Documents', path: '/srv/documents', access: 'alice', readOnly: false }]);
});
test('release comparison and API failure', async () => {
  assert.equal(newer('v0.10.0', '0.2.0'), true);
  assert.equal(newer('v0.2.0', '0.2.0'), false);
  assert.throws(() => newer('v1.2.3-beta', '0.2.0'));
  await assert.rejects(latestRelease(async () => ({ ok: false, status: 404 })), /Aucune publication/);
});
test('bundle rejects corruption, traversal and wrong version', async () => {
  const version = `v${JSON.parse(await readFile(new URL('../package.json', import.meta.url))).version}`;
  const bundle = { version, files: {} };
  for (const name of files) bundle.files[name] = (await readFile(new URL(`../${name}`, import.meta.url))).toString('base64');
  const bytes = Buffer.from(JSON.stringify(bundle));
  assert.equal(validateBundle(bytes, checksum(bytes), version).size, files.length);
  assert.throws(() => validateBundle(bytes, '0'.repeat(64), version), /Intégrité/);
  assert.throws(() => validateBundle(bytes, checksum(bytes), 'v99.0.0'), /Manifeste/);
  delete bundle.files['live.js']; bundle.files['../../etc/passwd'] = 'eA==';
  const hostile = Buffer.from(JSON.stringify(bundle));
  assert.throws(() => validateBundle(hostile, checksum(hostile), version), /Manifeste/);
});
