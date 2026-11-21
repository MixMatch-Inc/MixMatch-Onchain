import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Address, Amount, Avatar, CopyField } from "./display";
import { EmptyState, ErrorState } from "./states";
import { StatusPill } from "./status-pill";

describe("StatusPill (#1418)", () => {
  it("renders label with an icon that is hidden from assistive tech", () => {
    const { container } = render(<StatusPill tone="success" icon="✓" label="Completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("✓");
    expect(container.firstChild).toHaveAttribute("data-tone", "success");
  });
});

describe("display components (#1419)", () => {
  it("Amount formats to 7 decimals", () => {
    render(<Amount value="10" assetCode="XLM" />);
    expect(screen.getByText("10.0000000 XLM")).toBeInTheDocument();
  });

  it("Address truncates but exposes the full value", () => {
    const full = "G".padEnd(52, "A") + "ABCD";
    render(<Address value={full} />);
    expect(screen.getByLabelText(full)).toHaveTextContent("G…ABCD");
  });

  it("CopyField copies and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyField label="Address" value="GABCDEFGHIJKLMNOP" />);
    fireEvent.click(screen.getByLabelText("Copy Address"));
    expect(writeText).toHaveBeenCalledWith("GABCDEFGHIJKLMNOP");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("Avatar is decorative", () => {
    const { container } = render(<Avatar address="GABC" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("states (#1420)", () => {
  it("EmptyState shows its message", () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here");
  });

  it("ErrorState is an alert with a retry action", () => {
    const retry = vi.fn();
    render(<ErrorState message="Could not load" action={{ label: "Retry", onClick: retry }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    fireEvent.click(screen.getByText("Retry"));
    expect(retry).toHaveBeenCalled();
  });
});
