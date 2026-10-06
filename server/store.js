import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Le mot de passe doit contenir entre 12 et 256 caractères');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function passwordMatches(password, stored) {
  if (typeof password !== 'string' || password.length > 256 || !stored) return false;
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(hash, 'hex'));
}
export function username(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{2,19}$/.test(value)) throw new Error('Nom : 3 à 20 lettres minuscules, chiffres, tirets ou underscores');
  return value;
}
export class Store {
  constructor(file, initial = { configured: false, users: [] }) { this.file = file; this.initial = initial; this.queue = Promise.resolve(); }
  async read() {
    if (!this.file) return structuredClone(this.initial);
    try { return JSON.parse(await readFile(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return structuredClone(this.initial); throw error; }
  }
  change(fn) {
    const work = this.queue.then(async () => {
      const state = await this.read(); const result = await fn(state);
      if (!this.file) { this.initial = state; return result; }
      await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
      const temp = `${this.file}.${randomBytes(8).toString('hex')}`;
      await writeFile(temp, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
      await rename(temp, this.file); return result;
    });
    this.queue = work.catch(() => {}); return work;
  }
}
