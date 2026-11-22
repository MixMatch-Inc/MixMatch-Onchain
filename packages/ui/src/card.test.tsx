import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";
import { checkA11y } from "./test/a11y";

describe("Card", () => {
  it("renders the title and children as an external link", () => {
    render(<Card title="Docs" href="https://example.com">Read more</Card>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText("Read more")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    expect(await checkA11y(<Card title="Docs" href="https://example.com">Read more</Card>)).toHaveNoViolations();
  });
});
