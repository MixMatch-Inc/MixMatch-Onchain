import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonList, Spinner } from "./loading";
import { checkA11y } from "./test/a11y";

describe("loading primitives (#1417)", () => {
  it("Spinner is a status region with an accessible label", () => {
    render(<Spinner label="Loading history" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading history");
  });

  it("Skeleton is hidden from assistive technology", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("SkeletonList renders the requested rows and is marked busy", () => {
    const { container } = render(<SkeletonList rows={4} />);
    expect(container.querySelectorAll(".mm-skeleton")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("has no axe violations", async () => {
    expect(await checkA11y(<div><Spinner /><SkeletonList /></div>)).toHaveNoViolations();
  });
});
