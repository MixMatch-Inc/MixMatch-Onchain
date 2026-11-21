import type { Meta, StoryObj } from "@storybook/react";
import { Code } from "./code";

const meta: Meta<typeof Code> = { title: "Code", component: Code, args: { children: "pnpm install" } };
export default meta;
export const Default: StoryObj<typeof Code> = {};
