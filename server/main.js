import http from 'node:http';
import https from 'node:https';
import { readFile, realpath } from 'node:fs/promises';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { snapshot } from './system.js';
import { latestRelease, newer, repository } from './releases.js';
import { Store, passwordHash, passwordMatches, username } from './store.js';
import { agentClient } from './agent-client.js';
import { listFiles, downloadFile, uploadFile, makeDirectory, trashFile, moveFile, listTrash, restoreTrash, purgeTrash } from './files.js';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const assets = Object.fromEntries(['index.html', 'app.js', 'live.js', 'console.js', 'styles.css', 'nexus-icon.svg'].map(name => [`/${name}`, [name, name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/html']]));
assets['/'] = assets['/index.html'];
const digest = value => createHash('sha256').update(value).digest();
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
async function jsonBody(req) {
  let body = ''; for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 65536) fail(413, 'Requête trop volumineuse'); }
  try { return JSON.parse(body || '{}'); } catch { fail(400, 'JSON invalide'); }
}
const publicUser = ({ name, role, enabled }) => ({ name, role, enabled });
export function createServer({ password, setupToken, statePath, storagePath = '/', secureCookies = false, publicOrigin, agent = agentClient(), maximumUpload, tls } = {}) {
  if (!password && (typeof setupToken !== 'string' || setupToken.length < 24)) throw new Error('Un code d’installation est requis');
  if (password && (typeof password !== 'string' || password.length < 16)) throw new Error('NEXUS_ADMIN_PASSWORD doit contenir au moins 16 caractères.');
  const state = new Store(statePath);
  const ready = password ? state.change(async data => { if (!data.configured) { data.configured = true; data.users = [{ name: 'admin', role: 'admin', enabled: true, hash: await passwordHash(password) }]; } }) : Promise.resolve();
  const sessions = new Map(), attempts = new Map();
  function rateLimit(ip) {
    let attempt = attempts.get(ip);
    if (!attempt || attempt.until < Date.now()) attempt = { count: 0, until: Date.now() + 300000 };
    if (attempt.count >= 5 || attempts.size > 10000 || sessions.size >= 1000) fail(429, 'Réessayez dans cinq minutes');
    attempt.count++; attempts.set(ip, attempt);
  }
  const housekeeping = setInterval(() => {
    for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key);
    for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
  }, 60000).unref();
  const handler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self' https://api.github.com; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      await ready;
      const url = new URL(req.url, 'http://localhost'), route = url.pathname;
      if (route === '/api/health' && req.method === 'GET') return send(200, { version: pkg.version, status: 'ok' });
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const expected = publicOrigin || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        if (req.headers.origin !== expected || req.headers['x-nexus-request'] !== '1') fail(403, 'Origine refusée');
      }
      if (route === '/api/setup' && req.method === 'GET') return send(200, { configured: (await state.read()).configured });
      if (route === '/api/setup' && req.method === 'POST') {
        rateLimit(req.socket.remoteAddress);
        const input = await jsonBody(req);
        if (!setupToken || typeof input.token !== 'string' || !timingSafeEqual(digest(setupToken), digest(input.token))) fail(403, 'Code d’installation incorrect');
        const name = username(input.name), hash = await passwordHash(input.password);
        await state.change(async data => {
          if (data.configured) fail(409, 'Le serveur est déjà configuré');
          if (input.hostname) await agent('hostname', { name: input.hostname });
          await agent('users.save', { name, password: input.password });
          data.configured = true; data.users = [{ name, hash, role: 'admin', enabled: true }];
        });
        attempts.delete(req.socket.remoteAddress); return send(200, { ok: true });
      }
      if (route === '/api/login' && req.method === 'POST') {
        rateLimit(req.socket.remoteAddress); const input = await jsonBody(req);
        const user = (await state.read()).users.find(u => u.name === (input.name || 'admin') && u.enabled);
        if (!await passwordMatches(input.password, user?.hash)) fail(401, 'Identifiants incorrects');
        attempts.delete(req.socket.remoteAddress);
        const token = randomBytes(32).toString('hex'); sessions.set(token, { name: user.name, expires: Date.now() + 8 * 3600000 });
        res.setHeader('Set-Cookie', `nexus_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookies || req.socket.encrypted ? '; Secure' : ''}`);
        return send(200, { user: publicUser(user) });
      }
      const token = /(?:^|;\s*)nexus_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      if (route.startsWith('/api/')) {
        const session = sessions.get(token);
        const user = session && session.expires > Date.now() ? (await state.read()).users.find(u => u.name === session.name && u.enabled) : null;
        if (!user) fail(401, 'Connexion requise');
        const admin = () => { if (user.role !== 'admin') fail(403, 'Réservé à un administrateur'); };
        if (route === '/api/me' && req.method === 'GET') return send(200, { user: publicUser(user), onboarding: (await state.read()).onboarding === true });
        if (route === '/api/onboarding' && req.method === 'POST') { admin(); await state.change(data => { data.onboarding = true; }); return send(200, { ok: true }); }
        if (route === '/api/logout' && req.method === 'POST') { sessions.delete(token); res.setHeader('Set-Cookie', 'nexus_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send(200, { ok: true }); }
        if (route === '/api/password' && req.method === 'POST') {
          const input = await jsonBody(req); if (!await passwordMatches(input.current, user.hash)) fail(403, 'Mot de passe actuel incorrect');
          const hash = await passwordHash(input.password); await agent('users.save', { name: user.name, password: input.password });
          await state.change(data => { data.users.find(u => u.name === user.name).hash = hash; });
          for (const [key, session] of sessions) if (session.name === user.name) sessions.delete(key); return send(200, { ok: true });
        }
        if (route === '/api/system' && req.method === 'GET') { admin(); return send(200, { ...await snapshot(storagePath), version: pkg.version }); }
        if (route === '/api/agent' && req.method === 'GET') { admin(); return send(200, await agent('state')); }
        if (route === '/api/users' && req.method === 'GET') { admin(); return send(200, (await state.read()).users.map(publicUser)); }
        if (route === '/api/users' && req.method === 'POST') {
          admin(); const input = await jsonBody(req), name = username(input.name);
          if (!['admin', 'user'].includes(input.role)) fail(400, 'Rôle invalide');
          const hash = await passwordHash(input.password);
          await state.change(async data => {
            if (data.users.some(u => u.name === name)) fail(409, 'Ce compte existe déjà');
            await agent('users.save', { name, password: input.password }); data.users.push({ name, hash, role: input.role, enabled: true });
          }); return send(201, { ok: true });
        }
        if (route === '/api/users/disable' && req.method === 'POST') {
          admin(); const input = await jsonBody(req); if (input.name === user.name) fail(400, 'Vous ne pouvez pas désactiver votre propre compte');
          await state.change(async data => { const selected = data.users.find(u => u.name === input.name); if (!selected) fail(404, 'Compte inconnu'); await agent('users.disable', { name: selected.name }); selected.enabled = false; });
          return send(200, { ok: true });
        }
        if (route === '/api/users/update' && req.method === 'POST') {
          admin(); const input = await jsonBody(req), name = username(input.name);
          if (!['admin', 'user'].includes(input.role)) fail(400, 'Rôle invalide');
          if (name === user.name && (input.role !== 'admin' || input.enabled === false)) fail(400, 'Vous ne pouvez pas retirer vos propres droits administrateur');
          const hash = input.password ? await passwordHash(input.password) : null;
          await state.change(async data => {
            const selected = data.users.find(u => u.name === name); if (!selected) fail(404, 'Compte inconnu');
            if (input.enabled === true && !selected.enabled && !input.password) fail(400, 'Un nouveau mot de passe est requis pour réactiver le compte');
            if (input.password) { await agent('users.save', { name, password: input.password }); selected.hash = hash; }
            if (input.enabled === false) await agent('users.disable', { name });
            selected.enabled = input.enabled !== false; selected.role = input.role;
          });
          for (const [key, session] of sessions) if (session.name === name) sessions.delete(key);
          return send(200, { ok: true });
        }
        if (route === '/api/shares' && req.method === 'GET') {
          const info = await agent('state'); return send(200, info.shares.filter(s => user.role === 'admin' || s.members.some(m => m.name === user.name)).map(s => ({ ...s, writable: user.role === 'admin' || s.members.some(m => m.name === user.name && m.write) })));
        }
        if (route.startsWith('/api/files')) {
          const info = await agent('state'), share = info.shares.find(s => s.name === url.searchParams.get('share'));
          if (!share || (user.role !== 'admin' && !share.members.some(m => m.name === user.name))) fail(403, 'Accès au partage refusé');
          if (!info.volumes.some(v => v.id === share.volume)) fail(503, 'Volume déconnecté : accès aux fichiers suspendu');
          const relative = url.searchParams.get('path') || '';
          const writable = () => { if (user.role !== 'admin' && !share.members.some(m => m.name === user.name && m.write)) fail(403, 'Partage en lecture seule'); };
          if (route === '/api/files/trash' && req.method === 'GET') return send(200, await listTrash(share.path));
          if (route === '/api/files/restore' && req.method === 'POST') { writable(); const input = await jsonBody(req); await restoreTrash(share.path, input.id, input.destination); return send(200, { ok: true }); }
          if (route === '/api/files/purge' && req.method === 'POST') { writable(); const input = await jsonBody(req); await purgeTrash(share.path, input.confirmation); return send(200, { ok: true }); }
          if (route === '/api/files' && req.method === 'GET') return send(200, await listFiles(share.path, relative));
          if (route === '/api/files/download' && req.method === 'GET') {
            const data = await downloadFile(share.path, relative);
            res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': data.size, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(data.name)}` });
            await pipeline(data.file.createReadStream(), res); return;
          }
          if (route === '/api/files/upload' && req.method === 'PUT') { writable(); req.setTimeout(60000); return send(201, await uploadFile(share.path, relative, req, maximumUpload)); }
          if (route === '/api/files/folder' && req.method === 'POST') { writable(); await makeDirectory(share.path, relative); return send(201, { ok: true }); }
          if (route === '/api/files' && req.method === 'DELETE') { writable(); await trashFile(share.path, relative); return send(200, { ok: true, message: 'Déplacé dans la corbeille du partage' }); }
          if (route === '/api/files/move' && req.method === 'POST') { writable(); const input = await jsonBody(req); await moveFile(share.path, relative, input.destination); return send(200, { ok: true }); }
        }
        if (route === '/api/updates' && req.method === 'GET') {
          admin(); const release = await latestRelease(); return send(200, { version: release.tag_name, available: newer(release.tag_name, pkg.version), repository });
        }
        const actions = { '/api/disks/plan': 'disks.plan', '/api/disks/execute': 'disks.execute', '/api/shares/save': 'shares.save', '/api/shares/remove': 'shares.remove', '/api/hostname': 'hostname', '/api/updates/install': 'updates.install', '/api/updates/rollback': 'updates.rollback', '/api/restart': 'system.restart' };
        if (actions[route] && req.method === 'POST') { admin(); const input = await jsonBody(req); return send(200, await agent(actions[route], input)); }
        fail(404, 'Route inconnue');
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Méthode refusée');
      if (!assets[route]) fail(404, 'Fichier introuvable');
      const [name, mime] = assets[route]; const data = await readFile(new URL(name, root));
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` }); res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      const codes = { ENOENT: 404, EEXIST: 409, ENOSPC: 507, EACCES: 403, ELOOP: 403 };
      if (!res.headersSent) send(error.status || codes[error.code] || 400, { error: error.message }); else res.destroy();
    }
  };
  const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
  server.requestTimeout = 0; server.headersTimeout = 10000; server.setTimeout(60000);
  server.on('close', () => clearInterval(housekeeping)); return server;
}
if (process.argv[1] && await realpath(process.argv[1]).catch(() => '') === fileURLToPath(import.meta.url)) {
  const host = process.env.NEXUS_HOST || '0.0.0.0', port = Number(process.env.NEXUS_PORT || 8080);
  const tls = process.env.NEXUS_TLS_CERT && process.env.NEXUS_TLS_KEY ? { cert: await readFile(process.env.NEXUS_TLS_CERT), key: await readFile(process.env.NEXUS_TLS_KEY) } : undefined;
  const tlsPort = Number(process.env.NEXUS_TLS_PORT || 8443);
  const server = createServer({ password: process.env.NEXUS_ADMIN_PASSWORD, setupToken: process.env.NEXUS_SETUP_TOKEN, statePath: process.env.NEXUS_STATE_PATH || '/var/lib/nexus/state.json', storagePath: process.env.NEXUS_STORAGE_PATH || '/srv/nexus', secureCookies: process.env.NEXUS_SECURE_COOKIE === '1', publicOrigin: process.env.NEXUS_PUBLIC_ORIGIN, tls });
  server.listen(tls ? tlsPort : port, host, () => console.log(`Nexus ${pkg.version} : ${tls ? 'https' : 'http'}://${host}:${tls ? tlsPort : port}`));
  if (tls) http.createServer((req, res) => {
    if (req.url === '/api/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ version: pkg.version, status: 'ok' })); return; }
    try { const url = new URL(req.url, `http://${req.headers.host}`); url.protocol = 'https:'; url.port = String(tlsPort); res.writeHead(302, { Location: url.href }); res.end(); }
    catch { res.writeHead(400); res.end(); }
  }).listen(port, host);
}
