import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { snapshot } from './system.js';
import { latestRelease, newer, repository } from './releases.js';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const assets = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/live.js': ['live.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/nexus-icon.svg': ['nexus-icon.svg', 'image/svg+xml'] };
const digest = value => createHash('sha256').update(value).digest();
export function createServer({ password, storagePath = '/', secureCookies = false, publicOrigin } = {}) {
  if (typeof password !== 'string' || password.length < 16) throw new Error('NEXUS_ADMIN_PASSWORD doit contenir au moins 16 caractères.');
  const sessions = new Map(), attempts = new Map();
  const passwordHash = digest(password);
  const housekeeping = setInterval(() => {
    for (const [key, expires] of sessions) if (expires < Date.now()) sessions.delete(key);
    for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
  }, 60000).unref();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self' https://api.github.com; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/api/health' && req.method === 'GET') return send(200, { version: pkg.version, status: 'ok' });
      if (req.method === 'POST') {
        const expected = publicOrigin || `http://${req.headers.host}`;
        if (req.headers.origin !== expected || req.headers['x-nexus-request'] !== '1') return send(403, { error: 'Origine refusée' });
      }
      if (path === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress;
        let attempt = attempts.get(ip);
        if (!attempt || attempt.until < Date.now()) attempt = { count: 0, until: Date.now() + 300000 };
        if (attempt.count >= 5 || attempts.size > 10000 || sessions.size >= 1000) return send(429, { error: 'Réessayez dans cinq minutes' });
        attempt.count++; attempts.set(ip, attempt);
        let body = '';
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 4096) return send(413, { error: 'Requête trop volumineuse' }); }
        let input;
        try { input = JSON.parse(body); } catch { return send(400, { error: 'JSON invalide' }); }
        if (typeof input.password !== 'string' || !timingSafeEqual(passwordHash, digest(input.password))) return send(401, { error: 'Mot de passe incorrect' });
        attempts.delete(ip);
        const token = randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + 8 * 3600000);
        res.setHeader('Set-Cookie', `nexus_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookies ? '; Secure' : ''}`);
        return send(200, { ok: true });
      }
      const token = /(?:^|;\s*)nexus_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      if (path.startsWith('/api/')) {
        if (!token || (sessions.get(token) || 0) <= Date.now()) return send(401, { error: 'Connexion requise' });
        if (path === '/api/logout' && req.method === 'POST') { sessions.delete(token); res.setHeader('Set-Cookie', 'nexus_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send(200, { ok: true }); }
        if (path === '/api/system' && req.method === 'GET') return send(200, { ...await snapshot(storagePath), version: pkg.version });
        if (path === '/api/updates' && req.method === 'GET') {
          try { const release = await latestRelease(); return send(200, { version: release.tag_name, available: newer(release.tag_name, pkg.version), repository, command: 'sudo node /opt/nexus/current/scripts/update.js' }); }
          catch (error) { return send(502, { error: error.message }); }
        }
        return send(404, { error: 'Route inconnue' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { error: 'Méthode refusée' });
      if (!assets[path]) return send(404, { error: 'Fichier introuvable' });
      const [name, mime] = assets[path];
      const data = await readFile(new URL(name, root));
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8` });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) { console.error(error.message); if (!res.headersSent) send(500, { error: 'Erreur serveur' }); else res.end(); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => clearInterval(housekeeping));
  return server;
}
if (process.argv[1] && await realpath(process.argv[1]).catch(() => '') === fileURLToPath(import.meta.url)) {
  const host = process.env.NEXUS_HOST || '127.0.0.1';
  const port = Number(process.env.NEXUS_PORT || 8080);
  const server = createServer({ password: process.env.NEXUS_ADMIN_PASSWORD, storagePath: process.env.NEXUS_STORAGE_PATH || '/', secureCookies: process.env.NEXUS_SECURE_COOKIE === '1', publicOrigin: process.env.NEXUS_PUBLIC_ORIGIN });
  server.listen(port, host, () => console.log(`Nexus ${pkg.version} : http://${host}:${port}`));
}
