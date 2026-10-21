import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the Vite dev server (its development hooks make
 * outcomes deterministic). By default they use the locally installed Chrome; set
 * PW_CHANNEL= (empty) after `npx playwright install chromium` to use Playwright's own.
 */
const channel = process.env.PW_CHANNEL ?? 'chrome';
const port = 5174;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: channel || undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: channel || undefined } },
  ],
});
