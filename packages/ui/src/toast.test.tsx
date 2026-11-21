import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast";

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.error("Payment failed")}>fail</button>
      <button onClick={() => toast.success("Saved")}>ok</button>
    </>
  );
}

describe("Toast (#1416)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("announces errors assertively and success politely", () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText("fail"));
    fireEvent.click(screen.getByText("ok"));
    expect(screen.getByRole("alert")).toHaveTextContent("Payment failed");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("dismisses after the duration and on request", () => {
    render(<ToastProvider durationMs={1000}><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText("ok"));
    act(() => void vi.advanceTimersByTime(1001));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("fail"));
    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(screen.queryByText("Payment failed")).not.toBeInTheDocument();
  });

  it("useToast outside a provider throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
