import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    viewport: { width: 1512, height: 982 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3000",
    env: { APP_ACCESS_KEY: "pupuce-e2e" },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
