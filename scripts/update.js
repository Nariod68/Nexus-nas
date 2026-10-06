import { readFile, writeFile, mkdir, realpath, symlink, rename, unlink, open, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { latestRelease, newer, repository } from '../server/releases.js';
import { validateBundle } from './bundle.js';

const base = '/opt/nexus';
async function report(status, message) {
  await mkdir('/var/lib/nexus-agent', { recursive: true, mode: 0o700 });
  const file = '/var/lib/nexus-agent/update-status.json';
  const old = await readFile(file, 'utf8').then(JSON.parse).catch(() => ({}));
  await writeFile(file + '.new', JSON.stringify({ ...old, status, message, time: new Date().toISOString() }), { mode: 0o600 });
  await rename(file + '.new', file);
}
async function deployUnits(target) {
  for (const name of ['nexus.service', 'nexus-agent.service']) await copyFile(path.join(target, 'deploy', name), `/etc/systemd/system/${name}`);
  execFileSync('systemctl', ['daemon-reload']);
}
async function download(url, limit) {
  if (!url.startsWith(`https://github.com/${repository}/releases/download/`)) throw new Error('URL de publication refusée');
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Téléchargement : HTTP ${response.status}`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > limit) throw new Error('Publication trop volumineuse'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function switchTo(target) {
  const temporary = `${base}/.current-${process.pid}`;
  await symlink(target, temporary);
  await rename(temporary, `${base}/current`);
}
async function healthy(version) {
  const env = await readFile('/etc/nexus/nexus.env', 'utf8');
  const port = /^NEXUS_PORT=(\d+)$/m.exec(env)?.[1] || '8080';
  for (let i = 0; i < 20; i++) {
    try { const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) }); if (res.ok && (await res.json()).version === version) return true; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}
async function main() {
  if (process.platform !== 'linux' || process.getuid() !== 0) throw new Error('Exécuter cette commande avec sudo sur le serveur Linux');
  if (process.argv.slice(2).some(arg => arg !== '--rollback')) throw new Error('Option inconnue');
  const lock = await open(`${base}/.update-lock`, 'wx');
  try {
    await report('running', 'Vérification de la publication');
    const previous = await realpath(`${base}/current`);
    if (!previous.startsWith(`${base}/releases/`)) throw new Error('Installation inattendue');
    const installed = JSON.parse(await readFile(path.join(previous, 'package.json'))).version;
    let target, version;
    if (process.argv.includes('--rollback')) {
      target = (await readFile(`${base}/previous`, 'utf8')).trim();
      if (!target.startsWith(`${base}/releases/`) || await realpath(target) !== target) throw new Error('Sauvegarde invalide');
      version = JSON.parse(await readFile(path.join(target, 'package.json'))).version;
    } else {
      const release = await latestRelease();
      if (!newer(release.tag_name, installed)) { await report('success', 'Nexus est à jour'); console.log('Nexus est à jour'); return; }
      version = release.tag_name.slice(1);
      const name = `nexus-${release.tag_name}.json`;
      const asset = release.assets?.find(a => a.name === name);
      const hash = release.assets?.find(a => a.name === `${name}.sha256`);
      if (!asset || !hash) throw new Error('Paquet Nexus ou somme SHA-256 absent de la publication');
      const hashText = (await download(hash.browser_download_url, 1024)).toString('utf8').trim();
      const match = /^([a-f0-9]{64})  (\S+)$/.exec(hashText);
      if (!match || match[2] !== name) throw new Error('Somme SHA-256 invalide');
      const bytes = await download(asset.browser_download_url, 20000000);
      if (asset.digest && asset.digest !== `sha256:${match[1]}`) throw new Error('Empreinte GitHub incohérente');
      const contents = validateBundle(bytes, match[1], release.tag_name);
      target = `${base}/releases/${release.tag_name}-${Date.now()}`;
      await mkdir(target, { mode: 0o755 });
      for (const [name, data] of contents) { const dest = path.join(target, name); await mkdir(path.dirname(dest), { recursive: true }); await writeFile(dest, data, { mode: 0o644, flag: 'wx' }); }
      execFileSync(process.execPath, ['--check', path.join(target, 'server/main.js')]);
      execFileSync(process.execPath, ['--check', path.join(target, 'agent/main.js')]);
    }
    await writeFile(`${base}/previous`, previous, { mode: 0o600 });
    await switchTo(target);
    try {
      await report('running', 'Redémarrage sur la nouvelle version');
      await deployUnits(target);
      execFileSync('systemctl', ['restart', 'nexus-agent', 'nexus']);
      if (!await healthy(version)) throw new Error('La nouvelle version ne répond pas');
      execFileSync('systemctl', ['is-active', '--quiet', 'nexus-agent']);
    } catch (error) {
      await switchTo(previous); await deployUnits(previous); execFileSync('systemctl', ['restart', 'nexus-agent', 'nexus']);
      throw new Error(`${error.message}. Version précédente restaurée.`);
    }
    await report('success', `Nexus ${version} installé`);
    console.log(`Nexus ${version} installé. Configuration conservée dans /etc/nexus.`);
  } finally { await lock.close(); await unlink(`${base}/.update-lock`); }
}
main().catch(async error => { await report('failed', error.message).catch(() => {}); console.error(error.message); process.exitCode = 1; });
