import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import { Disks } from '../agent/disks.js';
const integration = process.platform === 'linux' && process.env.NEXUS_LINUX_INTEGRATION === '1';

test('installed Linux services, HTTPS setup, real Samba and file transfer', { skip: !integration, timeout: 120000 }, async () => {
  const env = await readFile('/etc/nexus/nexus.env', 'utf8');
  const token = /^NEXUS_SETUP_TOKEN=(.+)$/m.exec(env)[1];
  const ca = await readFile('/etc/nexus/server.crt');
  const request = (route, method = 'GET', body, cookie) => new Promise((resolve, reject) => {
    const req = https.request(`https://127.0.0.1:8443${route}`, { method, ca, headers: { Origin: 'https://127.0.0.1:8443', 'X-Nexus-Request': '1', ...(cookie ? { Cookie: cookie } : {}) } }, res => {
      let data = ''; res.on('data', d => data += d); res.on('end', () => resolve({ status: res.statusCode, data, cookie: res.headers['set-cookie']?.[0].split(';')[0] }));
    }); req.on('error', reject); req.end(body ? typeof body === 'string' ? body : JSON.stringify(body) : undefined);
  });
  const credentials = { name: 'ciadmin', password: 'ci-integration-password-123' };
  assert.equal((await request('/api/setup', 'POST', { token, ...credentials })).status, 200);
  const login = await request('/api/login', 'POST', credentials); assert.equal(login.status, 200);
  const cookie = login.cookie;
  const system = await request('/api/system', 'GET', undefined, cookie);
  assert.equal(system.status, 200, system.data);
  const metrics = JSON.parse(system.data);
  assert.ok(metrics.network.length > 0, 'The installed systemd service must enumerate real network interfaces');
  assert.deepEqual(metrics.diagnostics, []);
  assert.equal((await request('/api/shares/save', 'POST', { name: 'citest', volume: 'system', members: [{ name: credentials.name, write: true }] }, cookie)).status, 200);
  assert.equal((await request('/api/files/upload?share=citest&path=hello.txt', 'PUT', 'Linux NAS transfer', cookie)).status, 201);
  const folder = await request('/api/files/folder?share=citest&path=photos', 'POST', {}, cookie);
  assert.equal(folder.status, 201, folder.data);
  assert.equal((await request('/api/files/upload?share=citest&path=photos/nested.txt', 'PUT', 'Nested file', cookie)).status, 201);
  assert.equal((await request('/api/files/move?share=citest&path=photos', 'POST', { destination: 'albums' }, cookie)).status, 200);
  const nested = await request('/api/files?share=citest&path=albums', 'GET', undefined, cookie);
  assert.equal(nested.status, 200, nested.data);
  assert.match(nested.data, /nested.txt/);
  assert.equal((await request('/api/files/download?share=citest&path=hello.txt', 'GET', undefined, cookie)).data, 'Linux NAS transfer');
  const auth = path.join(os.tmpdir(), 'nexus-smb-test-auth');
  await writeFile(auth, `username = nx_ciadmin\npassword = ${credentials.password}\n`, { mode: 0o600 });
  try {
    const output = execFileSync('smbclient', ['//127.0.0.1/citest', '--option=client min protocol=SMB2', '--option=client signing=mandatory', '-A', auth, '-c', 'ls; cd albums; ls'], { encoding: 'utf8' }); assert.match(output, /hello.txt/); assert.match(output, /nested.txt/);
  } finally { await rm(auth, { force: true }); }
});

test('real GPT/ext4 partitioning ONLY on a newly allocated disposable loop device', { skip: !integration, timeout: 120000 }, async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'nexus-loop-'));
  const image = path.join(temp, 'disposable.img');
  execFileSync('truncate', ['-s', '256M', image]);
  const device = execFileSync('losetup', ['--find', '--show', '--partscan', image], { encoding: 'utf8' }).trim();
  assert.match(device, /^\/dev\/loop\d+$/);
  const originalFstab = await readFile('/etc/fstab');
  let mounted;
  process.env.NEXUS_TEST_DISKS = '1';
  try {
    const disks = new Disks();
    const plan = await disks.plan({ device, partitions: [{ label: 'nexus-test', sizeGiB: null }] });
    await assert.rejects(disks.execute({ token: plan.token, confirmation: 'wrong' }), /confirmation/);
    const second = await disks.plan({ device, partitions: [{ label: 'nexus-test', sizeGiB: null }] });
    const result = await disks.execute({ token: second.token, confirmation: `EFFACER ${device}` });
    mounted = result.volumes[0].mountpoint;
    await writeFile(path.join(mounted, 'verify.txt'), 'ext4 works');
    assert.equal(await readFile(path.join(mounted, 'verify.txt'), 'utf8'), 'ext4 works');
    await assert.rejects(disks.plan({ device, partitions: [{ label: 'unsafe', sizeGiB: null }] }), /montée/);
    assert.match(await readFile('/etc/fstab', 'utf8'), new RegExp(result.volumes[0].uuid));
  } finally {
    if (mounted) execFileSync('umount', [mounted]);
    await writeFile('/etc/fstab', originalFstab);
    execFileSync('losetup', ['--detach', device]);
    await rm(temp, { recursive: true, force: true }); delete process.env.NEXUS_TEST_DISKS;
  }
});
