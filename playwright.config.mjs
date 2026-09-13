import { defineConfig } from '@playwright/test';

const testEnv = 'RESET_TEST_DB=1 AGENT_TEST_MODE=1 HOSPITAL_DEMO_SEED=1 EMAIL_TRANSPORT=mock ADMIN_PASS=ShreeAuto@2026 JWT_SECRET=test-only-secret DB_PATH=/tmp/ai-masystem-v2-e2e.db PORT=8123';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8123',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `${testEnv} node server/server.js`,
    url: 'http://127.0.0.1:8123/api/status',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
