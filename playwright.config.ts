import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against the running local stack: backend `deploy/local/up.ps1` (it builds and starts this site too).
 *   E2E_BASE_URL (default http://localhost:8080, the Nginx in front of the site and the API)
 *   npm run e2e
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
  },
  outputDir: 'e2e-results',
});
