import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./card";

const meta: Meta<typeof Card> = { title: "Card", component: Card, args: { title: "Documentation", href: "https://example.com", children: "Find in-depth information." } };
export default meta;
export const Default: StoryObj<typeof Card> = {};
