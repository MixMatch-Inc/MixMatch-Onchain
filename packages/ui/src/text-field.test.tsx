import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { checkA11y } from "./test/a11y";
import { TextField } from "./text-field";

describe("TextField (#1413)", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("wires helper text and error through aria-describedby and marks the field invalid", () => {
    render(<TextField label="Email" helperText="We never share it" error="Enter a valid email" />);
    const input = screen.getByLabelText("Email");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0]!)).toHaveTextContent("We never share it");
    expect(document.getElementById(ids[1]!)).toHaveTextContent("Enter a valid email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
  });

  it("has no aria-describedby or aria-invalid when there is nothing to describe", () => {
    render(<TextField label="Name" />);
    const input = screen.getByLabelText("Name");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("has no axe violations in the default and error states", async () => {
    expect(await checkA11y(<TextField label="Email" helperText="Hint" />)).toHaveNoViolations();
    expect(await checkA11y(<TextField label="Email" error="Required" required />)).toHaveNoViolations();
  });
});
