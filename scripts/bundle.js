import { createHash } from 'node:crypto';
export const files = ['package.json', 'index.html', 'app.js', 'live.js', 'console.js', 'styles.css', 'nexus-icon.svg', 'server/main.js', 'server/system.js', 'server/releases.js', 'server/store.js', 'server/files.js', 'server/agent-client.js', 'agent/main.js', 'agent/commands.js', 'agent/disks.js', 'scripts/update.js', 'scripts/bundle.js', 'deploy/nexus.service', 'deploy/nexus-agent.service'];
export const checksum = data => createHash('sha256').update(data).digest('hex');
export function validateBundle(bytes, expectedHash, version) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || checksum(bytes) !== expectedHash) throw new Error('Intégrité SHA-256 incorrecte');
  const bundle = JSON.parse(bytes.toString('utf8'));
  if (bundle.version !== version || !bundle.files || Object.keys(bundle.files).length !== files.length || Object.keys(bundle.files).some(name => !files.includes(name))) throw new Error('Manifeste de publication invalide');
  const result = new Map();
  for (const name of files) {
    const encoded = bundle.files[name];
    if (typeof encoded !== 'string' || encoded.length > 4000000) throw new Error('Fichier absent ou trop volumineux');
    const decoded = Buffer.from(encoded, 'base64');
    if (decoded.toString('base64') !== encoded) throw new Error('Encodage invalide');
    result.set(name, decoded);
  }
  if (`v${JSON.parse(result.get('package.json')).version}` !== version) throw new Error('Version du paquet incohérente');
  return result;
}
