import type { Meta, StoryObj } from "@storybook/react";
import { TextField } from "./text-field";

const meta: Meta<typeof TextField> = { title: "TextField", component: TextField, args: { label: "Email", type: "email" } };
export default meta;
export const Default: StoryObj<typeof TextField> = {};
export const WithHelper: StoryObj<typeof TextField> = { args: { helperText: "We never share your email." } };
export const WithError: StoryObj<typeof TextField> = { args: { error: "Enter a valid email address." } };
