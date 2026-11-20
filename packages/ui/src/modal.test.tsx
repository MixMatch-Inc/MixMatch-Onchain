import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";
import { checkA11y } from "./test/a11y";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm payment">
        <button>Cancel</button>
        <button>Pay</button>
      </Modal>
    </>
  );
}

describe("Modal (#1415)", () => {
  it("is a labelled modal dialog and moves focus inside", () => {
    render(<Harness />);
    const opener = screen.getByText("Open");
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog", { name: "Confirm payment" })).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(screen.getByText("Cancel"));
  });

  it("Escape closes it and focus returns to the opener", () => {
    render(<Harness />);
    const opener = screen.getByText("Open");
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("traps Tab inside the dialog", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    const pay = screen.getByText("Pay");
    pay.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByText("Cancel"));
  });

  it("closes from the backdrop but not from inside the dialog", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T"><button>x</button></Modal>);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByTestId("modal-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations when open", async () => {
    expect(await checkA11y(<Modal open onClose={() => undefined} title="Title"><button>OK</button></Modal>)).toHaveNoViolations();
  });
});
