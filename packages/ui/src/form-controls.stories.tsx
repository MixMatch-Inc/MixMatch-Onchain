import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, RadioGroup, Select, Switch } from "./form-controls";

const meta: Meta = { title: "Form controls" };
export default meta;
export const Controls: StoryObj = {
  render: () => (
    <form>
      <Checkbox label="Remember me" />
      <Switch label="Notifications" defaultChecked />
      <RadioGroup legend="Kind" name="kind" value="deposit" options={[{ value: "deposit", label: "Deposit" }, { value: "withdraw", label: "Withdraw" }]} />
      <Select label="Asset" helperText="Pick an asset" options={[{ value: "SRT", label: "SRT" }, { value: "USDC", label: "USDC" }]} />
    </form>
  ),
};
