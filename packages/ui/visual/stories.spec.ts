import { expect, test } from "@playwright/test";

type StoryIndex = { entries: Record<string, { id: string; type: string }> };

test("every story matches its screenshot baseline", async ({ page, request }) => {
  const index = (await (await request.get("/index.json")).json()) as StoryIndex;
  const stories = Object.values(index.entries).filter((e) => e.type === "story");
  expect(stories.length).toBeGreaterThan(0);

  for (const story of stories) {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await page.waitForSelector("#storybook-root > *");
    await expect(page).toHaveScreenshot(`${story.id}.png`);
  }
});
