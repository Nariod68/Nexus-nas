import { open, realpath, readdir, lstat, mkdir, link, unlink, rename, statfs, rm, rmdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform, Writable } from 'node:stream';

export function components(relative = '') {
  if (typeof relative !== 'string' || relative.length > 2048 || relative.includes('\\') || relative.includes('\0') || relative.startsWith('/')) throw new Error('Chemin refusé');
  const parts = relative === '' ? [] : relative.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.nexus-') || /[\x00-\x1f\x7f]/.test(p) || Buffer.byteLength(p) > 255)) throw new Error('Chemin refusé');
  return parts;
}
// On Linux each component is opened with O_NOFOLLOW. /proc anchors operations to
// pinned directory descriptors rather than a pathname that SMB can swap midway.
export async function directory(root, relative = '') {
  const parts = components(relative), handles = [];
  let location = await realpath(root);
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink()) throw new Error('Racine symbolique refusée');
  try {
    for (const part of [null, ...parts]) {
      const candidate = part === null ? location : path.join(location, part);
      const info = await lstat(candidate);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Dossier ou lien refusé');
      const handle = await open(candidate, constants.O_RDONLY | (constants.O_DIRECTORY || 0) | (constants.O_NOFOLLOW || 0));
      handles.push(handle);
      location = process.platform === 'linux' ? `/proc/self/fd/${handle.fd}` : candidate;
    }
    return { path: location, close: () => Promise.all(handles.map(h => h.close())) };
  } catch (error) { await Promise.all(handles.map(h => h.close())); throw error; }
}
async function parent(root, relative) {
  const parts = components(relative); if (!parts.length) throw new Error('La racine est protégée');
  const name = parts.pop(); return { ...await directory(root, parts.join('/')), name };
}
export async function storageUsage(root) {
  const dir = await directory(root);
  try {
    const usage = await statfs(dir.path);
    const total = usage.blocks * usage.bsize;
    const available = Math.max(0, Math.min(total, usage.bavail * usage.bsize));
    // Include filesystem-reserved space: it cannot be used by the NAS account.
    return { total, available, used: Math.max(0, total - available) };
  } finally { await dir.close(); }
}
export async function listFiles(root, relative) {
  const dir = await directory(root, relative);
  try {
    const entries = await readdir(dir.path, { withFileTypes: true });
    const result = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.nexus-') || entry.isSymbolicLink()) continue;
      try { const stat = await lstat(path.join(dir.path, entry.name)); if (stat.isDirectory() || (stat.isFile() && stat.nlink === 1)) result.push({ name: entry.name, directory: stat.isDirectory(), size: stat.size, modified: stat.mtime.toISOString() }); } catch {}
    }
    return result.sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name));
  } finally { await dir.close(); }
}
export async function downloadFile(root, relative) {
  const dir = await parent(root, relative);
  try {
    const file = await open(path.join(dir.path, dir.name), constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
    const info = await file.stat();
    if (!info.isFile() || info.nlink !== 1) { await file.close(); throw new Error('Fichier ou lien refusé'); }
    return { file, name: dir.name, size: info.size };
  } finally { await dir.close(); }
}
export async function previewFile(root, relative) {
  const data = await downloadFile(root, relative);
  try {
    if (data.size > 16 * 1024 ** 2) throw new Error('Aperçu trop volumineux');
    const header = Buffer.alloc(32); await data.file.read(header, 0, header.length, 0);
    const hex = header.toString('hex'), ascii = header.toString('ascii');
    const mime = hex.startsWith('89504e470d0a1a0a') ? 'image/png'
      : hex.startsWith('ffd8ff') ? 'image/jpeg'
      : ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a') ? 'image/gif'
      : ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP' ? 'image/webp'
      : ascii.startsWith('BM') ? 'image/bmp'
      : ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(ascii.slice(8)) ? 'image/avif' : null;
    if (!mime) throw new Error('Aperçu indisponible');
    return { ...data, mime };
  } catch (error) { await data.file.close(); error.status = 415; throw error; }
}
export async function uploadFile(root, relative, input, maximum = 50 * 1024 ** 3) {
  const dir = await parent(root, relative);
  const temp = path.join(dir.path, `.nexus-upload-${randomBytes(16).toString('hex')}`);
  let size = 0;
  try {
    const space = await statfs(dir.path);
    const quota = Math.min(maximum, Math.max(0, space.bavail * space.bsize - 16 * 1024 ** 2));
    const file = await open(temp, 'wx', 0o660);
    const limit = new Transform({ transform(chunk, encoding, callback) { size += chunk.length; callback(size > quota ? new Error('Fichier trop volumineux ou espace insuffisant') : null, chunk); } });
    const output = new Writable({ write(chunk, encoding, callback) { file.writeFile(chunk).then(() => callback(), callback); } });
    try { await pipeline(input, limit, output); await file.sync(); } finally { await file.close(); }
    // Hard-link publication is atomic and refuses replacing an existing file.
    await link(temp, path.join(dir.path, dir.name)); await unlink(temp);
    return { size };
  } finally { await unlink(temp).catch(() => {}); await dir.close(); }
}
export async function makeDirectory(root, relative) {
  const dir = await parent(root, relative);
  // Inherit setgid from the share; requesting it explicitly is denied by the
  // web service's RestrictSUIDSGID sandbox.
  try { await mkdir(path.join(dir.path, dir.name), { mode: 0o770 }); } finally { await dir.close(); }
}
export async function trashFile(root, relative) {
  const dir = await parent(root, relative), rootDir = await directory(root);
  try {
    const item = await lstat(path.join(dir.path, dir.name));
    if (item.isSymbolicLink() || (!item.isFile() && !item.isDirectory())) throw new Error('Objet refusé');
    await mkdir(path.join(rootDir.path, '.nexus-trash'), { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const trash = await open(path.join(rootDir.path, '.nexus-trash'), constants.O_RDONLY | (constants.O_DIRECTORY || 0) | (constants.O_NOFOLLOW || 0));
    try {
      const destination = process.platform === 'linux' ? `/proc/self/fd/${trash.fd}` : path.join(rootDir.path, '.nexus-trash'), id = randomUUID();
      const metadata = await open(path.join(destination, `${id}.json`), 'wx', 0o600);
      try { await metadata.writeFile(JSON.stringify({ id, name: dir.name, original: relative, directory: item.isDirectory(), removedAt: new Date().toISOString() })); await metadata.sync(); } finally { await metadata.close(); }
      try { await rename(path.join(dir.path, dir.name), path.join(destination, `${id}.data`)); }
      catch (error) { await unlink(path.join(destination, `${id}.json`)); throw error; }
    } finally { await trash.close(); }
  } finally { await dir.close(); await rootDir.close(); }
}
async function trashDirectory(root) {
  const dir = await directory(root);
  try {
    await mkdir(path.join(dir.path, '.nexus-trash'), { mode: 0o700 }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const handle = await open(path.join(dir.path, '.nexus-trash'), constants.O_RDONLY | (constants.O_DIRECTORY || 0) | (constants.O_NOFOLLOW || 0));
    return { path: process.platform === 'linux' ? `/proc/self/fd/${handle.fd}` : path.join(dir.path, '.nexus-trash'), close: async () => { await handle.close(); await dir.close(); } };
  } catch (e) { await dir.close(); throw e; }
}
export async function listTrash(root) {
  const dir = await trashDirectory(root);
  try {
    const result = [];
    for (const name of await readdir(dir.path)) {
      if (!/^[a-f0-9-]{36}\.json$/.test(name)) continue;
      const handle = await open(path.join(dir.path, name), constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      try { const record = JSON.parse(await handle.readFile('utf8')); components(record.original); if (record.id + '.json' === name) { await lstat(path.join(dir.path, record.id + '.data')); result.push(record); } } catch {} finally { await handle.close(); }
    }
    return result;
  } finally { await dir.close(); }
}
export async function restoreTrash(root, id, destination) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Identifiant de corbeille refusé');
  const dir = await trashDirectory(root);
  let to;
  try {
    const handle = await open(path.join(dir.path, id + '.json'), constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    let record; try { record = JSON.parse(await handle.readFile('utf8')); } finally { await handle.close(); }
    to = await parent(root, destination || record.original);
    const target = path.join(to.path, to.name), source = path.join(dir.path, id + '.data');
    // Reserve a new directory or use an atomic non-overwriting hard-link for files.
    const info = await lstat(source);
    if (info.isSymbolicLink()) throw new Error('Lien refusé');
    if (info.isDirectory()) {
      await mkdir(target, { mode: 0o700 });
      try { await rename(source, target); } catch (error) { await rm(target, { recursive: false }).catch(() => {}); throw error; }
    } else if (info.isFile()) { await link(source, target); await unlink(source); }
    else throw new Error('Objet refusé');
    await unlink(path.join(dir.path, id + '.json'));
  } finally { if (to) await to.close(); await dir.close(); }
}
export async function purgeTrash(root, confirmation) {
  if (confirmation !== 'VIDER LA CORBEILLE') throw new Error('Confirmation incorrecte');
  const dir = await trashDirectory(root);
  try {
    for (const name of await readdir(dir.path)) {
      if (/^[a-f0-9-]{36}\.(data|json)$/.test(name)) await rm(path.join(dir.path, name), { recursive: true, force: true });
    }
  } finally { await dir.close(); }
}
export async function moveFile(root, source, destination) {
  const from = await parent(root, source);
  let to;
  try {
    to = await parent(root, destination);
    const info = await lstat(path.join(from.path, from.name));
    if (info.isDirectory() && !info.isSymbolicLink()) {
      // Reserve an empty destination exclusively. rename may replace this
      // reservation, but never an existing file or a non-empty directory.
      const destinationPath = path.join(to.path, to.name);
      await mkdir(destinationPath, { mode: 0o770 });
      const reserved = await lstat(destinationPath);
      // Windows refuses replacing even an empty directory. Its directory
      // rename also refuses a concurrently created destination.
      if (process.platform === 'win32') await rmdir(destinationPath);
      try { await rename(path.join(from.path, from.name), destinationPath); }
      catch (error) {
        const current = await lstat(destinationPath).catch(() => null);
        if (current?.ino === reserved.ino && current?.dev === reserved.dev) await rmdir(destinationPath).catch(() => {});
        throw error;
      }
      return;
    }
    if (!info.isFile() || info.nlink !== 1) throw new Error('Seuls les fichiers ordinaires peuvent être renommés');
    await link(path.join(from.path, from.name), path.join(to.path, to.name)); await unlink(path.join(from.path, from.name));
  } finally { await from.close(); if (to) await to.close(); }
}
