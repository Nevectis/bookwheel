import { defineConfig, devices } from '@playwright/test';

// Two setups:
//  demo     – the built site with no Firebase config (localStorage demo backend)
//  emulator – built against the local Firebase Auth + Firestore emulators
//             (run via `npm run test:e2e:emulator`, which starts them)
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: { executablePath, proxy },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'demo',
      testMatch: /demo\..*spec\.js/,
      use: { baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'emulator',
      testMatch: /emulator\..*spec\.js/,
      use: { baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      command: 'npx vite build --logLevel error && npx vite preview --port 4173 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'VITE_FIREBASE_EMULATOR=1 npx vite build --outDir dist-emulator --logLevel error && npx vite preview --outDir dist-emulator --port 4174 --strictPort --host 127.0.0.1',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
