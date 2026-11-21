import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox, RadioGroup, Select, Switch } from "./form-controls";
import { checkA11y } from "./test/a11y";

describe("form controls (#1414)", () => {
  it("Checkbox toggles from its label", () => {
    render(<Checkbox label="Remember me" />);
    const box = screen.getByLabelText("Remember me") as HTMLInputElement;
    fireEvent.click(screen.getByText("Remember me"));
    expect(box.checked).toBe(true);
  });

  it("Switch exposes the switch role", () => {
    render(<Switch label="Notifications" defaultChecked />);
    expect(screen.getByRole("switch", { name: "Notifications" })).toBeChecked();
  });

  it("RadioGroup is a labelled group and reports selection", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup legend="Kind" name="kind" value="deposit" onChange={onChange} options={[{ value: "deposit", label: "Deposit" }, { value: "withdraw", label: "Withdraw" }]} />,
    );
    expect(screen.getByRole("group", { name: "Kind" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Withdraw"));
    expect(onChange).toHaveBeenCalledWith("withdraw");
  });

  it("Select wires label, helper and error", () => {
    render(<Select label="Asset" helperText="Pick one" error="Required" options={[{ value: "", label: "Choose" }, { value: "SRT", label: "SRT" }]} />);
    const select = screen.getByLabelText("Asset");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect((select.getAttribute("aria-describedby") ?? "").split(" ")).toHaveLength(2);
  });

  it("has no axe violations", async () => {
    expect(
      await checkA11y(
        <form>
          <Checkbox label="A" />
          <Switch label="B" />
          <RadioGroup legend="C" name="c" options={[{ value: "1", label: "One" }]} />
          <Select label="D" options={[{ value: "x", label: "X" }]} />
        </form>,
      ),
    ).toHaveNoViolations();
  });
});
