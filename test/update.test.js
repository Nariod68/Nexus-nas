import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activateVersion } from '../scripts/update.js';
test('failed update restores the previous version and restarts its services', async () => {
  const switches = [], deployments = []; let restarts = 0;
  await assert.rejects(activateVersion('new', 'previous', '0.3.1', {
    switcher: async target => switches.push(target), deployer: async target => deployments.push(target), restarter: async () => restarts++, verifier: async () => false, notifier: async () => {},
  }), /Version précédente restaurée/);
  assert.deepEqual(switches, ['new', 'previous']); assert.deepEqual(deployments, ['new', 'previous']); assert.equal(restarts, 2);
});
test('successful update retains the new version after health validation', async () => {
  const switches = [];
  await activateVersion('new', 'previous', '0.3.1', { switcher: async target => switches.push(target), deployer: async () => {}, restarter: async () => {}, verifier: async version => version === '0.3.1', notifier: async () => {} });
  assert.deepEqual(switches, ['new']);
});
