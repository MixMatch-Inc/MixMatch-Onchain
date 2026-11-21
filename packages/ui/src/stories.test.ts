import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here);
const components = files.filter((f) => /^[a-z-]+\.tsx$/.test(f) && !f.includes(".test.") && !f.includes(".stories."));

describe("Storybook coverage (#1422)", () => {
  it("every component has a story", () => {
    const missing = components.filter((c) => !files.includes(c.replace(/\.tsx$/, ".stories.tsx")));
    expect(missing).toEqual([]);
  });

  it("every component is exported from the barrel", () => {
    const barrel = readFileSync(join(here, "index.ts"), "utf8");
    const missing = components.filter((c) => !barrel.includes(`./${c.replace(/\.tsx$/, "")}"`));
    expect(missing).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
