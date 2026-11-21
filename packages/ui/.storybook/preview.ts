import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    layout: "centered",
    // Accessibility violations fail the story in the a11y panel and the visual job.
    a11y: { test: "error" },
  },
};

export default preview;
