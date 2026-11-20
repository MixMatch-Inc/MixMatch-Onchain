import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./toast";

function Demo() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("Saved")}>Success</button>
      <button onClick={() => toast.error("Payment failed")}>Error</button>
      <button onClick={() => toast.info("Heads up")}>Info</button>
    </div>
  );
}

const meta: Meta = { title: "Toast", decorators: [(Story) => <ToastProvider><Story /></ToastProvider>] };
export default meta;
export const Triggers: StoryObj = { render: () => <Demo /> };
