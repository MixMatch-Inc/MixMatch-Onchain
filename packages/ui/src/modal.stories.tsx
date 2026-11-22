import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./modal";

const meta: Meta<typeof Modal> = { title: "Modal", component: Modal, args: { open: true, title: "Confirm payment", onClose: () => undefined } };
export default meta;
export const Open: StoryObj<typeof Modal> = { render: (args) => <Modal {...args}><p>Send 10 XLM?</p><button>Cancel</button> <button>Pay</button></Modal> };
