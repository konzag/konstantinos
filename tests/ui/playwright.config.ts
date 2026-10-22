import { defineConfig } from '@playwright/test';

// Playwright is a test-only tool here: the games themselves need nothing installed (CLAUDE.md).
// serve.mjs plays the hub: the repo at /konstantinos/ with the hub's CSP. Own port, so another repo's server is never reused.
const PORT = 4187;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: 'chromium', viewport: { width: 1280, height: 800 } },
  webServer: {
    command: 'node serve.mjs',
    url: `http://127.0.0.1:${PORT}/konstantinos/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
});
