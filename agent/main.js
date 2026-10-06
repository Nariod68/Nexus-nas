import http from 'node:http';
import { readFile, writeFile, mkdir, chmod, chown, unlink, realpath, lstat, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Store, username } from '../server/store.js';
import { run } from './commands.js';
import { Disks } from './disks.js';

const stateFile = '/var/lib/nexus-agent/state.json';
const store = new Store(stateFile, { shares: [], users: [], jobs: [] });
const disks = new Disks();
async function audit(action, status) {
  await mkdir('/var/lib/nexus-agent', { recursive: true, mode: 0o700 });
  const { appendFile } = await import('node:fs/promises');
  await appendFile('/var/lib/nexus-agent/audit.jsonl', JSON.stringify({ time: new Date().toISOString(), action, status }) + '\n', { mode: 0o600 });
}
export function sambaConfig(shares) {
  return ['# Managed by Nexus. Local configuration is preserved in smb.conf.\n[global]\nserver min protocol = SMB2\nserver signing = mandatory\nmap to guest = Never\n', ...shares.map(s => `\n[${s.name}]\npath = ${s.path}\nbrowseable = yes\nguest ok = no\nvalid users = ${s.members.map(m => `nx_${m.name}`).join(' ')}\nread only = yes\nwrite list = ${s.members.filter(m => m.write).map(m => `nx_${m.name}`).join(' ')}\nforce user = nexus\nforce group = nexus\ncreate mask = 0660\ndirectory mask = 0770\nfollow symlinks = no\nwide links = no\nveto files = /.nexus-*/\n`)].join('\n');
}
async function writeSamba(shares) {
  const file = '/etc/samba/nexus-shares.conf';
  const old = await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
  await writeFile(file + '.new', sambaConfig(shares), { mode: 0o644 });
  await rename(file + '.new', file);
  try { await run('testparm', ['-s']); await run('systemctl', ['restart', 'smbd']); }
  catch (error) { await writeFile(file, old, { mode: 0o644 }); await run('systemctl', ['restart', 'smbd']).catch(() => {}); throw error; }
}
async function volumes() {
  const mounts = (await readFile('/proc/self/mountinfo', 'utf8')).split('\n').map(line => line.split(' ')[4]).filter(Boolean);
  return [{ id: 'system', name: 'Stockage système (sans formatage)', path: '/srv/nexus/data' }, ...mounts.filter(p => /^\/srv\/nexus\/volumes\/[a-f0-9-]{36}$/.test(p)).map(p => ({ id: path.basename(p), name: path.basename(p), path: p }))];
}
async function shareAction(data, removing = false) {
  const name = username(data.name);
  return store.change(async state => {
    const existing = state.shares.find(s => s.name === name);
    if (removing) {
      if (!existing) throw new Error('Partage introuvable');
      const shares = state.shares.filter(s => s.name !== name); await writeSamba(shares); state.shares = shares;
      return { ok: true, message: 'Le partage est retiré. Ses fichiers sont conservés.' };
    }
    if (!Array.isArray(data.members) || !data.members.length) throw new Error('Sélectionner au moins un utilisateur');
    const members = data.members.map(m => ({ name: username(m.name), write: m.write === true }));
    if (new Set(members.map(m => m.name)).size !== members.length || members.some(m => !state.users.includes(m.name))) throw new Error('Utilisateur SMB inconnu ou en double');
    const volume = (await volumes()).find(v => v.id === data.volume);
    if (!volume) throw new Error('Volume indisponible ou non monté');
    if (existing && existing.volume !== volume.id) throw new Error('Retirer ce partage avant de changer son volume');
    const location = path.join(volume.path, name);
    if (await realpath(volume.path) !== volume.path) throw new Error('Volume symbolique refusé');
    await mkdir(location, { mode: 0o2770 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const info = await lstat(location); if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Dossier refusé');
    const identity = (await run('getent', ['passwd', 'nexus'])).split(':');
    await chown(location, Number(identity[2]), Number(identity[3])); await chmod(location, 0o2770);
    const share = { name, path: location, volume: volume.id, members };
    const shares = [...state.shares.filter(s => s.name !== name), share];
    await writeSamba(shares); state.shares = shares; return share;
  });
}
async function userAction(data) {
  const name = username(data.name), account = `nx_${name}`;
  if (typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 256 || /[\r\n\0]/.test(data.password)) throw new Error('Mot de passe SMB invalide (12 caractères minimum, sans retour à la ligne)');
  return store.change(async state => {
    if (!state.users.includes(name)) {
      const exists = await run('getent', ['passwd', account]).then(() => true).catch(() => false);
      if (exists) throw new Error('Ce compte Linux existe déjà hors de Nexus');
      await run('useradd', ['--no-create-home', '--shell', '/usr/sbin/nologin', '--', account]);
      // Persist ownership before setting SMB password, so a failed attempt is retryable.
      state.users.push(name);
      await writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
    }
    await run('smbpasswd', ['-s', '-a', account], { input: `${data.password}\n${data.password}\n` });
    await run('smbpasswd', ['-e', account]);
    await run('systemctl', ['restart', 'smbd']); return { ok: true };
  });
}
async function queueJob(kind, work) {
  const id = randomUUID();
  await store.change(async state => {
    const update = await readFile('/var/lib/nexus-agent/update-status.json', 'utf8').then(JSON.parse).catch(() => null);
    if (update?.status === 'running' && Date.now() - Date.parse(update.time) < 15 * 60000) throw new Error('Une mise à jour est en cours');
    if (state.jobs.some(j => j.status === 'running')) throw new Error('Une opération système est déjà en cours');
    state.jobs = [...state.jobs.slice(-49), { id, kind, status: 'running', message: 'Préparation', time: new Date().toISOString() }];
  });
  setImmediate(async () => {
    const progress = async message => store.change(state => { const j = state.jobs.find(j => j.id === id); j.message = message; });
    try {
      const result = await work(message => { progress(message).catch(() => {}); });
      await store.change(state => Object.assign(state.jobs.find(j => j.id === id), { status: 'success', result, message: 'Terminé' })); await audit(kind, 'success');
    } catch (error) { await store.change(state => Object.assign(state.jobs.find(j => j.id === id), { status: 'failed', message: error.message })); await audit(kind, 'failed'); }
  });
  return { id };
}
export async function dispatch(action, data) {
  if (action === 'shares.check') {
    const name = username(data.name), user = username(data.user), state = await store.read();
    const share = state.shares.find(s => s.name === name); if (!share) throw new Error('Partage introuvable');
    const checks = [];
    const check = async (key, work) => { try { checks.push({ key, ok: !!await work() }); } catch { checks.push({ key, ok: false }); } };
    await check('service', async () => (await run('systemctl', ['is-active', 'smbd'])).trim() === 'active');
    await check('configuration', async () => { await run('testparm', ['-s']); return true; });
    await check('account', async () => { const entry = await run('pdbedit', ['-L', '-v', '-u', `nx_${user}`]); return /Unix username:\s+nx_/.test(entry) && !/Account Flags:\s+\[[^\]]*D/.test(entry); });
    await check('permission', async () => share.members.some(m => m.name === user));
    await check('volume', async () => (await volumes()).some(v => v.id === share.volume));
    await check('directory', async () => { const directory = await lstat(share.path); return directory.isDirectory() && !directory.isSymbolicLink(); });
    return { ready: checks.every(c => c.ok), checks };
  }
  if (action === 'state') {
    const state = await store.read();
    const diagnostics = [];
    const detected = await disks.inventory().catch(error => { diagnostics.push(`Détection des disques indisponible : ${error.message}`); return []; });
    return { ...state, volumes: await volumes(), disks: detected, diagnostics, update: await readFile('/var/lib/nexus-agent/update-status.json', 'utf8').then(JSON.parse).catch(() => null) };
  }
  if (action === 'disks.plan') return disks.plan(data);
  if (action === 'disks.execute') return queueJob('partition', progress => disks.execute(data, progress));
  if (action === 'shares.save') return shareAction(data);
  if (action === 'shares.remove') return shareAction(data, true);
  if (action === 'users.save') return userAction(data);
  if (action === 'users.disable') {
    username(data.name); if (!(await store.read()).users.includes(data.name)) throw new Error('Compte Nexus inconnu');
    await run('smbpasswd', ['-d', `nx_${data.name}`]);
    await run('systemctl', ['restart', 'smbd']); return { ok: true };
  }
  if (action === 'hostname') {
    if (typeof data.name !== 'string' || !/^[a-z][a-z0-9-]{0,62}$/.test(data.name) || data.name.endsWith('-')) throw new Error('Nom de serveur invalide');
    await run('hostnamectl', ['set-hostname', data.name]); return { ok: true };
  }
  if (action === 'updates.install' || action === 'updates.rollback') {
    const id = randomUUID();
    await store.change(async state => {
      if (state.jobs.some(j => j.status === 'running')) throw new Error('Attendre la fin de l’opération disque avant de mettre à jour');
      const status = await readFile('/var/lib/nexus-agent/update-status.json', 'utf8').then(JSON.parse).catch(() => null);
      if (status?.status === 'running' && Date.now() - Date.parse(status.time) < 15 * 60000) throw new Error('Une mise à jour est en cours');
      await writeFile('/var/lib/nexus-agent/update-status.json', JSON.stringify({ id, status: 'running', time: new Date().toISOString(), message: 'Démarrage' }), { mode: 0o600 });
    });
    try { await run('systemdRun', ['--unit', `nexus-update-${id}`, '--collect', '--property=Type=exec', process.execPath, '/opt/nexus/current/scripts/update.js', ...(action === 'updates.rollback' ? ['--rollback'] : [])]); }
    catch (error) { await writeFile('/var/lib/nexus-agent/update-status.json', JSON.stringify({ id, status: 'failed', message: error.message }), { mode: 0o600 }); throw error; }
    return { id };
  }
  if (action === 'system.restart') { if (data.confirmation !== 'REDÉMARRER') throw new Error('Confirmation requise'); await run('systemdRun', ['--on-active=5s', '/usr/bin/systemctl', 'reboot']); return { ok: true }; }
  throw new Error('Action système non autorisée');
}
export async function startAgent(socketPath = '/run/nexus-agent/socket') {
  if (process.platform !== 'linux' || process.getuid() !== 0) throw new Error('L’agent doit être lancé par root sous Linux');
  // Reapply managed SMB settings to existing shares after an upgrade too.
  await writeSamba((await store.read()).shares);
  await store.change(state => { for (const job of state.jobs) if (job.status === 'running') { job.status = 'failed'; job.message = 'Opération interrompue par le redémarrage de l’agent. Vérifier le disque avant de réessayer.'; } });
  await mkdir(path.dirname(socketPath), { recursive: true, mode: 0o750 });
  await unlink(socketPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url !== '/') throw new Error('Requête refusée');
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 65536) throw new Error('Requête trop volumineuse'); }
      const { action, data } = JSON.parse(body);
      // No general command execution, shell, arbitrary paths or network listener.
      const result = await dispatch(action, data || {}); await audit(action, 'accepted');
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result));
    } catch (error) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); }
  });
  await new Promise(resolve => server.listen(socketPath, resolve));
  const gid = Number((await run('getent', ['group', 'nexus'])).split(':')[2]);
  await chown(path.dirname(socketPath), 0, gid); await chown(socketPath, 0, gid); await chmod(socketPath, 0o660);
  return server;
}
if (process.argv[1] && await realpath(process.argv[1]).catch(() => '') === fileURLToPath(import.meta.url)) startAgent().catch(error => { console.error(error.message); process.exitCode = 1; });
