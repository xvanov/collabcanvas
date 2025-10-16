import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright configuration for performance harness runs.
 * Targets Chromium + Firefox; Safari remains a manual checklist.
 * Tests assume Firebase emulators + app preview are running locally.
 */
export default defineConfig({
  testDir: path.join(__dirname, 'specs'),
  timeout: 5 * 60 * 1000, // allow long multi-client scenarios
  fullyParallel: false, // harness orchestrates concurrency itself
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.PERF_JSON_REPORT ?? 'test-results/perf-report.json' }],
  ],
  use: {
    baseURL: process.env.PERF_BASE_URL ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
