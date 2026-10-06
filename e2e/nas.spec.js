import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('browser setup, SMB share, file upload/download, folder, removal and account', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let agentRequests = 0;
  await page.route('**/api/agent', async route => {
    if (++agentRequests === 1) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service Linux temporairement indisponible (test)' }) });
    else await route.continue();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Installer votre NAS' })).toBeVisible();
  await page.getByLabel('Code d’installation').fill('browser-setup-token-1234567890');
  await page.getByLabel('Nom d’utilisateur', { exact: true }).fill('alice');
  await page.getByLabel('Mot de passe', { exact: true }).fill('browser-admin-password');
  await page.getByRole('button', { name: 'Créer mon serveur' }).click();
  await expect(page.getByRole('heading', { name: 'Compte connecté' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Service Linux temporairement indisponible');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(page.getByRole('heading', { name: 'Votre premier partage' })).toBeVisible();
  await page.getByRole('button', { name: 'Créer le partage et terminer' }).click();
  await expect(page.getByRole('heading', { name: 'Fichiers', exact: true })).toBeVisible();
  await page.locator('#file-upload').setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('Bonjour le NAS') });
  await expect(page.locator('#transfer-progress')).toHaveText('Transfert terminé.');
  await expect(page.locator('#file-rows')).toContainText('hello.txt');
  const download = page.waitForEvent('download'); await page.getByRole('link', { name: 'Télécharger' }).click();
  {
    const file = await download; expect(await readFile(await file.path(), 'utf8')).toBe('Bonjour le NAS');
  }
  page.once('dialog', dialog => dialog.accept('photos')); await page.getByRole('button', { name: 'Nouveau dossier' }).click();
  await expect(page.locator('#file-rows')).toContainText('photos');
  page.once('dialog', dialog => dialog.accept()); await page.locator('tr').filter({ hasText: 'hello.txt' }).getByRole('button', { name: 'Retirer' }).click();
  await expect(page.locator('#file-rows')).not.toContainText('hello.txt');
  await page.locator('[data-page=users]').click(); await page.getByRole('button', { name: 'Ajouter un utilisateur' }).click();
  const userDialog = page.getByRole('dialog'); await userDialog.getByLabel('Nom', { exact: true }).fill('bob'); await userDialog.getByLabel('Mot de passe', { exact: true }).fill('bob-browser-password'); await userDialog.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.locator('#page-users')).toContainText('bob');
  await page.locator('[data-page=storage]').click(); await page.getByRole('button', { name: 'Partitionner…' }).click();
  const partition = page.getByRole('dialog'); await partition.getByRole('button', { name: 'Préparer le plan' }).click();
  await expect(partition).toContainText('EFFACER /dev/testdisk');
  await partition.getByRole('button', { name: 'Fermer' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-page=files]').click();
  await expect(page.getByRole('heading', { name: 'Fichiers', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Nexus' })).toBeVisible();
  await page.getByLabel('Nom d’utilisateur', { exact: true }).fill('bob'); await page.getByLabel('Mot de passe', { exact: true }).fill('bob-browser-password');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Fichiers', exact: true })).toBeVisible();
  await expect(page.locator('#file-path')).toHaveText('Aucun partage autorisé.');
  expect(errors).toEqual([]);
});
