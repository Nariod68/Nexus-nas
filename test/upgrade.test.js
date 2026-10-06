import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import https from 'node:https';
const enabled = process.platform === 'linux' && process.env.NEXUS_UPGRADE_INTEGRATION === '1';
test('GitHub web update and rollback keep administrator, share and file data', { skip: !enabled, timeout: 180000 }, async () => {
  const installed = JSON.parse(await readFile('/opt/nexus/current/package.json', 'utf8')).version;
  const desired = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
  assert.equal(installed, '0.3.0'); assert.notEqual(desired, installed);
  const ca = await readFile('/etc/nexus/server.crt');
  const token = /^NEXUS_SETUP_TOKEN=(.+)$/m.exec(await readFile('/etc/nexus/nexus.env', 'utf8'))[1];
  const request = (route, method = 'GET', body, cookie) => new Promise((resolve, reject) => {
    const req = https.request(`https://127.0.0.1:8443${route}`, { method, ca, headers: { Origin: 'https://127.0.0.1:8443', 'X-Nexus-Request': '1', ...(cookie ? { Cookie: cookie } : {}) } }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve({ status: res.statusCode, data, cookie: res.headers['set-cookie']?.[0].split(';')[0] }));
    }); req.on('error', reject); req.end(body ? typeof body === 'string' ? body : JSON.stringify(body) : undefined);
  });
  const credentials = { name: 'upgradeadmin', password: 'upgrade-test-long-password' };
  let res = await request('/api/setup', 'POST', { ...credentials, token }); assert.equal(res.status, 200, res.data);
  const login = async () => { const response = await request('/api/login', 'POST', credentials); assert.equal(response.status, 200, response.data); return response.cookie; };
  let cookie = await login();
  res = await request('/api/shares/save', 'POST', { name: 'upgradetest', volume: 'system', members: [{ name: credentials.name, write: true }] }, cookie); assert.equal(res.status, 200, res.data);
  res = await request('/api/files/upload?share=upgradetest&path=preserved.txt', 'PUT', 'Preserve this across releases', cookie); assert.equal(res.status, 201, res.data);
  const waitForVersion = async version => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const status = await readFile('/var/lib/nexus-agent/update-status.json', 'utf8').then(JSON.parse).catch(() => ({}));
      if (status.status === 'failed') throw new Error(status.message);
      try { const response = await request('/api/health'); if (JSON.parse(response.data).version === version && status.status === 'success') return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`La version ${version} n’est pas disponible`);
  };
  const updates = await request('/api/updates', 'GET', undefined, cookie); assert.equal(updates.status, 200, updates.data); assert.equal(JSON.parse(updates.data).available, true);
  res = await request('/api/updates/install', 'POST', {}, cookie); assert.equal(res.status, 200, res.data);
  await waitForVersion(desired);
  cookie = await login();
  assert.equal((await request('/api/files/download?share=upgradetest&path=preserved.txt', 'GET', undefined, cookie)).data, 'Preserve this across releases');
  res = await request('/api/updates/rollback', 'POST', {}, cookie); assert.equal(res.status, 200, res.data);
  await waitForVersion(installed);
  cookie = await login();
  assert.equal((await request('/api/files/download?share=upgradetest&path=preserved.txt', 'GET', undefined, cookie)).data, 'Preserve this across releases');
});
