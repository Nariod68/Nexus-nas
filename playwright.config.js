import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:8099', trace: 'retain-on-failure' },
  webServer: { command: 'node e2e/server.js', url: 'http://127.0.0.1:8099/api/health', reuseExistingServer: false },
});
