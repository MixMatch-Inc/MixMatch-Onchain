import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Code } from "./code";

describe("Code", () => {
  it("renders children in a code element", () => {
    render(<Code>pnpm test</Code>);
    expect(screen.getByText("pnpm test").tagName).toBe("CODE");
  });
});
