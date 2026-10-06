export const repository = 'Nariod68/Nexus-nas';
export function versionParts(tag) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  if (!match) throw new Error('Numéro de version invalide');
  return match.slice(1).map(Number);
}
export function newer(tag, installed) {
  const a = versionParts(tag), b = versionParts(installed);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export async function latestRelease(fetcher = fetch) {
  const response = await fetcher(`https://api.github.com/repos/${repository}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Nexus-NAS' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(response.status === 404 ? 'Aucune publication GitHub disponible' : `GitHub : HTTP ${response.status}`);
  const release = await response.json();
  if (typeof release.tag_name !== 'string' || !release.tag_name.startsWith('v')) throw new Error('Le tag de publication doit commencer par v');
  versionParts(release.tag_name);
  if (release.draft || release.prerelease) throw new Error('Publication non stable');
  return release;
}
