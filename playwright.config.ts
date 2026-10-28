import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the running local stack: backend `deploy/local/up.ps1` (it builds and starts this site too).
 *   E2E_BASE_URL (default http://localhost:8081, the Nginx in front of the site and the API)
 *   E2E_EIMZO_FAKE=1 also runs the E-IMZO scenarios (needs docker-compose.eimzo-fake.yml, see README)
 *   npm run e2e                       everything in Chromium, and the browser smoke tests in the other browsers
 *   npx playwright install firefox webkit    once, for the other browsers
 */
const OTHER_BROWSERS = /cross-browser\.spec\.ts/;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: OTHER_BROWSERS },
    { name: 'safari', use: { ...devices['Desktop Safari'] }, testMatch: OTHER_BROWSERS },
    { name: 'android', use: { ...devices['Pixel 7'] }, testMatch: OTHER_BROWSERS },
    { name: 'iphone', use: { ...devices['iPhone 14'] }, testMatch: OTHER_BROWSERS },
  ],
  outputDir: 'e2e-results',
});
