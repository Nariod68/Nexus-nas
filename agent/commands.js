import { spawn } from 'node:child_process';
const paths = {
  lsblk: '/usr/bin/lsblk', sfdisk: '/usr/sbin/sfdisk', mkfs: '/usr/sbin/mkfs.ext4', blkid: '/usr/sbin/blkid',
  mount: '/usr/bin/mount', umount: '/usr/bin/umount', udevadm: '/usr/bin/udevadm',
  useradd: '/usr/sbin/useradd', smbpasswd: '/usr/bin/smbpasswd', testparm: '/usr/bin/testparm',
  systemctl: '/usr/bin/systemctl', systemdRun: '/usr/bin/systemd-run', hostnamectl: '/usr/bin/hostnamectl',
  getent: '/usr/bin/getent', setfacl: '/usr/bin/setfacl', smartctl: '/usr/sbin/smartctl',
  pdbedit: '/usr/bin/pdbedit',
};
export function run(name, args = [], { input, timeout = 30000 } = {}) {
  if (!paths[name]) throw new Error('Commande non autorisée');
  return new Promise((resolve, reject) => {
    const child = spawn(paths[name], args, { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C' } });
    let output = '', errors = '', completed = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.stdout.on('data', data => { output += data; if (output.length > 2e6) child.kill('SIGKILL'); });
    child.stderr.on('data', data => { errors += data; if (errors.length > 2e6) child.kill('SIGKILL'); });
    child.on('error', error => { clearTimeout(timer); completed = true; reject(error); });
    child.on('close', code => { clearTimeout(timer); if (completed) return; code === 0 ? resolve(output) : reject(new Error(`${name} a échoué (${code}) : ${errors.slice(-1500)}`)); });
    child.stdin.on('error', () => {}); child.stdin.end(input);
  });
}
