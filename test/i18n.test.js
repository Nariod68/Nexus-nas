import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('English catalog translates whole UI phrases, respects word boundaries and preserves error paths', async () => {
  const source = (await readFile(new URL('../app.js', import.meta.url), 'utf8')).split('const pageNames =')[0];
  const catalogText = source.slice(source.indexOf('  const english = ') + '  const english = '.length, source.indexOf(';\n  const keys ='));
  const catalog = JSON.parse(catalogText);
  const context = { document: { documentElement: { lang: 'en' } } }; vm.createContext(context);
  vm.runInContext(source + ';globalThis.i18n = NexusI18n;', context);
  for (const [french, english] of Object.entries(catalog)) assert.equal(context.i18n.fragment(french), english, french);
  assert.equal(context.i18n.fragment('prefixNomSuffix'), 'prefixNomSuffix');
  assert.equal(context.i18n.fragment('<button title="Nouveau dossier">Nouveau dossier</button>'), '<button title="New folder">New folder</button>');
  assert.equal(context.i18n.message("Accès refusé : '/srv/nexus/Dossier/Fichiers.txt'"), "Access denied : '/srv/nexus/Dossier/Fichiers.txt'");
  assert.equal(context.i18n.fragment('Tapez REDÉMARRER pour confirmer'), 'Type RESTART to confirm');
  context.document.documentElement.lang = 'fr';
  assert.equal(context.i18n.fragment('Nouveau dossier'), 'Nouveau dossier');
  assert.equal(context.i18n.locale(), 'fr-FR');
});
