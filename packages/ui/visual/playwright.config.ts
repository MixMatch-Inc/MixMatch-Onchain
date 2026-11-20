import { defineConfig } from "@playwright/test";

/** Screenshot tests against the built Storybook (`pnpm build-storybook`, served from storybook-static). */
export default defineConfig({
  testDir: ".",
  testMatch: "stories.spec.ts",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001 } },
  use: { baseURL: "http://127.0.0.1:6007", viewport: { width: 800, height: 600 } },
  webServer: {
    command: "npx http-server ../storybook-static -p 6007 -s",
    url: "http://127.0.0.1:6007",
    reuseExistingServer: !process.env.CI,
  },
});
