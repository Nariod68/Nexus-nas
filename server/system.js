import os from 'node:os';
import { readFile, statfs } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
async function command(name, args) {
  try { return (await exec(name, args, { timeout: 4000, maxBuffer: 1024 * 1024, env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C' } })).stdout; }
  catch { return null; }
}
export function parseShares(text) {
  if (text === null) return null;
  const shares = [];
  let section;
  for (const line of text.split('\n')) {
    const header = /^\s*\[([^\]]+)\]/.exec(line);
    if (header) {
      section = { name: header[1], path: '', access: '', readOnly: true };
      if (!['global', 'homes', 'printers', 'print$'].includes(section.name)) shares.push(section);
    } else if (section) {
      const field = /^\s*([^=]+?)\s*=\s*(.*)$/.exec(line);
      if (!field) continue;
      if (field[1] === 'path') section.path = field[2];
      if (field[1] === 'valid users') section.access = field[2];
      if (field[1] === 'read only') section.readOnly = field[2] !== 'No';
    }
  }
  return shares.filter(s => s.path);
}
function cpuSample() {
  return os.cpus().reduce((sum, cpu) => ({ idle: sum.idle + cpu.times.idle, total: sum.total + Object.values(cpu.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
}
let previous = cpuSample();
export async function snapshot(storagePath = '/') {
  const linux = process.platform === 'linux';
  const next = cpuSample();
  const delta = next.total - previous.total;
  const cpuPercent = delta > 0 ? Math.round(100 * (1 - (next.idle - previous.idle) / delta)) : null;
  previous = next;
  const [blocks, passwd, samba, memory, usage, services] = await Promise.all([
    linux ? command('lsblk', ['--json', '--bytes', '--output', 'NAME,SIZE,TYPE,MODEL,MOUNTPOINT,FSTYPE']) : null,
    linux ? command('getent', ['passwd']) : null,
    linux ? command('testparm', ['-s']) : null,
    linux ? readFile('/proc/meminfo', 'utf8').catch(() => null) : null,
    statfs(storagePath).catch(() => null),
    linux ? Promise.all(['smbd', 'ssh'].map(async name => ({ name, state: (await command('systemctl', ['is-active', name]))?.trim() || 'unavailable' }))) : [],
  ]);
  let disks = null;
  try { disks = JSON.parse(blocks).blockdevices; } catch { /* Missing tool: report unavailable. */ }
  const total = os.totalmem();
  const available = memory ? Number(/^MemAvailable:\s+(\d+)/m.exec(memory)?.[1]) * 1024 : os.freemem();
  return {
    hostname: os.hostname(), platform: process.platform, system: `${os.type()} ${os.release()}`, architecture: os.arch(),
    uptimeSeconds: Math.floor(os.uptime()), cpuPercent,
    memory: { total, available: Number.isFinite(available) ? available : null },
    network: Object.entries(os.networkInterfaces()).flatMap(([name, entries]) => entries.filter(e => !e.internal && e.family === 'IPv4').map(e => ({ name, address: e.address }))),
    storage: usage ? { path: storagePath, total: usage.blocks * usage.bsize, used: (usage.blocks - usage.bfree) * usage.bsize, available: usage.bavail * usage.bsize } : null,
    disks, shares: parseShares(samba),
    users: passwd === null ? null : passwd.trim().split('\n').map(line => { const [name, , uid, , , home, shell] = line.split(':'); return { name, uid: Number(uid), home, shell }; }).filter(u => u.uid === 0 || (u.uid >= 1000 && u.uid < 65534)),
    services, sampledAt: new Date().toISOString(),
  };
}
