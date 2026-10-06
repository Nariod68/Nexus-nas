import { readFile, readdir, stat, realpath, mkdir, chmod, chown, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { run } from './commands.js';
export const walk = node => [node, ...(node.children || []).flatMap(walk)];
export function diskReason(disk, swaps = []) {
  if (!disk || !['disk', 'loop'].includes(disk.type)) return 'Ce périphérique n’est pas un disque entier';
  if (disk.type === 'loop' && process.env.NEXUS_TEST_DISKS !== '1') return 'Disque virtuel réservé aux tests';
  if (disk.ro) return 'Disque en lecture seule';
  for (const child of walk(disk)) {
    if ((child.mountpoints || []).some(Boolean)) return 'Disque utilisé : une partition est montée';
    if (swaps.includes(child.name) || child.fstype === 'swap') return 'Disque utilisé pour le swap';
    if (!['disk', 'part', 'loop'].includes(child.type) || /raid|LVM|crypto/i.test(child.fstype || '')) return 'Disque membre d’un RAID, LVM ou volume chiffré';
  }
  return null;
}
export function partitionScript(parts, capacity) {
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 16) throw new Error('Prévoir entre 1 et 16 partitions');
  let allocated = 0;
  const lines = parts.map((p, index) => {
    if (typeof p.label !== 'string' || !/^[A-Za-z0-9_-]{1,16}$/.test(p.label)) throw new Error('Label ext4 : 1 à 16 lettres, chiffres ou tirets');
    if (p.sizeGiB === null && index === parts.length - 1) return `type=linux, name="${p.label}"`;
    if (!Number.isInteger(p.sizeGiB) || p.sizeGiB < 1) throw new Error('Taille entière en Gio, ou espace restant pour la dernière partition');
    allocated += p.sizeGiB * 1024 ** 3;
    return `size=${p.sizeGiB * 1024}MiB, type=linux, name="${p.label}"`;
  });
  if (allocated + 16 * 1024 ** 2 >= capacity) throw new Error('Les partitions dépassent la capacité disponible');
  return `label: gpt\nunit: sectors\n\n${lines.join('\n')}\n`;
}
function fingerprint(disk) { return createHash('sha256').update(JSON.stringify(walk(disk).map(d => [d.name, d['maj:min'], d.size, d.serial, d.fstype, d.mountpoints]))).digest('hex'); }
export class Disks {
  constructor({ volumes = '/srv/nexus/volumes', runner = run } = {}) { this.volumes = volumes; this.run = runner; this.plans = new Map(); }
  async inventory() {
    const parsed = JSON.parse(await this.run('lsblk', ['--json', '--bytes', '--paths', '--output', 'NAME,SIZE,TYPE,MODEL,SERIAL,RO,MOUNTPOINTS,FSTYPE,MAJ:MIN']));
    const swaps = (await readFile('/proc/swaps', 'utf8')).split('\n').slice(1).map(line => line.split(/\s+/)[0]);
    return Promise.all(parsed.blockdevices.filter(d => d.type === 'disk' || (process.env.NEXUS_TEST_DISKS === '1' && d.type === 'loop')).map(async disk => {
      let reason = diskReason(disk, swaps);
      for (const child of walk(disk)) {
        // Fail closed if the kernel holders cannot be inspected.
        if ((await readdir(`/sys/class/block/${path.basename(child.name)}/holders`)).length) reason = 'Disque utilisé par un autre périphérique';
      }
      return { ...disk, reason, canPartition: !reason, fingerprint: fingerprint(disk) };
    }));
  }
  async checked(device) {
    if (typeof device !== 'string' || !/^\/dev\/[a-zA-Z0-9_-]+$/.test(device) || await realpath(device) !== device || !(await stat(device)).isBlockDevice()) throw new Error('Périphérique bloc refusé');
    const disk = (await this.inventory()).find(d => d.name === device);
    if (!disk || disk.reason) throw new Error(disk?.reason || 'Disque non détecté');
    return disk;
  }
  async plan({ device, partitions }) {
    const disk = await this.checked(device);
    const script = partitionScript(partitions, disk.size);
    const token = randomBytes(24).toString('hex');
    for (const [key, p] of this.plans) if (p.expires < Date.now()) this.plans.delete(key);
    if (this.plans.size > 100) throw new Error('Trop de plans en attente');
    this.plans.set(token, { device, partitions, script, fingerprint: disk.fingerprint, expires: Date.now() + 300000 });
    return { token, device, partitions, capacity: disk.size, confirmation: `EFFACER ${device}`, warning: 'Toutes les données et partitions de ce disque seront détruites. Cette opération est irréversible.' };
  }
  async execute({ token, confirmation }, onProgress = () => {}) {
    const plan = this.plans.get(token); this.plans.delete(token);
    if (!plan || plan.expires < Date.now() || confirmation !== `EFFACER ${plan.device}`) throw new Error('Plan expiré ou confirmation incorrecte');
    const disk = await this.checked(plan.device);
    if (disk.fingerprint !== plan.fingerprint) throw new Error('Le disque a changé depuis la préparation');
    onProgress('Création de la table GPT');
    await this.run('sfdisk', ['--lock=yes', '--wipe', 'always', '--wipe-partitions', 'always', plan.device], { input: plan.script, timeout: 60000 });
    await this.run('udevadm', ['settle'], { timeout: 60000 });
    const current = JSON.parse(await this.run('lsblk', ['--json', '--paths', '--output', 'NAME,TYPE', plan.device])).blockdevices[0];
    const children = current.children?.filter(c => c.type === 'part') || [];
    if (children.length !== plan.partitions.length) throw new Error('Les nouvelles partitions ne sont pas disponibles');
    const gid = Number((await this.run('getent', ['group', 'nexus'])).split(':')[2]);
    const results = [];
    for (let index = 0; index < children.length; index++) {
      const device = children[index].name;
      if (!/^\/dev\/[a-zA-Z0-9_-]+$/.test(device)) throw new Error('Partition inattendue');
      onProgress(`Formatage ext4 : ${device}`);
      await this.run('mkfs', ['-F', '-L', plan.partitions[index].label, device], { timeout: 600000 });
      const uuid = (await this.run('blkid', ['-s', 'UUID', '-o', 'value', device])).trim();
      if (!/^[a-f0-9-]{36}$/.test(uuid)) throw new Error('UUID de volume invalide');
      const mountpoint = path.join(this.volumes, uuid);
      await mkdir(mountpoint, { recursive: true, mode: 0o755 });
      await this.run('mount', ['-t', 'ext4', '-o', 'nosuid,nodev,noexec', device, mountpoint]);
      await chown(mountpoint, 0, gid); await chmod(mountpoint, 0o2770);
      const old = await readFile('/etc/fstab', 'utf8');
      if (!old.includes(`UUID=${uuid}`)) {
        await writeFile(`/etc/fstab.nexus-${process.pid}`, `${old.trimEnd()}\nUUID=${uuid} ${mountpoint} ext4 defaults,nofail,nosuid,nodev,noexec 0 2\n`, { mode: 0o644 });
        await rename(`/etc/fstab.nexus-${process.pid}`, '/etc/fstab');
      }
      results.push({ device, uuid, mountpoint, label: plan.partitions[index].label });
    }
    return { volumes: results };
  }
}
