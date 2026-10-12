import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 180000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173/ai-music-remover/',
    headless: true,
  },
  webServer: {
    command: 'node e2e/server.mjs',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
