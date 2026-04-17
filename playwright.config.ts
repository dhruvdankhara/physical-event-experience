import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

const authJwtSecret =
  process.env.AUTH_JWT_SECRET ?? "playwright-local-auth-secret-1234567890";
const authCookieName = process.env.AUTH_COOKIE_NAME ?? "stadium_sync_session";

process.env.AUTH_JWT_SECRET = authJwtSecret;
process.env.AUTH_COOKIE_NAME = authCookieName;
process.env.PLAYWRIGHT_BASE_URL = baseURL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
      AUTH_JWT_SECRET: authJwtSecret,
      AUTH_COOKIE_NAME: authCookieName,
      GOOGLE_MAPS_API_KEY:
        process.env.GOOGLE_MAPS_API_KEY ??
        "playwright-google-maps-key-1234567890",
      GOOGLE_OAUTH_CLIENT_ID:
        process.env.GOOGLE_OAUTH_CLIENT_ID ?? "playwright-client-id",
      GOOGLE_OAUTH_CLIENT_SECRET:
        process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "playwright-client-secret",
      GOOGLE_OAUTH_CALLBACK_URL:
        process.env.GOOGLE_OAUTH_CALLBACK_URL ??
        `${baseURL}/api/auth/google/callback`,
      GOOGLE_CLOUD_PROJECT_ID:
        process.env.GOOGLE_CLOUD_PROJECT_ID ?? "playwright-project",
      FIRESTORE_PROJECT_ID:
        process.env.FIRESTORE_PROJECT_ID ?? "playwright-project",
      FIRESTORE_DATABASE_ID: process.env.FIRESTORE_DATABASE_ID ?? "(default)",
      GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
      GOOGLE_VERTEX_MODEL:
        process.env.GOOGLE_VERTEX_MODEL ?? "gemini-2.0-flash-001",
      GOOGLE_TTS_LANGUAGE_CODE: process.env.GOOGLE_TTS_LANGUAGE_CODE ?? "en-IN",
      GOOGLE_TTS_VOICE_NAME:
        process.env.GOOGLE_TTS_VOICE_NAME ?? "en-IN-Standard-B",
    },
  },
});
