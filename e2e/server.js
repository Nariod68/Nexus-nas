import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../server/main.js';
const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-browser-'));
const data = { shares: [], users: [], volumes: [{ id: 'system', name: 'Stockage système', path: root }], disks: [{ name: '/dev/testdisk', size: 8 * 1024 ** 3, model: 'Disque de test', canPartition: true }], jobs: [] };
const agent = async (action, value) => {
  if (action === 'state') return data;
  if (action === 'shares.check') return { ready: true, checks: ['service', 'configuration', 'account', 'permission', 'volume', 'directory'].map(key => ({ key, ok: true })) };
  if (action === 'users.save') { data.users.push(value.name); return { ok: true }; }
  if (action === 'hostname' || action === 'users.disable') return { ok: true };
  if (action === 'shares.save') { const directory = path.join(root, value.name); await mkdir(directory, { recursive: true }); data.shares = [...data.shares.filter(s => s.name !== value.name), { ...value, path: directory }]; return { ok: true }; }
  if (action === 'shares.remove') { data.shares = data.shares.filter(s => s.name !== value.name); return { ok: true }; }
  if (action === 'disks.plan') return { ...value, token: 'fixture-token', confirmation: `EFFACER ${value.device}`, warning: 'Toutes les données seront détruites.' };
  throw new Error('Action indisponible dans ce test');
};
const server = createServer({ setupToken: 'browser-setup-token-1234567890', statePath: path.join(root, '.state.json'), agent });
server.listen(8099, '127.0.0.1');
process.on('SIGTERM', () => { server.close(); rm(root, { recursive: true, force: true }).finally(() => process.exit()); });
