import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MetricsCollector } from '../server/system.js';
test('metrics history contains measured samples, is bounded and serializes concurrent captures', async () => {
  let reads = 0;
  const metrics = new MetricsCollector({ limit: 2, sampler: async () => {
    const cpuPercent = ++reads;
    await new Promise(resolve => setTimeout(resolve, 5));
    return { sampledAt: new Date(10000 * cpuPercent).toISOString(), cpuPercent, memory: { total: 100, available: 60 } };
  } });
  await Promise.all([metrics.sample(), metrics.sample()]);
  assert.equal(reads, 1);
  await metrics.sample(); await metrics.sample();
  const data = await metrics.get();
  assert.equal(reads, 3); assert.equal(data.history.length, 2);
  assert.deepEqual(data.history.map(p => p.cpu), [2, 3]);
  assert.deepEqual(data.history.map(p => p.memory), [40, 40]);
  assert.equal(data.sampleIntervalSeconds, 10);
});
