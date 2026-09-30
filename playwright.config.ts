import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  expect:{timeout:12000},
  use: {
    baseURL: "http://127.0.0.1:4315",
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.CLEARPAIR_BROWSER },
  },
  outputDir: ".runtime/playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: ".runtime/browser-results.json" }],
  ],
  webServer: {
    command:
      "python3 -m http.server 4315 --bind 127.0.0.1 --directory dist/site",
    url: "http://127.0.0.1:4315",
    reuseExistingServer: false,
    timeout: 10000,
  },
});
