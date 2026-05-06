import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PUBLIC_SITE_URL: "http://127.0.0.1:4321",
      PUBLIC_APP_NAME: "WhÿClub",
      PUBLIC_ENABLE_ADMIN_SUBDOMAIN: "false",
      PUBLIC_ADMIN_HOST: "admin.localhost",
      PUBLIC_RAZORPAY_CHECKOUT_MODE: "standard",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
