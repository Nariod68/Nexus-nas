import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createServer } from '../server/main.js';
import { components, listFiles, uploadFile, downloadFile, trashFile, listTrash, restoreTrash, purgeTrash } from '../server/files.js';
import { diskReason, partitionScript } from '../agent/disks.js';
import { sambaConfig } from '../agent/main.js';

test('setup, multiuser sessions, share ACL and file round trip', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'nexus-app-')); t.after(() => rm(temp, { recursive: true, force: true }));
  const dataRoot = path.join(temp, 'data'); await mkdir(dataRoot);
  let agentState = { volumes: [{ id: 'system', path: dataRoot }], shares: [], users: [], disks: [], jobs: [] };
  const calls = [];
  const agent = async (action, data) => {
    calls.push(action);
    if (action === 'state') return agentState;
    if (action === 'shares.save') { agentState.shares.push({ ...data, path: dataRoot }); return { ok: true }; }
    return { ok: true };
  };
  const server = createServer({ setupToken: 'a-random-bootstrap-code-at-least-24', statePath: path.join(temp, 'state.json'), agent });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (url, { method = 'GET', cookie, body, raw } = {}) => fetch(origin + url, { method, headers: { Origin: origin, 'X-Nexus-Request': '1', ...(cookie ? { Cookie: cookie } : {}) }, body: raw || (body ? JSON.stringify(body) : undefined) });
  assert.equal((await (await request('/api/setup')).json()).configured, false);
  assert.equal((await request('/api/setup', { method: 'POST', body: { token: 'wrong' } })).status, 403);
  const credentials = { name: 'alice', password: 'my-long-secret-password' };
  assert.equal((await request('/api/setup', { method: 'POST', body: { ...credentials, token: 'a-random-bootstrap-code-at-least-24', hostname: 'nexus-test' } })).status, 200);
  assert.ok(calls.includes('users.save'));
  assert.equal((await request('/api/setup', { method: 'POST', body: { ...credentials, token: 'a-random-bootstrap-code-at-least-24' } })).status, 409);
  const login = async creds => { const res = await request('/api/login', { method: 'POST', body: creds }); assert.equal(res.status, 200); return res.headers.get('set-cookie').split(';')[0]; };
  const cookie = await login(credentials);
  assert.equal((await request('/api/users', { method: 'POST', cookie, body: { name: 'bob', password: 'bob-has-a-long-password', role: 'user' } })).status, 201);
  assert.equal((await request('/api/shares/save', { method: 'POST', cookie, body: { name: 'docs', volume: 'system', members: [{ name: 'alice', write: true }, { name: 'bob', write: false }] } })).status, 200);
  const file = '/api/files/upload?share=docs&path=hello.txt';
  assert.equal((await request(file, { method: 'PUT', cookie, raw: Buffer.from('Bonjour NAS') })).status, 201);
  assert.equal((await request(file, { method: 'PUT', cookie, raw: Buffer.from('overwrite') })).status, 409);
  assert.equal(await (await request('/api/files/download?share=docs&path=hello.txt', { cookie })).text(), 'Bonjour NAS');
  assert.equal((await (await request('/api/files?share=docs', { cookie })).json())[0].name, 'hello.txt');
  assert.equal((await request('/api/files?share=docs&path=../', { cookie })).status, 400);
  const bob = await login({ name: 'bob', password: 'bob-has-a-long-password' });
  assert.equal((await request('/api/disks/plan', { method: 'POST', cookie: bob, body: {} })).status, 403);
  assert.equal((await request(file, { method: 'PUT', cookie: bob, raw: Buffer.from('no') })).status, 403);
  assert.equal((await request('/api/files/download?share=docs&path=hello.txt', { cookie: bob })).status, 200);
  assert.equal((await request('/api/users/disable', { method: 'POST', cookie, body: { name: 'bob' } })).status, 200);
  assert.equal((await request('/api/files?share=docs', { cookie: bob })).status, 401);
  assert.equal((await request('/api/files?share=docs&path=hello.txt', { method: 'DELETE', cookie })).status, 200);
  assert.equal((await (await request('/api/files?share=docs', { cookie })).json()).length, 0);
  assert.ok((await readFile(path.join(temp, 'state.json'), 'utf8')).includes('configured'));
});
test('files refuse traversal and symlink escape; aborted uploads leave no file', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'nexus-files-')); t.after(() => rm(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'share'); await mkdir(root);
  for (const p of ['../secret', '/etc/passwd', 'a/../b', 'a\\b', '.nexus-trash/x', 'a\0b']) assert.throws(() => components(p));
  await assert.rejects(uploadFile(root, 'too-large', Readable.from([Buffer.alloc(1024)]), 10), /volumineux/);
  assert.deepEqual(await listFiles(root, ''), []);
  await writeFile(path.join(temp, 'outside'), 'secret');
  try { await symlink(path.join(temp, 'outside'), path.join(root, 'escape')); }
  catch (error) { if (process.platform === 'win32' && error.code === 'EPERM') { t.diagnostic('Symlink test requires privilege on Windows; runs on Linux CI'); return; } throw error; }
  await assert.rejects(downloadFile(root, 'escape'));
  await assert.rejects(trashFile(root, 'escape'));
  assert.deepEqual(await listFiles(root, ''), []);
});
test('partition guard protects mounted, swap, RAID and readonly disks', () => {
  const disk = { type: 'disk', name: '/dev/sdb', ro: false, mountpoints: [], children: [] };
  assert.equal(diskReason(disk), null);
  assert.match(diskReason({ ...disk, children: [{ type: 'part', mountpoints: ['/'] }] }), /montée/);
  assert.match(diskReason({ ...disk, children: [{ type: 'part', name: '/dev/sdb1', fstype: 'swap' }] }), /swap/);
  assert.match(diskReason({ ...disk, children: [{ type: 'part', fstype: 'linux_raid_member' }] }), /RAID/);
  assert.match(diskReason({ ...disk, ro: true }), /lecture seule/);
  assert.throws(() => partitionScript([{ label: 'bad\nlabel', sizeGiB: null }], 4e9));
  assert.throws(() => partitionScript([{ label: 'data', sizeGiB: 10 }], 4e9));
  assert.match(partitionScript([{ label: 'data', sizeGiB: null }], 4e9), /label: gpt/);
});
test('trash restoration and permanent purge preserve existing destinations', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-trash-')); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'original'), 'original bytes'); await trashFile(root, 'original');
  const record = (await listTrash(root))[0]; assert.equal(record.original, 'original');
  await writeFile(path.join(root, 'original'), 'new bytes');
  await assert.rejects(restoreTrash(root, record.id), { code: 'EEXIST' });
  await restoreTrash(root, record.id, 'restored'); assert.equal(await readFile(path.join(root, 'restored'), 'utf8'), 'original bytes');
  await trashFile(root, 'restored'); await assert.rejects(purgeTrash(root, 'no'), /Confirmation/);
  await purgeTrash(root, 'VIDER LA CORBEILLE'); assert.deepEqual(await listTrash(root), []);
  if (process.platform === 'linux') {
    await mkdir(path.join(root, 'folder')); await writeFile(path.join(root, 'folder', 'child'), 'data'); await trashFile(root, 'folder');
    await restoreTrash(root, (await listTrash(root))[0].id); assert.equal(await readFile(path.join(root, 'folder', 'child'), 'utf8'), 'data');
  }
});
test('Samba enforces account allowlist, read-only members and no symlinks', () => {
  const config = sambaConfig([{ name: 'documents', path: '/srv/nexus/data/documents', members: [{ name: 'alice', write: true }, { name: 'bob', write: false }] }]);
  assert.match(config, /valid users = nx_alice nx_bob/); assert.match(config, /write list = nx_alice\n/);
  assert.match(config, /follow symlinks = no/); assert.match(config, /guest ok = no/);
});
